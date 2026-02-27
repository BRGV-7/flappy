// PICHUKA game implemented with HTML/CSS/vanilla JS.
(() => {
  "use strict";

  const game = document.getElementById("game");
  const bird = document.getElementById("bird");
  const pipesContainer = document.getElementById("pipes");
  const scoreBoard = document.getElementById("scoreBoard");
  const overlay = document.getElementById("overlay");

  const STORAGE_KEY = "pichuka_high_score";

  const state = {
    gameState: "start", // start | playing | gameover
    birdX: 90,
    birdY: 0,
    birdVelocity: 0,
    gravity: 0.45,
    jumpStrength: -8.5,
    pipeSpeed: 2.4,
    pipeWidth: 68,
    pipeGap: 170,
    pipeInterval: 1550,
    minPipeHeight: 70,
    score: 0,
    highScore: 0,
    pipes: [],
    lastPipeTime: 0,
    lastFrameTime: 0,
    animationFrameId: null
  };

  function getSizes() {
    const gameRect = game.getBoundingClientRect();
    return {
      gameWidth: gameRect.width,
      gameHeight: gameRect.height,
      groundHeight: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ground-height")),
      birdWidth: bird.offsetWidth,
      birdHeight: bird.offsetHeight
    };
  }

  function loadHighScore() {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    state.highScore = Number.isFinite(saved) && saved > 0 ? saved : 0;
  }

  function saveHighScore() {
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }

  function updateScoreBoard() {
    scoreBoard.textContent = `Score: ${state.score} | High: ${state.highScore}`;
  }

  function setOverlay(message, visible) {
    overlay.textContent = message;
    overlay.classList.toggle("hidden", !visible);
  }

  function placeBird() {
    bird.style.left = `${state.birdX}px`;
    bird.style.top = `${state.birdY}px`;
    const angle = Math.max(-25, Math.min(70, state.birdVelocity * 4));
    bird.style.transform = `rotate(${angle}deg)`;
  }

  function clearPipes() {
    state.pipes.forEach((pipe) => {
      pipe.topEl.remove();
      pipe.bottomEl.remove();
    });
    state.pipes = [];
  }

  function resetBird() {
    const { gameHeight, groundHeight, birdHeight } = getSizes();
    state.birdY = (gameHeight - groundHeight - birdHeight) / 2;
    state.birdVelocity = 0;
    placeBird();
  }

  function resetGameState() {
    state.score = 0;
    state.lastPipeTime = 0;
    state.lastFrameTime = 0;
    clearPipes();
    resetBird();
    updateScoreBoard();
  }

  function createPipe(now) {
    const { gameWidth, gameHeight, groundHeight } = getSizes();
    const availableHeight = gameHeight - groundHeight;
    const maxTopHeight = availableHeight - state.pipeGap - state.minPipeHeight;
    const topHeight =
      Math.random() * (maxTopHeight - state.minPipeHeight) + state.minPipeHeight;
    const bottomY = topHeight + state.pipeGap;
    const bottomHeight = availableHeight - bottomY;

    const topEl = document.createElement("div");
    topEl.className = "pipe pipe-top";
    topEl.style.left = `${gameWidth}px`;
    topEl.style.width = `${state.pipeWidth}px`;
    topEl.style.height = `${topHeight}px`;

    const bottomEl = document.createElement("div");
    bottomEl.className = "pipe pipe-bottom";
    bottomEl.style.left = `${gameWidth}px`;
    bottomEl.style.width = `${state.pipeWidth}px`;
    bottomEl.style.top = `${bottomY}px`;
    bottomEl.style.height = `${bottomHeight}px`;

    pipesContainer.appendChild(topEl);
    pipesContainer.appendChild(bottomEl);

    state.pipes.push({
      x: gameWidth,
      topHeight,
      bottomY,
      passed: false,
      topEl,
      bottomEl
    });

    state.lastPipeTime = now;
  }

  function updatePipes(deltaSec) {
    const moveBy = state.pipeSpeed * 60 * deltaSec;
    const { birdWidth } = getSizes();
    const birdFront = state.birdX + birdWidth;

    state.pipes.forEach((pipe) => {
      pipe.x -= moveBy;
      pipe.topEl.style.left = `${pipe.x}px`;
      pipe.bottomEl.style.left = `${pipe.x}px`;

      if (!pipe.passed && birdFront > pipe.x + state.pipeWidth) {
        pipe.passed = true;
        state.score += 1;
        if (state.score > state.highScore) {
          state.highScore = state.score;
          saveHighScore();
        }
        updateScoreBoard();
      }
    });

    state.pipes = state.pipes.filter((pipe) => {
      const visible = pipe.x + state.pipeWidth > -10;
      if (!visible) {
        pipe.topEl.remove();
        pipe.bottomEl.remove();
      }
      return visible;
    });
  }

  function intersects(a, b) {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  function hasCollision() {
    const { gameHeight, groundHeight } = getSizes();
    const birdRect = bird.getBoundingClientRect();
    const gameRect = game.getBoundingClientRect();

    const birdTop = birdRect.top - gameRect.top;
    const birdBottom = birdRect.bottom - gameRect.top;

    if (birdTop <= 0) {
      return true;
    }

    if (birdBottom >= gameHeight - groundHeight) {
      return true;
    }

    for (const pipe of state.pipes) {
      if (intersects(birdRect, pipe.topEl.getBoundingClientRect())) {
        return true;
      }
      if (intersects(birdRect, pipe.bottomEl.getBoundingClientRect())) {
        return true;
      }
    }

    return false;
  }

  function endGame() {
    state.gameState = "gameover";
    cancelAnimationFrame(state.animationFrameId);
    setOverlay(
      `Game Over - PICHUKA\nScore: ${state.score}\nHigh Score: ${state.highScore}\nPress Space to Restart`,
      true
    );
  }

  function gameLoop(now) {
    if (state.gameState !== "playing") {
      return;
    }

    if (!state.lastFrameTime) {
      state.lastFrameTime = now;
    }

    const deltaSec = Math.min((now - state.lastFrameTime) / 1000, 0.05);
    state.lastFrameTime = now;

    state.birdVelocity += state.gravity * 60 * deltaSec;
    state.birdY += state.birdVelocity * 60 * deltaSec;
    placeBird();

    if (!state.lastPipeTime || now - state.lastPipeTime >= state.pipeInterval) {
      createPipe(now);
    }

    updatePipes(deltaSec);

    if (hasCollision()) {
      endGame();
      return;
    }

    state.animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startPlaying() {
    if (state.gameState === "playing") {
      state.birdVelocity = state.jumpStrength;
      return;
    }

    if (state.gameState === "start" || state.gameState === "gameover") {
      resetGameState();
      state.gameState = "playing";
      setOverlay("", false);
      state.birdVelocity = state.jumpStrength;
      state.animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function handleInput(event) {
    if (event.type === "keydown" && event.code !== "Space") {
      return;
    }
    if (event.type === "keydown") {
      event.preventDefault();
    }

    startPlaying();
  }

  function init() {
    loadHighScore();
    resetGameState();
    setOverlay("PICHUKA - Press Space to Start", true);
    updateScoreBoard();

    window.addEventListener("keydown", handleInput);
    game.addEventListener("mousedown", handleInput);
    game.addEventListener("touchstart", handleInput, { passive: true });

    window.addEventListener("resize", () => {
      if (state.gameState !== "playing") {
        resetBird();
      }
    });
  }

  init();
})();
