// game.js — Aero Run v3 (fases por acertos + tempo limite)

// ─── ANUNCIADOR PARA LEITOR DE TELA ────────────────────────────────────────
// O canvas não é lido pelo leitor de tela, então os eventos do jogo passam por
// regiões aria-live invisíveis. Para o leitor não se atropelar:
//  • mensagens normais entram numa fila (máx. 2) e esperam a anterior terminar
//  • mensagens urgentes limpam a fila e falam na hora (região "assertive")
//  • a mesma mensagem não se repete em menos de 4 segundos
const AnnounceQ = { queue: [], freeAt: 0, timer: null, lastMsg: '', lastAt: 0 };

function writeLive(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';                         // limpa para repetir textos iguais
  setTimeout(() => { el.textContent = msg; }, 60);
}
function speakNow(id, msg) {
  writeLive(id, msg);
  // estimativa do tempo de fala (~15 caracteres por segundo)
  AnnounceQ.freeAt = performance.now() + 500 + msg.length * 65;
}
function pumpAnnouncements() {
  if (AnnounceQ.timer || !AnnounceQ.queue.length) return;
  const wait = Math.max(0, AnnounceQ.freeAt - performance.now());
  AnnounceQ.timer = setTimeout(() => {
    AnnounceQ.timer = null;
    const msg = AnnounceQ.queue.shift();
    if (msg) speakNow('announcer', msg);
    pumpAnnouncements();
  }, wait);
}
function announce(msg, urgent) {
  const now = performance.now();
  if (msg === AnnounceQ.lastMsg && now - AnnounceQ.lastAt < 4000) return;   // evita repetição
  AnnounceQ.lastMsg = msg;
  AnnounceQ.lastAt  = now;
  if (urgent) {
    AnnounceQ.queue.length = 0;
    clearTimeout(AnnounceQ.timer);
    AnnounceQ.timer = null;
    speakNow('announcer-alert', msg);
    return;
  }
  AnnounceQ.queue.push(msg);
  if (AnnounceQ.queue.length > 2) AnnounceQ.queue.shift();                   // mantém só as mais recentes
  pumpAnnouncements();
}
// Descarta o que está na fila (usado ao abrir pergunta, pausa etc.)
function clearAnnouncements() {
  AnnounceQ.queue.length = 0;
  clearTimeout(AnnounceQ.timer);
  AnnounceQ.timer = null;
  ['announcer', 'announcer-alert'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ─── FOCO E "INERT" ────────────────────────────────────────────────────────
// Durante o voo o foco fica no canvas (dentro de role="application"), assim o
// leitor de tela deixa W/A/S/D e as setas chegarem ao jogo.
function focusGame() {
  const c = document.getElementById('gameCanvas');
  if (c && screens.game && screens.game.classList.contains('active')) c.focus({ preventScroll: true });
}
// "inert" tira o elemento da leitura e do foco: o leitor não lê o fundo
// enquanto um diálogo (pergunta, pausa, acessibilidade) está aberto.
function setInert(els, on) {
  els.forEach(el => {
    if (!el) return;
    if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  });
}
function gameBackgroundEls() {
  return [document.getElementById('hud'), document.getElementById('gameCanvas'), document.getElementById('btn-pause')];
}

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
      cloudColor:   '#d8eeff', cloudAlpha: 0.55,
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
      cloudColor:   '#ffcca0', cloudAlpha: 0.45,
      accentColor:  '#ff8c42', hudBorder: 'rgba(255,140,66,0.3)',
      exhaustColor: '#ff6b00', groundColor: '#3a2010', birdTint: null,
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
      cloudColor:   '#1e3a7e', cloudAlpha: 0.5,
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

// ─── ACELERAR / FREAR — posição horizontal do avião ────────────────────────
// O avião pode se mover para frente (acelerar) e para trás (frear), além do
// movimento vertical já existente. A posição horizontal também define a
// velocidade relativa do mundo (acelerar = tudo passa mais rápido; frear =
// mais tempo de reação contra os pássaros).
const PLANE_X_DEFAULT = 120;   // posição horizontal neutra (padrão)
const PLANE_X_RANGE   = 75;    // quanto o avião pode avançar/recuar a partir do padrão
const PLANE_X_MIN     = PLANE_X_DEFAULT - PLANE_X_RANGE; // freando ao máximo
const PLANE_X_MAX     = PLANE_X_DEFAULT + PLANE_X_RANGE; // acelerando ao máximo

// ─── IMAGES ────────────────────────────────────────────────────────────────
const IMAGES = {};
let imagesLoaded = 0;
const IMAGE_LIST = {
  nave:          'assests/img/aviao.png',
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
let state = { keys: {} };
function createInitialState() {
  return {
    running: false, paused: false, phase: 0, score: 0, fuel: 100,
    planeY: 0, velY: 0, planeX: PLANE_X_DEFAULT, velX: 0, scrollX: 0,
    speedMultiplier: 1, // 1 = velocidade normal; >1 acelerando; <1 freando
    birds: [], qmarks: [], clouds: [], particles: [],
    questionPending: false, currentQuestion: null,
    animFrame: null, keys: {},
    birdFlap: 0, planeFlap: 0,
    // ── Novo sistema de progressão por fase ──
    phaseTimeLeft: CONFIG.phases[0].timeLimit, // segundos restantes na fase atual
    phaseCorrect:  0,                          // acertos nesta fase
    lastTick: 0,                               // timestamp do último segundo
    usedQuestions: [],                         // IDs já usados para não repetir
    _stars: null,                              // estrelas geradas na fase 3
    // ── Navegação por teclado e fluxo manual da pergunta ──
    qSelectedIndex: 0,                         // alternativa destacada (W/S ou ↑/↓)
    qAnswered:      false,                     // true depois que a pergunta foi confirmada
    qShouldAdvance: false,                     // se true, avança de fase ao fechar a pergunta
    // ── Avisos para leitor de tela ──
    fuelWarnLevel: 0,                          // 0 = ok, 1 = abaixo de 25%, 2 = abaixo de 10%
    timeWarned:    {},                         // avisos de tempo já falados na fase
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
const fuelTrack        = document.querySelector('.fuel-bar-track');
const fuelText         = document.getElementById('fuel-text');
const scoreEl          = document.getElementById('score');
const questionOverlay  = document.getElementById('question-overlay');
const questionText     = document.getElementById('question-text');
const questionOpts     = document.getElementById('question-options');
const questionFeedback = document.getElementById('question-feedback');
const btnQuestionClose    = document.getElementById('btn-question-close');
const btnQuestionContinue = document.getElementById('btn-question-continue');
const pauseOverlay     = document.getElementById('pause-overlay');
const hud              = document.getElementById('hud');

// ─── SCREENS ───────────────────────────────────────────────────────────────
function showScreen(name) {
  console.log('[DEBUG game.js] showScreen chamado com:', name, '| window.AudioEngine existe?', !!window.AudioEngine);
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  // Botão de acessibilidade só aparece fora do jogo
  const fab = document.getElementById('btn-accessibility');
  if (fab) fab.style.display = (name === 'game') ? 'none' : '';
  // Botão e painel de áudio também só aparecem fora do jogo
  const audioFab   = document.getElementById('btn-audio');
  const audioPanel = document.getElementById('audio-panel');
  if (audioFab)   audioFab.style.display = (name === 'game') ? 'none' : '';
  if (audioPanel && name === 'game') audioPanel.classList.add('hidden');
  // Áudio: música do menu só toca na tela inicial; para nas demais (voo incluso)
  if (window.AudioEngine) AudioEngine.onScreenChange(name);
  focusScreenHeading(name);
}

// Leva o foco (e a fala do leitor de tela) para o título da nova tela.
// Na tela do jogo não há título: só tira o foco do botão que foi clicado.
function focusScreenHeading(name) {
  setTimeout(() => {
    const target = name === 'start'        ? document.querySelector('#screen-start .start-content')
                 : name === 'instructions' ? document.querySelector('#screen-instructions .modal-box')
                 : name === 'gameover'     ? document.getElementById('gameover-title')
                 : null;
    if (target) target.focus({ preventScroll: true });
    else if (name === 'game') focusGame();
  }, 80);
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
document.getElementById('btn-quit').addEventListener('click', () => {
  cancelAnimationFrame(state.animFrame);
  setInert(gameBackgroundEls().concat([questionOverlay]), false);
  clearAnnouncements();
  showScreen('start');
});
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-menu').addEventListener('click', () => showScreen('start'));
btnQuestionContinue.addEventListener('click', closeQuestion);
btnQuestionClose.addEventListener('click', closeQuestion);

// ─── KEYBOARD ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  state.keys[e.code] = true;
  if (e.code === 'Escape' && state.running) togglePause();
  // Tecla I: fala o status do jogo (leitor de tela)
  if (e.code === 'KeyI' && state.running && !state.paused && !state.questionPending) announceStatus();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyS','KeyA','KeyD','Space'].includes(e.code)) e.preventDefault();
  // Navegação por teclado nas alternativas da pergunta (W/S, ↑/↓, Enter)
  if (state.questionPending) handleQuestionKeydown(e);
});
document.addEventListener('keyup', e => { state.keys[e.code] = false; });
// Se a janela perder o foco (ou o leitor de tela trocar de modo), solta as teclas
window.addEventListener('blur', () => { state.keys = {}; });
document.addEventListener('visibilitychange', () => { if (document.hidden) state.keys = {}; });

// ─── START ─────────────────────────────────────────────────────────────────
function startGame() {
  cancelAnimationFrame(state.animFrame);
  state = createInitialState();
  state.running  = true;
  state.lastTick = performance.now();
  pauseOverlay.classList.add('hidden');
  setInert(gameBackgroundEls().concat([questionOverlay]), false);
  clearAnnouncements();
  resizeCanvas();
  state.planeY = canvas.height / 2;
  spawnInitialClouds();
  showScreen('game');
  applyPhaseTheme(0);
  showPhaseBanner(CONFIG.phases[0].name, CONFIG.phases[0].description);
  announce(`${CONFIG.phases[0].name}. ${CONFIG.phases[0].description} Aperte I para ouvir o status.`, true);
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
  const phaseTxt = `Fase ${state.phase + 1}  ✅ ${correct}/${needed}  ⏱ ${timeLeft}s`;
  if (hudPhase.textContent !== phaseTxt) hudPhase.textContent = phaseTxt;
}

// Fala o status atual (tecla I)
function announceStatus() {
  const pc = CONFIG.phases[state.phase];
  announce(
    `Fase ${state.phase + 1}. ${state.phaseCorrect} de ${pc.correctNeeded} acertos. ` +
    `${Math.ceil(state.phaseTimeLeft)} segundos. ` +
    `Combustível ${Math.round(state.fuel)}. ${state.score} pontos.`,
    true
  );
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
  overlay.setAttribute('aria-hidden', 'true');
  document.getElementById('screen-game').appendChild(overlay);
  announce(`Fase ${fromPhase + 1} completa! ${state.score} pontos.`, true);

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
        state.fuelWarnLevel = 0;
        state.timeWarned = {};
        announce(`${pc.name}. ${pc.description}`, true);
        focusGame();
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
  const gameH = canvas.height - CONFIG.hudHeight;
  // Nuvens ficam apenas nos 60% superiores do céu (longe do chão)
  const maxY = CONFIG.hudHeight + gameH * 0.60;
  return {
    x, y: CONFIG.hudHeight + 30 + Math.random() * (maxY - CONFIG.hudHeight - 30),
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
      `Faltou pouco! Você acertou ${got} de ${needed} perguntas na Fase ${state.phase + 1}. Reabasteça e decole de novo!`
    );
    return;
  }

  // ── Avisos de tempo para leitor de tela (30 e 10 segundos)
  [30, 10].forEach(t => {
    if (state.phaseTimeLeft <= t && !state.timeWarned[t] && CONFIG.phases[state.phase].timeLimit > t) {
      state.timeWarned[t] = true;
      announce(`Faltam ${t} segundos.`);
    }
  });

  // ── Combustível
  const drainRate = state.phase === 2 ? CONFIG.fuelDrain * 1.6
                  : state.phase === 1 ? CONFIG.fuelDrain * 1.2
                  : CONFIG.fuelDrain;
  state.fuel = Math.max(0, state.fuel - drainRate);
  if (state.fuel <= 0) {
    endGame(false, 'O combustível acabou antes da hora! Você chegou longe — hora de reabastecer e tentar de novo.');
    return;
  }

  // ── Controles verticais (subir / descer)
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

  // ── Controles horizontais (acelerar / frear)
  const accelerate = state.keys['KeyD'] || state.keys['ArrowRight'];
  const brake      = state.keys['KeyA'] || state.keys['ArrowLeft'];
  if (accelerate) state.velX += accel;
  if (brake)      state.velX -= accel;
  state.velX *= 0.88;
  state.velX  = Math.max(-8, Math.min(8, state.velX));
  state.planeX = Math.max(PLANE_X_MIN, Math.min(PLANE_X_MAX, state.planeX + state.velX));

  // A posição horizontal do avião define o quanto o mundo passa mais rápido
  // (acelerando) ou mais devagar (freando) — de 0.6x a 1.4x a velocidade da fase
  const speedRatio      = (state.planeX - PLANE_X_DEFAULT) / PLANE_X_RANGE; // -1..1
  const speedMultiplier = 1 + speedRatio * 0.4;
  state.speedMultiplier = speedMultiplier; // exposto para o HUD

  state.scrollX += phaseConf.speed * speedMultiplier;

  // ── Nuvens
  state.clouds.forEach(c => c.x -= c.speed * speedMultiplier);
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
    // Dica de posição para leitor de tela
    const dy = state.qmarks[0].y - state.planeY;
    const where = dy < -40 ? 'acima de você' : dy > 40 ? 'abaixo de você' : 'na sua altura';
    announce(`Interrogação ${where}.`);
  }

  state.birdFlap  += 0.15;
  state.planeFlap += 0.08;

  state.birds.forEach(b => b.x -= b.speed * speedMultiplier);
  state.birds  = state.birds.filter(b => b.x + CONFIG.birdWidth > 0);
  state.qmarks.forEach(q => { q.x -= q.speed * speedMultiplier; q.pulse += 0.05; });
  state.qmarks = state.qmarks.filter(q => q.x + CONFIG.qMarkSize > 0);
  state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.vy += 0.1; });
  state.particles = state.particles.filter(p => p.life > 0);

  // ── Colisões
  const planeX        = state.planeX;
  const birdFuelLoss  = state.phase === 2 ? 15 : state.phase === 1 ? 12 : 10;
  const birdScoreLoss = 5; // -5 pts por pássaro em todas as fases

  state.birds.forEach((b, i) => {
    if (collides(planeX, state.planeY, CONFIG.planeWidth * 0.7, CONFIG.planeHeight * 0.6,
                 b.x, b.y, CONFIG.birdWidth * 0.7, CONFIG.birdHeight * 0.7)) {
      state.birds.splice(i, 1);
      state.score = Math.max(0, state.score - birdScoreLoss);
      state.fuel  = Math.max(0, state.fuel - birdFuelLoss);
      spawnParticles(planeX, state.planeY, '#ff6b35');
      showScorePopup(planeX, state.planeY, `-${birdScoreLoss}`);
      if (performance.now() - (state.lastBirdAnnounce || 0) > 1500) {
        state.lastBirdAnnounce = performance.now();
        announce(`Pássaro! Menos ${birdScoreLoss}.`, true);
      }
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
  const fuelTxt = Math.round(pct) + '%';
  if (fuelText.textContent !== fuelTxt) fuelText.textContent = fuelTxt;
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
  if (scoreEl.textContent !== String(state.score)) scoreEl.textContent = state.score;

  // Acessibilidade: valor da barra de combustível para leitores de tela
  const rounded = Math.round(pct);
  if (fuelTrack && fuelTrack.getAttribute('aria-valuenow') !== String(rounded)) {
    fuelTrack.setAttribute('aria-valuenow', rounded);
  }
  // Avisos falados de combustível baixo (uma vez por nível)
  if (state.running) {
    if (pct < 10 && state.fuelWarnLevel < 2) {
      state.fuelWarnLevel = 2;
      announce(`Combustível crítico: ${rounded}.`, true);
    } else if (pct < 25 && state.fuelWarnLevel < 1) {
      state.fuelWarnLevel = 1;
      announce(`Combustível baixo: ${rounded}.`, true);
    } else if (pct >= 35 && state.fuelWarnLevel > 0) {
      state.fuelWarnLevel = 0;   // reabasteceu: os avisos voltam a valer
    }
  }
}

// ─── DRAW ──────────────────────────────────────────────────────────────────
// ─── DRAW SKY (procedural, fase-específico, sem repetição de imagens) ──────
function drawSkyPhase0(W, H) {
  const top = CONFIG.hudHeight;
  const gameH = H - top;

  const skyGrad = ctx.createLinearGradient(0, top, 0, H);
  skyGrad.addColorStop(0.0, '#1a6fbb');
  skyGrad.addColorStop(0.3, '#2e93d1');
  skyGrad.addColorStop(0.65, '#72c0f0');
  skyGrad.addColorStop(0.85, '#b8dff8');
  skyGrad.addColorStop(1.0, '#d9eefd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, top, W, gameH);

  const horizGlow = ctx.createLinearGradient(0, H - gameH * 0.3, 0, H);
  horizGlow.addColorStop(0, 'rgba(255,255,255,0)');
  horizGlow.addColorStop(1, 'rgba(220,240,255,0.25)');
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, top, W, gameH);

  const sunX = W * 0.82;
  const sunY = top + gameH * 0.18;
  const sunR  = Math.min(W, gameH) * 0.07;

  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.8, sunX, sunY, sunR * 3.5);
  halo.addColorStop(0,   'rgba(255,245,160,0.32)');
  halo.addColorStop(0.4, 'rgba(255,220,80,0.12)');
  halo.addColorStop(1,   'rgba(255,200,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(state.scrollX * 0.002);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const inner = sunR * 1.35;
    const outer = sunR * (1.9 + 0.2 * Math.sin(state.scrollX * 0.015 + i));
    ctx.strokeStyle = `rgba(255,230,80,${0.18 + 0.08 * Math.sin(i * 1.3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();

  const sunCore = ctx.createRadialGradient(sunX - sunR*0.2, sunY - sunR*0.2, 0, sunX, sunY, sunR);
  sunCore.addColorStop(0,   '#fffde0');
  sunCore.addColorStop(0.5, '#ffe566');
  sunCore.addColorStop(1,   '#ffcc00');
  ctx.fillStyle = sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,80,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const hazeGrad = ctx.createLinearGradient(0, H - gameH * 0.22, 0, H);
  hazeGrad.addColorStop(0, 'rgba(200,230,255,0)');
  hazeGrad.addColorStop(1, 'rgba(200,230,255,0.18)');
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, top, W, gameH);

  const groundY = H - gameH * 0.08;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, '#3d8a40');
  groundGrad.addColorStop(0.4, '#2a6630');
  groundGrad.addColorStop(1, '#1a3a20');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  const fieldScroll = (state.scrollX * 0.3) % (W * 0.4);
  for (let i = -1; i < 4; i++) {
    const fx = i * W * 0.4 - fieldScroll;
    ctx.fillStyle = 'rgba(45,110,50,0.5)';
    ctx.fillRect(fx, groundY, W * 0.2, H - groundY);
  }
}

function drawSkyPhase1(W, H) {
  const top = CONFIG.hudHeight;
  const gameH = H - top;

  const skyGrad = ctx.createLinearGradient(0, top, 0, H);
  skyGrad.addColorStop(0.0, '#0d0520');
  skyGrad.addColorStop(0.15, '#1a0a35');
  skyGrad.addColorStop(0.4,  '#5c1a2a');
  skyGrad.addColorStop(0.65, '#c4402a');
  skyGrad.addColorStop(0.82, '#f07020');
  skyGrad.addColorStop(0.92, '#f8a030');
  skyGrad.addColorStop(1.0,  '#ffc060');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, top, W, gameH);

  const horizGlow = ctx.createLinearGradient(0, H - gameH * 0.35, 0, H);
  horizGlow.addColorStop(0, 'rgba(255,160,40,0)');
  horizGlow.addColorStop(1, 'rgba(255,180,60,0.3)');
  ctx.fillStyle = horizGlow;
  ctx.fillRect(0, top, W, gameH);

  const sunX = W * 0.75;
  const sunY = H - gameH * 0.12;
  const sunR  = Math.min(W, gameH) * 0.11;

  const bigHalo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 5);
  bigHalo.addColorStop(0,   'rgba(255,200,80,0.5)');
  bigHalo.addColorStop(0.3, 'rgba(255,120,20,0.25)');
  bigHalo.addColorStop(0.7, 'rgba(200,60,10,0.1)');
  bigHalo.addColorStop(1,   'rgba(150,20,5,0)');
  ctx.fillStyle = bigHalo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 5, 0, Math.PI * 2);
  ctx.fill();

  const sunGrad = ctx.createRadialGradient(sunX, sunY - sunR*0.1, 0, sunX, sunY, sunR);
  sunGrad.addColorStop(0,   '#fff0c0');
  sunGrad.addColorStop(0.3, '#ffcc44');
  sunGrad.addColorStop(0.7, '#ff8820');
  sunGrad.addColorStop(1,   '#ff5500');
  ctx.fillStyle = sunGrad;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, H - top);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const reflGrad = ctx.createLinearGradient(sunX - sunR*0.5, sunY, sunX + sunR*0.5, sunY);
  reflGrad.addColorStop(0, 'rgba(255,150,50,0)');
  reflGrad.addColorStop(0.5, 'rgba(255,180,60,0.35)');
  reflGrad.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = reflGrad;
  ctx.fillRect(sunX - sunR*0.5, sunY, sunR, H - sunY);

  const groundY = H - gameH * 0.07;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, '#2a1205');
  groundGrad.addColorStop(1, '#120800');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  const buildScroll = (state.scrollX * 0.15) % (W * 1.5);
  const builds = [
    {x: 0.05, w: 0.04, h: 0.14}, {x: 0.12, w: 0.02, h: 0.09},
    {x: 0.18, w: 0.05, h: 0.18}, {x: 0.27, w: 0.03, h: 0.12},
    {x: 0.35, w: 0.06, h: 0.16}, {x: 0.44, w: 0.03, h: 0.10},
    {x: 0.52, w: 0.05, h: 0.20}, {x: 0.61, w: 0.04, h: 0.13},
    {x: 0.70, w: 0.03, h: 0.11}, {x: 0.78, w: 0.06, h: 0.17},
    {x: 0.87, w: 0.04, h: 0.14}, {x: 0.95, w: 0.03, h: 0.09},
  ];
  builds.forEach(b => {
    const bx = ((b.x * W - buildScroll * 0.5) % W + W) % W;
    ctx.fillStyle = '#120808';
    ctx.fillRect(bx, groundY - b.h * gameH, b.w * W, b.h * gameH + (H - groundY));
  });
}

function drawSkyPhase2(W, H) {
  const top = CONFIG.hudHeight;
  const gameH = H - top;

  const skyGrad = ctx.createLinearGradient(0, top, 0, H);
  skyGrad.addColorStop(0.0, '#010208');
  skyGrad.addColorStop(0.2, '#02061a');
  skyGrad.addColorStop(0.5, '#050b2a');
  skyGrad.addColorStop(0.75,'#0a1540');
  skyGrad.addColorStop(0.9, '#0f1e4a');
  skyGrad.addColorStop(1.0, '#152050');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, top, W, gameH);

  ctx.save();
  const milkyGrad = ctx.createLinearGradient(0, top, W, H);
  milkyGrad.addColorStop(0,   'rgba(80,100,180,0)');
  milkyGrad.addColorStop(0.2, 'rgba(80,100,180,0.06)');
  milkyGrad.addColorStop(0.5, 'rgba(100,120,200,0.1)');
  milkyGrad.addColorStop(0.8, 'rgba(80,100,180,0.06)');
  milkyGrad.addColorStop(1,   'rgba(80,100,180,0)');
  ctx.fillStyle = milkyGrad;
  ctx.fillRect(0, top, W, gameH);
  ctx.restore();

  if (!state._stars) {
    state._stars = Array.from({length: 150}, () => ({
      x: Math.random(), y: Math.random() * 0.75,
      r: Math.random() * 1.8 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.04,
      hue: Math.random() < 0.15 ? (Math.random() < 0.5 ? 'rgba(180,200,255,' : 'rgba(255,220,180,') : 'rgba(255,255,255,',
    }));
  }
  state._stars.forEach(s => {
    const alpha = 0.3 + 0.7 * ((Math.sin(state.scrollX * s.speed + s.twinkle) + 1) / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (s.r > 1.3) {
      const sg = ctx.createRadialGradient(s.x * W, top + s.y * gameH, 0, s.x * W, top + s.y * gameH, s.r * 3);
      sg.addColorStop(0, s.hue + '0.5)');
      sg.addColorStop(1, s.hue + '0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(s.x * W, top + s.y * gameH, s.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = s.hue + '1)';
    ctx.beginPath();
    ctx.arc(s.x * W, top + s.y * gameH, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const moonX = W * 0.18;
  const moonY = top + gameH * 0.22;
  const moonR  = Math.min(W, gameH) * 0.058;

  const moonHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 3.5);
  moonHalo.addColorStop(0,   'rgba(180,210,255,0.18)');
  moonHalo.addColorStop(0.5, 'rgba(140,180,240,0.07)');
  moonHalo.addColorStop(1,   'rgba(100,150,220,0)');
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 3.5, 0, Math.PI * 2);
  ctx.fill();

  const moonGrad = ctx.createRadialGradient(
    moonX - moonR * 0.25, moonY - moonR * 0.25, moonR * 0.05,
    moonX, moonY, moonR
  );
  moonGrad.addColorStop(0,   '#f0f4ff');
  moonGrad.addColorStop(0.4, '#d8e4f8');
  moonGrad.addColorStop(0.75, '#c0d0f0');
  moonGrad.addColorStop(1,   '#9ab0e0');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  const craters = [
    {ox: 0.2, oy: 0.15, r: 0.18}, {ox: -0.3, oy: 0.35, r: 0.12},
    {ox: 0.0, oy: -0.3, r: 0.15}, {ox: -0.15, oy: -0.1, r: 0.09},
    {ox: 0.35, oy: -0.2, r: 0.1},
  ];
  craters.forEach(c => {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#7090c0';
    ctx.beginPath();
    ctx.arc(moonX + c.ox * moonR, moonY + c.oy * moonR, c.r * moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const atmGlow = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, H * 0.7);
  atmGlow.addColorStop(0,   'rgba(10,30,80,0.4)');
  atmGlow.addColorStop(0.5, 'rgba(5,15,50,0.15)');
  atmGlow.addColorStop(1,   'rgba(0,5,20,0)');
  ctx.fillStyle = atmGlow;
  ctx.fillRect(0, top, W, gameH);

  const groundY = H - gameH * 0.07;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, '#0a1428');
  groundGrad.addColorStop(0.3, '#060e1e');
  groundGrad.addColorStop(1, '#020508');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  const cityScrollOffset = (state.scrollX * 0.1) % (W * 2);
  const buildings = [
    {x:0.0, w:0.06, h:0.30}, {x:0.08, w:0.04, h:0.22}, {x:0.14, w:0.07, h:0.38},
    {x:0.23, w:0.05, h:0.25}, {x:0.30, w:0.03, h:0.18}, {x:0.35, w:0.08, h:0.45},
    {x:0.45, w:0.04, h:0.28}, {x:0.51, w:0.06, h:0.33}, {x:0.59, w:0.05, h:0.22},
    {x:0.66, w:0.04, h:0.35}, {x:0.72, w:0.07, h:0.28}, {x:0.81, w:0.05, h:0.42},
    {x:0.88, w:0.04, h:0.24}, {x:0.94, w:0.06, h:0.32},
  ];
  buildings.forEach(b => {
    const bx = ((b.x * W - cityScrollOffset * 0.4) % W + W) % W;
    const bh = b.h * gameH;
    const by = groundY - bh;
    ctx.fillStyle = '#03070f';
    ctx.fillRect(bx, by, b.w * W, bh + (H - groundY));
    const wCols = Math.floor(b.w * W / 10);
    const wRows = Math.floor(bh / 12);
    for (let r = 1; r < wRows; r++) {
      for (let c = 0; c < wCols; c++) {
        const lit = Math.sin(b.x * 100 + r * 13 + c * 7 + state.scrollX * 0.005) > 0.2;
        if (lit) {
          ctx.fillStyle = Math.random() < 0.3 ? 'rgba(255,240,140,0.85)' : 'rgba(200,230,255,0.7)';
          ctx.fillRect(bx + c * 10 + 2, by + r * 12, 6, 7);
        }
      }
    }
  });
}

function draw() {
  const W = canvas.width, H = canvas.height;
  const phaseConf = CONFIG.phases[state.phase];
  ctx.clearRect(0, 0, W, H);

  // Céu procedural por fase
  if (state.phase === 0)      drawSkyPhase0(W, H);
  else if (state.phase === 1) drawSkyPhase1(W, H);
  else                        drawSkyPhase2(W, H);

  state.clouds.forEach(c => drawCloud(c, phaseConf.cloudColor, phaseConf.cloudAlpha));
  state.birds.forEach(b  => drawBird(b, phaseConf.birdTint));
  state.qmarks.forEach(q => drawQMark(q, phaseConf.accentColor));

  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  drawPlane(state.planeX, state.planeY, phaseConf);
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
  const alpha = c.alpha * (baseAlpha / 0.10);

  const blobs = [
    { ox: 0.5,  oy: 0.0,  rx: 0.48, ry: 0.42 },
    { ox: 0.28, oy: 0.12, rx: 0.34, ry: 0.36 },
    { ox: 0.72, oy: 0.1,  rx: 0.3,  ry: 0.32 },
    { ox: 0.15, oy: 0.22, rx: 0.22, ry: 0.26 },
    { ox: 0.85, oy: 0.2,  rx: 0.20, ry: 0.24 },
  ];

  // Sombra suave abaixo
  ctx.globalAlpha = alpha * 0.18;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  blobs.forEach(b => {
    ctx.beginPath();
    ctx.ellipse(c.x + b.ox * c.w, c.y + (b.oy + 0.1) * c.h, b.rx * c.w, b.ry * c.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Nuvem principal
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = color;
  blobs.forEach(b => {
    ctx.beginPath();
    ctx.ellipse(c.x + b.ox * c.w, c.y + b.oy * c.h, b.rx * c.w, b.ry * c.h, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Destaque branco/claro no topo
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.5, c.y - c.h * 0.08, c.w * 0.3, c.h * 0.18, 0, 0, Math.PI * 2);
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
    if (tint) {
      // Offscreen canvas para aplicar tint SEM caixa quadrada
      const oc = document.createElement('canvas');
      oc.width = bw; oc.height = bh;
      const ox = oc.getContext('2d');
      ox.drawImage(IMAGES.passaro, 0, 0, bw, bh);
      ox.fillStyle = tint;
      ox.globalCompositeOperation = 'source-atop';
      ox.fillRect(0, 0, bw, bh);
      ctx.drawImage(oc, -bw/2, -bh/2);
    } else {
      ctx.drawImage(IMAGES.passaro, -bw/2, -bh/2, bw, bh);
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
  const speedMul = state.speedMultiplier || 1;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt * Math.PI / 180);
  if (IMAGES.nave && IMAGES.nave.complete && IMAGES.nave.naturalWidth > 0) {
    // Rastro fica mais longo acelerando e mais curto freando
    const pw = CONFIG.planeWidth * 1.7, ph = pw * (1024/1536);
    const exhaustCount = Math.round(4 + speedMul * 2); // ~5 no padrão, mais em alta, menos freando
    for (let i = 0; i < exhaustCount; i++) {
      ctx.globalAlpha = (0.15 - i * 0.02) * Math.min(1, speedMul);
      ctx.fillStyle = phaseConf.exhaustColor;
      ctx.beginPath(); ctx.ellipse(-pw/2 + 4 - i*9, 0, 7-i*0.6, 3.5-i*0.3, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(IMAGES.nave, -pw/2, -ph/2, pw, ph);
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
  state.qAnswered       = false;
  state.qShouldAdvance  = false;
  state.qSelectedIndex  = 0;
  hideQuestionActions();
  const phaseId = state.phase + 1;

  // Filtra perguntas da fase atual que ainda não foram usadas
  let pool = QUESTIONS.filter(q => q.phase === phaseId && !state.usedQuestions.includes(q.text));
  // Se esgotou, reseta o pool (permite repetir)
  if (!pool.length) {
    state.usedQuestions = [];
    pool = QUESTIONS.filter(q => q.phase === phaseId);
  }
  if (!pool.length) { state.questionPending = false; return; }

  // Escolhe pergunta aleatória do pool
  const rawQ = pool[Math.floor(Math.random() * pool.length)];
  state.usedQuestions.push(rawQ.text);

  // Embaralha as opções mantendo o índice correto atualizado
  const indexed = rawQ.options.map((opt, i) => ({ opt, isCorrect: i === rawQ.correct }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const newCorrectIdx = indexed.findIndex(o => o.isCorrect);

  state.currentQuestion = {
    text: rawQ.text,
    options: indexed.map(o => o.opt),
    correct: newCorrectIdx,
    explanation: rawQ.explanation,
  };

  questionText.textContent = state.currentQuestion.text;
  questionOpts.innerHTML   = '';
  questionFeedback.className = 'hidden';

  state.currentQuestion.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.setAttribute('aria-label', `Alternativa ${i + 1} de ${state.currentQuestion.options.length}: ${opt}`);
    btn.addEventListener('click', () => answerQuestion(i, btn));
    questionOpts.appendChild(btn);
  });
  questionOverlay.classList.remove('hidden');
  clearAnnouncements();                    // nada falando por cima da pergunta
  setInert(gameBackgroundEls(), true);     // o leitor não lê o HUD/canvas ao fundo

  // Uma alternativa já começa destacada, permitindo responder só com o teclado
  updateOptionSelection();

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
  // Impede responder a mesma pergunta duas vezes (proteção extra além do
  // atributo "disabled" dos botões, que já bloqueia cliques do mouse)
  if (state.qAnswered) return;
  state.qAnswered = true;

  const q       = state.currentQuestion;
  const correct = idx === q.correct;

  questionOpts.querySelectorAll('.option-btn').forEach((b, i) => {
    b.disabled = true;
    b.classList.remove('selected');
    if (i === q.correct) b.classList.add('correct');
  });
  if (!correct) btn.classList.add('wrong');

  questionFeedback.classList.remove('hidden');

  const phaseConf = CONFIG.phases[state.phase];
  const fuelGain  = CONFIG.fuelGain.correct + phaseConf.fuelGainBonus;
  const wrongLoss = CONFIG.fuelLoss.wrong;
  // Sistema calibrado: 9 acertos × 10 pts + 10 vitória = 100 pontos perfeitos
  const scoreGain = 10;   // fixo por acerto
  const scoreLoss = 5;    // fixo por erro

  state.qShouldAdvance = false;

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

    // Se completou os acertos necessários, a fase avança quando o
    // jogador fechar a pergunta (Continuar / X), não automaticamente
    if (state.phaseCorrect >= phaseConf.correctNeeded) {
      state.qShouldAdvance = true;
    }
  } else {
    questionFeedback.classList.add('fail');
    questionFeedback.classList.remove('success');
    questionFeedback.textContent = `❌ Errado! A alternativa correta era: "${q.options[q.correct]}". ${q.explanation}`;
    state.score = Math.max(0, state.score - scoreLoss);
    state.fuel  = Math.max(0, state.fuel - wrongLoss);
    showScorePopup(canvas.width/2, canvas.height/2, `-${scoreLoss}`);
  }

  updateHUD();

  // A pergunta permanece aberta — o jogador decide quando continuar
  showQuestionActions();

  // Leitor de tela: o foco vai para o feedback, que é lido na hora.
  // Enter (ou Tab até o botão Continuar) fecha a pergunta.
  questionFeedback.textContent += ' Aperte Enter para continuar.';
  questionFeedback.focus({ preventScroll: true });
}

// Fecha a pergunta manualmente (botão "Continuar" ou "X" / Enter após responder)
function closeQuestion() {
  if (!state.qAnswered || !state.questionPending) return; // só fecha depois de responder (e só uma vez)
  questionOverlay.classList.add('hidden');
  hideQuestionActions();
  state.questionPending = false;
  setInert(gameBackgroundEls(), false);
  focusGame();                             // sem isso o foco vai ao body e o leitor volta a bloquear as teclas

  const shouldAdvance = state.qShouldAdvance;
  state.qShouldAdvance = false;
  if (shouldAdvance) advancePhase();
}

function showQuestionActions() {
  btnQuestionContinue.classList.remove('hidden');
  btnQuestionClose.classList.remove('hidden');
}
function hideQuestionActions() {
  btnQuestionContinue.classList.add('hidden');
  btnQuestionClose.classList.add('hidden');
}

// ─── NAVEGAÇÃO DAS ALTERNATIVAS POR TECLADO (W/S, ↑/↓, Enter) ─────────────
function updateOptionSelection() {
  const buttons = questionOpts.querySelectorAll('.option-btn');
  buttons.forEach((b, i) => b.classList.toggle('selected', i === state.qSelectedIndex));
  // Foco acompanha a alternativa destacada: o leitor de tela lê a opção atual
  if (state.questionPending && !state.qAnswered && buttons[state.qSelectedIndex]) {
    buttons[state.qSelectedIndex].focus({ preventScroll: true });
  }
}

function handleQuestionKeydown(e) {
  const buttons = questionOpts.querySelectorAll('.option-btn');
  if (!buttons.length) return;

  if (!state.qAnswered) {
    // Pergunta ainda não respondida: navega e confirma
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      state.qSelectedIndex = Math.max(0, state.qSelectedIndex - 1);
      updateOptionSelection();
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      state.qSelectedIndex = Math.min(buttons.length - 1, state.qSelectedIndex + 1);
      updateOptionSelection();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      const btn = buttons[state.qSelectedIndex];
      if (btn && !btn.disabled) answerQuestion(state.qSelectedIndex, btn);
    }
  } else {
    // Pergunta já respondida: Enter funciona como o botão "Continuar"
    if (e.code === 'Enter') {
      e.preventDefault();
      closeQuestion();
    }
  }
}

// ─── SCORE POPUP ───────────────────────────────────────────────────────────
function showScorePopup(x, y, text) {
  const el = document.createElement('div');
  el.className = `score-popup ${(text.startsWith('+') || text.startsWith('⛽')) ? 'positive' : 'negative'}`;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
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
  el.setAttribute('aria-hidden', 'true');
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
  const behind = gameBackgroundEls().concat([questionOverlay]);
  if (state.paused) {
    clearAnnouncements();
    setInert(behind, true);
    document.getElementById('btn-resume').focus({ preventScroll: true });
  } else {
    setInert(behind, false);
    // Se havia uma pergunta aberta, o foco volta para ela; senão, para o canvas
    if (state.questionPending && !state.qAnswered) updateOptionSelection();
    else if (state.questionPending) questionFeedback.focus({ preventScroll: true });
    else focusGame();
    announce('Jogo retomado.');
  }
}

// ─── MENSAGENS DE DERROTA (amigáveis e motivadoras) ────────────────────────
const LOSE_TITLES = [
  'Quase lá!',
  'Foi por pouco!',
  'Boa tentativa!',
  'Não desista!',
  'Você quase conseguiu!',
];
function pickLoseTitle() {
  return LOSE_TITLES[Math.floor(Math.random() * LOSE_TITLES.length)];
}

// ─── END GAME ──────────────────────────────────────────────────────────────
function endGame(won, message) {
  state.running = false;
  setInert(gameBackgroundEls().concat([questionOverlay]), false);
  clearAnnouncements();
  cancelAnimationFrame(state.animFrame);
  document.getElementById('gameover-icon').textContent  = won ? '🛬' : '🔄';
  document.getElementById('gameover-title').textContent = won ? 'Pouso Perfeito!' : pickLoseTitle();
  document.getElementById('gameover-msg').textContent   = message;
  document.getElementById('final-score').textContent    = state.score;
  const medal = state.score >= 80 ? '🥇 Medalha de Ouro!'
              : state.score >= 50 ? '🥈 Medalha de Prata!'
              : '🥉 Medalha de Bronze!';
  document.getElementById('final-medal').textContent = medal;

  // Mensagem de habilidade baseada na pontuação
  const skillMsg = state.score >= 90
    ? '🌟 Desempenho Excelente! O aluno demonstrou domínio completo dos conceitos e não precisa de recuperação.'
    : state.score >= 80
    ? '✅ Muito Bom! O aluno compreendeu bem os conteúdos e está apto para avançar.'
    : state.score >= 70
    ? '👍 Bom Desempenho! O aluno apresentou boa compreensão, com pequenas lacunas a revisar.'
    : state.score >= 50
    ? '📚 Bom começo! Revisando mais alguns conceitos, você consolida o que já aprendeu e vai ainda mais longe.'
    : state.score >= 30
    ? '⚠️ Atenção! O aluno apresentou dificuldades e precisa de reforço nos conteúdos estudados.'
    : '🔁 Vamos tentar novamente! Você ainda não atingiu a pontuação mínima desta vez, mas com mais uma tentativa dá pra chegar lá — continue praticando!';
  document.getElementById('skill-message').textContent = skillMsg;

  showScreen('gameover');

  // Leitor de tela: o foco vai para o título; o resumo é falado logo depois
  setTimeout(() => announce(`${message} Pontuação final: ${state.score}. ${medal.replace(/[🥇🥈🥉]/gu, '').trim()}`), 700);
}

// Preload


/* ===========================
   ACESSIBILIDADE
   =========================== */
(function () {
  const PREF_FONT  = 'aerorun_font_size';
  const PREF_THEME = 'aerorun_theme';
  const PREF_CB    = 'aerorun_colorblind';

  const modal    = document.getElementById('accessibility-modal');
  const btnOpen  = document.getElementById('btn-accessibility');
  const btnClose = document.getElementById('btn-close-accessibility');

  // Fonte
  const fontMedium = document.getElementById('font-medium');
  const fontLarge  = document.getElementById('font-large');
  const fontXLarge = document.getElementById('font-xlarge');
  const previewText = document.getElementById('font-preview-text');

  // Tema
  const themeDark     = document.getElementById('theme-dark');
  const themeLight    = document.getElementById('theme-light');
  const themeContrast = document.getElementById('theme-contrast');

  // Daltonismo
  const cbNone         = document.getElementById('cb-none');
  const cbDeutBtn      = document.getElementById('cb-deuteranopia-btn');
  const cbProtBtn      = document.getElementById('cb-protanopia-btn');
  const cbTritBtn      = document.getElementById('cb-tritanopia-btn');

  const THEMES = ['dark', 'light', 'contrast'];
  const CB_MODES = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];

  let currentFont  = localStorage.getItem(PREF_FONT)  || 'medium';
  if (currentFont === 'small') currentFont = 'medium'; // compatibilidade com preferência antiga removida
  let currentTheme = localStorage.getItem(PREF_THEME) || 'dark';
  let currentCB    = localStorage.getItem(PREF_CB)    || 'none';

  // Sincroniza aria-pressed com a classe "active" (leitor de tela diz "pressionado")
  function syncPressed() {
    [fontMedium, fontLarge, fontXLarge, themeDark, themeLight, themeContrast,
     cbNone, cbDeutBtn, cbProtBtn, cbTritBtn]
      .forEach(b => b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false'));
  }

  /* ---- Fonte ---- */
  function applyFont(size) {
    document.body.classList.remove('font-medium', 'font-large', 'font-xlarge');
    document.body.classList.add('font-' + size);
    currentFont = size;
    localStorage.setItem(PREF_FONT, size);
    [fontMedium, fontLarge, fontXLarge].forEach(b => b.classList.remove('active'));
    ({ medium: fontMedium, large: fontLarge, xlarge: fontXLarge })[size].classList.add('active');
    previewText.style.fontSize = size === 'large' ? '18px' : size === 'xlarge' ? '21px' : '15px';
    syncPressed();
  }

  /* ---- Tema ---- */
  function applyTheme(theme) {
    currentTheme = theme;
    THEMES.forEach(t => document.body.classList.remove('theme-' + t));
    if (theme !== 'dark') document.body.classList.add('theme-' + theme);
    localStorage.setItem(PREF_THEME, theme);

    [themeDark, themeLight, themeContrast].forEach(b => b.classList.remove('active'));
    ({ dark: themeDark, light: themeLight, contrast: themeContrast })[theme].classList.add('active');
    syncPressed();
  }

  /* ---- Daltonismo ---- */
  function applyCB(mode) {
    currentCB = mode;
    CB_MODES.forEach(m => {
      if (m !== 'none') document.body.classList.remove('colorblind-' + m);
    });
    if (mode !== 'none') document.body.classList.add('colorblind-' + mode);
    localStorage.setItem(PREF_CB, mode);

    [cbNone, cbDeutBtn, cbProtBtn, cbTritBtn].forEach(b => b.classList.remove('active'));
    ({ none: cbNone, deuteranopia: cbDeutBtn, protanopia: cbProtBtn, tritanopia: cbTritBtn })[mode].classList.add('active');
    syncPressed();
  }

  /* ---- Init ---- */
  applyFont(currentFont);
  applyTheme(currentTheme);
  applyCB(currentCB);

  /* ---- Eventos ---- */
  const behindModal = () => Array.from(document.querySelectorAll('.screen'))
    .concat([btnOpen, document.getElementById('btn-audio'), document.getElementById('audio-panel')]);
  function openModal() {
    setInert(behindModal(), true);                                // leitor não lê o que está atrás
    modal.classList.remove('hidden');
    fontMedium.parentElement.querySelector('.active')?.focus();   // foco dentro do diálogo
  }
  function closeModal() {
    modal.classList.add('hidden');
    setInert(behindModal(), false);
    btnOpen.focus();                                              // devolve o foco ao botão ♿
  }
  btnOpen.addEventListener('click',  openModal);
  btnClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.classList.contains('hidden')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    // Prende o Tab dentro do diálogo
    if (e.key === 'Tab') {
      const items = modal.querySelectorAll('button');
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  fontMedium.addEventListener('click', () => applyFont('medium'));
  fontLarge.addEventListener('click',  () => applyFont('large'));
  fontXLarge.addEventListener('click', () => applyFont('xlarge'));

  themeDark.addEventListener('click',     () => applyTheme('dark'));
  themeLight.addEventListener('click',    () => applyTheme('light'));
  themeContrast.addEventListener('click', () => applyTheme('contrast'));

  cbNone.addEventListener('click',    () => applyCB('none'));
  cbDeutBtn.addEventListener('click', () => applyCB('deuteranopia'));
  cbProtBtn.addEventListener('click', () => applyCB('protanopia'));
  cbTritBtn.addEventListener('click', () => applyCB('tritanopia'));
})();

/* ===========================
   CONTROLE DE ÁUDIO (mudo + volume)
   =========================== */
(function () {
  const btnAudio     = document.getElementById('btn-audio');
  const audioPanel   = document.getElementById('audio-panel');
  const btnMute      = document.getElementById('btn-mute');
  const volumeSlider = document.getElementById('volume-slider');

  function updateAudioUI() {
    const engine = window.AudioEngine;
    const muted  = engine ? engine.isMuted()  : false;
    const volume = engine ? engine.getVolume() : 0.6;
    const icon = muted || volume === 0 ? '🔇' : '🔊';
    btnAudio.textContent = icon;
    btnMute.textContent  = icon;
    volumeSlider.value   = Math.round(volume * 100);
  }
  updateAudioUI();

  btnAudio.addEventListener('click', (e) => {
    e.stopPropagation();
    audioPanel.classList.toggle('hidden');
    btnAudio.setAttribute('aria-expanded', String(!audioPanel.classList.contains('hidden')));
  });

  btnMute.addEventListener('click', () => {
    if (window.AudioEngine) window.AudioEngine.toggleMute();
    updateAudioUI();
  });

  volumeSlider.addEventListener('input', () => {
    if (window.AudioEngine) window.AudioEngine.setVolume(volumeSlider.value / 100);
    updateAudioUI();
  });

  // Fecha o painel ao clicar fora dele
  document.addEventListener('click', (e) => {
    if (!audioPanel.classList.contains('hidden') &&
        !audioPanel.contains(e.target) &&
        e.target !== btnAudio) {
      audioPanel.classList.add('hidden');
      btnAudio.setAttribute('aria-expanded', 'false');
    }
  });

  // Fecha o painel com a tecla Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !audioPanel.classList.contains('hidden')) {
      audioPanel.classList.add('hidden');
      btnAudio.setAttribute('aria-expanded', 'false');
      btnAudio.focus();
    }
  });
})();

/* ---------------------------------------------------------
   OVERLAY "GIRE SEU DISPOSITIVO"
   Reforço em JS além da media query CSS: alguns navegadores
   mobile não reagem bem só ao "orientation" do CSS, então aqui
   comparamos largura x altura da própria janela diretamente.
   --------------------------------------------------------- */
(function () {
  const MOBILE_MAX_WIDTH = 900; // mesmo limite usado na media query do CSS

  function checkOrientation() {
    const isSmallScreen = window.innerWidth <= MOBILE_MAX_WIDTH;
    const isPortrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('force-rotate', isSmallScreen && isPortrait);
  }

  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
})();

// Ao abrir a página, leva o foco à tela inicial para o leitor ler o conteúdo dela
window.addEventListener('load', () => focusScreenHeading('start'));