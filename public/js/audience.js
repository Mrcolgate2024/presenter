const socket = io();
const statusEl = document.getElementById('status');

let deck = null;

socket.on('connect', () => {
  statusEl.style.background = '#2ed573';
});
socket.on('disconnect', () => {
  statusEl.style.background = '#ff4757';
});

// When presentation is loaded by presenter, load same slides here
socket.on('state-update', async (state) => {
  if (state.presentation && !deck) {
    await loadPresentation(state.presentation);
    if (deck) {
      deck.slide(state.indexh, state.indexv || 0);
    }
  }
});

socket.on('slide-changed', (state) => {
  if (deck) {
    deck.slide(state.indexh, state.indexv || 0);
  }
});

socket.on('navigate', (direction) => {
  // Audience doesn't respond to navigate directly, only to slide-changed
});

socket.on('navigate-to', (data) => {
  if (deck) {
    deck.slide(data.indexh, data.indexv || 0);
  }
});

async function loadPresentation(file) {
  if (!file) return;
  const ext = file.split('.').pop().toLowerCase();

  const container = document.getElementById('slides-container');

  if (ext === 'deck') {
    const res = await fetch(`/api/presentations/${file}`);
    const data = await res.json();
    container.innerHTML = DeckRenderer.render(data.content);
  } else if (ext === 'md') {
    const res = await fetch(`/api/presentations/${file}`);
    const data = await res.json();
    container.innerHTML = parseMarkdownSlides(data.content);
  } else if (ext === 'pdf') {
    try {
      const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
      const pdf = await pdfjsLib.getDocument(`/uploads/${file}`).promise;
      let html = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        html += `<section><img src="${canvas.toDataURL('image/png')}" style="max-width:100%;max-height:100vh;"></section>`;
      }
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<section><h2>Error loading PDF</h2><p>${err.message}</p></section>`;
    }
  }

  document.getElementById('waiting').style.display = 'none';
  document.getElementById('reveal-container').style.display = 'block';

  deck = new Reveal({
    hash: false,
    controls: false,
    progress: true,
    center: true,
    keyboard: false,
    touch: false,
    transition: 'slide',
    plugins: [RevealMarkdown, RevealHighlight]
  });

  await deck.initialize();
}

function parseMarkdownSlides(content) {
  content = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  const slides = content.split(/\n---\n/);
  return slides.map(slide => {
    const verticals = slide.split(/\n-v-\n/);
    if (verticals.length > 1) {
      const inner = verticals.map(v => {
        const c = v.replace(/\nNote:[\s\S]*?$/, '').trim();
        return `<section data-markdown><textarea data-template>${c}</textarea></section>`;
      }).join('\n');
      return `<section>${inner}</section>`;
    }
    const c = slide.replace(/\nNote:[\s\S]*?$/, '').trim();
    return `<section data-markdown><textarea data-template>${c}</textarea></section>`;
  }).join('\n');
}
