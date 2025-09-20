
const API_BASE_URL = process.env.API_URL; // URL da sua API Go
const axios = require('axios');

// Função para obter todas as funções
const getAllRoles = async (req, res) => {
    try {
        let roles;
        const response = await axios.get(`${API_BASE_URL}/roles`);
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
        const response = await axios.post(`${API_BASE_URL}/roles`, {
            name,
            description
        });

        req.flash('success', 'Role cadastrada com sucesso!');
        res.redirect('/roles');
    } catch (error) {
        console.error('Erro ao cadastrar a Role:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao cadastrar a role');
    }
};

const deleteRole = async (req, res) => {
    const roleId = req.params.id;
    try {
        const response = await axios.delete(`${API_BASE_URL}/roles/${roleId}`);
        // Verifica se a API retornou uma resposta de sucesso
        if (response.status === 200) {
            res.status(200).json({ message: 'Role excluída com sucesso!' });
        } else {
            res.status(response.status).json({ message: response.data.message });
        }

    } catch (error) {
        console.error('Erro ao excluir a role:', error);
        res.status(500).json({ error: 'Erro ao excluir a role' });
    }
};

const showEditRoleForm = async (req, res) => {
    const roleId = req.params.id;
    try {
        const roleResponse = await axios.get(`${API_BASE_URL}/roles/${roleId}`);
        const role = roleResponse.data; 
        //console.log(role);
        res.render('roles/edit', { pageTitle: 'Editar Role', role, errors: '', username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar role para edição');
        console.error('Erro ao buscar role para edição:', error);
    }
};

const updateRole = async (req, res) => {
    const roleId = req.params.id;
    const { name, description } = req.body;
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (description) dataToUpdate.description = description;
    try {
        const response = await axios.patch(`${API_BASE_URL}/roles/${roleId}`, dataToUpdate, {
            headers: {
                'Content-Type': 'application/json', // Garantindo que o Content-Type seja JSON
            },
        });

        if (response.status === 200) {
            req.flash('success', 'Role atualizada com sucesso!');
            res.redirect('/roles');
        } else {
            res.status(response.status).send(response.data.message || 'Erro ao atualizar a role');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao atualizar a role: ' + error.message);
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