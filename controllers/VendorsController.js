const { executeQuery } = require('../db');
const axios = require('axios');

const getAllVendors = async (req, res) => {
    try {
        const response = await axios.get(`http://127.0.0.1:3002/vendors`);
        vendors = response.data;
        const successMessage = req.flash('success'); 
        res.render('vendors/index', { 
            pageTitle: 'Produtores', 
            vendors, successMessage, 
            username: req.user.username, 
            userRole: req.user.roles_id 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar Produtores');
    }
};

const deleteVendor = async (req, res) => {
    const vendorId = req.params.id;
    try {
        const response = await axios.delete(`http://127.0.0.1:3002/vendors/${vendorId}`);
        if (response.status === 200) {
            res.status(200).json({ message: 'Produtor excluído com sucesso!' });
        } else {
            res.status(response.status).json({ message: response.data.message });
        }
      
    } catch (error) {
        console.error('Erro ao excluir o Produtor:', error);
        res.status(500).json({ error: 'Erro ao excluir o Produtor' });
    }
};

const showEditVendorForm = async (req, res) => {
    const Id = req.params.id;
    try {
        const vendorResponse = await axios.get(`http://127.0.0.1:3002/vendors/${Id}`);
        const vendor = vendorResponse.data;

        const userResponse = await axios.get(`http://127.0.0.1:3002/users/details/${vendor.users_id}`);
        const user = userResponse.data;
   
        res.render('vendors/edit', { pageTitle: 'Editar Produtor', vendor, user, errors: '', username: req.user.username, userRole: req.user.roles_id  });
    } catch (error) {
        res.status(500).send('Erro ao buscar produtor para edição');
    }
};

const updateVendor = async (req, res) => {
    const vendorID = req.params.id;
    try {

        const { users_id, name, username, surname, cpf, password, company_name, description, street, neighborhood, city, state, country, phone, email, cep, cnpj } = req.body;
        const role = 2;
      
        const userData = {};
        if (username) userData.username = username;
        if (password) userData.password = password;
        if (name) userData.name = name;
        if (role) userData.roles_id = parseInt(role);
    
        const vendorData = {};
        if (company_name) vendorData.name = company_name;
        if (description) vendorData.description = description;
        if (street) vendorData.address = street;
        if (neighborhood) vendorData.neighborhood = neighborhood;
        if (city) vendorData.city = city;
        if (state) vendorData.state = state;
        if (country) vendorData.country = country;
        if (phone) vendorData.phone = phone;
        if (email) vendorData.email = email;
        if (cep) vendorData.cep = cep;
        if (cnpj) vendorData.cnpj = cnpj;
        if (users_id) vendorData.users_id = parseInt(users_id);
        if (cnpj) vendorData.cnpj = cnpj;   

        const responseUser = await axios.patch(`http://127.0.0.1:3002/users/${users_id}`, userData, {
            headers: {
                'Content-Type': 'application/json', 
            },
        });

        if (responseUser.status === 200) {
            const responseVendor = await axios.patch(`http://127.0.0.1:3002/vendors/${vendorID}`, vendorData, {
                headers: {
                    'Content-Type': 'application/json', 
                },
            });
            if (responseVendor.status === 200) {
                req.flash('success', 'Produtor atualizado com sucesso!');
                res.redirect('/vendors');
                console.log('Produtor atualizado com sucesso!');
            }
        }

    } catch (error) {
        //console.log(error)
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
