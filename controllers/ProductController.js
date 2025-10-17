const path = require('path');
const sharp = require('sharp');
const fs_promisses = require('fs').promises; // Importar o módulo fs com Promises
const fs = require('fs'); // Importar o módulo fs com Promises

const API_BASE_URL = process.env.API_URL; // URL da sua API Go

const axios = require('axios');

const getAllProducts = async (req, res) => {
    try {
        let products;
        const userId = req.user.id; // Obtém o ID do usuário autenticado
        const roleId = req.user.roles_id; // Obtém o roles_id do usuário autenticado

        if (roleId === 1) { // Se o usuário for um administrador
            const response = await axios.get(`${API_BASE_URL}/products`);
            products = response.data;
        } else {
            const response = await axios.get(`${API_BASE_URL}/products/user/${userId}`);
            products = response.data;
        }

        const successMessage = req.flash('success');
        res.render('products/index', { pageTitle: 'Produtos', products, successMessage, username: req.user.username, userRole: roleId });

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar produtos');
    }
};

function generateRandomCode(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const createProduct = async (req, res) => {
    try {
        // Verificar se algum arquivo foi enviado
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('Nenhum arquivo foi enviado.');
        }

        // ID USUÁRIO
        const userId = req.session.passport.user;
        
        // DADOS DO PRODUTO
        const { code, name, price, categorias, quantity } = req.body;
        const ProductData = {};
        if (code) ProductData.sku = code;
        if (name) ProductData.name = name;
        if (price) ProductData.price = price;
        if (userId) ProductData.users_id = parseInt(userId); 
        if (quantity) ProductData.quantity = quantity; 
        if (categorias) ProductData.categories_product_id = parseInt(categorias); 
        // DADOS DO PRODUTO

        // Verificar se o usuário está autenticado
        if (!userId) {
            return res.status(401).send('Usuário não autenticado');
        }

        let result;
        let result_image;
        try {

            result = await axios.post(`${API_BASE_URL}/products`, ProductData);

            // Obter o host e a porta do servidor Express
            const serverHost = req.get('host');
            const serverPath = `${req.protocol}://${serverHost}`;

            // Processar os arquivos enviados e inserir na tabela de imagens
            await Promise.all(req.files.map(async file => {
                // Converter a imagem para WebP
                const webpBuffer = await sharp(file.buffer).toFormat('webp').toBuffer();

                // Salvar a imagem no servidor com a extensão WebP
                const filename = `${generateRandomCode(12)}.webp`;
                const filepath = path.join(__dirname, '..', 'uploads', filename);
                await fs_promisses.writeFile(filepath, webpBuffer);

                // Inserir o caminho da imagem convertida na tabela de imagens
                const imagePath = `${serverPath}/uploads/${filename}`;
                const imageData = {};
                if (filename) imageData.name = filename;
                if (imagePath) imageData.path = imagePath; 
                if (file.fieldname) imageData.type = file.fieldname; 
                if (result.data.product.id) imageData.products_id = result.data.product.id;

                result_image = await axios.post(`${API_BASE_URL}/images`, imageData);
                
            }));

        } catch (error) {
            console.error('Erro ao inserir produto:', error);
            res.status(500).send('Erro ao inserir produto.');
        } 

        req.flash('success', 'Produto cadastrado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao processar arquivos ou inserir produto:', error);
        res.status(500).send('Erro ao processar arquivos ou inserir produto.');
    }
};

