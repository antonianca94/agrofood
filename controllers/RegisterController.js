const API_BASE_URL = process.env.API_URL; 
const axios = require('axios');

const VENDOR_ROLE_ID = 2;

const registerVendor = async (req, res) => {
    const {
        name,
        surname,
        cpf,
        phone,
        username,
        email,
        password,
        password2,
        cnpj,
        company_name,
        description,
        cep,
        street,
        neighborhood,
        city,
        state,
        country
    } = req.body;

    try {
        // Validações básicas
        if (!password || !password2 || password !== password2) {
            return res.render('cadastro-produtor', {
                errorMessage: 'As senhas não coincidem',
                successMessage: '',
                pageTitle: 'Cadastro do Produtor',
                formData: req.body
            });
        }

        // Validação de campos obrigatórios
        const requiredFields = {
            username, name, surname, cpf, email, phone,
            cnpj, company_name, cep, street, city, state, country
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.render('cadastro-produtor', {
                errorMessage: 'Preencha todos os campos obrigatórios',
                successMessage: '',
                pageTitle: 'Cadastro do Produtor',
                formData: req.body
            });
        }

        const userData = {
            username,
            name,
            surname,
            cpf,
            password,
            status: 0,
            roles_id: VENDOR_ROLE_ID
        };

        const userResponse = await axios.post(`${API_BASE_URL}/users`, userData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (userResponse.status !== 200) {
            throw new Error('Falha ao criar usuário');
        }

        const userId = userResponse.data.user_id;

        const vendorData = {
            name: company_name,
            description,
            address: street,
            neighborhood,
            city,
            state,
            country,
            phone,
            email,
            cep,
            cnpj,
            users_id: userId
        };

        try {
            const vendorResponse = await axios.post(`${API_BASE_URL}/vendors`, vendorData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (vendorResponse.status === 200) {
                return res.render('cadastro-produtor', {
                    errorMessage: '',
                    successMessage: 'Cadastro efetuado com sucesso!',
                    pageTitle: 'Cadastro do Produtor',
                    formData: req.body
                });
            }
        } catch (vendorError) {
            console.error('Erro ao criar vendor:', vendorError.response?.data || vendorError.message);
            
            // Tenta deletar o usuário criado
            try {
                await axios.delete(`${API_BASE_URL}/users/${userId}`);
                console.log('Usuário deletado após falha na criação do vendor');
            } catch (deleteError) {
                console.error('Erro ao deletar usuário:', deleteError);
            }

            const errorMsg = vendorError.response?.data?.error || 
                           vendorError.response?.data?.message ||
                           'Erro ao criar a conta do produtor. Tente novamente.';

            return res.render('cadastro-produtor', {
                errorMessage: errorMsg,
                successMessage: '',
                pageTitle: 'Cadastro do Produtor',
                formData: req.body
            });
        }

    } catch (error) {
        console.error('Erro ao cadastrar:', error.response?.data || error.message);
        
        // Captura o erro específico da API
        const errorMsg = error.response?.data?.error || 
                        error.response?.data?.message ||
                        'Erro ao cadastrar usuário. Tente novamente.';
        
        // Renderiza novamente mantendo os dados
        return res.render('cadastro-produtor', {
            errorMessage: errorMsg,
            successMessage: '',
            pageTitle: 'Cadastro do Produtor',
            formData: req.body
        });
    }
};

const showRegisterVendor = async (req, res) => {
    res.render('cadastro-produtor', { 
        errorMessage: req.flash('error'),
        successMessage: req.flash('success'),
        pageTitle: 'Cadastro do Produtor',
        formData: {}
    });
};

module.exports = {
    registerVendor,
    showRegisterVendor
};