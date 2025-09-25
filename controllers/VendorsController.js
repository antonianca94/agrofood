const API_BASE_URL = process.env.API_URL; 
const axios = require('axios');

const getAllVendors = async (req, res) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/vendors`);
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
        const response = await axios.delete(`${API_BASE_URL}/vendors/${vendorId}`);
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
        const vendorResponse = await axios.get(`${API_BASE_URL}/vendors/${Id}`);
        const vendor = vendorResponse.data;

        const userResponse = await axios.get(`${API_BASE_URL}/users/details/${vendor.users_id}`);
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

        const responseUser = await axios.patch(`${API_BASE_URL}/users/${users_id}`, userData, {
            headers: {
                'Content-Type': 'application/json', 
            },
        });

        if (responseUser.status === 200) {
            const responseVendor = await axios.patch(`${API_BASE_URL}/vendors/${vendorID}`, vendorData, {
                headers: {
                    'Content-Type': 'application/json', 
                },
            });
            if (responseVendor.status === 200) {
                req.flash('success', 'Produtor atualizado com sucesso!');
                res.redirect('/vendors');
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

const createVendor = async (req, res) => {
    try {
        const { name, username, surname, cpf, password, company_name, description, street, neighborhood, city, state, country, phone, email, cep, cnpj } = req.body;
        const role = 2; // Role para vendor

        // Primeiro, criar o usuário
        const userData = {
            username: username,
            name: name,
            surname: surname,
            cpf: cpf,
            password: password,
            status: 0,
            roles_id: parseInt(role)
        };

        const userResponse = await axios.post(`${API_BASE_URL}/users`, userData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // console.log(userResponse);
        if (userResponse.status === 200) {
            const userId = userResponse.data.user_id; // Assumindo que a API retorna o ID do usuário criado
            // console.log(userId);
            // Depois, criar o vendor com o ID do usuário
            const vendorData = {
                name: company_name,
                description: description,
                address: street,
                neighborhood: neighborhood,
                city: city,
                state: state,
                country: country,
                phone: phone,
                email: email,
                cep: cep,
                cnpj: cnpj,
                users_id: userId
            };
            //console.log(vendorData);
            const vendorResponse = await axios.post(`${API_BASE_URL}/vendors`, vendorData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (vendorResponse.status === 200) {
                req.flash('success', 'Produtor criado com sucesso!');
                res.redirect('/vendors');
            } else {
                // Se falhou ao criar vendor, pode ser necessário deletar o usuário criado
                res.status(500).send('Erro ao criar o Produtor');
            }
        } else {
            res.status(500).send('Erro ao criar usuário para o Produtor');
        }

    } catch (error) {
        console.error('Erro ao criar o Produtor:', error);
        
        // Verificar se o erro é de validação ou duplicação
        if (error.response && error.response.data) {
            const errorMessage = error.response.data.message || 'Erro ao criar o Produtor';
            res.render('vendors/new', { 
                pageTitle: 'Inserir Produtor', 
                errors: errorMessage,
                username: req.user.username, 
                userRole: req.user.roles_id,
                formData: req.body // Para manter os dados preenchidos
            });
        } else {
            res.status(500).send('Erro interno do servidor ao criar o Produtor');
        }
    }
};

module.exports = {
    getAllVendors,
    deleteVendor,
    showEditVendorForm,
    updateVendor,
    showNewVendorForm,
    createVendor
};
