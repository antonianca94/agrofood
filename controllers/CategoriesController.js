const API_BASE_URL = process.env.API_URL; // URL da sua API Go
const axios = require('axios');


// Função para obter todas as categorias
const getAllCategories = async (req, res) => {
    try {
        let categories;
        const response = await axios.get(`${API_BASE_URL}/categories`);
        categories = response.data;
        const successMessage = req.flash('success'); 
        res.render('categories/index', { pageTitle: 'Categorias', categories, successMessage, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar categorias');
    }
};

// Função para exibir o formulário de inserção de nova categoria
const showNewCategoryForm = async (req, res) => {
    let categories;
    const response = await axios.get(`${API_BASE_URL}/categories`);
    categories = response.data;
    res.render('categories/new', { pageTitle: 'Inserir Categoria' , categories, username: req.user.username, userRole: req.user.roles_id });
};

// Função para criar uma nova categoria
const createCategory = async (req, res) => {
    const { name, description, parent_id } = req.body;
    const userId = req.session.passport.user; 
    id_categories_products = parseInt(parent_id);
    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }
    try {
        const response = await axios.post(`${API_BASE_URL}/categories`, {
            name,
            description,
            id_categories_products
        });
        req.flash('success', 'Categoria cadastrada com sucesso!');
        res.redirect('/categories');
              
    } catch (error) {
        console.error('Erro ao cadastrar a Categoria:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao cadastrar a Categoria');
    }
};

// Função para excluir uma categoria
const deleteCategory = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const response = await axios.delete(`${API_BASE_URL}/categories/${categoryId}`);
        // Verifica se a API retornou uma resposta de sucesso
        if (response.status === 200) {
            res.status(200).json({ message: 'Categoria excluída com sucesso!' });
        } else {
            res.status(response.status).json({ message: response.data.message });
        }

    } catch (error) {
        console.error('Erro ao excluir a Categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir a Categoria' });
    }
};

// Função para exibir o formulário de edição de uma categoria
const showEditCategoryForm = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
        const categories = categoriesResponse.data;
        const categoryResponse = await axios.get(`${API_BASE_URL}/categories/${categoryId}`);
        const category = categoryResponse.data; 
        res.render('categories/edit', { pageTitle: 'Editar Categoria', category, categories, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar categoria para edição');
    }
};

// Função para atualizar uma categoria
const updateCategory = async (req, res) => {
    const categoryId = req.params.id;
    const { name, description, id_categories_products} = req.body;
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (description) dataToUpdate.description = description;
    if (id_categories_products) dataToUpdate.id_categories_products = parseInt(id_categories_products);
    try {
        const response = await axios.patch(`${API_BASE_URL}/categories/${categoryId}`, dataToUpdate, {
            headers: {
                'Content-Type': 'application/json', // Garantindo que o Content-Type seja JSON
            },
        });

        if (response.status === 200) {
            req.flash('success', 'Categoria atualizada com sucesso!');
            res.redirect('/categories');
        } else {
            res.status(response.status).send(response.data.message || 'Erro ao atualizar a categoria');
        }
    } catch (error) {
                console.error(error);

        res.status(500).send('Erro ao atualizar a categoria');
    }
};

// Exportando as funções do controller para serem usadas em outros lugares
module.exports = {
    getAllCategories,
    showNewCategoryForm,
    createCategory,
    deleteCategory,
    showEditCategoryForm,
    updateCategory
};
