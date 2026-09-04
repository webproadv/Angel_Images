# Generatore di Immagini AI

Webapp locale per generare immagini ad alta risoluzione a partire da una descrizione testuale, usando il modello **gpt-image-1** di OpenAI.

## Requisiti

- [Node.js](https://nodejs.org) versione 18 o superiore (consigliata 20+)
- Una API key OpenAI con credito disponibile (la generazione immagini è a pagamento)

## 1. Ottenere la API key OpenAI

1. Vai su https://platform.openai.com/ e crea un account (o accedi se ne hai già uno).
2. Nel menu vai su **Dashboard → API keys** (https://platform.openai.com/api-keys).
3. Clicca **Create new secret key**, dai un nome (es. "imagegen-webapp") e copia la chiave che inizia con `sk-...`. Non potrai rivederla dopo aver chiuso la finestra, quindi salvala subito.
4. Assicurati di avere credito disponibile: vai su **Settings → Billing** e aggiungi un metodo di pagamento/credito. Senza credito le richieste falliranno con errore 429.
5. (Facoltativo ma consigliato) In **Settings → Limits** puoi impostare un tetto di spesa mensile per stare tranquillo.

La generazione di immagini con gpt-image-1 ha un costo per immagine che varia in base a risoluzione e qualità scelte (indicativamente pochi centesimi di dollaro per immagine in qualità media/bassa, di più in alta qualità/alta risoluzione). Controlla i prezzi aggiornati su https://openai.com/api/pricing/.

## 2. Installazione

Apri un terminale nella cartella del progetto ed esegui:

```bash
npm install
```

## 3. Configurazione della chiave

Copia il file di esempio e incolla la tua chiave:

```bash
cp .env.example .env
```

Poi apri `.env` con un editor di testo e sostituisci `sk-...` con la tua vera API key:

```
OPENAI_API_KEY=sk-la-tua-chiave-vera
```

Il file `.env` non viene mai condiviso o caricato da nessuna parte: resta solo sul tuo computer (è anche escluso da git tramite `.gitignore`).

## 4. Avvio dell'app

```bash
npm start
```

Poi apri il browser su:

```
http://localhost:3000
```

## Come si usa

1. Scrivi nella casella la descrizione dell'immagine che vuoi ottenere (più è dettagliata, meglio è: soggetto, stile, colori, atmosfera, inquadratura...).
2. Scegli formato (quadrato/orizzontale/verticale), qualità, sfondo (trasparente utile per loghi/PNG) e quante varianti generare (max 4 per richiesta).
3. Clicca **Genera immagine** e attendi (può richiedere qualche decina di secondi, di più con qualità alta).
4. Ogni immagine generata è scaricabile in PNG cliccando **Scarica PNG** sotto l'anteprima.

### Correggere un'immagine senza rigenerarla da zero

Sotto ogni immagine generata c'è un campo **"Correggi questa immagine"**: scrivi solo l'istruzione di modifica (es. "rendi il cielo più scuro", "sposta il soggetto a sinistra", "togli il testo in alto") e clicca **Applica modifica**. L'app invia l'immagine attualmente mostrata (non il prompt originale) all'API di editing di OpenAI, che la ricrea applicando la correzione richiesta, mantenendo il resto della composizione. Puoi ripetere il processo più volte per affinare progressivamente il risultato, e usare **Annulla ultima modifica** per tornare alla versione precedente se il risultato non ti convince. Ogni modifica è un'immagine nuova (con il proprio costo), quindi conviene descrivere una correzione alla volta.

### Immagini uniche/originali per la pubblicazione in un libro

Ogni chiamata al modello produce un'immagine generata "sul momento", non pescata da un archivio: non troverai due immagini identiche a meno di richiederlo esplicitamente. Per ridurre i rischi legati ai diritti d'autore quando pubblichi le immagini:

- Evita nel prompt riferimenti a personaggi, loghi, marchi o "in stile di [nome di un artista vivente]": OpenAI limita già molti di questi casi, ma è buona norma non affidarsi solo a quel filtro.
- Preferisci descrizioni originali (soggetto, ambientazione, tecnica, palette) invece di citare opere esistenti.
- Prima della pubblicazione, verifica i [termini di utilizzo di OpenAI](https://openai.com/policies/usage-policies) e le condizioni commerciali/editoriali applicabili al tuo caso — non è una consulenza legale, quindi per un progetto editoriale conviene una verifica con chi segue gli aspetti legali della pubblicazione.

## Protezione con password

L'app supporta una protezione opzionale con password (HTTP Basic Auth: il browser mostra un popup nativo per utente/password prima di mostrare qualunque cosa, form e API incluse).

**In locale**: se non imposti nulla, l'app resta senza password (comodo per lo sviluppo). Per attivarla anche in locale, imposta nel tuo `.env`:

```
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=una-password-a-tua-scelta
```

e riavvia il server.

**Online (Vercel)**: qui la protezione è invece *obbligatoria per design* — se non imposti `BASIC_AUTH_PASSWORD`, il sito risponde a chiunque con un errore 500 "Accesso non configurato" invece di restare aperto per errore. Per attivarla:

1. Vai sul progetto su vercel.com → **Settings → Environment Variables**
2. Aggiungi `BASIC_AUTH_USER` (es. `admin`) e `BASIC_AUTH_PASSWORD` (una password a tua scelta), ambiente **Production**
3. Vai su **Deployments**, apri i tre puntini sull'ultimo deployment e clicca **Redeploy** (le variabili d'ambiente vengono lette dal codice solo a partire dal deployment successivo a quando le imposti)

La protezione è realizzata da `middleware.js`, eseguito da Vercel prima di qualunque richiesta (sia la pagina che le funzioni in `/api`), quindi blocca l'accesso all'intero sito, non solo alla generazione delle immagini.

## Struttura del progetto

```
imagegen-webapp/
├── server.js          # Backend Express per lo sviluppo locale (endpoint /api/generate, /api/edit, /api/health)
├── middleware.js       # Protezione con password (Basic Auth) per il deploy su Vercel
├── lib/
│   └── imageService.js # Logica condivisa per parlare con l'API Immagini di OpenAI
├── api/
│   ├── generate.js     # Funzione serverless Vercel equivalente a POST /api/generate
│   ├── edit.js          # Funzione serverless Vercel equivalente a POST /api/edit
│   └── health.js        # Funzione serverless Vercel equivalente a GET /api/health
├── package.json
├── .env.example        # Modello per la configurazione di chiave API e password
├── public/
│   ├── index.html      # Form e layout della pagina
│   ├── style.css        # Stile
│   └── app.js            # Logica frontend (generazione, editing incrementale, download)
└── README.md
```

Nota: `server.js` (Express) viene usato solo in sviluppo locale (`npm start`). Su Vercel, a servire le stesse richieste sono le funzioni in `api/` più i file statici in `public/`: la logica è condivisa tramite `lib/imageService.js` per evitare di doverla mantenere in due posti.

## Personalizzazioni possibili

- **Numero massimo di immagini per richiesta**: modifica il limite `count > 4` sia in `server.js` sia in `api/generate.js`.
- **Formati/qualità disponibili**: aggiungi opzioni nei `<select>` in `public/index.html` (rispettando i valori accettati da gpt-image-1: size `1024x1024`, `1024x1536`, `1536x1024`, `auto`; quality `low`, `medium`, `high`, `auto`).
- **Porta del server locale**: imposta `PORT=xxxx` nel file `.env`.

## Risoluzione problemi

- **"Nessuna API key OpenAI configurata"** → in locale controlla di aver creato il file `.env` (non `.env.example`) con la chiave corretta e riavvia il server; su Vercel controlla di aver impostato `OPENAI_API_KEY` nelle Environment Variables e di aver rifatto il deploy dopo averla aggiunta.
- **Errore 401** → la chiave OpenAI non è valida: rigenerala su platform.openai.com.
- **Errore 429** → hai esaurito il credito o superato i limiti di richieste: controlla la sezione Billing del tuo account OpenAI.
- **Il server locale non parte** → assicurati di aver eseguito `npm install` nella cartella del progetto e di usare Node 18+.
- **La modifica di un'immagine fallisce con errore 400** → riprova con un'istruzione più semplice/breve; alcune richieste di editing molto complesse o ambigue vengono rifiutate dal modello.
- **Il sito online risponde sempre con errore 500 "Accesso non configurato"** → manca (o non è stato applicato) `BASIC_AUTH_PASSWORD` su Vercel: impostala nelle Environment Variables e rifai il deploy.
- **Il sito online chiede utente/password ma le tue credenziali corrette vengono rifiutate** → hai impostato la variabile ma non hai rifatto il deploy dopo averla salvata: le funzioni serverless leggono le variabili d'ambiente solo a partire dal deployment successivo.
- **Su Vercel, la modifica di un'immagine molto grande fallisce** → il piano Free di Vercel ha un limite di payload di circa 4.5MB per richiesta; riprova a qualità media invece che alta.
