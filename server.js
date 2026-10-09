require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// AS SUAS CREDENCIAIS OFICIAIS
const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 

app.get('/buscar', async (req, res) => {
    const termoDeBusca = req.query.q || 'smartphone'; 

    try {
        let produtosVarejo = [];
        
        if (LOMADEE_API_KEY) {
            try {
                // Correção exata baseada no erro: trocamos 'keyword' por 'q' e removemos 'sourceId'
                const urlLomadee = `https://api.lomadee.com.br/affiliate/products?q=${encodeURIComponent(termoDeBusca)}&limit=10`;
                
                const resposta = await axios.get(urlLomadee, {
                    headers: { 'x-api-key': LOMADEE_API_KEY }
                });
                
                const ofertas = resposta.data.data || [];
                produtosVarejo = ofertas.slice(0, 2).map(oferta => ({
                    nome: oferta.store?.name || oferta.brand?.name || 'Loja Parceira',
                    preco: oferta.price || 0,
                    link_afiliado: oferta.link || '',
                    frete_gratis: false,
                    rating: 4.8,
                    vendas: 'Ver site'
                }));
            } catch (erroLomadee) {
                console.error('Erro DETALHADO Lomadee:', erroLomadee.response ? JSON.stringify(erroLomadee.response.data) : erroLomadee.message);
            }
        }

        // SISTEMA ANTI-FALHAS: Se a Lomadee falhar ou não tiver o produto, criamos as lojas manualmente!
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
