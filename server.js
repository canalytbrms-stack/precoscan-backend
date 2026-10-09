require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const LOMADEE_API_KEY = process.env.LOMADEE_API_KEY; 
const LOMADEE_BASE_URL = 'https://api.lomadee.com.br';

app.get('/buscar', async (req, res) => {
    const termo = (req.query.q || '').trim().toLowerCase();

    if (!termo) {
        return res.json([]);
    }

    try {
        // 1. Busca os produtos reais na API da Lomadee respeitando a documentação oficial
        const resposta = await axios.get(`${LOMADEE_BASE_URL}/affiliate/products`, {
            params: { limit: 100 }, // Pega o lote máximo permitido por request
            headers: { 'x-api-key': LOMADEE_API_KEY }
        });

        const produtosGerais = resposta.data.data || [];

        // 2. Filtra os produtos da base da Lomadee que correspondem ao que o utilizador pesquisou
        const filtrados = produtosGerais.filter(p => p.name && p.name.toLowerCase().includes(termo));

        if (filtrados.length > 0) {
            // Pega o primeiro produto correspondente para definir o nome e a imagem oficial
            const produtoPrincipal = filtrados[0];
            const nomeProduto = produtoPrincipal.name;
            const imagemProduto = produtoPrincipal.thumbnail || produtoPrincipal.image || 'https://via.placeholder.com/300';

            // 3. Mapeia as ofertas reais utilizando o link de afiliado oficial que JÁ VEM na resposta da API (`item.link`)
            const ofertas = filtrados.slice(0, 3).map((item) => ({
                nome: item.store?.name || item.brand?.name || 'Loja Parceira',
                preco: item.price || item.offerPrice || 0.00,
                // O link de afiliado oficial fornecido diretamente pela Lomadee
                link_afiliado: item.link || item.url || '#',
                frete_gratis: false,
                rating: 4.8,
                vendas: 'Parceiro Oficial'
            }));

            // Ordena matematicamente do menor para o maior preço (Menor preço no topo 🥇)
            ofertas.sort((a, b) => a.preco - b.preco);

            return res.json([{
                product_name: nomeProduto,
                image_url: imagemProduto,
                ofertas: ofertas
            }]);
        }

        // Se não encontrar nenhum produto com esse termo exato na listagem atual
        return res.json([]);

    } catch (erro) {
        console.error('Erro na API da Lomadee:', erro.response ? JSON.stringify(erro.response.data) : erro.message);
        res.status(500).json({ erro: 'Falha ao buscar produtos.' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor PreçoScan rodando na porta ${PORT}`));
