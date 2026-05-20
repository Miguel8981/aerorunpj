// game.js — Aero Run v3 (fases por acertos + tempo limite)

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  phases: [
    {
      id: 1,
      name: 'Fase 1 – Início do Voo',
      description: 'Acerte 3 perguntas em 40 segundos para avançar!',
      birdFreq:      0.006,
      birdSpeedVar:  0.8,
      birdMaxCount:  2,
      speed:         7.0,
      questionFreq:  1.012,   // perguntas spawnando com frequência para ter tempo de acertar 3
      fuelGainBonus: 6,
      timeLimit:     60,       // segundos para completar a fase
      correctNeeded: 3,        // acertos necessários para avançar
      skyImg:       'ceu_dia',
      cloudColor:   '#b0d8ff', cloudAlpha: 0.10,
      accentColor:  '#00d4ff', hudBorder: 'rgba(0,212,255,0.2)',
      exhaustColor: '#00d4ff', groundColor: '#1a3a2a', birdTint: null,
    },
    {
      id: 2,
      name: 'Fase 2 – Voo Intermediário',
      description: 'Acerte 3 perguntas em 50 segundos para avançar!',
      birdFreq:      0.026,
      birdSpeedVar:  1.5,
      birdMaxCount:  6,
      speed:         7.0,
      questionFreq:  1.010,
      fuelGainBonus: 3,
      timeLimit:     60,
      correctNeeded: 3,
      skyImg:       'ceu_por_do_sol',
      cloudColor:   '#ffb07a', cloudAlpha: 0.18,
      accentColor:  '#ff8c42', hudBorder: 'rgba(255,140,66,0.3)',
      exhaustColor: '#ff6b00', groundColor: '#3a2010', birdTint: 'rgba(255,120,60,0.35)',
    },
    {
      id: 3,
      name: 'Fase 3 – Aproximação do Aeroporto',
      description: 'Acerte 3 perguntas em 60 segundos para pousar!',
      birdFreq:      0.045,
      birdSpeedVar:  2.5,
      birdMaxCount:  12,
      speed:         7.0,
      questionFreq:  1.000,
      fuelGainBonus: 0,
      timeLimit:     60,
      correctNeeded: 3,
      skyImg:       'ceu_noite',
      cloudColor:   '#1e2d6e', cloudAlpha: 0.22,
      accentColor:  '#a78bfa', hudBorder: 'rgba(167,139,250,0.3)',
      exhaustColor: '#c4b5fd', groundColor: '#0a0f1a', birdTint: 'rgba(80,60,140,0.3)',
    },
  ],

  planeWidth:  70,
  planeHeight: 36,
  birdWidth:   40,
  birdHeight:  28,
  qMarkSize:   34,
  fuelLoss:  { bird: 10, wrong: 8 },
  fuelGain:  { correct: 12 },
  fuelDrain: 0.018,
  hudHeight:  50,
};

// ─── IMAGES ────────────────────────────────────────────────────────────────
const IMAGES = {};
let imagesLoaded = 0;
const IMAGE_LIST = {
  aviao:          'assests/img/aviao.png',
  passaro:        'assests/img/passaro.png',
  ceu_dia:        'assests/img/ceu_dia.png',
  ceu_por_do_sol: 'assests/img/ceu_por_do_sol.png',
  ceu_noite:      'assests/img/ceu_noite.png',
};
function loadImages(callback) {
  const total = Object.keys(IMAGE_LIST).length;
  for (const [key, src] of Object.entries(IMAGE_LIST)) {
    const img = new Image();
    img.onload  = () => { imagesLoaded++; if (imagesLoaded >= total) callback(); };
    img.onerror = () => { imagesLoaded++; if (imagesLoaded >= total) callback(); };
    img.src = src;
    IMAGES[key] = img;
  }
}

