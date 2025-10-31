const API_BASE_URL = process.env.API_URL; // URL da sua API Go


const axios = require('axios');
// Renderizar página de checkout
const getCheckout = async (req, res) => {
    try {
        // Verificar se o usuário está autenticado
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login');
        }

        const user = req.user;
        const userId = req.user.id;

        // Buscar carrinho do usuário
        const cartResponse = await axios.get(`${API_BASE_URL}/cart/user/${userId}`);
        
        if (cartResponse.status === 404) {
            return res.redirect('/carrinho');
        }
                
        if (!cartResponse.ok) {
            console.error('Erro ao buscar carrinho:', cartResponse.status);
            return res.status(500).send('Erro ao buscar carrinho');
        }

        const cart = await cartResponse.json();

        // Buscar itens do carrinho
        const cartItemsResponse = await axios.get(`${API_BASE_URL}/cart/${cart.id}/items`);

        if (!cartItemsResponse.ok) {
            console.error('Erro ao buscar itens do carrinho:', cartItemsResponse.status);
            return res.status(500).send('Erro ao buscar itens do carrinho');
        }

        const cartWithItems = await cartItemsResponse.json();

        // Verificar se há itens no carrinho
        if (!cartWithItems.items || cartWithItems.items.length === 0) {
            return res.redirect('/carrinho');
        }

        // Buscar todos os produtos
        let products = [];
        try {
            const productResponse = await axios.get(`${API_BASE_URL}/products`);
            if (productResponse.ok) {
                products = await productResponse.json();
            }
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        }

        // Buscar imagens para todos os produtos
        const imagePromises = products.map(async (product) => {
            try {
                const imageResponse = await axios.get(`${API_BASE_URL}/images/${product.id}`);
                if (imageResponse.ok) {
                    const images = await imageResponse.json();
                    const featuredImage = images.find(img => img.type === 'featured_image');
                    product.featuredImage = featuredImage ? featuredImage.path : null;
                }
            } catch (error) {
                product.featuredImage = null;
            }
            return product;
        });

        await Promise.all(imagePromises);

        // Calcular total e formatar dados
        let cartTotal = 0;
        
        for (const item of cartWithItems.items) {
            const product = products.find(p => p.id === item.products_id);
            
            if (product) {
                item.productName = product.name;
                item.productPrice = parseFloat(product.price);
                item.totalPrice = item.productPrice * item.quantity;
                item.productImage = product.featuredImage;
                item.productSku = product.sku;
                
                item.productPriceFormatted = item.productPrice.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                item.totalPriceFormatted = item.totalPrice.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                
                cartTotal += item.totalPrice;
            }
        }

        const cartTotalFormatted = cartTotal.toLocaleString('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
        });

        res.render('checkout/index', {
            pageTitle: 'Finalizar Compra',
            cart: cartWithItems,
            cartItems: cartWithItems.items,
            cartTotalFormatted: cartTotalFormatted,
            user
        });

    } catch (error) {
        console.error('Erro ao carregar checkout:', error);
        res.status(500).render('error', { 
            message: 'Erro interno do servidor',
            error: error.message 
        });
    }
};

