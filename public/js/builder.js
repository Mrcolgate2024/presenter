/**
 * Presentation Builder
 * Visual editor for .deck format
 */

// State
let deck = null;
let selectedSceneIndex = 0;
let selectedBeatIndex = -1;
let isDirty = false;

// DOM refs
const titleInput = document.getElementById('deck-title');
const sceneListEl = document.getElementById('scene-list-items');
const previewFrame = document.getElementById('preview-frame');
const beatsListEl = document.getElementById('beats-list');
const timelineEl = document.getElementById('timeline');
const propSceneId = document.getElementById('prop-scene-id');
const propSceneNotes = document.getElementById('prop-scene-notes');
const propLayout = document.getElementById('prop-layout');
const moodGrid = document.getElementById('mood-grid');
const blockDropdown = document.getElementById('block-dropdown');

// Init
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const file = params.get('file');

  if (file) {
    try {
      const res = await fetch(`/api/presentations/${file}`);
      const data = await res.json();
      if (data.type === 'deck') {
        deck = data.content;
      }
    } catch (e) {
      console.error('Failed to load deck:', e);
    }
  }

  if (!deck) {
    deck = DeckRenderer.createEmpty('Untitled');
  }

  titleInput.value = deck.meta?.title || 'Untitled';
  selectScene(0);
  render();
})();

// ==================== RENDERING ====================

function render() {
  renderSceneList();
  renderProperties();
  renderPreview();
  renderTimeline();
}

function renderSceneList() {
  sceneListEl.innerHTML = deck.scenes.map((scene, i) => {
    const active = i === selectedSceneIndex ? 'active' : '';
    const mood = scene.mood || 'calm';
    return `<div class="scene-item ${active}" data-index="${i}">
      <div class="mood-strip mood-strip-${mood}"></div>
      <div class="scene-id">${scene.id || `Scene ${i + 1}`}</div>
      <div class="scene-mood">${mood} &middot; ${scene.layout || 'center'} &middot; ${(scene.beats || []).length} blocks</div>
      ${deck.scenes.length > 1 ? `<button class="scene-delete" data-index="${i}">&times;</button>` : ''}
    </div>`;
  }).join('');

  // Click handlers
  sceneListEl.querySelectorAll('.scene-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('scene-delete')) return;
      selectScene(parseInt(el.dataset.index));
    });
  });

  sceneListEl.querySelectorAll('.scene-delete').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteScene(parseInt(el.dataset.index));
    });
  });
}

function renderProperties() {
  const scene = currentScene();
  if (!scene) return;

  propSceneId.value = scene.id || '';
  propSceneNotes.value = scene.notes || '';
  propLayout.value = scene.layout || 'center';

  // Mood chips
  moodGrid.querySelectorAll('.mood-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.mood === (scene.mood || 'calm'));
  });

  // Beats
  renderBeatsList();
}

function renderBeatsList() {
  const scene = currentScene();
  if (!scene) return;

  beatsListEl.innerHTML = (scene.beats || []).map((beat, i) => {
    return `<div class="beat-item" data-index="${i}">
      <div class="beat-item-header">
        <span class="beat-type">${beat.block || 'text'}</span>
        <div class="beat-actions">
          ${i > 0 ? `<button class="beat-action-btn" data-action="up" data-index="${i}" title="Move up">&uarr;</button>` : ''}
          ${i < scene.beats.length - 1 ? `<button class="beat-action-btn" data-action="down" data-index="${i}" title="Move down">&darr;</button>` : ''}
          <button class="beat-action-btn" data-action="delete" data-index="${i}" title="Delete">&times;</button>
        </div>
      </div>
      ${renderBeatEditor(beat, i)}
    </div>`;
  }).join('');

  // Beat action handlers
  beatsListEl.querySelectorAll('.beat-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);
      if (action === 'up') moveBeat(index, -1);
      else if (action === 'down') moveBeat(index, 1);
      else if (action === 'delete') deleteBeat(index);
    });
  });

  // Input handlers for beat editing
  beatsListEl.querySelectorAll('[data-beat-field]').forEach(input => {
    input.addEventListener('input', () => {
      const beatIndex = parseInt(input.closest('.beat-item').dataset.index);
      const field = input.dataset.beatField;
      updateBeatField(beatIndex, field, input.value);
    });
  });

  // Enter animation selects
  beatsListEl.querySelectorAll('.beat-enter-select').forEach(select => {
    select.addEventListener('change', () => {
      const beatIndex = parseInt(select.closest('.beat-item').dataset.index);
      const scene = currentScene();
      scene.beats[beatIndex].enter = select.value;
      markDirty();
      renderPreview();
    });
  });

  // List item handlers
  beatsListEl.querySelectorAll('.list-item-input').forEach(input => {
    input.addEventListener('input', () => {
      const beatIndex = parseInt(input.dataset.beatIndex);
      const itemIndex = parseInt(input.dataset.itemIndex);
      const scene = currentScene();
      scene.beats[beatIndex].items[itemIndex] = input.value;
      markDirty();
      renderPreview();
    });
  });

  beatsListEl.querySelectorAll('.list-add-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const beatIndex = parseInt(btn.dataset.beatIndex);
      const scene = currentScene();
      scene.beats[beatIndex].items.push('New item');
      markDirty();
      render();
    });
  });
}

