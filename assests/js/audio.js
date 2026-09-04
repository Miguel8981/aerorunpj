// audio.js — Aero Run · Trilhas sonoras
// Morning_Altitude.mp3 toca em loop na tela inicial (menu).
// Above_the_Clouds.mp3 toca em loop assim que o voo começa (tela do jogo).
// Nas demais telas (instruções, fim de jogo) fica tudo em silêncio.

window.AudioEngine = (() => {
  'use strict';

  const menuMusic = new Audio('assests/audio/Morning_Altitude.mp3');
  menuMusic.loop    = true;
  menuMusic.volume  = 0.6;
  menuMusic.preload = 'auto';

  const gameMusic = new Audio('assests/audio/Above_the_Clouds.mp3');
  gameMusic.loop    = true;
  gameMusic.volume  = 0.6;
  gameMusic.preload = 'auto';

  let unlocked = false;
  let muted    = false;
  let currentTrack = null; // referência à música tocando no momento ('menu' | 'game' | null)

  // A tela inicial já nasce com a classe "active" no HTML (não passa pelo
  // showScreen() no carregamento da página), então detectamos aqui qual tela
  // está ativa de cara para já deixar a faixa certa "armada".
  function detectInitialScreen() {
    const startScreen = document.getElementById('screen-start');
    const gameScreen  = document.getElementById('screen-game');
    if (startScreen && startScreen.classList.contains('active')) {
      currentTrack = 'menu';
    } else if (gameScreen && gameScreen.classList.contains('active')) {
      currentTrack = 'game';
    }
  }
  detectInitialScreen();

  function stopAll() {
    menuMusic.pause();
    menuMusic.currentTime = 0;
    gameMusic.pause();
    gameMusic.currentTime = 0;
  }

  function playTrack(track) {
    currentTrack = track;
    console.log('[AudioEngine] playTrack chamado com:', track, '| muted:', muted, '| unlocked:', unlocked);
    if (muted) return; // respeita o mudo: guarda a intenção mas não toca

    if (track === 'menu') {
      gameMusic.pause();
      gameMusic.currentTime = 0;
      menuMusic.play()
        .then(() => console.log('[AudioEngine] menuMusic tocando com sucesso'))
        .catch(err => console.error('[AudioEngine] ERRO ao tocar menuMusic:', err));
    } else if (track === 'game') {
      menuMusic.pause();
      menuMusic.currentTime = 0;
      gameMusic.play()
        .then(() => console.log('[AudioEngine] gameMusic tocando com sucesso'))
        .catch(err => console.error('[AudioEngine] ERRO ao tocar gameMusic:', err));
    } else {
      stopAll();
    }
  }

  menuMusic.addEventListener('error', () => console.error('[AudioEngine] Falha ao carregar arquivo:', menuMusic.src, menuMusic.error));
  gameMusic.addEventListener('error', () => console.error('[AudioEngine] Falha ao carregar arquivo:', gameMusic.src, gameMusic.error));

  // Navegadores só liberam áudio depois de um gesto do usuário (clique/tecla/toque)
  function unlockOnce() {
    if (unlocked) return;
    unlocked = true;
    if (currentTrack) playTrack(currentTrack);
    ['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
      document.removeEventListener(evt, unlockOnce)
    );
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, unlockOnce)
  );

  // Chamado pelo showScreen() do jogo a cada troca de tela
  function onScreenChange(name) {
    if (name === 'start')      currentTrack = 'menu';
    else if (name === 'game')  currentTrack = 'game';
    else                       currentTrack = null;

    if (!unlocked) return; // aguarda o primeiro gesto do usuário
    playTrack(currentTrack);
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      menuMusic.pause();
      gameMusic.pause();
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  // Mantidas por compatibilidade com chamadas antigas
  function playMenu() { onScreenChange('start'); }
  function stopMenu()  { stopAll(); }

  return { playMenu, stopMenu, onScreenChange, toggleMute, isMuted };
})();