// Processar finalização da compra
const processCheckout = async (req, res) => {
    try {
        // Verificar se o usuário está autenticado
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const userId = req.user.id;
        const checkoutData = req.body;

        // Validar dados obrigatórios
        if (!checkoutData.payment_method) {
            return res.status(400).json({ error: 'Método de pagamento é obrigatório' });
        }
        if (!checkoutData.shipping_address) {
            return res.status(400).json({ error: 'Endereço de entrega é obrigatório' });
        }
        if (!checkoutData.shipping_city) {
            return res.status(400).json({ error: 'Cidade é obrigatória' });
        }
        if (!checkoutData.shipping_state) {
            return res.status(400).json({ error: 'Estado é obrigatório' });
        }
        if (!checkoutData.shipping_cep) {
            return res.status(400).json({ error: 'CEP é obrigatório' });
        }

        // Chamar API de checkout
        const response = await fetch(`${API_BASE_URL}/checkout/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(checkoutData)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error || 'Erro ao processar pedido' 
            });
        }

        // Retornar sucesso com dados do pedido
        res.status(201).json({
            message: 'Pedido criado com sucesso',
            order_id: data.id,
            order_number: data.order_number,
            total: data.total,
            status: data.status
        });

    } catch (error) {
        console.error('Erro ao processar checkout:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};


// ==================== PREVIEW DO CHECKOUT ====================

// Renderizar página de checkout com preview multi-vendor
const getCartPreview = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login');
        }

        const user = req.user;
        const userId = req.user.id;

        // Buscar carrinho do usuário
        const cartResponse = await axios.get(`${API_BASE_URL}/cart/user/${userId}`);
        //console.log('cartResponse: ' +JSON.stringify(cartResponse.data))
        if (cartResponse.status === 404) {
            return res.redirect('/carrinho');
        }

        const cart = cartResponse.data;
        const cartItemsResponse = await axios.get(`${API_BASE_URL}/cart/${cart.id}/items`);
		
		//console.log('cartItemsResponse: ' +JSON.stringify(cartItemsResponse.data))
        if (cartItemsResponse.status !== 200) {
            console.error('Erro ao buscar itens do carrinho:', cartItemsResponse.status);
            return res.status(500).send('Erro ao buscar itens do carrinho');
        }

        const cartWithItems =  cartItemsResponse.data;

        // Verificar se há itens no carrinho
        if (!cartWithItems.items || cartWithItems.items.length === 0) {
            return res.redirect('/carrinho');
        }

        // Buscar produtos com informações dos vendors
        const productPromises = cartWithItems.items.map(async (item) => {
            try {
                // Buscar produto
                const productRes = await axios.get(`${API_BASE_URL}/products/id/${item.products_id}`);
                const product = await productRes.data;

                //console.log(productRes.data)
                // Buscar vendor do produto
                const vendorRes = await axios.get(`${API_BASE_URL}/vendors/user/${product.users_id}`);
                const vendor = await vendorRes.data;

                // Buscar imagem
                const imageRes = await axios.get(`${API_BASE_URL}/images/${product.id}`);
                let featuredImage = null;
                if (imageRes.status === 200) {
                    const images = await imageRes.data;
                    const featured = images.find(img => img.type === 'featured_image');
                    featuredImage = featured ? featured.path : null;
                }

                return {
                    ...item,
                    productName: product.name,
                    productPrice: parseFloat(product.price),
                    productSku: product.sku,
                    productImage: featuredImage,
                    vendorId: vendor.id,
                    vendorName: vendor.name,
                    vendorUserId: product.users_id
                };
            } catch (error) {
                //console.error('Erro ao buscar produto:', error);
                return null;
            }
        });

        const itemsWithVendors = (await Promise.all(productPromises)).filter(item => item !== null);

        // Agrupar itens por vendor
        const itemsByVendor = {};
        let grandTotal = 0;

        itemsWithVendors.forEach(item => {
            const vendorKey = item.vendorId;
            
            if (!itemsByVendor[vendorKey]) {
                itemsByVendor[vendorKey] = {
                    vendorId: item.vendorId,
                    vendorName: item.vendorName,
                    items: [],
                    total: 0
                };
            }

            const itemTotal = item.productPrice * item.quantity;
            item.totalPrice = itemTotal;
            item.productPriceFormatted = item.productPrice.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
            });
            item.totalPriceFormatted = itemTotal.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
            });

            itemsByVendor[vendorKey].items.push(item);
            itemsByVendor[vendorKey].total += itemTotal;
            grandTotal += itemTotal;
        });

        // Formatar totais dos vendors
        Object.values(itemsByVendor).forEach(vendor => {
            vendor.totalFormatted = vendor.total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
        });

        const grandTotalFormatted = grandTotal.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        res.render('site/checkout/index', {
            pageTitle: 'Finalizar Compra',
            cart: cartWithItems,
            itemsByVendor: Object.values(itemsByVendor),
            totalVendors: Object.keys(itemsByVendor).length,
            grandTotal: grandTotal,
            grandTotalFormatted: grandTotalFormatted,
            user
        });

    } catch (error) {
        console.error('Erro ao carregar checkout:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// ==================== PROCESSAR CHECKOUT ====================

// Processar checkout multi-vendor
const processMultiVendorCheckout = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const userId = req.user.id;
        const checkoutData = req.body;


        // Validações
        if (!checkoutData.payment_method) {
            return res.status(400).json({ error: 'Método de pagamento é obrigatório.........' });
        }
        if (!checkoutData.shipping_address) {
            return res.status(400).json({ error: 'Endereço de entrega é obrigatório...........' });
        }
        if (!checkoutData.shipping_city) {
            return res.status(400).json({ error: 'Cidade é obrigatória...........' });
        }
        if (!checkoutData.shipping_state) {
            return res.status(400).json({ error: 'Estado é obrigatório' });
        }
        if (!checkoutData.shipping_cep) {
            return res.status(400).json({ error: 'CEP é obrigatório' });
        }

        const { data, status } = await axios.post(`${API_BASE_URL}/checkout-multi-vendor/${userId}`, checkoutData);
        if (status !== 200) return res.status(status).json({ error: data.error || 'Erro ao processar pedido' });


        // if (!response.ok) {
        //     return res.status(response.status).json({ 
        //         error: data.error || 'Erro ao processar pedido' 
        //     });
        // }

        // Retornar sucesso com informações dos pedidos criados
        res.status(200).json({
            success: true,
            message: data.message,
            total_orders: data.total_orders,
            orders: data.orders.map(order => ({
                order_id: order.id,
                order_number: order.order_number,
                total: order.total,
                vendor_id: order.vendors_id
            }))
        });

    } catch (error) {
        console.error('Erro ao processar checkout:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// ==================== PEDIDOS DO USUÁRIO ====================

// Buscar pedidos do usuário agrupados por vendor
const getUserOrdersByVendor = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login');
        }

        const user = req.user;
        const userId = req.user.id;
        const userRole = req.user.roles_id; // Obtém o roles_id do usuário autenticado


        const response = await fetch(`${API_BASE_URL}/orders/user/${userId}/by-vendor`);

        if (!response.ok) {
            console.error('Erro ao buscar pedidos:', response.status);
            return res.status(500).send('Erro ao buscar pedidos');
        }

        const data = await response.json();
        const ordersByVendor = data.orders_by_vendor;

        // Formatar dados
        Object.keys(ordersByVendor).forEach(vendorName => {
            ordersByVendor[vendorName].forEach(order => {
                order.totalFormatted = parseFloat(order.total).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });

                const date = new Date(order.created_at);
                order.createdAtFormatted = date.toLocaleDateString('pt-BR');

                const statusMap = {
                    'pending': 'Pendente',
                    'processing': 'Processando',
                    'shipped': 'Enviado',
                    'delivered': 'Entregue',
                    'cancelled': 'Cancelado'
                };
                order.statusFormatted = statusMap[order.status] || order.status;
            });
        });

        res.render('orders/index', {
            pageTitle: 'Meus Pedidos por Vendedor',
            ordersByVendor: ordersByVendor,
            user,
            username: req.user.username,
            userRole
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Buscar todos os pedidos do usuário
const getUserOrders = async (req, res) => {
   
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login');
        }

        const user = req.user;
        const userId = req.user.id;

        const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);

        if (!response.ok) {
            console.error('Erro ao buscar pedidos:', response.status);
            return res.status(500).send('Erro ao buscar pedidos');
        }

        const orders = await response.json();

        // Formatar valores
        orders.forEach(order => {
            order.totalFormatted = parseFloat(order.total).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            const date = new Date(order.created_at);
            order.createdAtFormatted = date.toLocaleDateString('pt-BR');

            const statusMap = {
                'pending': 'Pendente',
                'processing': 'Processando',
                'shipped': 'Enviado',
                'delivered': 'Entregue',
                'cancelled': 'Cancelado'
            };
            order.statusFormatted = statusMap[order.status] || order.status;
        });
        const userRole = 3;
        res.render('orders/index', {
            pageTitle: 'Meus Pedidos',
            orders: orders,
            user,
            userRole,
            username: req.user.username
        });

    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

// Buscar detalhes de um pedido específico
const getOrderDetails = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).redirect('/login');
        }

        const user = req.user;
        const orderId = req.params.id;
        const userRole = req.user.roles_id; // Obtém o roles_id do usuário autenticado

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/details`);

        if (response.status === 404) {
            return res.status(404).send('Pedido não encontrado');
        }

        if (!response.ok) {
            console.error('Erro ao buscar pedido:', response.status);
            return res.status(500).send('Erro ao buscar pedido');
        }

        const data = await response.json();
        const order = data.order;
        const items = data.items;

        // Verificar se o pedido pertence ao usuário
        if (order.users_id !== user.id) {
            return res.status(403).send('Acesso negado');
        }

        // Formatar valores
        order.totalFormatted = parseFloat(order.total).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        const date = new Date(order.created_at);
        order.createdAtFormatted = date.toLocaleDateString('pt-BR');

        const statusMap = {
            'pending': 'Pendente',
            'processing': 'Processando',
            'shipped': 'Enviado',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };
        order.statusFormatted = statusMap[order.status] || order.status;

        const paymentMap = {
            'pix': 'PIX',
            'boleto': 'Boleto Bancário',
            'credit_card': 'Cartão de Crédito',
            'debit_card': 'Cartão de Débito'
        };
        order.paymentMethodFormatted = paymentMap[order.payment_method] || order.payment_method;

        // Formatar itens
        items.forEach(item => {
            item.priceFormatted = parseFloat(item.price).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            item.subtotal = item.price * item.quantity;
            item.subtotalFormatted = item.subtotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
        });
       
        console.log(items)
        console.log(order)

        res.render('orders/details/index', {
            pageTitle: `Pedido #${order.order_number}`,
            order: order,
            items: items,
            user,
            username: req.user.username,
            userRole
        });

    } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

module.exports = {
    getCheckout,
    processCheckout,
    getUserOrders,
    getOrderDetails,

	getCartPreview,
    processMultiVendorCheckout,
    getUserOrdersByVendor,

};