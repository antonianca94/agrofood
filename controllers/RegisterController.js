const { executeQuery } = require('../db');


const registerUser = async (req, res) => {
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
        cep,
        street,
        neighborhood,
        city,
        state,
        country
    } = req.body;

    try {
        // Verifica se o usuário já existe no banco de dados
        const existingUser = await executeQuery('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            req.flash('error', ' Nome de usuário já existe ');
            // return res.redirect('/register');
        }

        // Insere o usuário na tabela users
        const result = await executeQuery('INSERT INTO users (username, password, name, surname, roles_id, cpf) VALUES (?, ?, ?, ?, 2, ?)', [username, password, name, surname, cpf]);

        // Obtém o ID do usuário inserido
        const userId = result.insertId;

        // Insere o produtor na tabela vendors
        await executeQuery('INSERT INTO vendors (name, description, address, city, state, country, phone, email, users_id, cep, cnpj, neighborhood) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [company_name, '', street, city, state, country, phone, email, userId, cep, cnpj, neighborhood]);
        
        res.render('register', { message: 'Dados enviados com sucesso!' });

    } catch (error) {
        console.error('Erro ao inserir o produtor ou usuário: ', error);
        req.flash('error', ' Erro ao cadastrar usuário ');
        res.redirect('/register');
    }
};


const showRegisterUser = async (req, res) => {
    res.render('register', { message: req.flash('error'), pageTitle: 'Cadastro do Produtor', } );
};

// Exportando as funções do controller para serem usadas em outros lugares
module.exports = {
    registerUser,
    showRegisterUser
};