// ─── STATE ─────────────────────────────────────────────────────────────────
let state = {};
function createInitialState() {
  return {
    running: false, paused: false, phase: 0, score: 0, fuel: 100,
    planeY: 0, velY: 0, scrollX: 0,
    birds: [], qmarks: [], clouds: [], particles: [],
    questionPending: false, currentQuestion: null,
    animFrame: null, keys: {},
    birdFlap: 0, planeFlap: 0,
    // ── Novo sistema de progressão por fase ──
    phaseTimeLeft: CONFIG.phases[0].timeLimit, // segundos restantes na fase atual
    phaseCorrect:  0,                          // acertos nesta fase
    lastTick: 0,                               // timestamp do último segundo
    usedQuestions: [],                         // IDs já usados para não repetir
  };
}

// ─── DOM REFS ──────────────────────────────────────────────────────────────
const screens = {
  start:        document.getElementById('screen-start'),
  instructions: document.getElementById('screen-instructions'),
  game:         document.getElementById('screen-game'),
  gameover:     document.getElementById('screen-gameover'),
};
const canvas           = document.getElementById('gameCanvas');
const ctx              = canvas.getContext('2d');
const hudPhase         = document.getElementById('hud-phase');
const fuelBar          = document.getElementById('fuel-bar');
const fuelText         = document.getElementById('fuel-text');
const scoreEl          = document.getElementById('score');
const questionOverlay  = document.getElementById('question-overlay');
const questionText     = document.getElementById('question-text');
const questionOpts     = document.getElementById('question-options');
const questionFeedback = document.getElementById('question-feedback');
const pauseOverlay     = document.getElementById('pause-overlay');
const hud              = document.getElementById('hud');

// ─── SCREENS ───────────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─── BUTTONS ───────────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', e => {
  e.currentTarget.blur();
  if (imagesLoaded < Object.keys(IMAGE_LIST).length) { loadImages(startGame); } else { startGame(); }
});
document.getElementById('btn-instructions').addEventListener('click', () => showScreen('instructions'));
document.getElementById('btn-back').addEventListener('click', () => showScreen('start'));
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-quit').addEventListener('click', () => { cancelAnimationFrame(state.animFrame); showScreen('start'); });
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-menu').addEventListener('click', () => showScreen('start'));

