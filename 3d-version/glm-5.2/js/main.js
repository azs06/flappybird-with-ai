import * as THREE from "three";
import { Environment, GROUND_Y, CEILING_Y } from "./Environment.js";
import { Bird } from "./Bird.js";
import { PipeManager } from "./Pipes.js";
import { Particles } from "./Particles.js";
import { audio } from "./Audio.js";
import { leaderboard } from "./Leaderboard.js";

const STATE = { MENU: "menu", PLAYING: "playing", PAUSED: "paused", DYING: "dying", GAMEOVER: "gameover" };
const CAM_LABELS = ["Chase cam", "Side view", "First person"];
const CAM_KEY = "flappy3d_glm_cam";

const BASE_SPEED = 8.6;
const MAX_SPEED = 15.5;

class Game {
  constructor() {
    this.state = STATE.MENU;
    this.score = 0;
    this.speed = BASE_SPEED;
    this._dyingTimer = 0;
    this._shake = 0;
    this._camTarget = new THREE.Vector3();
    this._camMode = parseInt(localStorage.getItem(CAM_KEY) || "0", 10) % 3;

    this._cacheDom();
    this._initThree();
    this._initWorld();
    this._initInput();
    this._renderLeaderboard(this.dom.lbTable);
    this._updateSoundLabel();
    this._updateCamLabel();

    this.clock = new THREE.Clock();
    this.dom.loader.classList.add("hidden");
    this._show(this.dom.menu);

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _cacheDom() {
    const $ = (id) => document.getElementById(id);
    this.dom = {
      loader: $("loader"),
      menu: $("menu"),
      lbView: $("leaderboard-view"),
      hud: $("hud"),
      pause: $("pause"),
      gameover: $("gameover"),
      score: $("score"),
      scorePopup: $("score-popup"),
      finalScore: $("final-score"),
      bestScore: $("best-score"),
      newRecord: $("new-record"),
      nameEntry: $("name-entry"),
      playerName: $("player-name"),
      goLb: $("gameover-leaderboard"),
      lbTable: $("leaderboard-table"),
      btnStart: $("btn-start"),
      btnLb: $("btn-leaderboard"),
      btnLbBack: $("btn-lb-back"),
      btnCam: $("btn-cam"),
      btnSound: $("btn-sound"),
      btnPause: $("btn-pause"),
      btnHudCam: $("btn-hud-cam"),
      btnHudSound: $("btn-hud-sound"),
      btnResume: $("btn-resume"),
      btnQuit: $("btn-quit"),
      btnSave: $("btn-save-score"),
      btnRetry: $("btn-retry"),
      btnGoMenu: $("btn-go-menu")
    };
  }

  _initThree() {
    const mount = document.getElementById("scene-mount");
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.set(-7.5, 6.4, 6.2);

    window.addEventListener("resize", () => this._onResize(), { passive: true });
  }

  _initWorld() {
    this.environment = new Environment(this.scene, this.camera);
    this.bird = new Bird(this.scene);
    this.pipes = new PipeManager(this.scene);
    this.particles = new Particles(this.scene);
    this.environment.setProgress(0);
  }

  _initInput() {
    window.addEventListener("keydown", (e) => this._onKey(e));
    window.addEventListener("pointerdown", (e) => this._onPointer(e), { passive: false });
    window.addEventListener("touchstart", (e) => {
      const t = e.target;
      if (t && t instanceof Element && t.closest("input, button")) return;
      e.preventDefault();
    }, { passive: false });

    this.dom.btnStart.addEventListener("click", () => this._start());
    this.dom.btnRetry.addEventListener("click", () => this._start());
    this.dom.btnResume.addEventListener("click", () => this._togglePause());
    this.dom.btnQuit.addEventListener("click", () => this._quitToMenu());
    this.dom.btnGoMenu.addEventListener("click", () => this._quitToMenu());
    this.dom.btnPause.addEventListener("click", () => this._togglePause());
    this.dom.btnLb.addEventListener("click", () => { this._hide(this.dom.menu); this._show(this.dom.lbView); this._renderLeaderboard(this.dom.lbTable); });
    this.dom.btnLbBack.addEventListener("click", () => { this._hide(this.dom.lbView); this._show(this.dom.menu); });

    this.dom.btnCam.addEventListener("click", () => this._cycleCamera());
    this.dom.btnHudCam.addEventListener("click", (e) => { e.stopPropagation(); this._cycleCamera(); });
    this.dom.btnSound.addEventListener("click", () => this._toggleSound());
    this.dom.btnHudSound.addEventListener("click", (e) => { e.stopPropagation(); this._toggleSound(); });

    this.dom.btnSave.addEventListener("click", () => this._saveScore());
    this.dom.playerName.addEventListener("keydown", (e) => { if (e.key === "Enter") this._saveScore(); });
  }

  _onKey(e) {
    if (e.target === this.dom.playerName) return;
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      audio.unlock();
      if (this.state === STATE.PLAYING) this._flap();
      else if (this.state === STATE.MENU) this._start();
      else if (this.state === STATE.GAMEOVER && this.dom.nameEntry.classList.contains("hidden")) this._start();
    } else if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this._togglePause();
    }
  }

  _onPointer(e) {
    const t = e.target;
    if (t && t instanceof Element && t.closest(".overlay, .icon-btn, .hud-controls, input, button")) return;
    audio.unlock();
    if (this.state === STATE.PLAYING) {
      e.preventDefault();
      this._flap();
    }
  }

  _show(el) { el.classList.remove("hidden"); }
  _hide(el) { el.classList.add("hidden"); }

  _start() {
    audio.unlock();
    this.score = 0;
    this.speed = BASE_SPEED;
    this._dyingTimer = 0;
    this._shake = 0;
    this.bird.reset();
    this.pipes.reset();
    this.environment.setProgress(0);
    this._hide(this.dom.menu);
    this._hide(this.dom.lbView);
    this._hide(this.dom.gameover);
    this._hide(this.dom.pause);
    this._show(this.dom.hud);
    this.dom.score.textContent = "0";
    this.state = STATE.PLAYING;
    audio.swoosh();
  }

  _flap() {
    this.bird.flap();
    audio.flap();
    this.particles.flapPuff(this.bird.group.position);
  }

  _togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this._show(this.dom.pause);
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this._hide(this.dom.pause);
      this.clock.getDelta();
    }
  }

  _quitToMenu() {
    this.state = STATE.MENU;
    this._hide(this.dom.hud);
    this._hide(this.dom.pause);
    this._hide(this.dom.gameover);
    this._hide(this.dom.lbView);
    this.bird.reset();
    this.pipes.reset();
    this.environment.setProgress(0);
    this._show(this.dom.menu);
  }

  _die() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.DYING;
    this._dyingTimer = 0;
    this.bird.kill();
    audio.hit();
    this.particles.feathers(this.bird.group.position);
    this._shake = 0.45;
    this._hide(this.dom.hud);
  }

  _onScore(pipe) {
    this.score++;
    this.dom.score.textContent = String(this.score);
    this.dom.score.classList.remove("bump");
    void this.dom.score.offsetWidth;
    this.dom.score.classList.add("bump");
    this._popup("+1");
    audio.score();
    this.particles.sparkle(new THREE.Vector3(pipe.x, this.bird.y, 0));
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.score * 0.18);
    this.environment.setProgress(Math.min(1, this.score / 40));
  }

  _popup(text) {
    this.dom.scorePopup.textContent = text;
    this.dom.scorePopup.classList.remove("show");
    void this.dom.scorePopup.offsetWidth;
    this.dom.scorePopup.classList.add("show");
  }

  _showGameOver() {
    const prevBest = leaderboard.best();
    const qualifies = leaderboard.qualifies(this.score);
    this.bird.vy = 0;
    this.dom.finalScore.textContent = String(this.score);
    this.dom.bestScore.textContent = String(Math.max(prevBest, this.score));
    const isRecord = this.score > prevBest && this.score > 0;
    this.dom.newRecord.classList.toggle("hidden", !isRecord);

    if (qualifies) {
      this.dom.nameEntry.classList.remove("hidden");
      this.dom.goLb.classList.add("hidden");
      this.dom.playerName.value = "";
      window.setTimeout(() => this.dom.playerName.focus(), 60);
    } else {
      this.dom.nameEntry.classList.add("hidden");
      this.dom.goLb.classList.remove("hidden");
      this._renderLeaderboard(this.dom.goLb, -1);
    }
    this._hide(this.dom.hud);
    this._show(this.dom.gameover);
    this.state = STATE.GAMEOVER;
  }

  _saveScore() {
    const name = this.dom.playerName.value;
    const rank = leaderboard.add(name, this.score);
    this.dom.bestScore.textContent = String(leaderboard.best());
    this.dom.nameEntry.classList.add("hidden");
    this.dom.goLb.classList.remove("hidden");
    this._renderLeaderboard(this.dom.goLb, rank);
    audio.swoosh();
  }

  _renderLeaderboard(container, highlightIndex = -1) {
    const entries = leaderboard.all();
    container.innerHTML = "";
    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "lb-row lb-empty";
      empty.textContent = "No flights yet — be the first!";
      container.appendChild(empty);
      return;
    }
    entries.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      if (i === 0) row.classList.add("top-1");
      else if (i === 1) row.classList.add("top-2");
      else if (i === 2) row.classList.add("top-3");
      if (i === highlightIndex) row.classList.add("is-self");
      const rank = document.createElement("span");
      rank.className = "lb-rank";
      rank.textContent = `${i + 1}`;
      const name = document.createElement("span");
      name.className = "lb-name";
      name.textContent = e.name;
      const score = document.createElement("span");
      score.className = "lb-score";
      score.textContent = String(e.score);
      row.append(rank, name, score);
      container.appendChild(row);
    });
  }

  _cycleCamera() {
    this._camMode = (this._camMode + 1) % 3;
    localStorage.setItem(CAM_KEY, String(this._camMode));
    this._updateCamLabel();
    audio.swoosh();
  }

  _updateCamLabel() {
    const label = CAM_LABELS[this._camMode];
    this.dom.btnCam.textContent = label;
    this.dom.btnHudCam.title = label;
  }

  _toggleSound() {
    audio.unlock();
    const on = audio.toggle();
    this._updateSoundLabel();
  }

  _updateSoundLabel() {
    const on = audio.enabled;
    this.dom.btnSound.textContent = on ? "Sound on" : "Sound off";
    this.dom.btnHudSound.textContent = on ? "♪" : "♪̸";
    this.dom.btnHudSound.title = on ? "Mute" : "Unmute";
  }

  _desiredCamera() {
    const b = this.bird;
    if (this._camMode === 2) {
      return { pos: new THREE.Vector3(b.x - 0.05, b.y + 0.28, b.z + 0.001), look: new THREE.Vector3(b.x + 9, b.y - 0.55, 0) };
    }
    if (this._camMode === 1) {
      return { pos: new THREE.Vector3(b.x + 0.6, b.y + 1.1, b.z + 15), look: new THREE.Vector3(b.x, b.y, 0) };
    }
    return { pos: new THREE.Vector3(b.x - 7.6, b.y + 2.5, b.z + 6.4), look: new THREE.Vector3(b.x + 5, b.y - 0.2, 0) };
  }

  _updateCamera(dt) {
    const { pos, look } = this._desiredCamera();
    const k = this._camMode === 1 ? 10 : 7;
    const a = 1 - Math.exp(-dt * k);
    this.camera.position.lerp(pos, a);
    this._camTarget.lerp(look, 1 - Math.exp(-dt * 10));

    if (this._shake > 0) {
      const s = this._shake;
      this.camera.position.x += (Math.random() - 0.5) * s * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * s * 0.4;
    }

    if (this.state === STATE.MENU) {
      const t = this.clock.elapsedTime;
      this.camera.position.y += Math.sin(t * 0.6) * 0.12;
      this.camera.position.x += Math.cos(t * 0.4) * 0.1;
    }

    this.camera.lookAt(this._camTarget);
  }

  _updateMenu(dt) {
    this.bird.hover(dt, this.clock.elapsedTime);
    this.environment.update(dt, 5);
    this.particles.update(dt);
  }

  _updatePlaying(dt) {
    this.bird.update(dt);
    const scored = this.pipes.update(dt, this.speed, this.score);
    for (const pipe of scored) this._onScore(pipe);

    if (this.pipes.checkCollision(this.bird)) {
      this._die();
      return;
    }
    const r = this.bird.radius * 0.85;
    if (this.bird.y - r <= GROUND_Y) {
      this.bird.y = GROUND_Y + r;
      this._die();
      return;
    }
    if (this.bird.y + r >= CEILING_Y) {
      this.bird.y = CEILING_Y - r;
      this._die();
      return;
    }
    this.environment.update(dt, this.speed);
    this.particles.update(dt);
  }

  _updateDying(dt) {
    this._dyingTimer += dt;
    this.bird.update(dt);
    const slowSpeed = this.speed * Math.max(0, 1 - this._dyingTimer * 1.3);
    this.environment.update(dt, slowSpeed);
    this.pipes.update(dt, slowSpeed * 0.6, this.score);
    this.particles.update(dt);

    const r = this.bird.radius * 0.85;
    if (this.bird.y - r <= GROUND_Y || this._dyingTimer > 1.4) {
      if (this.bird.y - r <= GROUND_Y + 0.1) {
        this.particles.dust(new THREE.Vector3(this.bird.x, GROUND_Y + 0.1, 0));
      }
      this.bird.y = Math.max(this.bird.y, GROUND_Y + r);
      this._shake = 0;
      this._showGameOver();
    }
  }

  _loop() {
    requestAnimationFrame(this._loop);
    let dt = this.clock.getDelta();
    if (dt > 0.05) dt = 0.05;

    if (this.state === STATE.MENU) this._updateMenu(dt);
    else if (this.state === STATE.PLAYING) this._updatePlaying(dt);
    else if (this.state === STATE.DYING) this._updateDying(dt);
    else if (this.state === STATE.GAMEOVER) {
      this.environment.update(dt, 3);
      this.particles.update(dt);
    }

    if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 1.6);

    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  try {
    const g = new Game();
    window.__g = g;
  } catch (err) {
    console.error("Flappy Sky failed to start:", err);
    const l = document.getElementById("loader");
    if (l) l.innerHTML = "<div class='loader-text'>Failed to start — check console.</div>";
  }
});
