require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// AS SUAS CREDENCIAIS OFICIAIS
const AMAZON_TRACKING_ID = 'rms0cf-20'; 
const LOMADEE_SOURCE_ID = '1968ec3d-110c-4bf7-8ea5-3be258077c96';
const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; // A chave longa virá do Render para segurança máxima

app.get('/buscar', async (req, res) => {
    const termoDeBusca = req.query.q || 'smartphone'; 

    try {
        let produtosVarejo = [];
        
        // 1. Busca Oficial na Nova API da Lomadee
        if (LOMADEE_API_KEY) {
            try {
                const resposta = await axios.get(`https://api.lomadee.com.br/affiliate/products?keyword=${encodeURIComponent(termoDeBusca)}&sourceId=${LOMADEE_SOURCE_ID}`, {
                    headers: {
                        'x-api-key': LOMADEE_API_KEY
                    }
                });
                
                const ofertas = resposta.data.data || [];
                produtosVarejo = ofertas.slice(0, 3).map(oferta => ({
                    nome: oferta.store ? oferta.store.name : 'Loja Parceira',
                    preco: oferta.price,
                    link_afiliado: oferta.link,
                    frete_gratis: false, // Será atualizado futuramente com frete real
                    rating: 4.8,
                    vendas: 'Ver site'
                }));
            } catch (erroLomadee) {
                console.error('Aviso Lomadee:', erroLomadee.message);
            }
        }

        // 2. Estratégia de "Bypass" para as 10 vendas na Amazon
        const linkAmazonDinâmico = `https://www.amazon.com.br/s?k=${encodeURIComponent(termoDeBusca)}&tag=${AMAZON_TRACKING_ID}`;
        const ofertaAmazonFallback = {
            nome: 'Amazon',
            preco: 0.00, // Preço zero para ocultar no app e forçar o clique do cliente
            frete_gratis: true,
            rating: 4.9,
            vendas: 'Ver no site',
            link_afiliado: linkAmazonDinâmico,
            mensagem_botao: 'Ver Preço na Amazon'
        };

        // 3. Enviar para a tela do Celular
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
        console.error('Erro no servidor:', erro.message);
        res.status(500).json({ erro: 'Falha interna na busca.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
