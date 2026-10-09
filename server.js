require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CREDENCIAIS OFICIAIS
const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 
const LOMADEE_BASE_URL = 'https://api.lomadee.com.br'; // Nova URL oficial de produção

app.get('/buscar', async (req, res) => {
    const termoDeBusca = (req.query.q || 'smartphone').toLowerCase();

    let ofertasVarejo = [];
    let imageUrl = '';
    let nomeProdutoFinal = `Busca: ${req.query.q || 'smartphone'}`;

    try {
        if (LOMADEE_API_KEY) {
            // Chamada estritamente conforme a documentação oficial:
            // GET /affiliate/products com limit e header x-api-key (sem parâmetros inválidos na URL)
            const resposta = await axios.get(`${LOMADEE_BASE_URL}/affiliate/products`, {
                params: { limit: 50 }, // Respeitando o limite máximo de 100 da documentação
                headers: { 'x-api-key': LOMADEE_API_KEY }
            });

            const produtos = resposta.data.data || [];

            // Filtramos os produtos retornados de forma segura no servidor
            const filtrados = produtos.filter(p => 
                p.name && p.name.toLowerCase().includes(termoDeBusca)
            );

            if (filtrados.length > 0) {
                imageUrl = filtrados[0].thumbnail || filtrados[0].image || '';
                nomeProdutoFinal = filtrados[0].name;

                ofertasVarejo = filtrados.slice(0, 2).map(oferta => ({
                    nome: oferta.store?.name || oferta.brand?.name || 'Loja Parceira',
                    preco: oferta.price || oferta.offerPrice || 0,
                    link_afiliado: oferta.link || oferta.url || '#',
                    frete_gratis: false,
                    rating: 4.8,
                    vendas: 'Parceiro Oficial'
                }));
            }
        }
    } catch (erroLomadee) {
        console.error('Erro na API Lomadee:', erroLomadee.response ? JSON.stringify(erroLomadee.response.data) : erroLomadee.message);
    }

    // Fallback limpo caso a listagem não traga o item exato
    if (ofertasVarejo.length === 0) {
        ofertasVarejo = [
            {
                nome: 'Magalu',
                preco: 0.00,
                frete_gratis: true,
                rating: 4.8,
                vendas: 'Consulte na Loja',
                link_afiliado: `https://www.magazineluiza.com.br/busca/${encodeURIComponent(req.query.q || 'smartphone')}/`
            },
            {
                nome: 'Casas Bahia',
                preco: 0.00,
                frete_gratis: false,
                rating: 4.7,
                vendas: 'Consulte na Loja',
                link_afiliado: `https://www.casasbahia.com.br/${encodeURIComponent(req.query.q || 'smartphone')}/b`
            }
        ];
    }

    // Oferta Amazon com o ID de afiliado correto
    const linkAmazon = `https://www.amazon.com.br/s?k=${encodeURIComponent(req.query.q || 'smartphone')}&tag=${AMAZON_TRACKING_ID}`;
    const ofertaAmazon = {
        nome: 'Amazon',
        preco: 0.00, 
        frete_gratis: true,
        rating: 4.9,
        vendas: 'Associado',
        link_afiliado: linkAmazon
    };

    if (!imageUrl) {
        imageUrl = 'https://via.placeholder.com/300?text=PrecoScan';
    }

    const rankingFinal = [ofertaAmazon, ...ofertasVarejo];
    
    // Ordena do menor para o maior preço (apenas se houver preço válido maior que 0)
    rankingFinal.sort((a, b) => (a.preco > 0 ? a.preco : 999999) - (b.preco > 0 ? b.preco : 999999));

    const resultados = [{
        product_name: nomeProdutoFinal,
        image_url: imageUrl,
        ofertas: rankingFinal
    }];

    res.json(resultados);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
