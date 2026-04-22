/* ============================================================
   Memory Game — script.js
   Card-flipping memory game with levels, timer, moves & best score.
   ============================================================ */

(() => {
  'use strict';

  // ==================== CONFIG ====================
  const LEVELS = {
    easy:   { pairs: 8,  cols: 4, label: 'Easy' },
    medium: { pairs: 12, cols: 6, label: 'Medium' },
    hard:   { pairs: 18, cols: 6, label: 'Hard' },
  };

  // A curated pool of emojis (visually distinct, attractive)
  const EMOJI_POOL = [
    '🦋', '🌺', '🍄', '🦊', '🐙', '🌈', '🦄', '🎸',
    '🪐', '🔮', '🐉', '🍉', '🎭', '🦜', '🌸', '⚡',
    '🎪', '🦁',
  ];

  // ==================== STATE ====================
  let currentLevel   = null;   // 'easy' | 'medium' | 'hard'
  let cards          = [];     // { id, emoji, el }
  let flippedCards   = [];     // currently flipped (max 2)
  let matchedPairs   = 0;
  let totalPairs     = 0;
  let moves          = 0;
  let timerSeconds   = 0;
  let timerInterval  = null;
  let lockBoard      = false;

  // ==================== DOM REFS ====================
  const $startScreen = document.getElementById('start-screen');
  const $gameScreen  = document.getElementById('game-screen');
  const $winScreen   = document.getElementById('win-screen');

  const $board       = document.getElementById('game-board');
  const $timer       = document.getElementById('stat-timer');
  const $moves       = document.getElementById('stat-moves');
  const $best        = document.getElementById('stat-best');
  const $pairs       = document.getElementById('stat-pairs');

  const $btnRestart  = document.getElementById('btn-restart');
  const $btnBack     = document.getElementById('btn-back');
  const $btnAgain    = document.getElementById('btn-play-again');
  const $btnChange   = document.getElementById('btn-change-level');

  const $winTime     = document.getElementById('win-time');
  const $winMoves    = document.getElementById('win-moves');
  const $winNewBest  = document.getElementById('win-new-best');
  const $winSubtitle = document.getElementById('win-subtitle');

  const $confettiBox = document.getElementById('confetti-container');

  // ==================== SCREENS ====================
  function showScreen(screen) {
    [$startScreen, $gameScreen, $winScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  // ==================== TIMER ====================
  function startTimer() {
    stopTimer();
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    $timer.textContent = `${m}:${s}`;
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  // ==================== BEST SCORE ====================
  function getBestMoves(level) {
    const val = localStorage.getItem(`memory_best_${level}`);
    return val ? parseInt(val, 10) : null;
  }

  function setBestMoves(level, movesCount) {
    localStorage.setItem(`memory_best_${level}`, movesCount);
  }

  function displayBest() {
    const best = getBestMoves(currentLevel);
    $best.textContent = best !== null ? best : '—';
  }

  // ==================== CARD GENERATOR ====================
  function generateCards(pairCount) {
    // Pick random emojis from the pool
    const selected = shuffle([...EMOJI_POOL]).slice(0, pairCount);
    // Duplicate for pairs and shuffle
    const deck = shuffle([...selected, ...selected]);
    return deck.map((emoji, i) => ({ id: i, emoji }));
  }

  // Fisher-Yates shuffle
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ==================== BOARD RENDERING ====================
  function renderBoard() {
    const lvl = LEVELS[currentLevel];
    $board.innerHTML = '';
    $board.className = `game-board ${currentLevel}`;

    cards = generateCards(lvl.pairs);
    totalPairs = lvl.pairs;

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'memory-card';
      el.dataset.cardId = card.id;
      el.dataset.emoji  = card.emoji;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Hidden card');

      el.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back"></div>
          <div class="card-face card-front">${card.emoji}</div>
        </div>
      `;

      el.addEventListener('click', () => flipCard(el));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flipCard(el);
        }
      });

      $board.appendChild(el);
      card.el = el;
    });
  }

  // ==================== GAME LOGIC ====================
  function flipCard(el) {
    // Guard: ignore if board is locked, card already flipped, or already matched
    if (lockBoard) return;
    if (el.classList.contains('flipped')) return;
    if (el.classList.contains('matched')) return;
    if (flippedCards.length >= 2) return;

    el.classList.add('flipped');
    el.setAttribute('aria-label', `Card: ${el.dataset.emoji}`);
    flippedCards.push(el);

    if (flippedCards.length === 2) {
      moves++;
      $moves.textContent = moves;
      checkMatch();
    }
  }

  function checkMatch() {
    const [a, b] = flippedCards;
    const isMatch = a.dataset.emoji === b.dataset.emoji;

    lockBoard = true;

    if (isMatch) {
      // Match!
      setTimeout(() => {
        a.classList.add('matched');
        b.classList.add('matched');
        matchedPairs++;
        $pairs.textContent = `${matchedPairs} / ${totalPairs}`;
        flippedCards = [];
        lockBoard = false;

        if (matchedPairs === totalPairs) {
          onWin();
        }
      }, 400);
    } else {
      // No match — shake then flip back
      setTimeout(() => {
        a.classList.add('shake');
        b.classList.add('shake');
      }, 500);

      setTimeout(() => {
        a.classList.remove('flipped', 'shake');
        b.classList.remove('flipped', 'shake');
        a.setAttribute('aria-label', 'Hidden card');
        b.setAttribute('aria-label', 'Hidden card');
        flippedCards = [];
        lockBoard = false;
      }, 1100);
    }
  }

  // ==================== WIN ====================
  function onWin() {
    stopTimer();

    const best = getBestMoves(currentLevel);
    const isNewBest = best === null || moves < best;

    if (isNewBest) {
      setBestMoves(currentLevel, moves);
    }

    // Fill win screen stats
    $winTime.textContent  = formatTime(timerSeconds);
    $winMoves.textContent = moves;
    $winNewBest.classList.toggle('hidden', !isNewBest);

    // Dynamic subtitle
    if (isNewBest) {
      $winSubtitle.textContent = '🎉 New personal best! Incredible!';
    } else if (moves <= totalPairs + 2) {
      $winSubtitle.textContent = 'Outstanding memory! Almost perfect!';
    } else if (moves <= totalPairs * 1.5) {
      $winSubtitle.textContent = 'Great job! Very efficient playing!';
    } else {
      $winSubtitle.textContent = 'Well done! Can you beat your record?';
    }

    setTimeout(() => {
      showScreen($winScreen);
      launchConfetti();
    }, 600);
  }

  // ==================== CONFETTI ====================
  function launchConfetti() {
    $confettiBox.innerHTML = '';
    const colors = ['#7c3aed', '#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#f97316'];

    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.classList.add('confetti-piece');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 6;
      const left = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const duration = Math.random() * 2 + 2;
      const shape = Math.random() > 0.5 ? '50%' : '2px';

      piece.style.cssText = `
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${shape};
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
      `;
      $confettiBox.appendChild(piece);
    }

    // Clean up confetti after animation
    setTimeout(() => {
      $confettiBox.innerHTML = '';
    }, 5000);
  }

  // ==================== GAME SETUP ====================
  function startGame(level) {
    currentLevel = level;
    matchedPairs = 0;
    moves = 0;
    flippedCards = [];
    lockBoard = false;

    $moves.textContent = '0';
    $pairs.textContent = `0 / ${LEVELS[level].pairs}`;
    displayBest();

    renderBoard();
    showScreen($gameScreen);
    startTimer();
  }

  function restartGame() {
    stopTimer();
    startGame(currentLevel);
  }

  function backToMenu() {
    stopTimer();
    showScreen($startScreen);
  }

  // ==================== EVENT LISTENERS ====================
  // Level selection
  document.getElementById('level-easy').addEventListener('click', () => startGame('easy'));
  document.getElementById('level-medium').addEventListener('click', () => startGame('medium'));
  document.getElementById('level-hard').addEventListener('click', () => startGame('hard'));

  // Keyboard support for level cards
  document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Game controls
  $btnRestart.addEventListener('click', restartGame);
  $btnBack.addEventListener('click', backToMenu);
  $btnAgain.addEventListener('click', restartGame);
  $btnChange.addEventListener('click', backToMenu);

})();
