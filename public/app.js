const form = document.getElementById('generate-form');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const submitBtn = document.getElementById('submit-btn');

const sizeSelect = document.getElementById('size');
const qualitySelect = document.getElementById('quality');
const backgroundSelect = document.getElementById('background');

function setStatus(message, kind) {
  statusEl.textContent = message || '';
  statusEl.className = 'status' + (kind ? ` ${kind}` : '');
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Generazione in corso…' : 'Genera immagine';
}

// Crea una card per un'immagine generata, con la possibilità di applicare
// correzioni successive (senza rigenerarla da zero) e di annullare l'ultima modifica.
function createResultCard(initialImage) {
  const history = [initialImage];
  let current = initialImage;

  const card = document.createElement('div');
  card.className = 'result-card';

  const imageEl = document.createElement('img');
  imageEl.alt = 'Immagine generata';

  const downloadLink = document.createElement('a');
  downloadLink.className = 'download-link';
  downloadLink.textContent = 'Scarica PNG';

  const editBox = document.createElement('div');
  editBox.className = 'edit-box';

  const editLabel = document.createElement('label');
  editLabel.textContent = 'Correggi questa immagine';

  const editTextarea = document.createElement('textarea');
  editTextarea.rows = 3;
  editTextarea.maxLength = 4000;
  editTextarea.placeholder = 'Es: rendi il cielo più scuro, sposta il soggetto a sinistra, togli il testo in alto…';

  const editButtonsRow = document.createElement('div');
  editButtonsRow.className = 'edit-buttons';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.textContent = 'Applica modifica';

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'undo-btn';
  undoBtn.textContent = 'Annulla ultima modifica';
  undoBtn.disabled = true;

  const versionLabel = document.createElement('span');
  versionLabel.className = 'version-label';

  const editStatus = document.createElement('p');
  editStatus.className = 'edit-status';

  function refresh() {
    imageEl.src = `data:image/png;base64,${current.b64}`;
    downloadLink.href = imageEl.src;
    downloadLink.download = current.filename || 'immagine.png';
    undoBtn.disabled = history.length <= 1;
    versionLabel.textContent =
      history.length > 1 ? `Versione ${history.length} di ${history.length}` : 'Versione originale';
  }

  editBtn.addEventListener('click', async () => {
    const editPrompt = editTextarea.value.trim();
    if (!editPrompt) {
      editStatus.textContent = 'Scrivi cosa vuoi correggere.';
      editStatus.className = 'edit-status error';
      return;
    }

    editBtn.disabled = true;
    undoBtn.disabled = true;
    editStatus.textContent = 'Applico la modifica, può richiedere qualche decina di secondi…';
    editStatus.className = 'edit-status loading';

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageB64: current.b64,
          prompt: editPrompt,
          size: sizeSelect.value,
          quality: qualitySelect.value,
          background: backgroundSelect.value,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la modifica.');
      }

      current = data.image;
      history.push(current);
      refresh();
      editTextarea.value = '';
      editStatus.textContent = 'Modifica applicata.';
      editStatus.className = 'edit-status success';
    } catch (err) {
      editStatus.textContent = err.message || 'Errore imprevisto durante la modifica.';
      editStatus.className = 'edit-status error';
    } finally {
      editBtn.disabled = false;
      undoBtn.disabled = history.length <= 1;
    }
  });

  undoBtn.addEventListener('click', () => {
    if (history.length <= 1) return;
    history.pop();
    current = history[history.length - 1];
    refresh();
    editStatus.textContent = 'Tornato alla versione precedente.';
    editStatus.className = 'edit-status success';
  });

  editButtonsRow.appendChild(editBtn);
  editButtonsRow.appendChild(undoBtn);
  editButtonsRow.appendChild(versionLabel);

  editBox.appendChild(editLabel);
  editBox.appendChild(editTextarea);
  editBox.appendChild(editButtonsRow);
  editBox.appendChild(editStatus);

  card.appendChild(imageEl);
  card.appendChild(downloadLink);
  card.appendChild(editBox);

  refresh();
  return card;
}

function renderResults(images) {
  resultsEl.innerHTML = '';
  images.forEach((img) => {
    resultsEl.appendChild(createResultCard(img));
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    prompt: formData.get('prompt'),
    size: formData.get('size'),
    quality: formData.get('quality'),
    background: formData.get('background'),
    n: formData.get('n'),
  };

  if (!payload.prompt || !payload.prompt.trim()) {
    setStatus('Inserisci una descrizione per l\'immagine.', 'error');
    return;
  }

  setLoading(true);
  setStatus('Generazione in corso, può richiedere fino a un minuto…', 'loading');
  resultsEl.innerHTML = '';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Errore durante la generazione.');
    }

    renderResults(data.images);
    setStatus(`Fatto! ${data.images.length} immagine/i generata/e.`, 'success');
  } catch (err) {
    setStatus(err.message || 'Errore imprevisto.', 'error');
    resultsEl.innerHTML = '<p class="empty-state">Nessuna immagine generata.</p>';
  } finally {
    setLoading(false);
  }
});
