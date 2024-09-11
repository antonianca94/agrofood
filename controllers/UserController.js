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

const showEditUserForm = async (req, res) => {
    const userId = req.params.id;
    try {
        // Consumir a API para obter os detalhes do usuário
        const userResponse = await axios.get(`http://localhost:3001/users/details/${userId}`);
        const user = userResponse.data; // Dados do usuário

        // Consultar as roles disponíveis
        let rolesResponse = await axios.get(`http://localhost:3001/roles`);
        let roles = rolesResponse.data;

        // Retornar os dados renderizados
        res.render('users/edit', {
            pageTitle: 'Editar Usuário',
            user,
            roles,
            username: req.user.username,
            userRole: req.user.roles_id
        });
    } catch (error) {
        res.status(500).send('Erro ao buscar usuário para edição');
    }
};

// Função para atualizar um usuário
const updateUser = async (req, res) => {
    const userId = req.params.id;
    const { username, password, name, role } = req.body;

    // Objeto com os dados que precisam ser atualizados
    const dataToUpdate = {};
    if (username) dataToUpdate.username = username;
    if (password) dataToUpdate.password = password;
    if (name) dataToUpdate.name = name;
    if (role) dataToUpdate.roles_id = role; // Supondo que "role" seja o ID da role

    try {
        // Fazendo a requisição PATCH para a API
        const response = await axios.patch(`http://localhost:3001/users/${userId}`, dataToUpdate, {
            headers: {
                'Content-Type': 'application/json', // Garantindo que o Content-Type seja JSON
            },
        });

        if (response.status === 200) {
            req.flash('success', 'Usuário atualizado com sucesso!');
            res.redirect('/users');
        } else {
            res.status(response.status).send(response.data.message || 'Erro ao atualizar o usuário');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao atualizar o usuário: ' + error.message);
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