function renderBeatEditor(beat, index) {
  const enterOptions = ['fade', 'rise', 'slide-left', 'slide-right', 'zoom', 'blur', 'bounce', 'typewriter'];
  const enterSelect = `<select class="prop-select beat-enter-select" style="margin-bottom:0.3rem;">
    ${enterOptions.map(o => `<option value="${o}" ${beat.enter === o ? 'selected' : ''}>${o}</option>`).join('')}
  </select>`;

  switch (beat.block) {
    case 'title':
    case 'subtitle':
    case 'heading':
    case 'text':
      return `<input type="text" class="prop-input" data-beat-field="text" value="${escAttr(beat.text || '')}">
        <label class="prop-label">Enter</label>${enterSelect}`;

    case 'list':
      const items = (beat.items || []).map((item, j) =>
        `<input type="text" class="prop-input list-item-input" data-beat-index="${index}" data-item-index="${j}" value="${escAttr(item)}" style="margin-bottom:2px;">`
      ).join('');
      return `${items}
        <button class="beat-action-btn list-add-item" data-beat-index="${index}" style="font-size:0.75rem;color:var(--accent);">+ item</button>
        <label class="prop-label" style="margin-top:0.3rem;">Enter</label>${enterSelect}`;

    case 'code':
      return `<label class="prop-label">Language</label>
        <input type="text" class="prop-input" data-beat-field="language" value="${escAttr(beat.language || '')}">
        <label class="prop-label">Code</label>
        <textarea class="prop-textarea" data-beat-field="code" rows="3">${escAttr(beat.code || '')}</textarea>
        <label class="prop-label">Enter</label>${enterSelect}`;

    case 'metric':
      return `<label class="prop-label">Value</label>
        <input type="text" class="prop-input" data-beat-field="value" value="${escAttr(beat.value || '')}">
        <label class="prop-label">Label</label>
        <input type="text" class="prop-input" data-beat-field="label" value="${escAttr(beat.label || '')}">
        <label class="prop-label">Enter</label>${enterSelect}`;

    case 'quote':
      return `<textarea class="prop-textarea" data-beat-field="text">${escAttr(beat.text || '')}</textarea>
        <label class="prop-label">Attribution</label>
        <input type="text" class="prop-input" data-beat-field="attribution" value="${escAttr(beat.attribution || '')}">
        <label class="prop-label">Enter</label>${enterSelect}`;

    case 'image':
      return `<label class="prop-label">Image URL</label>
        <input type="text" class="prop-input" data-beat-field="src" value="${escAttr(beat.src || '')}">
        <label class="prop-label">Enter</label>${enterSelect}`;

    case 'comparison':
      return `<label class="prop-label">Left Title</label>
        <input type="text" class="prop-input" data-beat-field="left.title" value="${escAttr(beat.left?.title || '')}">
        <label class="prop-label">Left Text</label>
        <input type="text" class="prop-input" data-beat-field="left.text" value="${escAttr(beat.left?.text || '')}">
        <label class="prop-label">Right Title</label>
        <input type="text" class="prop-input" data-beat-field="right.title" value="${escAttr(beat.right?.title || '')}">
        <label class="prop-label">Right Text</label>
        <input type="text" class="prop-input" data-beat-field="right.text" value="${escAttr(beat.right?.text || '')}">
        <label class="prop-label">Enter</label>${enterSelect}`;

    default:
      return `<input type="text" class="prop-input" data-beat-field="text" value="${escAttr(beat.text || '')}">`;
  }
}

function renderPreview() {
  const scene = currentScene();
  if (!scene) {
    previewFrame.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No scene selected</div>';
    return;
  }
  previewFrame.innerHTML = DeckRenderer.renderScenePreview(scene);
}

function renderTimeline() {
  const scene = currentScene();
  if (!scene) return;

  const blockIcons = {
    title: 'H', subtitle: 'h', heading: 'H2', text: 'T', list: '\u2022',
    code: '</>', metric: '#', quote: '\u201C', image: 'IMG', comparison: 'VS', embed: '\u25B6'
  };

  timelineEl.innerHTML = (scene.beats || []).map((beat, i) => {
    const icon = blockIcons[beat.block] || '?';
    const label = beat.text || beat.value || beat.block;
    const truncated = label.length > 20 ? label.substring(0, 20) + '...' : label;
    return `<div class="timeline-beat ${i === selectedBeatIndex ? 'active' : ''}" data-index="${i}">
      <span class="beat-icon">${icon}</span> ${truncated}
    </div>`;
  }).join('');

  timelineEl.querySelectorAll('.timeline-beat').forEach(el => {
    el.addEventListener('click', () => {
      selectedBeatIndex = parseInt(el.dataset.index);
      renderTimeline();
    });
  });
}

