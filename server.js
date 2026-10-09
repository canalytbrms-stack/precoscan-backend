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
    let imageUrl = '';
    let nomeProdutoFinal = `Buscando: ${termoDeBusca}`;

    try {
        let produtosVarejo = [];
        
        if (LOMADEE_API_KEY) {
            try {
                // TENTATIVA 1: Rota Nova
                const urlLomadeeNova = `https://api.lomadee.com.br/affiliate/products?search=${encodeURIComponent(termoDeBusca)}&limit=10`;
                const resposta = await axios.get(urlLomadeeNova, { headers: { 'x-api-key': LOMADEE_API_KEY } });
                const ofertas = resposta.data.data || [];
                
                // Extrai a imagem real se existir
                if (ofertas.length > 0 && ofertas[0].thumbnail) {
                    imageUrl = ofertas[0].thumbnail;
                    nomeProdutoFinal = ofertas[0].name || nomeProdutoFinal;
                }

                // FILTRO DE LIXO: Só aceita produtos que tenham preço maior que 0 e link válido
                produtosVarejo = ofertas
                    .filter(o => o.price && o.price > 0 && o.link)
                    .slice(0, 5) // Pega os 5 primeiros bons
                    .map(oferta => ({
                        nome: oferta.store?.name || oferta.brand?.name || 'Loja Parceira',
                        preco: oferta.price,
                        link_afiliado: oferta.link,
                        frete_gratis: false,
                        rating: 4.8,
                        vendas: 'Ver site'
                    }));
            } catch (erro1) {
                try {
                    // TENTATIVA 2: Rota Clássica V3
                    const urlV3 = `https://api.lomadee.com/v3/${LOMADEE_SOURCE_ID}/offer/_search?keyword=${encodeURIComponent(termoDeBusca)}`;
                    const respV3 = await axios.get(urlV3);
                    const ofertasV3 = respV3.data.offers || [];
                    
                    if (ofertasV3.length > 0 && ofertasV3[0].thumbnail) {
                        imageUrl = ofertasV3[0].thumbnail;
                        nomeProdutoFinal = ofertasV3[0].offerName || nomeProdutoFinal;
                    }

                    produtosVarejo = ofertasV3
                        .filter(o => o.price && o.price > 0 && o.link)
                        .slice(0, 5)
                        .map(oferta => ({
                            nome: oferta.store?.name || 'Loja Parceira',
                            preco: oferta.price,
                            link_afiliado: oferta.link,
                            frete_gratis: false,
                            rating: 4.8,
                            vendas: 'Ver site'
                        }));
                } catch (erro2) {
                    console.error('Lomadee falhou completamente.');
                }
            }
        }

        // ORDENAÇÃO DO RANKING (Do mais barato ao mais caro)
        produtosVarejo.sort((a, b) => a.preco - b.preco);
        // Corta para manter apenas o Top 2 da Lomadee
        produtosVarejo = produtosVarejo.slice(0, 2);

        // ANTI-FALHAS: Se a Lomadee enviar lixo ou não achar (ex: iPhone 18), injeta as lojas de emergência
        if (produtosVarejo.length === 0) {
            produtosVarejo = [
                {
                    nome: 'Magalu',
                    preco: 0.00,
                    frete_gratis: true,
                    rating: 4.8,
                    vendas: 'Dinâmico',
                    link_afiliado: `https://www.magazinevoce.com.br/busca/${encodeURIComponent(termoDeBusca)}`
                },
                {
                    nome: 'Casas Bahia',
                    preco: 0.00,
                    frete_gratis: false,
                    rating: 4.7,
                    vendas: 'Dinâmico',
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
            vendas: 'Preço Direto',
            link_afiliado: linkAmazonDinâmico
        };

        // Imagem genérica para quando realmente não houver foto
        if (!imageUrl) imageUrl = 'https://via.placeholder.com/300?text=PrecoScan+Busca';

        const resultados = [{
            product_name: nomeProdutoFinal,
            image_url: imageUrl, 
            ofertas: [ofertaAmazonFallback, ...produtosVarejo] // Amazon sempre aparece no Topo como Exclusiva
        }];

        res.json(resultados);

    } catch (erro) {
        console.error('Erro interno:', erro.message);
        res.status(500).json({ erro: 'Falha interna na busca.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