// ─── KEYBOARD ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  state.keys[e.code] = true;
  if (e.code === 'Escape' && state.running) togglePause();
  if (['ArrowUp','ArrowDown','KeyW','KeyS','Space'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { state.keys[e.code] = false; });

// ─── START ─────────────────────────────────────────────────────────────────
function startGame() {
  cancelAnimationFrame(state.animFrame);
  state = createInitialState();
  state.running  = true;
  state.lastTick = performance.now();
  pauseOverlay.classList.add('hidden');
  resizeCanvas();
  state.planeY = canvas.height / 2;
  spawnInitialClouds();
  showScreen('game');
  applyPhaseTheme(0);
  showPhaseBanner(CONFIG.phases[0].name, CONFIG.phases[0].description);
  updatePhaseHUD();
  loop();
}

// ─── PHASE HUD ─────────────────────────────────────────────────────────────
function updatePhaseHUD() {
  const pc = CONFIG.phases[state.phase];
  const timeLeft = Math.ceil(state.phaseTimeLeft);
  const correct  = state.phaseCorrect;
  const needed   = pc.correctNeeded;
  // Mostra: "Fase 1 | ✅ 1/3 | ⏱ 38s"
  hudPhase.textContent = `Fase ${state.phase + 1}  ✅ ${correct}/${needed}  ⏱ ${timeLeft}s`;
}

// ─── PHASE THEME ───────────────────────────────────────────────────────────
function applyPhaseTheme(phaseIdx) {
  const p = CONFIG.phases[phaseIdx];
  hud.style.borderBottomColor = p.hudBorder;
  document.documentElement.style.setProperty('--current-accent', p.accentColor);
  const accent = p.accentColor;
  fuelBar.style.setProperty('--phase-accent', accent);
  document.getElementById('hud-phase').style.color = accent;
  scoreEl.parentElement.style.color = accent;
  fuelText.style.color = accent;
}

// ─── ADVANCE PHASE ─────────────────────────────────────────────────────────
function advancePhase() {
  if (state.phase >= CONFIG.phases.length - 1) {
    // Completou a fase 3 → vitória
    state.score += 10;
    endGame(true, 'Parabéns! Você completou todas as fases e pousou com sucesso!');
    return;
  }

  // Para o loop durante a transição
  state.running = false;
  cancelAnimationFrame(state.animFrame);

  const fromPhase = state.phase;
  const toPhase   = state.phase + 1;
  const pc        = CONFIG.phases[toPhase];
  const phaseNames = ['Início do Voo', 'Voo Intermediário', 'Aproximação do Aeroporto'];

  // Cria o overlay de transição cinematográfica
  const overlay = document.createElement('div');
  overlay.id = 'phase-transition';
  overlay.innerHTML = `
    <div class="pt-bar pt-bar-top"></div>
    <div class="pt-bar pt-bar-bottom"></div>
    <div class="pt-content">
      <div class="pt-completed">FASE ${fromPhase + 1} COMPLETA</div>
      <div class="pt-check">✓</div>
      <div class="pt-divider"></div>
      <div class="pt-next-label">PRÓXIMA FASE</div>
      <div class="pt-number">${toPhase + 1}</div>
      <div class="pt-name">${phaseNames[toPhase]}</div>
      <div class="pt-stats">
        <div class="pt-stat"><span>⭐ Pontuação</span><span>${state.score}</span></div>
        <div class="pt-stat"><span>⛽ Combustível</span><span>${Math.floor(state.fuel)}%</span></div>
        <div class="pt-stat"><span>⏱ Próximo Tempo</span><span>${pc.timeLimit}s</span></div>
      </div>
      <div class="pt-loading"><div class="pt-loading-fill"></div></div>
    </div>
  `;
  document.getElementById('screen-game').appendChild(overlay);

  // Sequência de animação
  const $ = s => overlay.querySelector(s);
  requestAnimationFrame(() => {
    // 1. Barras entram
    setTimeout(() => {
      $('.pt-bar-top').classList.add('in');
      $('.pt-bar-bottom').classList.add('in');
    }, 50);
    // 2. Conteúdo aparece
    setTimeout(() => overlay.classList.add('show-content'), 550);
    // 3. Barra de loading
    setTimeout(() => $('.pt-loading-fill').style.width = '100%', 700);
    // 4. Saída e início da próxima fase
    setTimeout(() => {
      overlay.classList.add('exit');
      setTimeout(() => {
        overlay.remove();
        // Aplica a nova fase
        state.phase        = toPhase;
        state.phaseTimeLeft = pc.timeLimit;
        state.phaseCorrect  = 0;
        state.usedQuestions = [];
        state.birds  = [];
        state.qmarks = [];
        state.lastTick = performance.now();
        state.fuel = Math.min(100, state.fuel + 20);
        state.clouds = [];
        spawnInitialClouds();
        applyPhaseTheme(state.phase);
        updatePhaseHUD();
        // Reinicia o loop
        state.running = true;
        state.animFrame = requestAnimationFrame(loop);
        showPhaseBanner(pc.name, pc.description);
      }, 600);
    }, 3800);
  });
}

// ─── RESIZE ────────────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => { if (state.running) resizeCanvas(); });

// ─── CLOUDS ────────────────────────────────────────────────────────────────
function spawnInitialClouds() {
  for (let i = 0; i < 8; i++)
    state.clouds.push(createCloud(Math.random() * canvas.width));
}
function createCloud(x) {
  return {
    x, y: CONFIG.hudHeight + 20 + Math.random() * (canvas.height - CONFIG.hudHeight - 80),
    w: 80 + Math.random() * 120, h: 30 + Math.random() * 40,
    speed: 0.5 + Math.random() * 1,
    alpha: 0.08 + Math.random() * 0.12,
  };
}

// ─── MAIN LOOP ─────────────────────────────────────────────────────────────
function loop() {
  if (!state.running) return;
  state.animFrame = requestAnimationFrame(loop);
  if (state.paused || state.questionPending) return;
  update();
  draw();
}

// ─── UPDATE ────────────────────────────────────────────────────────────────
function update() {
  const phaseConf = CONFIG.phases[state.phase];
  const gameH     = canvas.height;
  const now       = performance.now();

  // ── Countdown do tempo da fase (por segundos reais)
  const delta = (now - state.lastTick) / 1000;
  state.lastTick = now;
  state.phaseTimeLeft -= delta;

  if (state.phaseTimeLeft <= 0) {
    state.phaseTimeLeft = 0;
    updatePhaseHUD();
    const needed = phaseConf.correctNeeded;
    const got    = state.phaseCorrect;
    endGame(false,
      `Tempo esgotado na Fase ${state.phase + 1}! Você acertou ${got} de ${needed} perguntas necessárias.`
    );
    return;
  }

  // ── Combustível
  const drainRate = state.phase === 2 ? CONFIG.fuelDrain * 1.6
                  : state.phase === 1 ? CONFIG.fuelDrain * 1.2
                  : CONFIG.fuelDrain;
  state.fuel = Math.max(0, state.fuel - drainRate);
  if (state.fuel <= 0) {
    endGame(false, 'Sem combustível! O avião pousou antes de completar a fase.');
    return;
  }

  // ── Controles
  const accel = state.phase === 0 ? 0.45 : 0.6;
  const up   = state.keys['KeyW'] || state.keys['ArrowUp'];
  const down = state.keys['KeyS'] || state.keys['ArrowDown'];
  if (up)   state.velY -= accel;
  if (down) state.velY += accel;
  state.velY *= 0.88;
  state.velY  = Math.max(-8, Math.min(8, state.velY));
  state.planeY = Math.max(
    CONFIG.hudHeight + CONFIG.planeHeight / 2 + 10,
    Math.min(gameH - CONFIG.planeHeight / 2 - 10, state.planeY + state.velY)
  );

  state.scrollX += phaseConf.speed;

  // ── Nuvens
  state.clouds.forEach(c => c.x -= c.speed);
  state.clouds = state.clouds.filter(c => c.x + c.w > 0);
  if (state.clouds.length < 8) state.clouds.push(createCloud(canvas.width + 20));

  // ── Spawn pássaros
  if (state.birds.length < phaseConf.birdMaxCount && Math.random() < phaseConf.birdFreq) {
    const count = (state.phase === 2 && Math.random() < 0.3) ? 2 : 1;
    for (let i = 0; i < count; i++) {
      state.birds.push({
        x: canvas.width + 20 + i * 65,
        y: CONFIG.hudHeight + 40 + Math.random() * (gameH - CONFIG.hudHeight - 100),
        speed: phaseConf.speed + 0.5 + Math.random() * phaseConf.birdSpeedVar,
        flapOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  // ── Spawn perguntas — só aparece 1 por vez na tela
  if (state.qmarks.length === 0 && !state.questionPending && Math.random() < phaseConf.questionFreq) {
    state.qmarks.push({
      x: canvas.width + 20,
      y: CONFIG.hudHeight + 60 + Math.random() * (gameH - CONFIG.hudHeight - 120),
      speed: phaseConf.speed * 0.75,
      pulse: 0,
    });
  }

  state.birdFlap  += 0.15;
  state.planeFlap += 0.08;

  state.birds.forEach(b => b.x -= b.speed);
  state.birds  = state.birds.filter(b => b.x + CONFIG.birdWidth > 0);
  state.qmarks.forEach(q => { q.x -= q.speed; q.pulse += 0.05; });
  state.qmarks = state.qmarks.filter(q => q.x + CONFIG.qMarkSize > 0);
  state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.vy += 0.1; });
  state.particles = state.particles.filter(p => p.life > 0);

  // ── Colisões
  const planeX        = 120;
  const birdFuelLoss  = state.phase === 2 ? 15 : state.phase === 1 ? 12 : 10;
  const birdScoreLoss = state.phase === 2 ? 3 : 2;

  state.birds.forEach((b, i) => {
    if (collides(planeX, state.planeY, CONFIG.planeWidth * 0.7, CONFIG.planeHeight * 0.6,
                 b.x, b.y, CONFIG.birdWidth * 0.7, CONFIG.birdHeight * 0.7)) {
      state.birds.splice(i, 1);
      state.score = Math.max(0, state.score - birdScoreLoss);
      state.fuel  = Math.max(0, state.fuel - birdFuelLoss);
      spawnParticles(planeX, state.planeY, '#ff6b35');
      showScorePopup(planeX, state.planeY, `-${birdScoreLoss}`);
      updateHUD();
    }
  });

  state.qmarks.forEach((q, i) => {
    if (collides(planeX, state.planeY, CONFIG.planeWidth * 0.7, CONFIG.planeHeight * 0.6,
                 q.x, q.y, CONFIG.qMarkSize * 0.8, CONFIG.qMarkSize * 0.8)) {
      state.qmarks.splice(i, 1);
      spawnParticles(q.x, q.y, phaseConf.accentColor);
      showQuestion();
    }
  });

  updateHUD();
  updatePhaseHUD();
}

// ─── COLLISION ─────────────────────────────────────────────────────────────
function collides(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

// ─── HUD ───────────────────────────────────────────────────────────────────
function updateHUD() {
  const pct = Math.max(0, Math.min(100, state.fuel));
  fuelBar.style.width = pct + '%';
  fuelText.textContent = Math.round(pct) + '%';
  fuelBar.className = 'fuel-bar' + (pct < 25 ? ' low' : pct < 55 ? ' medium' : '');
  if (state.phase === 1) {
    fuelBar.style.background = pct < 25
      ? 'linear-gradient(90deg,#ff3d3d,#ff8c00)'
      : pct < 55
        ? 'linear-gradient(90deg,#ff8c00,#ffb347)'
        : 'linear-gradient(90deg,#ff6b00,#ffb347)';
  } else {
    fuelBar.style.background = '';
  }
  scoreEl.textContent = state.score;
}

// ─── DRAW ──────────────────────────────────────────────────────────────────
function draw() {
  const W = canvas.width, H = canvas.height;
  const phaseConf = CONFIG.phases[state.phase];
  ctx.clearRect(0, 0, W, H);

  // Céu
  const skyImg = IMAGES[phaseConf.skyImg];
  if (skyImg && skyImg.complete && skyImg.naturalWidth > 0) {
    const scale   = (H - CONFIG.hudHeight) / skyImg.naturalHeight;
    const scaledW = skyImg.naturalWidth * scale;
    const offsetX = -(state.scrollX * 0.3) % scaledW;
    for (let tx = offsetX; tx < W + scaledW; tx += scaledW)
      ctx.drawImage(skyImg, tx, CONFIG.hudHeight, scaledW, H - CONFIG.hudHeight);
  } else {
    const sky = ctx.createLinearGradient(0, CONFIG.hudHeight, 0, H);
    if (state.phase === 0) { sky.addColorStop(0,'#0a1628'); sky.addColorStop(1,'#1a3a6b'); }
    else if (state.phase === 1) { sky.addColorStop(0,'#1a0530'); sky.addColorStop(1,'#ff6b00'); }
    else { sky.addColorStop(0,'#050308'); sky.addColorStop(1,'#15183f'); }
    ctx.fillStyle = sky;
    ctx.fillRect(0, CONFIG.hudHeight, W, H - CONFIG.hudHeight);
  }

  state.clouds.forEach(c => drawCloud(c, phaseConf.cloudColor, phaseConf.cloudAlpha));
  state.birds.forEach(b  => drawBird(b, phaseConf.birdTint));
  state.qmarks.forEach(q => drawQMark(q, phaseConf.accentColor));

  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  drawPlane(120, state.planeY, phaseConf);
  drawTimerBar(W, H, phaseConf);
  drawProgressDots(W, H, phaseConf);

  // Borda pulsante de perigo na fase 3
  if (state.phase === 2) {
    const pulse = (Math.sin(state.scrollX * 0.05) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.04 + pulse * 0.07;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, CONFIG.hudHeight + 4, W - 8, H - CONFIG.hudHeight - 8);
    ctx.restore();
  }
}

// ─── DRAW TIMER BAR (substitui barra de progresso de distância) ─────────────
function drawTimerBar(W, H, phaseConf) {
  const pc       = CONFIG.phases[state.phase];
  const progress = Math.max(0, state.phaseTimeLeft / pc.timeLimit);
  const barY = H - 22, barW = W - 60, barX = 30;

  // Trilha
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, 10, 5); ctx.fill();

  // Cor da barra de tempo — vermelho quando urgente
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  if (progress > 0.5) {
    grad.addColorStop(0, phaseConf.accentColor);
    grad.addColorStop(1, phaseConf.accentColor + 'aa');
  } else if (progress > 0.25) {
    grad.addColorStop(0, '#ff8c00'); grad.addColorStop(1, '#ffb347');
  } else {
    // Últimos 25%: vermelho piscando
    const blink = Math.sin(state.scrollX * 0.3) > 0 ? 1 : 0.5;
    ctx.globalAlpha = blink;
    grad.addColorStop(0, '#ff2020'); grad.addColorStop(1, '#ff6060');
  }
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, 10, 5); ctx.fill();
  ctx.globalAlpha = 1;

  // Ícone de avião na ponta
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('✈', barX + barW * progress, barY - 4);

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px Exo 2, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⏱ ${Math.ceil(state.phaseTimeLeft)}s restantes`, barX, barY + 22);
  ctx.textAlign = 'right';
  ctx.fillText(`Acertos: ${state.phaseCorrect}/${pc.correctNeeded}`, barX + barW, barY + 22);
}

// ─── DOTS DE PROGRESSO DE ACERTOS ──────────────────────────────────────────
function drawProgressDots(W, H, phaseConf) {
  const pc     = CONFIG.phases[state.phase];
  const needed = pc.correctNeeded;
  const dotR   = 10;
  const gap    = 30;
  const totalW = needed * (dotR * 2) + (needed - 1) * gap;
  const startX = (W - totalW) / 2;
  const dotY   = CONFIG.hudHeight + 28;

  for (let i = 0; i < needed; i++) {
    const cx = startX + i * (dotR * 2 + gap) + dotR;
    const filled = i < state.phaseCorrect;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = phaseConf.accentColor;
      ctx.shadowColor = phaseConf.accentColor;
      ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
    }
    ctx.fill();
    if (!filled) ctx.stroke();
    // Checkmark nos preenchidos
    if (filled) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${dotR}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', cx, dotY);
    }
    ctx.restore();
  }
}

// ─── DRAW CLOUD ────────────────────────────────────────────────────────────
function drawCloud(c, color, baseAlpha) {
  ctx.save();
  ctx.globalAlpha = c.alpha * (baseAlpha / 0.10);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.5, c.y, c.w * 0.5, c.h * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + c.w * 0.3, c.y + c.h * 0.1, c.w * 0.35, c.h * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + c.w * 0.7, c.y + c.h * 0.1, c.w * 0.3, c.h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── DRAW BIRD ─────────────────────────────────────────────────────────────
function drawBird(b, tint) {
  if (IMAGES.passaro && IMAGES.passaro.complete && IMAGES.passaro.naturalWidth > 0) {
    const bw = CONFIG.birdWidth * 1.8, bh = CONFIG.birdHeight * 1.8;
    ctx.save();
    const flap = Math.sin(state.birdFlap + b.flapOffset) * 0.12 + 1;
    ctx.translate(b.x, b.y); ctx.scale(1, flap);
    ctx.drawImage(IMAGES.passaro, -bw/2, -bh/2, bw, bh);
    if (tint) {
      ctx.fillStyle = tint;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillRect(-bw/2, -bh/2, bw, bh);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    return;
  }
  const flap = Math.sin(state.birdFlap + b.flapOffset) * 8;
  const bx = b.x, by = b.y;
  ctx.save();
  ctx.fillStyle = tint ? '#d4854a' : '#e8d5b7'; ctx.strokeStyle = tint ? '#a05020' : '#c4a882'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(bx,by,16,8,-0.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tint ? '#c07040' : '#d4c4a0';
  ctx.beginPath(); ctx.moveTo(bx-4,by-2); ctx.quadraticCurveTo(bx-20,by-12+flap,bx-28,by-4+flap); ctx.quadraticCurveTo(bx-18,by+4,bx-4,by+2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx+4,by-2); ctx.quadraticCurveTo(bx+20,by-12+flap,bx+28,by-4+flap); ctx.quadraticCurveTo(bx+18,by+4,bx+4,by+2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = tint ? '#d4854a' : '#e8d5b7';
  ctx.beginPath(); ctx.ellipse(bx+14,by-3,7,6,0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(bx+16,by-4,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff9900'; ctx.beginPath(); ctx.moveTo(bx+20,by-3); ctx.lineTo(bx+26,by-1); ctx.lineTo(bx+20,by+1); ctx.fill();
  ctx.restore();
}

// ─── DRAW QUESTION MARK ────────────────────────────────────────────────────
function drawQMark(q, accentColor) {
  const glow = Math.sin(q.pulse) * 0.3 + 0.7;
  ctx.save();
  ctx.globalAlpha = glow;
  const grad = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, CONFIG.qMarkSize);
  grad.addColorStop(0, accentColor + '59'); grad.addColorStop(1, accentColor + '00');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(q.x, q.y, CONFIG.qMarkSize, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = accentColor; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(q.x, q.y, CONFIG.qMarkSize/2, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${CONFIG.qMarkSize*0.7}px Orbitron, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', q.x, q.y+1);
  ctx.restore();
}

// ─── DRAW PLANE ────────────────────────────────────────────────────────────
function drawPlane(x, y, phaseConf) {
  const tilt = state.velY * 1.5;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt * Math.PI / 180);
  if (IMAGES.aviao && IMAGES.aviao.complete && IMAGES.aviao.naturalWidth > 0) {
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.15 - i * 0.025;
      ctx.fillStyle = phaseConf.exhaustColor;
      ctx.beginPath(); ctx.ellipse(-50 - i*12, 0, 10-i, 5-i*0.5, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const pw = CONFIG.planeWidth * 2.6, ph = pw * (1024/1536);
    ctx.drawImage(IMAGES.aviao, -pw/2, -ph/2, pw, ph);
  } else {
    ctx.fillStyle = '#e8f4fd'; ctx.strokeStyle = '#a0c8e8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0,0,32,12,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// ─── PARTICLES ─────────────────────────────────────────────────────────────
function spawnParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 4;
    state.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-2, color, size: 2+Math.random()*3, life: 1 });
  }
}

// ─── QUESTIONS ─────────────────────────────────────────────────────────────
function showQuestion() {
  state.questionPending = true;
  const phaseId = state.phase + 1;

  // Filtra perguntas da fase atual que ainda não foram usadas
  let pool = QUESTIONS.filter(q => q.phase === phaseId && !state.usedQuestions.includes(q.text));
  // Se esgotou, reseta o pool (permite repetir)
  if (!pool.length) {
    state.usedQuestions = [];
    pool = QUESTIONS.filter(q => q.phase === phaseId);
  }
  if (!pool.length) { state.questionPending = false; return; }

  state.currentQuestion = pool[Math.floor(Math.random() * pool.length)];
  state.usedQuestions.push(state.currentQuestion.text);

  questionText.textContent = state.currentQuestion.text;
  questionOpts.innerHTML   = '';
  questionFeedback.className = 'hidden';

  state.currentQuestion.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => answerQuestion(i, btn));
    questionOpts.appendChild(btn);
  });
  questionOverlay.classList.remove('hidden');

  // Estilo da caixa por fase
  const qbox    = document.querySelector('.question-box');
  const qheader = document.querySelector('.question-header');
  const colors  = [
    { border:'rgba(0,212,255,0.4)',   shadow:'rgba(0,180,255,0.2)',   text:'#00d4ff' },
    { border:'rgba(255,140,66,0.4)',  shadow:'rgba(255,100,0,0.25)',  text:'#ff8c42' },
    { border:'rgba(167,139,250,0.5)', shadow:'rgba(120,80,200,0.3)',  text:'#a78bfa' },
  ];
  const c = colors[state.phase];
  qbox.style.borderColor  = c.border;
  qbox.style.boxShadow    = `0 0 50px ${c.shadow}`;
  qheader.style.color     = c.text;
}

function answerQuestion(idx, btn) {
  const q       = state.currentQuestion;
  const correct = idx === q.correct;

  questionOpts.querySelectorAll('.option-btn').forEach((b, i) => {
    b.disabled = true;
    if (i === q.correct) b.classList.add('correct');
  });
  if (!correct) btn.classList.add('wrong');

  questionFeedback.classList.remove('hidden');

  const phaseConf = CONFIG.phases[state.phase];
  const fuelGain  = CONFIG.fuelGain.correct + phaseConf.fuelGainBonus;
  const wrongLoss = state.phase === 2 ? 12 : CONFIG.fuelLoss.wrong;
  const scoreGain = state.phase === 2 ? 8 : 6;
  const scoreLoss = state.phase === 2 ? 5 : 3;

  if (correct) {
    questionFeedback.classList.add('success');
    questionFeedback.classList.remove('fail');
    questionFeedback.textContent = `✅ Correto! ${q.explanation}`;
    state.score += scoreGain;
    state.fuel   = Math.min(100, state.fuel + fuelGain);
    showScorePopup(canvas.width/2, canvas.height/2, `+${scoreGain}`);

    // Incrementa acertos da fase
    state.phaseCorrect++;
    updatePhaseHUD();

    // Verifica se completou os acertos necessários
    if (state.phaseCorrect >= phaseConf.correctNeeded) {
      // Fecha a pergunta e avança de fase após feedback
      setTimeout(() => {
        questionOverlay.classList.add('hidden');
        state.questionPending = false;
        advancePhase();
      }, 2200);
      updateHUD();
      return;
    }
  } else {
    questionFeedback.classList.add('fail');
    questionFeedback.classList.remove('success');
    questionFeedback.textContent = `❌ Errado! ${q.explanation}`;
    state.score = Math.max(0, state.score - scoreLoss);
    state.fuel  = Math.max(0, state.fuel - wrongLoss);
    showScorePopup(canvas.width/2, canvas.height/2, `-${scoreLoss}`);
  }

  updateHUD();
  setTimeout(() => {
    questionOverlay.classList.add('hidden');
    state.questionPending = false;
  }, 2800);
}

// ─── SCORE POPUP ───────────────────────────────────────────────────────────
function showScorePopup(x, y, text) {
  const el = document.createElement('div');
  el.className = `score-popup ${(text.startsWith('+') || text.startsWith('⛽')) ? 'positive' : 'negative'}`;
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.getElementById('screen-game').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// ─── PHASE BANNER ──────────────────────────────────────────────────────────
function showPhaseBanner(title, description) {
  const existing = document.getElementById('phase-banner');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'phase-banner';
  const accent = CONFIG.phases[state.phase].accentColor;
  el.innerHTML = `<strong>${title}</strong><br><small style="opacity:0.85;font-size:0.68em;">${description || ''}</small>`;
  el.style.textShadow  = `0 0 30px ${accent}`;
  el.style.borderColor = accent + '4d';
  document.getElementById('screen-game').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── PAUSE ─────────────────────────────────────────────────────────────────
function togglePause() {
  // Só funciona se o jogo estiver rodando na tela de jogo
  if (!screens.game.classList.contains('active')) return;
  if (!state.running && !state.paused) return;
  state.paused = !state.paused;
  // Reajusta lastTick ao retomar para não penalizar o tempo
  if (!state.paused) state.lastTick = performance.now();
  pauseOverlay.classList.toggle('hidden', !state.paused);
}

// ─── END GAME ──────────────────────────────────────────────────────────────
function endGame(won, message) {
  state.running = false;
  cancelAnimationFrame(state.animFrame);
  document.getElementById('gameover-icon').textContent  = won ? '🛬' : '💥';
  document.getElementById('gameover-title').textContent = won ? 'Pouso Perfeito!' : 'Fim de Voo!';
  document.getElementById('gameover-msg').textContent   = message;
  document.getElementById('final-score').textContent    = state.score;
  const medal = state.score >= 80 ? '🥇 Medalha de Ouro!'
              : state.score >= 50 ? '🥈 Medalha de Prata!'
              : '🥉 Medalha de Bronze!';
  document.getElementById('final-medal').textContent = medal;
  showScreen('gameover');
}

// Preload
loadImages(() => {});