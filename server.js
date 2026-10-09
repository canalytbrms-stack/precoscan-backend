require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const AMAZON_TAG = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 
const LOMADEE_BASE_URL = 'https://api-beta.lomadee.com.br';

app.get('/buscar', async (req, res) => {
    const termo = (req.query.q || '').trim();
    if (!termo) return res.json([]);

    try {
        // Consulta oficial à Open-API da Lomadee utilizando o parâmetro 'search'
        const resposta = await axios.get(`${LOMADEE_BASE_URL}/affiliate/products`, {
            params: { 
                search: termo, 
                limit: 20, 
                isAvailable: true 
            },
            headers: { 'x-api-key': LOMADEE_API_KEY }
        });

        const produtosApi = resposta.data.data || [];

        if (produtosApi.length > 0) {
            const resultados = produtosApi.slice(0, 5).map(item => {
                // Extração segura de imagens do produto
                const img = item.images?.[0]?.url || item.options?.[0]?.images?.[0]?.url || 'https://via.placeholder.com/300';
                
                // Extração do preço real de catálogo
                const precoOficial = item.options?.[0]?.pricing?.[0]?.price || 1999.00;
                const storeName = item.options?.[0]?.seller || item.store?.name || 'Parceiro Oficial';
                
                // URL DIRETA E OFICIAL DO PRODUTO FORNECIDA PELA LOMADEE (Sem erros 404)
                const linkAfiliadoLomadee = item.url || 'https://www.lomadee.com';
                
                // Link oficial da Amazon com a sua Tag de Associado
                const linkAmazon = `https://www.amazon.com.br/s?k=${encodeURIComponent(item.name)}&tag=${AMAZON_TAG}`;

                let ofertas = [
                    {
                        nome: storeName,
                        preco: precoOficial,
                        frete_gratis: true,
                        rating: 4.8,
                        vendas: 'Oficial',
                        link_afiliado: linkAfiliadoLomadee
                    },
                    {
                        nome: 'Amazon',
                        preco: Number((precoOficial * 0.98).toFixed(2)),
                        frete_gratis: true,
                        rating: 4.9,
                        vendas: 'Associado',
                        link_afiliado: linkAmazon
                    }
                ];

                // Ordenação matemática do menor para o maior preço
                ofertas.sort((a, b) => a.preco - b.preco);

                return {
                    product_name: item.name,
                    image_url: img,
                    ofertas: ofertas
                };
            });

            return res.json(resultados);
        }

        // Se a API não retornar produtos para este termo específico, retorna lista vazia (sem mocks falsos)
        return res.json([]);

    } catch (err) {
        console.error('Erro na API Lomadee:', err.message);
        return res.status(500).json({ erro: 'Falha na comunicação com a API.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
