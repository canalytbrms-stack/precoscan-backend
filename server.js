require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CREDENCIAIS
const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_SOURCE_ID = '1968ec3d-110c-4bf7-8ea5-3be258077c96';
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 

app.get('/buscar', async (req, res) => {
    const termoDeBusca = req.query.q || 'smartphone'; 

    try {
        let produtosVarejo = [];
        
        if (LOMADEE_API_KEY) {
            try {
                // TENTATIVA 1: Nova API com o parâmetro 'search'
                const urlLomadeeNova = `https://api.lomadee.com.br/affiliate/products?search=${encodeURIComponent(termoDeBusca)}&limit=10`;
                const resposta = await axios.get(urlLomadeeNova, { headers: { 'x-api-key': LOMADEE_API_KEY } });
                const ofertas = resposta.data.data || [];
                produtosVarejo = ofertas.slice(0, 2).map(oferta => ({
                    nome: oferta.store?.name || oferta.brand?.name || 'Loja Parceira',
                    preco: oferta.price || 0,
                    link_afiliado: oferta.link || '',
                    frete_gratis: false,
                    rating: 4.8,
                    vendas: 'Ver site'
                }));
            } catch (erro1) {
                try {
                    // TENTATIVA 2: Se a nova API bloquear, usamos a V3 Clássica
                    const urlV3 = `https://api.lomadee.com/v3/${LOMADEE_SOURCE_ID}/offer/_search?keyword=${encodeURIComponent(termoDeBusca)}`;
                    const respV3 = await axios.get(urlV3);
                    const ofertasV3 = respV3.data.offers || [];
                    produtosVarejo = ofertasV3.slice(0, 2).map(oferta => ({
                        nome: oferta.store?.name || 'Loja Parceira',
                        preco: oferta.price || 0,
                        link_afiliado: oferta.link || '',
                        frete_gratis: false,
                        rating: 4.8,
                        vendas: 'Ver site'
                    }));
                } catch (erro2) {
                    console.error('Ambas as rotas da Lomadee falharam.');
                }
            }
        }

        // TENTATIVA 3 (ANTI-FALHAS): Se a Lomadee não devolver nada, garantimos o Layout com Magalu e Casas Bahia
        if (produtosVarejo.length === 0) {
            produtosVarejo = [
                {
                    nome: 'Magalu',
                    preco: 0.00,
                    frete_gratis: true,
                    rating: 4.8,
                    vendas: 'Ver no site',
                    link_afiliado: `https://www.magazinevoce.com.br/busca/${encodeURIComponent(termoDeBusca)}`
                },
                {
                    nome: 'Casas Bahia',
                    preco: 0.00,
                    frete_gratis: false,
                    rating: 4.7,
                    vendas: 'Ver no site',
                    link_afiliado: `https://www.casasbahia.com.br/${encodeURIComponent(termoDeBusca)}/b`
                }
            ];
        }

        const linkAmazonDinâmico = `https://www.amazon.com.br/s?k=${encodeURIComponent(termoDeBusca)}&tag=${AMAZON_TRACKING_ID}`;
        const ofertaAmazonFallback = {
            nome: 'Amazon',
            preco: 0.00, 
            frete_gratis: true,
            rating: 4.9,
            vendas: 'Ver no site',
            link_afiliado: linkAmazonDinâmico
        };

        const resultados = [{
            product_name: `Buscando: ${termoDeBusca}`,
            image_url: 'https://via.placeholder.com/300?text=Pre%C3%A7oScan', 
            ofertas: [
                ofertaAmazonFallback,
                ...produtosVarejo
            ]
        }];

        res.json(resultados);

    } catch (erro) {
        console.error('Erro interno:', erro.message);
        res.status(500).json({ erro: 'Falha interna na busca.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
