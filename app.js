const express = require('express');
const app = express();
const axios = require('axios');

require('dotenv').config();

const RoleController = require('./controllers/RoleController');
const userController = require('./controllers/UserController'); 
const CategoriesController = require('./controllers/CategoriesController');
const productController = require('./controllers/ProductController');
const RegisterController = require('./controllers/RegisterController');
const VendorsController = require('./controllers/VendorsController');
const CartController = require('./controllers/CartController');

const cacheController = require('express-cache-controller');

const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_URL; 

const mysql = require('mysql2/promise');
const flash = require('express-flash');
const session = require('express-session');


const compression = require('compression');

const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('O arquivo enviado não é uma imagem.'));
        }
    }
});


var Images = upload.any();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'agrofood-marketplace',
    resave: false,
    saveUninitialized: true
}));

app.use(compression());

app.use(cacheController({
    maxAge: '5 minutes' // Tempo de vida do cache em segundos
  }));
  
app.use('/public', express.static('public'))
app.use('/uploads', express.static('uploads'));


app.use(flash());

// Inicialização do Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Rota para fazer logout
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).send('Erro ao fazer logout');
        }
        res.redirect('/'); // Redireciona para a página de login
    });
});

// Configuração da estratégia de autenticação local
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Busca o usuário no banco de dados pelo nome de usuário
            const userResponse = await axios.get(`${API_BASE_URL}/users/username/${username}`);
            const user = userResponse.data; // Dados do usuário

            // Se o usuário não for encontrado ou a senha estiver incorreta, retorna uma mensagem de erro
            if (!user || user.password !== password) {
                return done(null, false, { message: 'Nome de usuário ou senha incorretos.' });
            }

            // Se o usuário for encontrado e a senha estiver correta, retorna o usuário
            return done(null, user);
        } catch (error) {
            // Se ocorrer um erro ao buscar o usuário, retorna o erro
            return done(error);
        }
    }
));

// Serialização do usuário para a sessão
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Desserialização do usuário da sessão
passport.deserializeUser(async (id, done) => {
    try {
        // Busca o usuário no banco de dados pelo ID
        const userResponse = await axios.get(`${API_BASE_URL}/users/${id}`);
        const user = userResponse.data; // Dados do usuário
        // Se o usuário for encontrado, retorna o usuário
        done(null, user);
    } catch (error) {
        // Se ocorrer um erro ao buscar o usuário, retorna o erro
        done(error);
    }
});


// LOGIN USER
// Rota de login
// Se o login for bem-sucedido, redirecionar o usuário para a URL armazenada na consulta "redirect"
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

// Rota para renderizar o formulário de login
app.get('/login', (req, res) => {
    // Renderiza o arquivo login.ejs
    res.render('login', { message: req.flash('error') });
});
// LOGIN USER

// REGISTRO PRODUTOR
app.get('/cadastro-produtor', RegisterController.showRegisterVendor);
app.post('/cadastro-produtor', RegisterController.registerVendor);
// REGISTRO PRODUTOR

// HOME
app.get('/', async (req, res) => {

    const user = req.user; // Obter o usuário autenticado, se estiver disponível

    const response = await axios.get(`${API_BASE_URL}/products/home`);
    products = response.data;
    
    // Renderiza o arquivo login.ejs
    res.render('site/home', { pageTitle: 'Home', message: req.flash('error'), products, user });
});
// HOME 

// LISTAGEM PRODUTOS POR CATEGORIA
app.get('/categoria/:id', productController.getProductsByCategory);
app.get('/api/products/category/id/:id', async (req, res) => {
    const categoryId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    try {
        const response = await axios.get(
            `${API_BASE_URL}/products/category/id/${categoryId}`,
            { 
                params: { page, limit },
                timeout: 5000
            }
        );

        const { products, currentPage, totalCount, totalPages } = response.data;

        // Verificar se não há produtos
        if (!products || products.length === 0) {
            return res.json({
                products: [],
                currentPage: 1,
                totalCount: 0,
                totalPages: 0
            });
        }

        // Buscar imagens para todos os produtos
        const productsWithImages = await Promise.all(
            products.map(async (product) => {
                try {
                    const imgResponse = await axios.get(
                        `${API_BASE_URL}/images/${product.id}/type`,
                        { 
                            params: { type: 'featured_image' },
                            timeout: 3000
                        }
                    );
                    
                    return {
                        ...product,
                        image_path: imgResponse.data?.length > 0 
                            ? imgResponse.data[0].path 
                            : '/public/img/no-image.png'
                    };
                } catch (error) {
                    return {
                        ...product,
                        image_path: '/public/img/no-image.png'
                    };
                }
            })
        );

        res.json({
            products: productsWithImages,
            currentPage,
            totalCount,
            totalPages
        });
    } catch (error) {
        console.error('Erro ao buscar produtos:', error.message);
        
        // Retornar estrutura vazia em vez de erro 500
        if (error.response?.status === 404) {
            return res.json({
                products: [],
                currentPage: 1,
                totalCount: 0,
                totalPages: 0
            });
        }
        
        res.status(error.response?.status || 500).json({ 
            error: 'Erro ao buscar produtos',
            products: [],
            currentPage: 1,
            totalCount: 0,
            totalPages: 0
        });
    }
});
// LISTAGEM PRODUTOS POR CATEGORIA

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        const userRole = req.user.roles_id;
        const allowedRoutes = getRoutesForRole(userRole);
        const requestedRoute = req.originalUrl;

        // Verifica se o usuário tem permissão para acessar a rota solicitada
        const isRouteAllowed = allowedRoutes.some(route => {
            // Verifica se a rota solicitada corresponde ao padrão da rota permitida
            const regex = new RegExp(`^${route.replace(/:\w+/g, '\\w+')}$`);
            return regex.test(requestedRoute);
        });

        if (isRouteAllowed) {
            return next(); // Prossiga para a próxima rota se for permitida
        } else {
            return res.redirect('/dashboard');
        }
    }
    res.redirect('/login');
};

