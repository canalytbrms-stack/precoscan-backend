require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 

app.get('/buscar', async (req, res) => {
    const termoDeBusca = req.query.q || 'smartphone';

    try {
        let ofertasLomadee = [];
        let imagemProduto = 'https://via.placeholder.com/300?text=PrecoScan';

        // Tenta buscar dados reais na Lomadee
        if (LOMADEE_API_KEY) {
            try {
                // Tentativa limpa na API atualizada
                const urlLomadee = `https://api.lomadee.com.br/affiliate/products?name=${encodeURIComponent(termoDeBusca)}&limit=3`;
                const resposta = await axios.get(urlLomadee, { headers: { 'x-api-key': LOMADEE_API_KEY } });
                const itens = resposta.data.data || [];

                if (itens.length > 0) {
                    if (itens[0].thumbnail) imagemProduto = itens[0].thumbnail;

                    ofertasLomadee = itens.map(oferta => ({
                        nome: oferta.store?.name || 'Loja Parceira',
                        preco: oferta.price || 0, // Preço real devolvido pela API
                        link_afiliado: oferta.link || '#',
                        frete_gratis: false,
                        rating: 4.8,
                        vendas: 'Parceiro Oficial'
                    }));
                }
            } catch (err) {
                console.log('Aviso: Lomadee indisponível para esta busca exata.');
            }
        }

        // Se a API externa não retornar itens reais, construímos as opções de forma transparente
        if (ofertasLomadee.length === 0) {
            ofertasLomadee = [
                {
                    nome: 'Magalu (Parceiro)',
                    preco: 0.00, // Indica preço sob consulta para evitar valores falsos
                    frete_gratis: true,
                    rating: 4.8,
                    vendas: 'Ver na Loja',
                    link_afiliado: `https://www.magazineluiza.com.br/busca/${encodeURIComponent(termoDeBusca)}/`
                },
                {
                    nome: 'Casas Bahia (Parceiro)',
                    preco: 0.00,
                    frete_gratis: false,
                    rating: 4.7,
                    vendas: 'Ver na Loja',
                    link_afiliado: `https://www.casasbahia.com.br/${encodeURIComponent(termoDeBusca)}/b`
                }
            ];
        }

        // Opção da Amazon com link de afiliado oficial
        const linkAmazon = `https://www.amazon.com.br/s?k=${encodeURIComponent(termoDeBusca)}&tag=${AMAZON_TRACKING_ID}`;
        const ofertaAmazon = {
            nome: 'Amazon',
            preco: 0.00, 
            frete_gratis: true,
            rating: 4.9,
            vendas: 'Associado',
            link_afiliado: linkAmazon
        };

        const rankingFinal = [ofertaAmazon, ...ofertasLomadee];

        const resultados = [{
            product_name: termoDeBusca.toUpperCase(),
            image_url: imagemProduto, 
            ofertas: rankingFinal
        }];

        res.json(resultados);

    } catch (erro) {
        console.error('Erro interno:', erro.message);
        res.status(500).json({ erro: 'Falha interna na busca.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
