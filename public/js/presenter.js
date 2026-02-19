const currentFrame = document.getElementById('current-frame');
const nextFrame = document.getElementById('next-frame');
const notesEl = document.getElementById('notes');
const timerEl = document.getElementById('timer');
const slideNumEl = document.getElementById('slide-num');
const slideTotalEl = document.getElementById('slide-total');

let state = { indexh: 0, indexv: 0, totalSlides: 0, notes: [] };
let timerStart = null;
let timerInterval = null;
let framesLoaded = false;

// Realtime listeners
onBroadcast('presentation-loaded', (s) => {
  state = { ...state, ...s, indexh: 0, indexv: 0 };
  if (s.presentation) loadFrames(s.presentation);
  updateUI();
});

onBroadcast('slide-changed', (s) => {
  state = { ...state, ...s };
  startTimer();
  updateFrameSlides();
  updateUI();
});

// Navigation
document.getElementById('btn-next').addEventListener('click', () => {
  broadcast('navigate', { direction: 'next' });
  startTimer();
});

document.getElementById('btn-prev').addEventListener('click', () => {
  broadcast('navigate', { direction: 'prev' });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    broadcast('navigate', { direction: 'next' });
    startTimer();
  } else if (e.key === 'ArrowLeft') {
    broadcast('navigate', { direction: 'prev' });
  }
});

function loadFrames(file) {
  if (framesLoaded) return;
  framesLoaded = true;
  const baseUrl = `/slides.html?file=${encodeURIComponent(file)}`;
  currentFrame.src = baseUrl + '&mode=audience';
  nextFrame.src = baseUrl + '&mode=audience';
}

function updateFrameSlides() {
  try {
    if (currentFrame.contentWindow) {
      currentFrame.contentWindow.postMessage({
        type: 'navigate-to',
        indexh: state.indexh,
        indexv: state.indexv || 0
      }, '*');
    }
    if (nextFrame.contentWindow) {
      const nextH = state.indexh + 1;
      nextFrame.contentWindow.postMessage({
        type: 'navigate-to',
        indexh: nextH < state.totalSlides ? nextH : state.indexh,
        indexv: 0
      }, '*');
    }
  } catch (e) { /* cross-origin safety */ }
}

// Timer
function startTimer() {
  if (timerStart) return;
  timerStart = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!timerStart) return;
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${h}:${m}:${s}`;
}

function updateUI() {
  slideNumEl.textContent = state.indexh + 1;
  slideTotalEl.textContent = state.totalSlides || '?';

  const note = (state.notes || []).find(
    n => n.indexh === state.indexh && n.indexv === (state.indexv || 0)
  );
  notesEl.textContent = note && note.text ? note.text : 'No notes for this slide.';
}
