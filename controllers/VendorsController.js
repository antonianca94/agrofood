const { executeQuery } = require('../db');

// Função para obter todas as categorias
const getAllVendors = async (req, res) => {
    try {
        const vendors = await executeQuery('SELECT * FROM vendors');
        const successMessage = req.flash('success'); 
        res.render('vendors/index', { pageTitle: 'Produtores', vendors, successMessage, username: req.user.username, userRole: req.user.roles_id });
    } catch (error) {
        res.status(500).send('Erro ao buscar Produtores');
    }
};

const deleteVendor = async (req, res) => {
    const vendorId = req.params.id;
    try {
        await executeQuery('DELETE FROM vendors WHERE id = ?', [vendorId]);
        res.status(200).json({ message: 'Produtor excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir o Produtor:', error);
        res.status(500).json({ error: 'Erro ao excluir o Produtor' });
    }
};

const showEditVendorForm = async (req, res) => {
    const Id = req.params.id;
    try {
        const [vendor] = await executeQuery('SELECT * FROM vendors WHERE id = ?', [Id]);
        const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [vendor.users_id]);
        res.render('vendors/edit', { pageTitle: 'Editar Produtor', vendor, user, errors: '', username: req.user.username, userRole: req.user.roles_id  });
    } catch (error) {
        res.status(500).send('Erro ao buscar produtor para edição');
    }
};

const updateVendor = async (req, res) => {
    const { name, username, surname, cpf, password, company_name, description, street, neighborhood, city, state, country, phone, email, cep, cnpj } = req.body;
    try {
        let users_id = parseInt(req.body.users_id);
        await executeQuery('UPDATE users SET username = ?, password = ?, name = ?, surname = ?, cpf = ? WHERE id = ?', [username, password, name, surname, cpf, users_id]);   
        await executeQuery('UPDATE vendors SET name = ?, description = ?, address = ?, neighborhood = ?, city = ?, state = ?, country = ?, phone = ?, email = ?, cep = ?, users_id = ?, cnpj = ? WHERE id = ?', [company_name, '', street, neighborhood, city, state, country, phone, email, cep, users_id, cnpj, req.params.id]);
        req.flash('success', 'Produtor atualizado com sucesso!');
        res.redirect('/vendors');
    } catch (error) {
        console.log(error)
        res.status(500).send('Erro ao atualizar o Produtor');
    }
};

const showNewVendorForm = async (req, res) => {
    res.render('vendors/new', { pageTitle: 'Inserir Produtor' , username: req.user.username, userRole: req.user.roles_id });
};

module.exports = {
    getAllVendors,
    deleteVendor,
    showEditVendorForm,
    updateVendor,
    showNewVendorForm
};
