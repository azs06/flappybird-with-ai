// ============================================================================
// main.js - Application Entry Point, Input Listeners & Gamepad Support
// ============================================================================

import './style.css';
import { Game } from './game/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  const game = new Game(canvas);

  // Resize listener
  const handleResize = () => {
    game.renderer.resize();
  };
  window.addEventListener('resize', handleResize);

  // Coordinate mapper from Screen/Touch to Virtual Canvas
  const getCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = game.renderer.virtualWidth / rect.width;
    const scaleY = game.renderer.virtualHeight / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Click & Touch Handlers
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const pos = getCoords(e);
    game.handleCanvasClick(pos.x, pos.y);
  });

  // Keyboard Handlers
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      game.handleAction();
    } else if (e.code === 'Escape') {
      if (game.uiManager.activeModal) {
        game.uiManager.closeModal();
      }
    }
  });

  // Header Sound Button
  const btnSound = document.getElementById('btn-sound-toggle');
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      const isMuted = !game.soundEngine.isMuted;
      game.soundEngine.setMuted(isMuted);
      btnSound.textContent = isMuted ? '🔇' : '🔊';
      btnSound.title = isMuted ? 'Unmute Audio' : 'Mute Audio';
    });
  }

  // Header Fullscreen Button
  const btnFullscreen = document.getElementById('btn-fullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const container = document.getElementById('canvas-container');
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) container.requestFullscreen();
        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });
  }

  // Gamepad API integration
  let lastGamepadButtonState = false;
  const pollGamepad = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      // Button 0 (A / Cross), Button 12 (D-pad Up)
      const buttonPressed = gp.buttons[0]?.pressed || gp.buttons[12]?.pressed;
      if (buttonPressed && !lastGamepadButtonState) {
        game.handleAction();
      }
      lastGamepadButtonState = buttonPressed;
    }
    requestAnimationFrame(pollGamepad);
  };
  pollGamepad();
});
