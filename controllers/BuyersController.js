const API_BASE_URL = process.env.API_URL; 
const axios = require('axios');

const BUYER_ROLE_ID = 3; // Defina o ID da role apropriada para compradores

const registerBuyer = async (req, res) => {
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
            return res.render('cadastro-comprador', {
                errorMessage: 'As senhas não coincidem',
                successMessage: '',
                pageTitle: 'Cadastro do Comprador',
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
            return res.render('cadastro-comprador', {
                errorMessage: 'Preencha todos os campos obrigatórios',
                successMessage: '',
                pageTitle: 'Cadastro do Comprador',
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
            roles_id: BUYER_ROLE_ID
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

        const buyerData = {
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
            const buyerResponse = await axios.post(`${API_BASE_URL}/buyers`, buyerData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (buyerResponse.status === 200) {
                return res.render('cadastro-comprador', {
                    errorMessage: '',
                    successMessage: 'Cadastro efetuado com sucesso!',
                    pageTitle: 'Cadastro do Comprador',
                    formData: req.body
                });
            }
        } catch (buyerError) {
            console.error('Erro ao criar buyer:', buyerError.response?.data || buyerError.message);
            
            // Tenta deletar o usuário criado
            try {
                await axios.delete(`${API_BASE_URL}/users/${userId}`);
                console.log('Usuário deletado após falha na criação do buyer');
            } catch (deleteError) {
                console.error('Erro ao deletar usuário:', deleteError);
            }

            const errorMsg = buyerError.response?.data?.error || 
                           buyerError.response?.data?.message ||
                           'Erro ao criar a conta do comprador. Tente novamente.';

            return res.render('cadastro-comprador', {
                errorMessage: errorMsg,
                successMessage: '',
                pageTitle: 'Cadastro do Comprador',
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
        return res.render('cadastro-comprador', {
            errorMessage: errorMsg,
            successMessage: '',
            pageTitle: 'Cadastro do Comprador',
            formData: req.body
        });
    }
};

const showRegisterBuyer = async (req, res) => {
    res.render('cadastro-comprador', { 
        errorMessage: req.flash('error'),
        successMessage: req.flash('success'),
        pageTitle: 'Cadastro do Comprador',
        formData: {}
    });
};

module.exports = {
    registerBuyer,
    showRegisterBuyer
};
