const { executeQuery } = require('../db');
const axios = require('axios');

// Função para obter todos os usuários
const getAllUsers = async (req, res) => {
    try {
        let users;
        const response = await axios.get(`http://localhost:3001/users`);
        
        users = response.data;

        const successMessage = req.flash('success'); 
        res.render('users/index', { pageTitle: 'Usuários', users, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar usuários' +error);
    }
};

// Função para exibir o formulário de criação de novo usuário
const showNewUserForm = async (req, res) => {
    let response = await axios.get(`http://localhost:3001/roles`);
    let roles = response.data;
    res.render('users/new', { pageTitle: 'Inserir Usuário' , roles, username: req.user.username, userRole: req.user.roles_id });
};

// Função para criar um novo usuário
const createUser = async (req, res) => {
    const { name, surname, cpf, username, role, password } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }

    try {
        await executeQuery('INSERT INTO users (name, surname, cpf, username, roles_id, password) VALUES (?, ?, ?, ?, ?, ?)', [name, surname, cpf, username, role, password]);
        req.flash('success', 'Usuário cadastrado com sucesso!');
        res.redirect('/users');
    } catch (error) {
        console.error('Erro ao cadastrar o Usuário:', error);
        res.status(500).send('Erro ao cadastrar o Usuário');
    }
};

const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        // Faz a requisição DELETE para a API que lida com a exclusão do usuário
        const response = await axios.delete(`http://localhost:3001/users/${userId}`);

        // Verifica se a API retornou uma resposta de sucesso
        if (response.status === 200) {
            res.status(200).json({ message: 'Usuário excluído com sucesso!' });
        } else {
            res.status(response.status).json({ message: response.data.message });
        }
    } catch (error) {
        console.error('Erro ao excluir o Usuário:', error.message || error);
        res.status(500).json({ error: 'Erro ao excluir o Usuário' });
    }
};

// Função para exibir o formulário de edição de usuário
const showEditUserForm = async (req, res) => {
    const userId = req.params.id;
    try {
        const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
        const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [user.roles_id]);
        const roles = await executeQuery('SELECT * FROM roles');
        res.render('users/edit', { pageTitle: 'Editar Usuário', user, role, roles, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar usuário para edição');
    }
};

// Função para atualizar um usuário
const updateUser = async (req, res) => {
    const userId = req.params.id;

    const { username, password, name, role } = req.body;
    try {
        await executeQuery('UPDATE users SET username = ?, password = ?, name = ? , roles_id = ? WHERE id = ?', [username, password, name, role, userId]);
        req.flash('success', 'Usuário atualizado com sucesso!');
        res.redirect('/users');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a Usuário');
    }
};

module.exports = {
    getAllUsers,
    showNewUserForm,
    createUser,
    deleteUser,
    showEditUserForm,
    updateUser
};
