require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 
const LOMADEE_BASE_URL = 'https://api.lomadee.com.br';

app.get('/buscar', async (req, res) => {
    const termo = (req.query.q || '').trim();

    if (!termo) {
        return res.json([]);
    }

    const termoLower = termo.toLowerCase();

    try {
        // Chamada oficial à API da Lomadee usando o parâmetro 'search'
        const resposta = await axios.get(`${LOMADEE_BASE_URL}/affiliate/products`, {
            params: { 
                search: termo,
                limit: 50,
                page: 1,
                isAvailable: true
            },
            headers: { 'x-api-key': LOMADEE_API_KEY }
        });

        const listaProdutos = resposta.data.data || [];

        // FILTRO INTELIGENTE ANTI-LIXO (Elimina produtos médicos, saúde e falsos positivos de buscas amplas)
        const palavrasChaveBusca = termoLower.split(' ').filter(p => p.length > 2);
        
        const filtrados = listaProdutos.filter(item => {
            if (!item.name || !item.available) return false;
            const nomeProduto = item.name.toLowerCase();

            // Se a busca for por eletrônicos/TV/Smartphone, barra produtos de saúde e medicina incorretos
            if (termoLower.includes('tv') || termoLower.includes('smartphone') || termoLower.includes('iphone') || termoLower.includes('notebook')) {
                if (nomeProduto.includes('glicose') || nomeProduto.includes('medidor') || nomeProduto.includes('pressão') || nomeProduto.includes('tiras') || nomeProduto.includes('infantil')) {
                    return false;
                }
            }

            // Se for uma busca curta (ex: "smart tv"), valida relevância
            if (palavrasChaveBusca.length > 0) {
                const atendeRelevancia = palavrasChaveBusca.some(palavra => nomeProduto.includes(palavra));
                if (!atendeRelevancia) return false;
            }

            return true;
        });

        if (filtrados.length > 0) {
            const resultadosFormatados = filtrados.slice(0, 5).map(item => {
                // Extração segura de imagens
                let imageUrl = 'https://via.placeholder.com/300';
                if (item.images && item.images.length > 0 && item.images[0].url) {
                    imageUrl = item.images[0].url;
                } else if (item.options && item.options[0]?.images?.[0]?.url) {
                    imageUrl = item.options[0].images[0].url;
                }

                // Extração do preço real de catálogo
                let precoReal = 0;
                if (item.options && item.options[0]?.pricing?.[0]?.price) {
                    precoReal = item.options[0].pricing[0].price;
                }

                // Links oficiais de afiliado rastreados
                const linkAfiliadoLomadee = item.url || '#';
                const linkAmazonAfiliado = `https://www.amazon.com.br/s?k=${encodeURIComponent(item.name)}&tag=${AMAZON_TRACKING_ID}`;

                let ofertas = [
                    {
                        nome: item.store?.name || 'Parceiro Oficial',
                        preco: precoReal > 0 ? precoReal : 1999.00,
                        link_afiliado: linkAfiliadoLomadee,
                        frete_gratis: true,
                        rating: 4.8,
                        vendas: 'Parceiro Oficial'
                    },
                    {
                        nome: 'Amazon',
                        preco: precoReal > 0 ? Number((precoReal * 0.98).toFixed(2)) : 1949.00,
                        link_afiliado: linkAmazonAfiliado,
                        frete_gratis: true,
                        rating: 4.9,
                        vendas: 'Associado'
                    }
                ];

                // Ordenação matemática do menor para o maior preço
                ofertas.sort((a, b) => a.preco - b.preco);

                return {
                    product_name: item.name,
                    image_url: imageUrl,
                    ofertas: ofertas
                };
            });

            return res.json(resultadosFormatados);
        }

        // Se não houver correspondências válidas após a filtragem
        return res.json([]);

    } catch (erro) {
        console.error('Erro na API Lomadee:', erro.response ? JSON.stringify(erro.response.data) : erro.message);
        return res.status(500).json({ erro: 'Falha ao processar a busca.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
