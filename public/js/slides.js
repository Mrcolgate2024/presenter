const socket = io();
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
    const res = await fetch(`/api/presentations/${file}`);
    const data = await res.json();
    const html = DeckRenderer.render(data.content);
    document.getElementById('slides-container').innerHTML = html;
  } else if (ext === 'md') {
    const res = await fetch(`/api/presentations/${file}`);
    const data = await res.json();
    const slides = parseMarkdownSlides(data.content);
    document.getElementById('slides-container').innerHTML = slides;
  } else if (ext === 'pdf') {
    await loadPdfSlides(`/uploads/${file}`);
  } else {
    document.getElementById('slides-container').innerHTML = `<section><h2>Unsupported format: ${ext}</h2></section>`;
  }

  initReveal();
}

function parseMarkdownSlides(content) {
  // Remove frontmatter
  content = content.replace(/^---\n[\s\S]*?\n---\n/, '');

  // Split by horizontal rule (---)
  const slides = content.split(/\n---\n/);

  return slides.map(slide => {
    // Check for vertical slides (separated by -v-)
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
  // Load PDF.js from CDN
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs';
  script.type = 'module';

  // Use image-based approach for PDF
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

    // Notify server
    socket.emit('presentation-loaded', {
      presentation: file,
      totalSlides,
      notes: allNotes
    });

    // Listen for slide changes (this presenter controls)
    if (mode === 'presenter') {
      deck.on('slidechanged', (event) => {
        socket.emit('slide-changed', {
          indexh: event.indexh,
          indexv: event.indexv,
          totalSlides,
          notes: allNotes
        });
      });
    }

    // Listen for remote navigation
    socket.on('navigate', (direction) => {
      if (direction === 'next') deck.next();
      else if (direction === 'prev') deck.prev();
      else if (direction === 'up') deck.up();
      else if (direction === 'down') deck.down();
    });

    socket.on('navigate-to', (data) => {
      deck.slide(data.indexh, data.indexv || 0);
    });

    // Audience mode: follow presenter
    if (mode === 'audience') {
      socket.on('slide-changed', (state) => {
        deck.slide(state.indexh, state.indexv || 0);
      });
      socket.on('state-update', (state) => {
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
