// Funzione serverless Vercel: POST /api/edit
// Modifica un'immagine già generata (ricevuta in base64) applicando nuove
// istruzioni testuali, senza ripartire da zero. Vedi anche server.js per
// l'equivalente usato in sviluppo locale.

const {
  OpenAI,
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

  const { imageB64, prompt, size, quality, background } = req.body || {};

  if (!imageB64 || typeof imageB64 !== 'string') {
    res.status(400).json({ error: 'Nessuna immagine di partenza ricevuta per la modifica.' });
    return;
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    res.status(400).json({ error: 'Descrivi la modifica da applicare all\'immagine.' });
    return;
  }
  if (prompt.length > 4000) {
    res.status(400).json({ error: 'Le istruzioni di modifica sono troppo lunghe (max 4000 caratteri).' });
    return;
  }

  const finalSize = pickOption(size, ALLOWED_SIZES, 'auto');
  const finalQuality = pickOption(quality, ALLOWED_QUALITY, 'auto');
  const finalBackground = pickOption(background, ALLOWED_BACKGROUND, 'auto');

  try {
    const sourceBuffer = Buffer.from(imageB64, 'base64');
    const sourceFile = await OpenAI.toFile(sourceBuffer, 'immagine-sorgente.png', { type: 'image/png' });

    const result = await client.images.edit({
      model: MODEL,
      image: sourceFile,
      prompt: prompt.trim(),
      size: finalSize,
      quality: finalQuality,
      background: finalBackground,
      n: 1,
    });

    const edited = result.data && result.data[0];
    if (!edited || !edited.b64_json) {
      res.status(502).json({ error: 'Il servizio non ha restituito l\'immagine modificata. Riprova.' });
      return;
    }

    res.status(200).json({
      image: {
        b64: edited.b64_json,
        filename: `immagine-modificata-${Date.now()}.png`,
      },
    });
  } catch (err) {
    const { status, body } = errorResponseFor(err, 'modifica dell\'immagine');
    res.status(status).json(body);
  }
};
