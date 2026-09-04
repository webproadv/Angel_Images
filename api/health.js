// Funzione serverless Vercel: GET /api/health
// Utile per verificare rapidamente se la variabile OPENAI_API_KEY è configurata
// sull'ambiente di produzione, senza consumare una generazione a pagamento.

const { getClient } = require('../lib/imageService');

module.exports = async (req, res) => {
  res.status(200).json({ ok: true, apiKeyConfigured: Boolean(getClient()) });
};
