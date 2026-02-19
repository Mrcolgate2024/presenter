/**
 * Deck Renderer
 * Converts .deck JSON format to reveal.js HTML sections
 */
class DeckRenderer {

  /**
   * Render a full .deck presentation to reveal.js HTML
   * @param {Object} deck - The parsed .deck JSON
   * @returns {string} HTML string of <section> elements
   */
  static render(deck) {
    if (!deck || !deck.scenes) return '<section><h2>Empty presentation</h2></section>';
    return deck.scenes.map(scene => this.renderScene(scene)).join('\n');
  }

  /**
   * Render a single scene to a reveal.js <section>
   */
  static renderScene(scene) {
    const mood = scene.mood || 'calm';
    const layout = scene.layout || 'center';
    const notes = scene.notes ? `<aside class="notes">${this.escapeHtml(scene.notes)}</aside>` : '';

    const blocksHtml = (scene.beats || []).map((beat, i) => {
      return this.renderBeat(beat, i);
    }).join('\n');

    return `<section data-mood="${mood}" data-layout="${layout}" data-scene-id="${scene.id || ''}">
  <div class="deck-scene mood-${mood} layout-${layout}">
    ${blocksHtml}
  </div>
  ${notes}
</section>`;
  }

  /**
   * Render a single beat/block
   */
  static renderBeat(beat, index) {
    const enter = beat.enter || 'fade';
    const position = beat.position ? `beat-${beat.position}` : '';
    const delay = beat.delay ? `animation-delay: ${beat.delay}s;` : '';
    const fragment = index > 0 ? 'class="fragment"' : '';

    let inner = '';

    switch (beat.block) {
      case 'title':
        inner = `<div class="block-title">${this.escapeHtml(beat.text || '')}</div>`;
        break;

      case 'subtitle':
        inner = `<div class="block-subtitle">${this.escapeHtml(beat.text || '')}</div>`;
        break;

      case 'heading':
        inner = `<div class="block-heading">${this.escapeHtml(beat.text || '')}</div>`;
        break;

      case 'text':
        inner = `<div class="block-text">${this.escapeHtml(beat.text || '')}</div>`;
        break;

      case 'list':
        if (beat.reveal === 'one-by-one') {
          const items = (beat.items || []).map((item, j) =>
            `<li ${j > 0 ? 'class="fragment"' : ''}>${this.escapeHtml(item)}</li>`
          ).join('\n');
          inner = `<ul class="block-list">${items}</ul>`;
        } else {
          const items = (beat.items || []).map(item =>
            `<li>${this.escapeHtml(item)}</li>`
          ).join('\n');
          inner = `<ul class="block-list">${items}</ul>`;
        }
        break;

      case 'code':
        const lang = beat.language || '';
        const code = this.escapeHtml(beat.code || '');
        inner = `<div class="block-code"><pre><code class="language-${lang}">${code}</code></pre></div>`;
        break;

      case 'metric':
        inner = `<div class="block-metric">
  <div class="metric-value">${this.escapeHtml(beat.value || '')}</div>
  <div class="metric-label">${this.escapeHtml(beat.label || '')}</div>
</div>`;
        break;

      case 'quote':
        const attribution = beat.attribution
          ? `<div class="quote-attribution">— ${this.escapeHtml(beat.attribution)}</div>` : '';
        inner = `<blockquote class="block-quote">
  ${this.escapeHtml(beat.text || '')}
  ${attribution}
</blockquote>`;
        break;

      case 'image':
        const alt = beat.alt || '';
        inner = `<div class="block-image"><img src="${this.escapeHtml(beat.src || '')}" alt="${this.escapeHtml(alt)}"></div>`;
        break;

      case 'comparison':
        inner = `<div class="block-comparison">
  <div class="comp-side">
    <div class="block-heading">${this.escapeHtml(beat.left?.title || '')}</div>
    <div class="block-text">${this.escapeHtml(beat.left?.text || '')}</div>
  </div>
  <div class="comp-vs">VS</div>
  <div class="comp-side">
    <div class="block-heading">${this.escapeHtml(beat.right?.title || '')}</div>
    <div class="block-text">${this.escapeHtml(beat.right?.text || '')}</div>
  </div>
</div>`;
        break;

      case 'embed':
        if (beat.src && (beat.src.endsWith('.mp4') || beat.src.endsWith('.webm'))) {
          inner = `<div class="block-embed"><video src="${this.escapeHtml(beat.src)}" controls></video></div>`;
        } else {
          inner = `<div class="block-embed"><iframe src="${this.escapeHtml(beat.src || '')}" width="800" height="450"></iframe></div>`;
        }
        break;

      default:
        inner = `<div class="block-text">${this.escapeHtml(beat.text || '')}</div>`;
    }

    return `<div class="block-container enter-${enter} ${position}" ${fragment} style="${delay}">
  ${inner}
</div>`;
  }

  /**
   * Render a single scene for live preview (standalone, no reveal.js wrapping)
   */
  static renderScenePreview(scene) {
    const mood = scene.mood || 'calm';
    const layout = scene.layout || 'center';

    const blocksHtml = (scene.beats || []).map((beat, i) => {
      return this.renderBeatPreview(beat, i);
    }).join('\n');

    return `<div class="deck-scene mood-${mood} layout-${layout}">
  ${blocksHtml}
</div>`;
  }

