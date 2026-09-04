// Funzione serverless Vercel: POST /api/generate
// Stessa logica di server.js (Express), ma nel formato richiesto dal runtime
// Node di Vercel: un handler (req, res) esportato di default, senza bisogno
// di Express (body JSON e helper res.status()/res.json() sono già forniti
// automaticamente dalla piattaforma).

const {
  MODEL,
  ALLOWED_SIZES,
  ALLOWED_QUALITY,
  ALLOWED_BACKGROUND,
  MISSING_KEY_MESSAGE,
  getClient,
  pickOption,
  errorResponseFor,
} = require('../lib/imageService');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo non consentito.' });
    return;
  }

  const client = getClient();
  if (!client) {
    res.status(500).json({ error: MISSING_KEY_MESSAGE });
    return;
  }

  const { prompt, size, quality, background, n } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'Il prompt (descrizione dell\'immagine) è obbligatorio.' });
    return;
  }
  if (prompt.length > 4000) {
    res.status(400).json({ error: 'Il prompt è troppo lungo (max 4000 caratteri).' });
    return;
  }

  const finalSize = pickOption(size, ALLOWED_SIZES, 'auto');
  const finalQuality = pickOption(quality, ALLOWED_QUALITY, 'auto');
  const finalBackground = pickOption(background, ALLOWED_BACKGROUND, 'auto');

  let count = parseInt(n, 10);
  if (!Number.isFinite(count) || count < 1) count = 1;
  if (count > 4) count = 4; // limite prudenziale per costi/tempo

  try {
    const result = await client.images.generate({
      model: MODEL,
      prompt: prompt.trim(),
      size: finalSize,
      quality: finalQuality,
      background: finalBackground,
      n: count,
    });

    const images = (result.data || []).map((img, i) => ({
      b64: img.b64_json,
      filename: `immagine-${Date.now()}-${i + 1}.png`,
    }));

    if (images.length === 0) {
      res.status(502).json({ error: 'Il servizio non ha restituito immagini. Riprova.' });
      return;
    }

    res.status(200).json({ images });
  } catch (err) {
    const { status, body } = errorResponseFor(err, 'generazione dell\'immagine');
    res.status(status).json(body);
  }
};
