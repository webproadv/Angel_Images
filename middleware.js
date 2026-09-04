// Edge Middleware di Vercel: protegge con una password (HTTP Basic Auth) sia
// la pagina statica (public/index.html e asset) sia le funzioni serverless
// in /api. Viene eseguito su ogni richiesta prima che raggiunga il resto
// del sito, quindi chi non ha la password non vede nulla, form incluso.
//
// Nota: non ha alcun effetto in sviluppo locale (server.js) — lì, se vuoi la
// stessa protezione, imposta le stesse variabili BASIC_AUTH_USER/PASSWORD
// nel tuo .env (vedi server.js e README.md).

export const config = {
  matcher: '/((?!favicon\\.ico).*)',
};

function unauthorized() {
  return new Response('Accesso protetto da password.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Accesso riservato", charset="UTF-8"' },
  });
}

export default function middleware(request) {
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  const expectedUser = process.env.BASIC_AUTH_USER || 'admin';

  // Fail-safe: se la password non è configurata, blocca tutto invece di
  // lasciare il sito aperto per errore.
  if (!expectedPassword) {
    return new Response(
      "Accesso non configurato: imposta la variabile d'ambiente BASIC_AUTH_PASSWORD nelle impostazioni del progetto Vercel, poi rifai il deploy.",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const [scheme, encoded] = authHeader.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch (err) {
      decoded = '';
    }
    const separatorIndex = decoded.indexOf(':');
    const user = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    const pass = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

    if (user === expectedUser && pass === expectedPassword) {
      return; // credenziali corrette: lascia proseguire la richiesta
    }
  }

  return unauthorized();
}
