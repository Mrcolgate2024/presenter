const socket = io();

const slideNum = document.getElementById('slide-num');
const slideTotal = document.getElementById('slide-total');
const progressBar = document.getElementById('progress-bar');
const notesEl = document.getElementById('notes');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const swipeArea = document.getElementById('swipe-area');

let state = { indexh: 0, indexv: 0, totalSlides: 0, notes: [] };
let timerStarted = false;
let timerStart = null;
let timerInterval = null;

// Connection status
socket.on('connect', () => {
  statusEl.className = 'connection-status connected';
});
socket.on('disconnect', () => {
  statusEl.className = 'connection-status disconnected';
});

// State sync
socket.on('state-update', (s) => {
  state = s;
  updateUI();
});

socket.on('slide-changed', (s) => {
  state = s;
  startTimer();
  updateUI();
});

// Navigation
btnNext.addEventListener('click', () => {
  socket.emit('navigate', 'next');
  startTimer();
});

btnPrev.addEventListener('click', () => {
  socket.emit('navigate', 'prev');
});

// Keyboard
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    socket.emit('navigate', 'next');
    startTimer();
  } else if (e.key === 'ArrowLeft') {
    socket.emit('navigate', 'prev');
  }
});

// Swipe gestures
let touchStartX = 0;
let touchStartY = 0;

swipeArea.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

swipeArea.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    if (dx < 0) {
      socket.emit('navigate', 'next');
      startTimer();
    } else {
      socket.emit('navigate', 'prev');
    }
  }
}, { passive: true });

// Haptic feedback
btnNext.addEventListener('touchstart', () => {
  if (navigator.vibrate) navigator.vibrate(10);
}, { passive: true });
btnPrev.addEventListener('touchstart', () => {
  if (navigator.vibrate) navigator.vibrate(10);
}, { passive: true });

// Timer
function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  timerStart = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  if (!timerStart) return;
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const sec = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${min}:${sec}`;
}

// UI update
function updateUI() {
  const current = state.indexh + 1;
  const total = state.totalSlides || 1;
  slideNum.textContent = current;
  slideTotal.textContent = total;
  progressBar.style.width = `${(current / total) * 100}%`;

  // Find notes for current slide
  const note = (state.notes || []).find(
    n => n.indexh === state.indexh && n.indexv === (state.indexv || 0)
  );
  notesEl.textContent = note ? note.text : '';
}

updateUI();
