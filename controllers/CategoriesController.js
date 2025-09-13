const { executeQuery } = require('../db');
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

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO categories_products (name, description, id_categories_products) VALUES (?, ?, ?)', [name, description, parent_id]);
        req.flash('success', 'Categoria cadastrada com sucesso!');
        res.redirect('/categories');
    } catch (error) {
        console.error('Erro ao cadastrar a categoria:', error);
        res.status(500).send('Erro ao cadastrar a categoria');
    }
};

// Função para excluir uma categoria
const deleteCategory = async (req, res) => {
    const categoryId = req.params.id;
    try {
        await executeQuery('DELETE FROM categories_products WHERE id = ?', [categoryId]);
        res.status(200).json({ message: 'Categoria excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir a categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir a categoria' });
    }
};

// Função para exibir o formulário de edição de uma categoria
const showEditCategoryForm = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const categories = await executeQuery('SELECT * FROM categories_products');
        const [category] = await executeQuery('SELECT * FROM categories_products WHERE id = ?', [categoryId]);
        res.render('categories/edit', { pageTitle: 'Editar Categoria', category, categories, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar categoria para edição');
    }
};

// Função para atualizar uma categoria
const updateCategory = async (req, res) => {
    const categoryId = req.params.id;
    const { name, description, id_categories_products} = req.body;

    try {
        await executeQuery('UPDATE categories_products SET name = ?, description = ?, id_categories_products = ? WHERE id = ?', [name, description,id_categories_products,categoryId]);
        req.flash('success', 'Categoria atualizada com sucesso!');
        res.redirect('/categories');
    } catch (error) {
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