const showNewProductForm = async (req, res) => {
    try {

        // Consulta SQL para obter todas as categorias
        const categoriesQuery = await axios.get(`${API_BASE_URL}/categories`);
        const categories = categoriesQuery.data;

         // Pega as categorias principais (sem pai)
        const parentCategories = categories.filter(cat => 
            cat.id_categories_products === 0 || cat.id_categories_products === null
        );

        // Construindo a estrutura de árvore de categorias
        const buildCategoryTree = (parentCategories, categories) => {
            return parentCategories.map(parent => {
                const children = categories.filter(child => child.id_categories_products === parent.id);
                return {
                    id: parent.id,
                    name: parent.name,
                    children: buildCategoryTree(children, categories)
                };
            });
        };

        // Construindo o JSON da árvore de categorias
        const categoryTree = buildCategoryTree(parentCategories, categories);
        // Renderiza a página com as categorias
        res.render('products/new', { 
            pageTitle: 'Inserir Produto', 
            categoryTree: categoryTree, 
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        res.status(500).send('Erro ao carregar categorias para criar um novo produto');
    }
};

const deleteProduct = async (req, res) => {
    const productId = req.params.id;
    try {
        // Obter todas as imagens associadas ao produto
        const imagesResponse = await axios.get(`${API_BASE_URL}/images/${productId}`);
        const images = imagesResponse.data;

        // Excluir cada imagem associada ao produto
        for (const image of images) {
    
            const response = await axios.delete(`${API_BASE_URL}/images/${image.id}`);

            // Remova os arquivos de imagem do sistema de arquivos, se necessário
            const filePath = path.join(__dirname, '..', 'uploads', image.name);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    //console.log(`${image.name} excluída com sucesso.`);
                } else {
                    console.error(`${image.name} não encontrado.`);
                }
            } catch (err) {
                console.error(`Erro ao excluir ${image.name}:`, err);
            }
        }

        // Excluir o produto
        const delete_product = await axios.delete(`${API_BASE_URL}/products/id/${productId}`);

        res.status(200).json({ message: 'Produto excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
};

const showEditProductForm = async (req, res) => {
    const productId = req.params.id;
    try {
        // Obtenha o produto com base no ID
        const productResponse = await axios.get(`${API_BASE_URL}/products/id/${productId}`);
        const product = productResponse.data; 

        // Consulta SQL para obter todas as categorias
        const categoriesQuery = await axios.get(`${API_BASE_URL}/categories`);
        const categories = categoriesQuery.data;
        const allCategories = categoriesQuery.data;
        
        // Pega as categorias principais (sem pai)
        const parentCategories = categories.filter(cat => 
            cat.id_categories_products === 0 || cat.id_categories_products === null
        );

        const buildCategoryTree = (parentCategories, categories) => {
            return parentCategories.map(parent => {
                const children = categories.filter(child => child.id_categories_products === parent.id);
                return {
                    id: parent.id,
                    name: parent.name,
                    children: buildCategoryTree(children, categories)
                };
            });
        };

        const categoryTree = buildCategoryTree(parentCategories, allCategories);

        // Consulta para obter a imagem destacada (featured_image) do produto      
        const featuredImageQuery = await axios.get(`${API_BASE_URL}/images/${productId}/type?type=featured_image`);
        const featuredImage = featuredImageQuery.data;
    
        // Consulta para obter as imagens da galeria (gallery_images) do produto
        const galleryImagesQuery = await axios.get(`${API_BASE_URL}/images/${productId}/type?type=gallery_images[]`);
        const galleryImages = galleryImagesQuery.data;

        const galleryImagePaths = galleryImages.map(image => image.path);
        const galleryImageConfig = galleryImages.map(image => {
            return {
                caption: image.name,
                url: image.path,
                key: image.id,
                tipo: image.type,
                products_id: image.products_id,
            };
        });

        res.render('products/edit', { 
            pageTitle: 'Editar Produto', 
            product, 
            featuredImage,
            galleryImagePaths: JSON.stringify(galleryImagePaths), 
            galleryImageConfig: JSON.stringify(galleryImageConfig), 
            categories, 
            categoryTree, 
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar produto para edição');
    }
};

const updateProduct = async (req, res) => {
    const productId = req.params.id;
    const { name, price, categorias, quantity } = req.body;

    // Objeto com os dados que precisam ser atualizados
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (price) dataToUpdate.price = price;
    if (quantity) dataToUpdate.quantity = quantity;
    if (categorias) dataToUpdate.categories_product_id = parseInt(categorias);

    let result;
    let result_image;
    try {
        // Fazendo a requisição PATCH para a API
        result = await axios.patch(`${API_BASE_URL}/products/id/${productId}`, dataToUpdate, {
            headers: {
                'Content-Type': 'application/json', // Garantindo que o Content-Type seja JSON
            },
        });

        // Obter o host e a porta do servidor Express
        const serverHost = req.get('host');
        const serverPath = `${req.protocol}://${serverHost}`;

        // Processar os arquivos enviados e inserir na tabela de imagens
        await Promise.all(req.files.map(async file => {
            // Converter a imagem para WebP
            const webpBuffer = await sharp(file.buffer).toFormat('webp').toBuffer();

            // Salvar a imagem no servidor com a extensão WebP
            const filename = `${generateRandomCode(12)}.webp`;
            const filepath = path.join(__dirname, '..', 'uploads', filename);
            await fs.promises.writeFile(filepath, webpBuffer);

                            // Inserir o caminho da imagem convertida na tabela de imagens
                const imagePath = `${serverPath}/uploads/${filename}`;

                const imageData = {};
                if (filename) imageData.name = filename;
                if (imagePath) imageData.path = imagePath; 
                if (file.fieldname) imageData.type = file.fieldname; 
                if (result.data.product.id) imageData.products_id = result.data.product.id;

                result_image = await axios.post(`${API_BASE_URL}/images`, imageData);

        }));

        req.flash('success', 'Produto atualizado com sucesso!');
        res.redirect('/products');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).send('Erro ao atualizar produto');
    }
};

const getProductBySKU = async (req, res) => {
    const sku = req.params.sku; // Obter o SKU da URL
    const user = req.user; // Obter o usuário autenticado, se estiver disponível

    try {
        // Consulta para obter as informações do produto pelo SKU
        const productResponse = await axios.get(`${API_BASE_URL}/products/${sku}`);
        const product = productResponse.data;

        // Verificar se o produto foi encontrado
        if (product.length === 0) {
            return res.status(404).send('Produto não encontrado');
        }

        // Consulta para obter todas as imagens relacionadas ao produto
        const imagesResponse = await axios.get(`${API_BASE_URL}/images/${product.id}`);
        const images = imagesResponse.data;

        // PEGAR O VENDOR PELA API (USERS_ID)
        const vendorResponse = await axios.get(`${API_BASE_URL}/vendors/user/${product.users_id}`);
        const vendor = vendorResponse.data;

        res.render('site/product/index', { 
            pageTitle: 'Produto', 
            product,
            images,
            vendor,
            user
        });
    } catch (error) {
        console.error('Erro ao buscar produto por SKU:', error);
        res.status(500).send('Erro ao buscar produto por SKU');
    }
};

const deleteImage = async (req, res) => {
    const filename = req.params.filename;
    try {
        // Buscar a imagem no banco de dados

        const imagesResponse = await axios.get(`${API_BASE_URL}/images/name/${filename}`);
        const image = imagesResponse.data;
        // Verificar se a imagem existe
        if (!image) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        // Excluir a imagem do banco de dados
        const response = await axios.delete(`${API_BASE_URL}/images/${image.id}`);

        // Remover o arquivo de imagem do sistema de arquivos
        const imagePath = path.join(__dirname, '..', 'uploads', image.name);
        try {
            fs.unlinkSync(imagePath);
            console.log(`Imagem ${filename} excluída com sucesso`);
        } catch (error) {
            console.error('Erro ao excluir imagem:', error);
            return res.status(500).json({ error: 'Erro ao excluir imagem' });
        }

        // Enviar uma resposta de sucesso ao cliente
        res.status(200).json({ message: 'Imagem excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        res.status(500).json({ error: 'Erro ao excluir imagem' });
    }
};

// Exportando as funções do controller para serem usadas em outros lugares
module.exports = {
    getAllProducts,
    createProduct,
    showNewProductForm,
    deleteProduct,
    showEditProductForm,
    updateProduct,
    getProductBySKU,
    deleteImage
};