  /**
   * Render a beat for preview (all visible, no fragments)
   */
  static renderBeatPreview(beat, index) {
    const enter = beat.enter || 'fade';
    const position = beat.position ? `beat-${beat.position}` : '';
    let inner = '';

    switch (beat.block) {
      case 'title':
        inner = `<div class="block-title">${this.escapeHtml(beat.text || '')}</div>`;
        break;
      case 'subtitle':
        inner = `<div class="block-subtitle">${this.escapeHtml(beat.text || '')}</div>`;
        break;
      case 'heading':
        inner = `<div class="block-heading">${this.escapeHtml(beat.text || '')}</div>`;
        break;
      case 'text':
        inner = `<div class="block-text">${this.escapeHtml(beat.text || '')}</div>`;
        break;
      case 'list':
        const items = (beat.items || []).map(item => `<li>${this.escapeHtml(item)}</li>`).join('\n');
        inner = `<ul class="block-list">${items}</ul>`;
        break;
      case 'code':
        inner = `<div class="block-code"><pre><code class="language-${beat.language || ''}">${this.escapeHtml(beat.code || '')}</code></pre></div>`;
        break;
      case 'metric':
        inner = `<div class="block-metric"><div class="metric-value">${this.escapeHtml(beat.value || '')}</div><div class="metric-label">${this.escapeHtml(beat.label || '')}</div></div>`;
        break;
      case 'quote':
        const attr = beat.attribution ? `<div class="quote-attribution">— ${this.escapeHtml(beat.attribution)}</div>` : '';
        inner = `<blockquote class="block-quote">${this.escapeHtml(beat.text || '')}${attr}</blockquote>`;
        break;
      case 'image':
        inner = `<div class="block-image"><img src="${this.escapeHtml(beat.src || '')}" alt="${this.escapeHtml(beat.alt || '')}"></div>`;
        break;
      case 'comparison':
        inner = `<div class="block-comparison"><div class="comp-side"><div class="block-heading">${this.escapeHtml(beat.left?.title || '')}</div><div class="block-text">${this.escapeHtml(beat.left?.text || '')}</div></div><div class="comp-vs">VS</div><div class="comp-side"><div class="block-heading">${this.escapeHtml(beat.right?.title || '')}</div><div class="block-text">${this.escapeHtml(beat.right?.text || '')}</div></div></div>`;
        break;
      case 'embed':
        inner = `<div class="block-embed"><em>[Embed: ${this.escapeHtml(beat.src || '')}]</em></div>`;
        break;
      default:
        inner = `<div class="block-text">${this.escapeHtml(beat.text || '')}</div>`;
    }

    return `<div class="block-container visible enter-${enter} ${position}">${inner}</div>`;
  }

  /**
   * Extract all notes from a deck
   */
  static extractNotes(deck) {
    if (!deck || !deck.scenes) return [];
    return deck.scenes.map((scene, i) => ({
      indexh: i,
      indexv: 0,
      text: scene.notes || ''
    }));
  }

  /**
   * Create an empty deck
   */
  static createEmpty(title = 'Untitled') {
    return {
      meta: {
        title,
        author: '',
        created: new Date().toISOString().split('T')[0],
        palette: 'default'
      },
      scenes: [
        {
          id: 'intro',
          mood: 'dramatic',
          layout: 'center',
          beats: [
            { block: 'title', text: title, enter: 'fade' },
            { block: 'subtitle', text: 'Click to edit', enter: 'rise' }
          ],
          notes: ''
        }
      ]
    };
  }

  /**
   * Create an empty scene
   */
  static createScene(id = '') {
    return {
      id: id || 'scene-' + Date.now(),
      mood: 'calm',
      layout: 'center',
      beats: [
        { block: 'heading', text: 'New Scene', enter: 'fade' }
      ],
      notes: ''
    };
  }

  /**
   * Create an empty beat of a given block type
   */
  static createBeat(blockType = 'text') {
    const defaults = {
      title: { block: 'title', text: 'Title', enter: 'fade' },
      subtitle: { block: 'subtitle', text: 'Subtitle', enter: 'rise' },
      heading: { block: 'heading', text: 'Heading', enter: 'fade' },
      text: { block: 'text', text: 'Your text here', enter: 'fade' },
      list: { block: 'list', items: ['Item 1', 'Item 2', 'Item 3'], reveal: 'one-by-one', enter: 'rise' },
      code: { block: 'code', language: 'javascript', code: '// Your code here', enter: 'fade' },
      metric: { block: 'metric', value: '99%', label: 'Description', enter: 'zoom' },
      quote: { block: 'quote', text: 'Your quote here', attribution: 'Author', enter: 'fade' },
      image: { block: 'image', src: '', alt: '', enter: 'fade' },
      comparison: { block: 'comparison', left: { title: 'Option A', text: 'Description' }, right: { title: 'Option B', text: 'Description' }, enter: 'fade' },
      embed: { block: 'embed', src: '', enter: 'fade' }
    };
    return defaults[blockType] || defaults.text;
  }

  static escapeHtml(str) {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = str;
      return div.innerHTML;
    }
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeckRenderer;
} else if (typeof window !== 'undefined') {
  window.DeckRenderer = DeckRenderer;
}
