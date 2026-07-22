(() => {
  'use strict';

  const LEVELS = {
    easy: { pairs: 8, cols: 4, label: 'Easy' },
    medium: { pairs: 12, cols: 6, label: 'Medium' },
    hard: { pairs: 18, cols: 6, label: 'Hard' },
  };

  const EMOJI_POOL = [
    '🦋', '🌺', '🍄', '🦊', '🐙', '🌈', '🦄', '🎸',
    '🪐', '🔮', '🐉', '🍉', '🎭', '🦜', '🌸', '⚡',
    '🎪', '🦁',
  ];

  let currentLevel = null;
  let flippedCards = [];
  let matchedPairs = 0;
  let totalPairs = 0;
  let moves = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let lockBoard = false;

  const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    win: document.getElementById('win-screen')
  };

  const ui = {
    board: document.getElementById('game-board'),
    timer: document.getElementById('stat-timer'),
    moves: document.getElementById('stat-moves'),
    best: document.getElementById('stat-best'),
    pairs: document.getElementById('stat-pairs'),
    winTime: document.getElementById('win-time'),
    winMoves: document.getElementById('win-moves'),
    winNewBest: document.getElementById('win-new-best'),
    winSubtitle: document.getElementById('win-subtitle'),
    confettiBox: document.getElementById('confetti-container')
  };

  const buttons = {
    restart: document.getElementById('btn-restart'),
    back: document.getElementById('btn-back'),
    playAgain: document.getElementById('btn-play-again'),
    changeLevel: document.getElementById('btn-change-level')
  };

  function showScreen(screenEl) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screenEl.classList.add('active');
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function updateTimerDisplay() {
    ui.timer.textContent = formatTime(timerSeconds);
  }

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
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function getBestMoves(level) {
    const val = localStorage.getItem(`memory_best_${level}`);
    return val ? parseInt(val, 10) : null;
  }

  function setBestMoves(level, movesCount) {
    localStorage.setItem(`memory_best_${level}`, movesCount);
  }

  function displayBest() {
    const best = getBestMoves(currentLevel);
    ui.best.textContent = best !== null ? best : '—';
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateCards(pairCount) {
    const selected = shuffle([...EMOJI_POOL]).slice(0, pairCount);
    const deck = shuffle([...selected, ...selected]);
    return deck.map((emoji, id) => ({ id, emoji }));
  }

  function flipCard(cardEl) {
    if (
      lockBoard ||
      cardEl.classList.contains('flipped') ||
      cardEl.classList.contains('matched') ||
      flippedCards.length >= 2
    ) {
      return;
    }

    cardEl.classList.add('flipped');
    cardEl.setAttribute('aria-label', `Card: ${cardEl.dataset.emoji}`);
    flippedCards.push(cardEl);

    if (flippedCards.length === 2) {
      moves++;
      ui.moves.textContent = moves;
      checkMatch();
    }
  }

  function checkMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.emoji === card2.dataset.emoji;

    lockBoard = true;

    if (isMatch) {
      setTimeout(() => {
        card1.classList.add('matched');
        card2.classList.add('matched');
        matchedPairs++;
        ui.pairs.textContent = `${matchedPairs} / ${totalPairs}`;
        flippedCards = [];
        lockBoard = false;

        if (matchedPairs === totalPairs) {
          handleWin();
        }
      }, 400);
    } else {
      setTimeout(() => {
        card1.classList.add('shake');
        card2.classList.add('shake');
      }, 500);

      setTimeout(() => {
        card1.classList.remove('flipped', 'shake');
        card2.classList.remove('flipped', 'shake');
        card1.setAttribute('aria-label', 'Hidden card');
        card2.setAttribute('aria-label', 'Hidden card');
        flippedCards = [];
        lockBoard = false;
      }, 1100);
    }
  }

  function handleWin() {
    stopTimer();

    const best = getBestMoves(currentLevel);
    const isNewBest = best === null || moves < best;

    if (isNewBest) {
      setBestMoves(currentLevel, moves);
    }

    ui.winTime.textContent = formatTime(timerSeconds);
    ui.winMoves.textContent = moves;
    ui.winNewBest.classList.toggle('hidden', !isNewBest);

    if (isNewBest) {
      ui.winSubtitle.textContent = '🎉 New personal best! Incredible!';
    } else if (moves <= totalPairs + 2) {
      ui.winSubtitle.textContent = 'Outstanding memory! Almost perfect!';
    } else if (moves <= totalPairs * 1.5) {
      ui.winSubtitle.textContent = 'Great job! Very efficient playing!';
    } else {
      ui.winSubtitle.textContent = 'Well done! Can you beat your record?';
    }

    setTimeout(() => {
      showScreen(screens.win);
      launchConfetti();
    }, 600);
  }

  function launchConfetti() {
    ui.confettiBox.innerHTML = '';
    const colors = ['#7c3aed', '#a855f7', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#f97316'];
    const fragment = document.createDocumentFragment();

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
      fragment.appendChild(piece);
    }
    
    ui.confettiBox.appendChild(fragment);

    setTimeout(() => {
      ui.confettiBox.innerHTML = '';
    }, 5000);
  }

  function renderBoard(levelConfig) {
    ui.board.innerHTML = '';
    ui.board.className = `game-board ${currentLevel}`;

    const cards = generateCards(levelConfig.pairs);
    totalPairs = levelConfig.pairs;
    
    const fragment = document.createDocumentFragment();

    cards.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'memory-card';
      cardEl.dataset.cardId = card.id;
      cardEl.dataset.emoji = card.emoji;
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('aria-label', 'Hidden card');

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back"></div>
          <div class="card-face card-front">${card.emoji}</div>
        </div>
      `;

      cardEl.addEventListener('click', () => flipCard(cardEl));
      cardEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flipCard(cardEl);
        }
      });

      fragment.appendChild(cardEl);
    });
    
    ui.board.appendChild(fragment);
  }

  function startGame(level) {
    currentLevel = level;
    matchedPairs = 0;
    moves = 0;
    flippedCards = [];
    lockBoard = false;

    ui.moves.textContent = '0';
    ui.pairs.textContent = `0 / ${LEVELS[level].pairs}`;
    displayBest();

    renderBoard(LEVELS[level]);
    showScreen(screens.game);
    startTimer();
  }

  function restartGame() {
    stopTimer();
    startGame(currentLevel);
  }

  function backToMenu() {
    stopTimer();
    showScreen(screens.start);
  }

  function setupEventListeners() {
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(card => {
      card.addEventListener('click', () => {
        const level = card.id.replace('level-', '');
        if (LEVELS[level]) startGame(level);
      });
      
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    buttons.restart.addEventListener('click', restartGame);
    buttons.back.addEventListener('click', backToMenu);
    buttons.playAgain.addEventListener('click', restartGame);
    buttons.changeLevel.addEventListener('click', backToMenu);
  }

  setupEventListeners();
})();
