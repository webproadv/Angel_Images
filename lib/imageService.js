// Logica condivisa per parlare con l'API Immagini di OpenAI.
// Usata sia da server.js (sviluppo locale con Express) sia dalle funzioni
// serverless in /api (deploy su Vercel), per evitare di duplicare il codice.

const OpenAI = require('openai');

const MODEL = 'gpt-image-1';

// Valori consentiti dal modello gpt-image-1
const ALLOWED_SIZES = new Set(['auto', '1024x1024', '1024x1536', '1536x1024']);
const ALLOWED_QUALITY = new Set(['auto', 'low', 'medium', 'high']);
const ALLOWED_BACKGROUND = new Set(['auto', 'opaque', 'transparent']);

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'sk-...') {
    return null;
  }
  return new OpenAI({ apiKey });
}

function pickOption(value, allowedSet, fallback) {
  return allowedSet.has(value) ? value : fallback;
}

const MISSING_KEY_MESSAGE =
  'Nessuna API key OpenAI configurata sul server. Imposta la variabile d\'ambiente OPENAI_API_KEY (vedi README.md).';

// Traduce un errore dell'SDK OpenAI in { status, body } pronti per la risposta HTTP.
function errorResponseFor(err, action) {
  console.error(`Errore ${action}:`, err?.message || err);

  const status = err?.status || err?.response?.status;
  if (status === 401) {
    return { status: 401, body: { error: 'API key OpenAI non valida. Controlla la variabile OPENAI_API_KEY.' } };
  }
  if (status === 429) {
    return {
      status: 429,
      body: {
        error: 'Limite di richieste o credito OpenAI esaurito. Riprova più tardi o controlla il tuo account OpenAI.',
      },
    };
  }
  if (status === 400) {
    return {
      status: 400,
      body: {
        error:
          err?.error?.message ||
          err?.message ||
          'Richiesta non valida (controlla il prompt e le opzioni scelte).',
      },
    };
  }

  return { status: 500, body: { error: `Errore imprevisto durante la ${action}. Riprova.` } };
}

module.exports = {
  OpenAI,
  MODEL,
  ALLOWED_SIZES,
  ALLOWED_QUALITY,
  ALLOWED_BACKGROUND,
  MISSING_KEY_MESSAGE,
  getClient,
  pickOption,
  errorResponseFor,
};
