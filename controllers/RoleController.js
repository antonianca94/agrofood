
const { executeQuery } = require('../db');
const axios = require('axios');

// Função para obter todas as funções
const getAllRoles = async (req, res) => {
    try {
        let roles;
        const response = await axios.get(`http://127.0.0.1:3002/roles`);
        roles = response.data;
        const successMessage = req.flash('success'); 
        res.render('roles/index', { pageTitle: 'Roles', roles, successMessage, username: req.user.username, userRole: req.user.roles_id });

    } catch (error) {
        res.status(500).send('Erro ao buscar roles');
    }
};

const showNewRoleForm = (req, res) => {
    res.render('roles/new', { pageTitle: 'Inserir Role' , username: req.user.username, userRole: req.user.roles_id });
};

const createRole = async (req, res) => {
    const { name, description } = req.body;
    const userId = req.session.passport.user; 

    if (!userId) {
        return res.status(401).send('Usuário não autenticado');
    }
    try {
        await executeQuery('INSERT INTO roles (name, description) VALUES (?, ?)', [name, description]);
        req.flash('success', 'Role cadastrada com sucesso!');
        res.redirect('/roles');
    } catch (error) {
        console.error('Erro ao cadastrar a role:', error);
        res.status(500).send('Erro ao cadastrar a role');
    }
};

const deleteRole = async (req, res) => {
    const roleId = req.params.id;
    try {
        await executeQuery('DELETE FROM roles WHERE id = ?', [roleId]);
        res.status(200).json({ message: 'Role excluída com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir a role:', error);
        res.status(500).json({ error: 'Erro ao excluir a role' });
    }
};

const showEditRoleForm = async (req, res) => {
    const roleId = req.params.id;
    try {
        const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
        res.render('roles/edit', { pageTitle: 'Editar Role', role, errors: '', username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar role para edição');
    }
};

const updateRole = async (req, res) => {
    const roleId = req.params.id;
    const [role] = await executeQuery('SELECT * FROM roles WHERE id = ?', [roleId]);
    const { name, description } = req.body;

    try {
        await executeQuery('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, description, roleId]);
        req.flash('success', 'Role atualizada com sucesso!');
        res.redirect('/roles');
    } catch (error) {
        res.status(500).send('Erro ao atualizar a role');
    }
};

// Exportando a função getAllRoles para ser usada em outros lugares
module.exports = {
    getAllRoles,
    showNewRoleForm,
    createRole,
    deleteRole,
    showEditRoleForm,
    updateRole
};