// ==================== ACTIONS ====================

function selectScene(index) {
  selectedSceneIndex = Math.max(0, Math.min(index, deck.scenes.length - 1));
  selectedBeatIndex = -1;
  render();
}

function currentScene() {
  return deck.scenes[selectedSceneIndex];
}

function addScene() {
  const newScene = DeckRenderer.createScene();
  deck.scenes.push(newScene);
  markDirty();
  selectScene(deck.scenes.length - 1);
}

function deleteScene(index) {
  if (deck.scenes.length <= 1) return;
  deck.scenes.splice(index, 1);
  markDirty();
  if (selectedSceneIndex >= deck.scenes.length) {
    selectedSceneIndex = deck.scenes.length - 1;
  }
  render();
}

function addBeat(blockType) {
  const scene = currentScene();
  const beat = DeckRenderer.createBeat(blockType);
  scene.beats.push(beat);
  markDirty();
  render();
}

function deleteBeat(index) {
  const scene = currentScene();
  scene.beats.splice(index, 1);
  markDirty();
  render();
}

function moveBeat(index, direction) {
  const scene = currentScene();
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= scene.beats.length) return;
  const [beat] = scene.beats.splice(index, 1);
  scene.beats.splice(newIndex, 0, beat);
  markDirty();
  render();
}

function updateBeatField(beatIndex, field, value) {
  const scene = currentScene();
  const beat = scene.beats[beatIndex];

  // Handle nested fields like "left.title"
  if (field.includes('.')) {
    const [obj, key] = field.split('.');
    if (!beat[obj]) beat[obj] = {};
    beat[obj][key] = value;
  } else {
    beat[field] = value;
  }

  markDirty();
  renderPreview();
  renderTimeline();
}

function markDirty() {
  isDirty = true;
}

async function saveDeck() {
  deck.meta.title = titleInput.value || 'Untitled';
  const filename = (deck.meta.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  try {
    const res = await fetch('/api/presentations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, deck })
    });
    const data = await res.json();
    if (data.success) {
      isDirty = false;
      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('file', data.file);
      history.replaceState({}, '', url);
      showToast('Saved!');
    } else {
      showToast('Save failed: ' + (data.error || 'Unknown error'), true);
    }
  } catch (e) {
    showToast('Save failed: ' + e.message, true);
  }
}

function previewFullscreen() {
  const scene = currentScene();
  if (!scene) return;
  // Save first, then open slides view
  saveDeck().then(() => {
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    if (file) {
      window.open(`/slides.html?file=${encodeURIComponent(file)}`, '_blank');
    } else {
      showToast('Save first to preview', true);
    }
  });
}

function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:1rem;left:50%;transform:translateX(-50%);padding:0.6rem 1.2rem;border-radius:8px;font-size:0.9rem;z-index:9999;animation:deck-fade 0.3s ease;${isError ? 'background:#dc2626;color:#fff;' : 'background:#2ed573;color:#000;'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function escAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==================== EVENT LISTENERS ====================

// Add scene
document.getElementById('btn-add-scene').addEventListener('click', addScene);

// Save
document.getElementById('btn-save').addEventListener('click', saveDeck);

// Preview
document.getElementById('btn-preview').addEventListener('click', previewFullscreen);

// Title change
titleInput.addEventListener('input', () => {
  deck.meta.title = titleInput.value;
  markDirty();
});

// Scene ID change
propSceneId.addEventListener('input', () => {
  const scene = currentScene();
  scene.id = propSceneId.value;
  markDirty();
  renderSceneList();
});

// Scene notes change
propSceneNotes.addEventListener('input', () => {
  const scene = currentScene();
  scene.notes = propSceneNotes.value;
  markDirty();
});

// Layout change
propLayout.addEventListener('change', () => {
  const scene = currentScene();
  scene.layout = propLayout.value;
  markDirty();
  renderPreview();
  renderSceneList();
});

// Mood selection
moodGrid.querySelectorAll('.mood-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const scene = currentScene();
    scene.mood = chip.dataset.mood;
    markDirty();
    render();
  });
});

// Add block dropdown
document.getElementById('btn-add-block').addEventListener('click', (e) => {
  e.stopPropagation();
  blockDropdown.classList.toggle('open');
});

blockDropdown.querySelectorAll('.block-dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    addBeat(item.dataset.block);
    blockDropdown.classList.remove('open');
  });
});

// Close dropdown on outside click
document.addEventListener('click', () => {
  blockDropdown.classList.remove('open');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveDeck();
  }
});

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
