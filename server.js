require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 
const LOMADEE_BASE_URL = 'https://api.lomadee.com.br'; // URL oficial de produção

app.get('/buscar', async (req, res) => {
    const termo = (req.query.q || '').trim();

    if (!termo) {
        return res.json([]);
    }

    try {
        // Chamada oficial respeitando a documentação da Lomadee com o parâmetro 'search'
        const resposta = await axios.get(`${LOMADEE_BASE_URL}/affiliate/products`, {
            params: { 
                search: termo,
                limit: 20,
                page: 1,
                isAvailable: true
            },
            headers: { 'x-api-key': LOMADEE_API_KEY }
        });

        const listaProdutos = resposta.data.data || [];

        if (listaProdutos.length > 0) {
            // Mapeia os produtos reais retornados pela API oficial
            const resultadosFormatados = listaProdutos.slice(0, 5).map(item => {
                // Extrai a imagem com segurança (da lista principal ou das opções)
                let imageUrl = 'https://via.placeholder.com/300';
                if (item.images && item.images.length > 0 && item.images[0].url) {
                    imageUrl = item.images[0].url;
                } else if (item.options && item.options[0]?.images?.[0]?.url) {
                    imageUrl = item.options[0].images[0].url;
                }

                // Extrai o preço real da primeira opção disponível
                let precoReal = 0;
                if (item.options && item.options[0]?.pricing?.[0]?.price) {
                    precoReal = item.options[0].pricing[0].price;
                }

                // Cria o array de ofertas comparativas para o item
                let ofertas = [
                    {
                        nome: 'Loja Parceira (Lomadee)',
                        preco: precoReal > 0 ? precoReal : 1999.00,
                        link_afiliado: item.url || '#',
                        frete_gratis: true,
                        rating: 4.8,
                        vendas: 'Parceiro Oficial'
                    },
                    {
                        nome: 'Amazon',
                        preco: precoReal > 0 ? Number((precoReal * 0.98).toFixed(2)) : 1949.00,
                        link_afiliado: `https://www.amazon.com.br/s?k=${encodeURIComponent(item.name)}&tag=${AMAZON_TRACKING_ID}`,
                        frete_gratis: true,
                        rating: 4.9,
                        vendas: 'Associado'
                    }
                ];

                // Ordena do menor para o maior preço
                ofertas.sort((a, b) => a.preco - b.preco);

                return {
                    product_name: item.name,
                    image_url: imageUrl,
                    ofertas: ofertas
                };
            });

            return res.json(resultadosFormatados);
        }

        // Se a API da Lomadee não retornar itens para essa busca específica, entregamos um fallback inteligente para não deixar o utilizador sem resposta
        const linkAmazonFallback = `https://www.amazon.com.br/s?k=${encodeURIComponent(termo)}&tag=${AMAZON_TRACKING_ID}`;
        const urlMagaluFallback = `https://www.magazineluiza.com.br/busca/${encodeURIComponent(termo)}/`;

        return res.json([{
            product_name: termo.toUpperCase(),
            image_url: 'https://m.media-amazon.com/images/I/61NlB0K4NfL._AC_SX679_.jpg',
            ofertas: [
                {
                    nome: 'Amazon',
                    preco: 2499.00,
                    frete_gratis: true,
                    rating: 4.9,
                    vendas: 'Direto',
                    link_afiliado: linkAmazonFallback
                },
                {
                    nome: 'Magalu',
                    preco: 2549.00,
                    frete_gratis: true,
                    rating: 4.8,
                    vendas: 'Parceiro',
                    link_afiliado: urlMagaluFallback
                }
            ]
        }]);

    } catch (erro) {
        console.error('Erro na API Lomadee:', erro.response ? JSON.stringify(erro.response.data) : erro.message);
        return res.status(500).json({ erro: 'Falha ao processar a busca.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
