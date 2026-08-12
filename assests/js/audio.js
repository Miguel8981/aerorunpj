// audio.js — Aero Run · Música do menu
// Toca a trilha ambiente enquanto o jogador está na tela inicial
// e interrompe assim que o voo começa (ou o jogador sai dela).

const AudioEngine = (() => {
    'use strict';
  
    const menuMusic = new Audio('assests/audio/lorenzobuczek-first-flight-226814.mp3');
    menuMusic.loop    = true;
    menuMusic.volume  = 0.6;
    menuMusic.preload = 'auto';
  
    let unlocked = false;
  
    function tryPlayMenu() {
      const startScreen = document.getElementById('screen-start');
      if (startScreen && startScreen.classList.contains('active')) {
        menuMusic.play().catch(() => { /* navegador ainda bloqueando, ignora */ });
      }
    }
  
    // Navegadores só liberam áudio depois de um gesto do usuário (clique/tecla/toque)
    function unlockOnce() {
      if (unlocked) return;
      unlocked = true;
      tryPlayMenu();
      ['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
        document.removeEventListener(evt, unlockOnce)
      );
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
      document.addEventListener(evt, unlockOnce)
    );
  
    function playMenu() {
      if (!unlocked) return; // ainda sem gesto do usuário — a música entra no unlockOnce()
      tryPlayMenu();
    }
  
    function stopMenu() {
      menuMusic.pause();
      menuMusic.currentTime = 0;
    }
  
    // Chamado pelo showScreen() do jogo: música só toca na tela inicial
    function onScreenChange(name) {
      if (name === 'start') playMenu();
      else stopMenu(); // instruções, jogo e fim de jogo ficam sem a música do menu
    }
  
    return { playMenu, stopMenu, onScreenChange };
  })();