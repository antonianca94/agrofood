const API_BASE_URL = process.env.API_URL; // URL da sua API Go

// Adicionar um item ao carrinho
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).send('Usuário não autenticado');
        }

        // 1. Verificar se o usuário já tem um carrinho
        let cartResponse;
        try {
            cartResponse = await fetch(`${API_BASE_URL}/cart/user/${userId}`);
        } catch (error) {
            console.error('Erro ao buscar carrinho do usuário:', error);
        }

        let cart;
        if (cartResponse && cartResponse.status === 200) {
            cart = await cartResponse.json();
        } else {
            // Criar novo carrinho se não existir
            const newCartResponse = await fetch(`${API_BASE_URL}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    users_id: userId
                })
            });
            console.log(newCartResponse)
            if (!newCartResponse.ok) {
                return res.status(500).send('Erro ao criar carrinho');
            }
            
            cart = await newCartResponse.json();
        }

        // 2. Adicionar item ao carrinho
        const addItemResponse = await fetch(`${API_BASE_URL}/cart/cart-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: parseInt(quantity),
                cart_id: cart.id,
                products_id: parseInt(productId)
            })
        });

        if (!addItemResponse.ok) {
            const errorData = await addItemResponse.json();
            return res.status(addItemResponse.status).send(errorData.error);
        }

        res.status(200).send('Item adicionado ao carrinho com sucesso!');

    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Obter carrinho com itens
const getCart = async (req, res) => {
    try {
        // Verificar se o usuário está autenticado
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login'); // ou renderizar página de login
        }

        const user = req.user;
        const userId = req.user.id;

        // Buscar carrinho do usuário
        const cartResponse = await fetch(`${API_BASE_URL}/cart/user/${userId}`);
        
        if (cartResponse.status === 404) {
            return res.render('site/cart/index', {
                pageTitle: 'Carrinho',
                cart: null,
                cartItems: [],
                cartTotalFormatted: 'R$ 0,00',
                user
            });
        }
                
        if (!cartResponse.ok) {
            console.error('Erro ao buscar carrinho:', cartResponse.status, cartResponse.statusText);
            return res.status(500).send('Erro ao buscar carrinho');
        }

        const cart = await cartResponse.json();

        // Buscar itens do carrinho
        const cartItemsResponse = await fetch(`${API_BASE_URL}/cart/${cart.id}/items`);

        if (!cartItemsResponse.ok) {
            console.error('Erro ao buscar itens do carrinho:', cartItemsResponse.status);
            return res.status(500).send('Erro ao buscar itens do carrinho');
        }

        const cartWithItems = await cartItemsResponse.json();
        
        // Buscar todos os produtos do usuário uma vez só (otimização)
        let products = [];
        try {
            const productResponse = await fetch(`${API_BASE_URL}/products`);
            if (productResponse.ok) {
                products = await productResponse.json();
            } else {
                console.error('Erro ao buscar produtos do usuário:', productResponse.status);
            }
        } catch (error) {
            console.error('Erro ao buscar produtos do usuário:', error);
        }

        // Buscar imagens para todos os produtos (em paralelo para otimização)
        const imagePromises = products.map(async (product) => {
            try {
                const imageResponse = await fetch(`${API_BASE_URL}/images/${product.id}`);
                if (imageResponse.ok) {
                    const images = await imageResponse.json();
                    // Encontrar a imagem destacada
                    const featuredImage = images.find(img => img.type === 'featured_image');
                    product.featuredImage = featuredImage ? featuredImage.path : null;
                    product.galleryImages = images.filter(img => img.type === 'gallery_images[]');
                } else {
                    product.featuredImage = null;
                    product.galleryImages = [];
                }
            } catch (error) {
                console.error(`Erro ao buscar imagens do produto ${product.id}:`, error);
                product.featuredImage = null;
                product.galleryImages = [];
            }
            return product;
        });

        // Aguardar todas as requisições de imagens
        try {
            await Promise.all(imagePromises);
        } catch (error) {
            console.error('Erro ao buscar imagens dos produtos:', error);
        }

        // Calcular total e formatar dados
        let cartTotal = 0;
        
        // Processar cada item do carrinho
        for (const item of cartWithItems.items) {
            try {
                // Encontrar o produto correspondente na lista de produtos do usuário
                const product = products.find(p => p.id === item.products_id);
                
                if (product) {
                    // Usar as propriedades diretas do produto
                    item.productName = product.name;
                    item.productPrice = parseFloat(product.price);
                    item.totalPrice = item.productPrice * item.quantity;
                    item.productImage = product.featuredImage; // Imagem destacada
                    item.productSku = product.sku;
                    item.categoryName = product.category_name;
                    
                    // Formatar valores
                    item.productPriceFormatted = item.productPrice.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    });
                    item.totalPriceFormatted = item.totalPrice.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    });
                    
                    cartTotal += item.totalPrice;
                } else {
                    console.warn(`Produto ID ${item.product_id} não encontrado para item: ${item.id}`);
                    // Definir valores padrão se produto não for encontrado
                    item.productName = 'Produto não encontrado';
                    item.productPrice = 0;
                    item.totalPrice = 0;
                    item.productImage = null;
                    item.productSku = '';
                    item.categoryName = '';
                    item.productPriceFormatted = 'R$ 0,00';
                    item.totalPriceFormatted = 'R$ 0,00';
                }
            } catch (itemError) {
                console.error(`Erro ao processar item ${item.id}:`, itemError);
                // Continuar com próximo item em caso de erro
                item.productName = 'Erro ao processar item';
                item.productPrice = 0;
                item.totalPrice = 0;
                item.productImage = null;
                item.productSku = '';
                item.categoryName = '';
                item.productPriceFormatted = 'R$ 0,00';
                item.totalPriceFormatted = 'R$ 0,00';
            }
        }

        const cartTotalFormatted = cartTotal.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });

        res.render('site/cart/index', {
            pageTitle: 'Carrinho',
            cart: cartWithItems,
            cartItems: cartWithItems.items,
            cartTotalFormatted: cartTotalFormatted,
            user
        });

    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).render('error', { 
            message: 'Erro interno do servidor',
            error: error.message 
        });
    }
};

