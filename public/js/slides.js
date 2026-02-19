const params = new URLSearchParams(window.location.search);
const file = params.get('file');
const mode = params.get('mode') || 'presenter'; // presenter | audience | embed

let deck;

async function loadPresentation() {
  if (!file) {
    document.getElementById('slides-container').innerHTML = '<section><h2>No presentation selected</h2><p>Go to <a href="/">dashboard</a></p></section>';
    initReveal();
    return;
  }

  const ext = file.split('.').pop().toLowerCase();

  if (ext === 'deck') {
    const pres = await PresentationsDB.get(file);
    const html = DeckRenderer.render(pres.content);
    document.getElementById('slides-container').innerHTML = html;
  } else if (ext === 'md') {
    const pres = await PresentationsDB.get(file);
    const slides = parseMarkdownSlides(pres.markdown_content || pres.content);
    document.getElementById('slides-container').innerHTML = slides;
  } else if (ext === 'pdf') {
    await loadPdfSlides(`/uploads/${file}`);
  } else {
    document.getElementById('slides-container').innerHTML = `<section><h2>Unsupported format: ${ext}</h2></section>`;
  }

  initReveal();
}

function parseMarkdownSlides(content) {
  content = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  const slides = content.split(/\n---\n/);

  return slides.map(slide => {
    const verticals = slide.split(/\n-v-\n/);
    if (verticals.length > 1) {
      const inner = verticals.map(v => {
        const { content: c, notes } = extractNotes(v);
        const notesHtml = notes ? `<aside class="notes">${notes}</aside>` : '';
        return `<section data-markdown><textarea data-template>${c.trim()}</textarea>${notesHtml}</section>`;
      }).join('\n');
      return `<section>${inner}</section>`;
    }

    const { content: c, notes } = extractNotes(slide);
    const notesHtml = notes ? `<aside class="notes">${notes}</aside>` : '';
    return `<section data-markdown><textarea data-template>${c.trim()}</textarea>${notesHtml}</section>`;
  }).join('\n');
}

function extractNotes(slideContent) {
  const noteMatch = slideContent.match(/\nNote:([\s\S]*?)$/);
  if (noteMatch) {
    return {
      content: slideContent.replace(/\nNote:[\s\S]*?$/, ''),
      notes: noteMatch[1].trim()
    };
  }
  return { content: slideContent, notes: '' };
}

async function loadPdfSlides(pdfUrl) {
  const container = document.getElementById('slides-container');
  container.innerHTML = '<section><h2>Loading PDF...</h2></section>';

  try {
    const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    let slidesHtml = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgData = canvas.toDataURL('image/png');
      slidesHtml += `<section><img src="${imgData}" style="max-width:100%;max-height:100vh;"></section>\n`;
    }

    container.innerHTML = slidesHtml;
  } catch (err) {
    container.innerHTML = `<section><h2>Error loading PDF</h2><p>${err.message}</p></section>`;
  }
}

function initReveal() {
  deck = new Reveal({
    hash: false,
    history: false,
    controls: mode !== 'audience',
    progress: true,
    center: true,
    transition: 'slide',
    plugins: [RevealMarkdown, RevealHighlight, RevealNotes]
  });

  deck.initialize().then(() => {
    const totalSlides = deck.getTotalSlides();
    const allNotes = getAllNotes();

    // Notify others that presentation loaded
    broadcast('presentation-loaded', {
      presentation: file,
      totalSlides,
      notes: allNotes
    });

    // Presenter mode: broadcast slide changes
    if (mode === 'presenter') {
      deck.on('slidechanged', (event) => {
        broadcast('slide-changed', {
          indexh: event.indexh,
          indexv: event.indexv,
          totalSlides,
          notes: allNotes
        });
      });
    }

    // Listen for remote navigation
    onBroadcast('navigate', (data) => {
      if (data.direction === 'next') deck.next();
      else if (data.direction === 'prev') deck.prev();
      else if (data.direction === 'up') deck.up();
      else if (data.direction === 'down') deck.down();
    });

    onBroadcast('navigate-to', (data) => {
      deck.slide(data.indexh, data.indexv || 0);
    });

    // Audience mode: follow presenter
    if (mode === 'audience') {
      onBroadcast('slide-changed', (state) => {
        deck.slide(state.indexh, state.indexv || 0);
      });
    }
  });
}

function getAllNotes() {
  const notes = [];
  const sections = document.querySelectorAll('.reveal .slides > section');
  sections.forEach((section, i) => {
    const nested = section.querySelectorAll('section');
    if (nested.length > 0) {
      nested.forEach((s, j) => {
        const aside = s.querySelector('aside.notes');
        notes.push({ indexh: i, indexv: j, text: aside ? aside.textContent : '' });
      });
    } else {
      const aside = section.querySelector('aside.notes');
      notes.push({ indexh: i, indexv: 0, text: aside ? aside.textContent : '' });
    }
  });
  return notes;
}

loadPresentation();