const getRoutesForRole = (roleId) => {
    switch (roleId) {
        case 1: // Role de administrador
            return [
                '/dashboard',
                '/products',
                '/products/new',
                '/products/:id/edit',
                '/products/:id',
                '/categories',
                '/categories/new',
                '/categories/:id/edit',
                '/categories/:id',
                '/roles',
                '/roles/new',
                '/roles/:id/edit',
                '/roles/:id',
                '/users',
                '/users/new',
                '/users/:id/edit',
                '/users/:id',
                '/vendors',
                '/vendors/:id/edit',
                '/vendors/:id'
                // Adicione outras rotas permitidas para o administrador conforme necessário
            ];
        case 2: // Role de usuário normal
            return [
                '/dashboard',
                '/products',
                '/products/new',
                '/products/:id/edit',
                '/products/:id',
                // Adicione outras rotas permitidas para o usuário normal conforme necessário
            ];
        default: 
            return [
                '/dashboard'
            ];
    }
};


// ROLES
app.get('/roles', isAuthenticated, RoleController.getAllRoles);
app.get('/roles/new', isAuthenticated, RoleController.showNewRoleForm);
app.post('/roles', isAuthenticated, RoleController.createRole);
app.delete('/roles/:id', isAuthenticated, RoleController.deleteRole);
app.get('/roles/:id/edit', isAuthenticated, RoleController.showEditRoleForm);
app.post('/roles/:id', isAuthenticated, RoleController.updateRole);
app.get('/roles', isAuthenticated, RoleController.getAllRoles);
// ROLES
// USERS
app.get('/users', isAuthenticated, userController.getAllUsers);
app.get('/users/new', isAuthenticated, userController.showNewUserForm);
app.post('/users', userController.createUser);
app.delete('/users/:id', isAuthenticated, userController.deleteUser);
app.get('/users/:id/edit', isAuthenticated, userController.showEditUserForm);
app.post('/users/:id', userController.updateUser);
// USERS
// CATEGORIES
app.get('/categories', isAuthenticated, CategoriesController.getAllCategories);
app.get('/categories/new', isAuthenticated, CategoriesController.showNewCategoryForm);
app.post('/categories', isAuthenticated, CategoriesController.createCategory);
app.delete('/categories/:id', isAuthenticated, CategoriesController.deleteCategory);
app.get('/categories/:id/edit', isAuthenticated, CategoriesController.showEditCategoryForm);
app.post('/categories/:id', isAuthenticated, CategoriesController.updateCategory);
// CATEGORIES
// VENDORS
app.get('/vendors', isAuthenticated, VendorsController.getAllVendors);
app.delete('/vendors/:id', VendorsController.deleteVendor);
app.get('/vendors/:id/edit', isAuthenticated, VendorsController.showEditVendorForm);
app.post('/vendors/:id', isAuthenticated, VendorsController.updateVendor);
app.get('/vendors/new', isAuthenticated, VendorsController.showNewVendorForm);
app.post('/vendors', isAuthenticated, VendorsController.createVendor);



// VENDORS
app.get('/dashboard', isAuthenticated, async (req, res) => {
    res.render('dashboard/index', { pageTitle: 'Painel',username: req.user.username, userRole: req.user.roles_id });

});

// PRODUCTS
app.get('/products', isAuthenticated, productController.getAllProducts);
app.post('/products', Images, productController.createProduct);
app.get('/products/new', isAuthenticated, productController.showNewProductForm);
app.delete('/products/:id', productController.deleteProduct);
app.get('/products/:id/edit', productController.showEditProductForm);
app.post('/products/:id', upload.any(), productController.updateProduct);
app.post('/uploads/:filename', productController.deleteImage);
// PRODUCTS

// PRODUTO
app.get('/produto/:sku', productController.getProductBySKU);
// PRODUTO

// Middleware para verificar se o usuário está autenticado e tem o role_id necessário

// Rota para adicionar ao carrinho de compras
app.post('/adicionar-ao-carrinho', async (req, res, next) => {
    try {
        await CartController.addToCart(req, res); // Chamar a função addToCart do controlador
    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// CARRINHO
app.get('/carrinho', CartController.getCart);
app.post('/carrinho/increment', CartController.incrementCartItem);
app.post('/carrinho/decrement', CartController.decrementCartItem);
// CARRINHO

app.listen(PORT, () => {
    console.log(`O servidor está em execução http://localhost:${PORT}`);
});
