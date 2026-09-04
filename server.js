require('dotenv').config();

const express = require('express');
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
} = require('./lib/imageService');

const app = express();
const PORT = process.env.PORT || 3000;

// Protezione opzionale con password (HTTP Basic Auth), equivalente a middleware.js
// usato in produzione su Vercel. In locale è attiva solo se imposti BASIC_AUTH_PASSWORD
// nel tuo .env: se la lasci vuota, l'app resta senza password sul tuo computer.
function basicAuth(req, res, next) {
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedPassword) {
    return next();
  }

  const expectedUser = process.env.BASIC_AUTH_USER || 'admin';
  const authHeader = req.headers.authorization || '';
  const [scheme, encoded] = authHeader.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
    if (user === expectedUser && pass === expectedPassword) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Accesso riservato"');
  return res.status(401).send('Accesso protetto da password.');
}

app.use(basicAuth);

// Le immagini in base64 (soprattutto ad alta risoluzione/qualità) possono pesare diversi MB,
// quindi il limite del body JSON è più alto del default. (Su Vercel questo limite non si applica:
// vale invece il limite di payload della piattaforma, vedi README.)
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

function requireClientOr(res) {
  const client = getClient();
  if (!client) {
    res.status(500).json({ error: MISSING_KEY_MESSAGE });
    return null;
  }
  return client;
}

app.post('/api/generate', async (req, res) => {
  const client = requireClientOr(res);
  if (!client) return;

  const { prompt, size, quality, background, n } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Il prompt (descrizione dell\'immagine) è obbligatorio.' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Il prompt è troppo lungo (max 4000 caratteri).' });
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
      return res.status(502).json({ error: 'Il servizio non ha restituito immagini. Riprova.' });
    }

    return res.json({ images });
  } catch (err) {
    const { status, body } = errorResponseFor(err, 'generazione dell\'immagine');
    return res.status(status).json(body);
  }
});

// Modifica un'immagine già generata sulla base di nuove istruzioni testuali,
// senza dover ripartire da un prompt vuoto. Riceve l'immagine corrente in base64
// (quella mostrata nel form) e la ricrea applicando la correzione richiesta.
app.post('/api/edit', async (req, res) => {
  const client = requireClientOr(res);
  if (!client) return;

  const { imageB64, prompt, size, quality, background } = req.body || {};

  if (!imageB64 || typeof imageB64 !== 'string') {
    return res.status(400).json({ error: 'Nessuna immagine di partenza ricevuta per la modifica.' });
  }
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Descrivi la modifica da applicare all\'immagine.' });
  }
  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'Le istruzioni di modifica sono troppo lunghe (max 4000 caratteri).' });
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
      return res.status(502).json({ error: 'Il servizio non ha restituito l\'immagine modificata. Riprova.' });
    }

    return res.json({
      image: {
        b64: edited.b64_json,
        filename: `immagine-modificata-${Date.now()}.png`,
      },
    });
  } catch (err) {
    const { status, body } = errorResponseFor(err, 'modifica dell\'immagine');
    return res.status(status).json(body);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, apiKeyConfigured: Boolean(getClient()) });
});

app.listen(PORT, () => {
  console.log(`\nWebapp generazione immagini avviata su http://localhost:${PORT}\n`);
  if (!getClient()) {
    console.log(
      'ATTENZIONE: nessuna API key OpenAI trovata. Copia .env.example in .env e inserisci la tua chiave prima di generare immagini.\n'
    );
  }
});
