let deck = null;

// When presenter loads a presentation
onBroadcast('presentation-loaded', async (state) => {
  if (state.presentation && !deck) {
    await loadPresentation(state.presentation);
  }
});

onBroadcast('slide-changed', (state) => {
  if (deck) {
    deck.slide(state.indexh, state.indexv || 0);
  }
});

onBroadcast('navigate-to', (data) => {
  if (deck) {
    deck.slide(data.indexh, data.indexv || 0);
  }
});

async function loadPresentation(file) {
  if (!file) return;
  const ext = file.split('.').pop().toLowerCase();
  const container = document.getElementById('slides-container');

  try {
    const pres = await PresentationsDB.get(file);

    if (ext === 'deck') {
      container.innerHTML = DeckRenderer.render(pres.content);
    } else if (ext === 'md') {
      container.innerHTML = parseMarkdownSlides(pres.markdown_content || pres.content);
    }
  } catch (err) {
    container.innerHTML = `<section><h2>Error loading presentation</h2><p>${err.message}</p></section>`;
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