// Remover item do carrinho
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;

        const response = await fetch(`${API_BASE_URL}/cart/cart-items/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            return res.status(response.status).send('Erro ao remover item do carrinho');
        }

        res.status(200).send('Item removido do carrinho com sucesso!');
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Atualizar quantidade (incrementar)
const incrementCartItem = async (req, res) => {
    try {
        const { itemId } = req.body;

        // Primeiro buscar o item atual
        const itemResponse = await fetch(`${API_BASE_URL}/cart/cart-items/${itemId}`);
        if (!itemResponse.ok) {
            return res.status(itemResponse.status).send('Item não encontrado');
        }

        const item = await itemResponse.json();
        
        // Atualizar quantidade
        const updateResponse = await fetch(`${API_BASE_URL}/cart/cart-items/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: item.quantity + 1
            })
        });

        if (!updateResponse.ok) {
            return res.status(updateResponse.status).send('Erro ao atualizar item');
        }

        // Buscar dados atualizados para calcular totais
        const updatedItem = await updateResponse.json();
        const productResponse = await fetch(`${API_BASE_URL}/products/${updatedItem.products_id}`);
        const product = await productResponse.json();
        
        const newTotalPrice = updatedItem.quantity * parseFloat(product.price);
        
        // Calcular total do carrinho
        const cartResponse = await fetch(`${API_BASE_URL}/cart/${updatedItem.cart_id}/items`);
        const cartWithItems = await cartResponse.json();
        
        let cartTotal = 0;
        for (const cartItem of cartWithItems.items) {
            const productRes = await fetch(`${API_BASE_URL}/products/${cartItem.products_id}`);
            const productData = await productRes.json();
            cartTotal += cartItem.quantity * parseFloat(productData.price);
        }

        res.send({
            newQuantity: updatedItem.quantity,
            newTotalPriceFormatted: newTotalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            cartTotalFormatted: cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
    } catch (error) {
        console.error('Erro ao incrementar item no carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Atualizar quantidade (decrementar)
const decrementCartItem = async (req, res) => {
    try {
        const { itemId } = req.body;

        // Primeiro buscar o item atual
        const itemResponse = await fetch(`${API_BASE_URL}/cart/cart-items/${itemId}`);
        if (!itemResponse.ok) {
            return res.status(itemResponse.status).send('Item não encontrado');
        }

        const item = await itemResponse.json();
        
        if (item.quantity - 1 < 1) {
            return res.status(400).send('A quantidade mínima é 1');
        }
        
        // Atualizar quantidade
        const updateResponse = await fetch(`${API_BASE_URL}/cart/cart-items/${itemId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity: item.quantity - 1
            })
        });

        if (!updateResponse.ok) {
            return res.status(updateResponse.status).send('Erro ao atualizar item');
        }

        // Buscar dados atualizados para calcular totais
        const updatedItem = await updateResponse.json();
        const productResponse = await fetch(`${API_BASE_URL}/products/${updatedItem.products_id}`);
        const product = await productResponse.json();
        
        const newTotalPrice = updatedItem.quantity * parseFloat(product.price);
        
        // Calcular total do carrinho
        const cartResponse = await fetch(`${API_BASE_URL}/cart/${updatedItem.cart_id}/items`);
        const cartWithItems = await cartResponse.json();
        
        let cartTotal = 0;
        for (const cartItem of cartWithItems.items) {
            const productRes = await fetch(`${API_BASE_URL}/products/${cartItem.products_id}`);
            const productData = await productRes.json();
            cartTotal += cartItem.quantity * parseFloat(productData.price);
        }

        res.send({
            newQuantity: updatedItem.quantity,
            newTotalPriceFormatted: newTotalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            cartTotalFormatted: cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
    } catch (error) {
        console.error('Erro ao decrementar item no carrinho:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

module.exports = {
    addToCart,
    removeFromCart,
    getCart,
    incrementCartItem,
    decrementCartItem
};