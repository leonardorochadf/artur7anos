(() => {
  "use strict";

  const TILE = 40;
  const GRAVITY = 2200;
  const MOVE_SPEED = 230;
  const JUMP_VEL = -660;
  const PLAYER_W = 28;
  const PLAYER_H = 44;
  const WORLD_H = 560;
  const GROUND = 380;
  const HIGH = 220;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("screen-menu");
  const winScreen = document.getElementById("screen-win");
  const overScreen = document.getElementById("screen-over");
  const hud = document.getElementById("hud");
  const touchUI = document.getElementById("touch");
  const hintEl = document.getElementById("hud-hint");
  const blocksEl = document.getElementById("hud-blocks");
  const livesEl = document.getElementById("hud-lives");
  const coinsEl = document.getElementById("hud-coins");
  const progressTextEl = document.getElementById("hud-progress-text");
  const progressFillEl = document.getElementById("hud-bar-fill");
  const progressChipEl = document.getElementById("hud-progress");
  const levelBannerEl = document.getElementById("level-banner");
  const levelBannerKickerEl = document.getElementById("level-banner-kicker");
  const levelBannerTitleEl = document.getElementById("level-banner-title");
  const levelBannerNextEl = document.getElementById("level-banner-next");
  const winStatsEl = document.getElementById("win-stats");
  const muteBtn = document.getElementById("btn-mute");
  const actBtn = document.getElementById("btn-action");
  const actCapEl = document.getElementById("btn-action-cap");

  function setActLabel(label) {
    if (actCapEl) actCapEl.textContent = label;
    else if (actBtn) actBtn.textContent = label;
    if (actBtn) actBtn.setAttribute("aria-label", label);
  }
  const btnPlay = document.getElementById("btn-play");
  const btnAgain = document.getElementById("btn-again");
  const btnRetry = document.getElementById("btn-retry");
  let levelBannerTimer = 0;
  let hintLockUntil = 0;

  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;
  document.body.classList.toggle("is-mobile", isTouch);

  let W = 800;
  let H = 480;
  let dpr = 1;
  let muted = false;
  let audioCtx = null;
  let running = false;
  let lastTs = 0;
  let cameraX = 0;
  let particles = [];
  let floatingTexts = [];
  let actionMode = "none";
  let chestOpenAt = 0;
  let winScheduled = false;
  let lastTap = 0;
  let worldTip = "";

  const keys = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
    actionPressed: false,
    buildPressed: false,
  };

  const MAX_LIVES = 7;
  const MAX_LEVEL = 7;

  /** Níveis da Missão Energética — a surpresa só aparece no baú (Level 7) */
  const LEVELS = {
    1: {
      id: "start",
      coins: 0,
      title: "Começo da missão",
      label: "Level 1 · Começo",
      nextGoal: "Suba a plataforma alta",
    },
    2: {
      id: "climb",
      coins: 15,
      title: "Você subiu!",
      label: "Level 2 · Subiu!",
      nextGoal: "Quebre os 3 blocos",
    },
    3: {
      id: "blocks",
      coins: 30,
      title: "Blocos quebrados!",
      label: "Level 3 · Blocos!",
      nextGoal: "Desça o tobogã até a grama",
    },
    4: {
      id: "slide",
      coins: 25,
      title: "Tobogã concluído!",
      label: "Level 4 · Tobogã!",
      nextGoal: "Atravesse o rio pelos jacarés",
    },
    5: {
      id: "river",
      coins: 30,
      title: "Rio atravessado!",
      label: "Level 5 · Rio!",
      nextGoal: "Construa a escada de 3 blocos",
    },
    6: {
      id: "stairs",
      coins: 35,
      title: "Escada montada!",
      label: "Level 6 · Escada!",
      nextGoal: "Abra o baú surpresa",
    },
    7: {
      id: "chest",
      coins: 50,
      title: "Baú aberto!",
      label: "Level 7 · Surpresa!",
      nextGoal: "Surpresa revelada!",
    },
  };

  const state = {
    lives: MAX_LIVES,
    coins: 0,
    level: 1,
    unlocked: {
      start: true,
      climb: false,
      blocks: false,
      slide: false,
      river: false,
      stairs: false,
      chest: false,
    },
    collected: 0,
    inventory: 0,
    broken: [false, false, false],
    placed: [false, false, false],
    chestOpen: false,
    checkpoint: { x: 70, y: GROUND - PLAYER_H },
    hintId: "start",
  };

  const worldW = 64 * TILE; // ~2560

  let solids = [];
  let breakables = [];
  let buildSlots = [];
  let slides = [];
  let waters = [];
  let gators = [];
  let chest = { x: 0, y: 0, w: TILE, h: TILE };
  let decor = [];

  const player = {
    x: 70,
    y: GROUND - PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    onSlide: false,
    facing: 1,
    walkPhase: 0,
    swing: 0,
    invuln: 0,
    slideCoast: 0,
  };

  function tip(desktop, mobile) {
    return isTouch ? mobile : desktop;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(320, Math.floor(rect.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addGround(x0, x1, topY, type) {
    for (let x = x0; x < x1; x += TILE) {
      solids.push({
        x,
        y: topY,
        w: Math.min(TILE, x1 - x),
        h: WORLD_H - topY + 120,
        type: type || "ground",
      });
    }
  }

  function buildWorld() {
    solids = [];
    breakables = [];
    buildSlots = [];
    slides = [];
    waters = [];
    gators = [];
    decor = [];
    particles = [];
    floatingTexts = [];

    // 1) Início: solo + obstáculos + subidinhas
    addGround(0, 760, GROUND);
    solids.push({ x: 220, y: GROUND - 24, w: 36, h: 24, type: "rock" });
    solids.push({ x: 340, y: GROUND - 36, w: 40, h: 36, type: "rock" });
    solids.push({ x: 460, y: GROUND - 22, w: 44, h: 22, type: "rock" });
    // degraus naturais para subir
    solids.push({ x: 560, y: GROUND - 40, w: 48, h: 40, type: "wood" });
    solids.push({ x: 620, y: GROUND - 80, w: 48, h: 80, type: "wood" });
    solids.push({ x: 680, y: GROUND - 120, w: 80, h: 120, type: "wood" });

    // 2) Plataforma alta + 3 blocos quebráveis
    addGround(760, 1040, HIGH);
    for (let i = 0; i < 3; i++) {
      breakables.push({
        x: 860 + i * TILE,
        y: HIGH - TILE,
        w: TILE,
        h: TILE,
        id: i,
      });
    }

    // 3) Tobogã — desce até a grama no final
    const slideStartX = 1040;
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const y = HIGH + i * 18;
      const x = slideStartX + i * 34;
      const tile = {
        x,
        y,
        w: 44,
        h: WORLD_H - y + 80,
        type: "slide",
      };
      solids.push(tile);
      slides.push(tile);
    }

    // 4) Grama no fim do tobogã (dá para parar) → depois o rio
    const lowY = GROUND;
    addGround(1320, 1520, lowY); // plataforma de grama para ficar parado
    waters.push({ x: 1520, y: lowY - 8, w: 400, h: 100 });

    [
      [1600, 32],
      [1740, 34],
      [1880, 32],
    ].forEach(([x, h], i) => {
      solids.push({ x, y: lowY - h, w: 44, h, type: "rock" });
      gators.push({
        x: x + 48,
        y: lowY - 22,
        w: 54,
        h: 22,
        baseX: x + 48,
        range: 24,
        phase: i * 1.3,
      });
    });

    addGround(1960, 2040, lowY);

    // 5) Escada + prêmio
    const stairX = 2040;
    for (let i = 0; i < 3; i++) {
      const stepTop = lowY - (i + 1) * TILE;
      solids.push({
        x: stairX + i * TILE,
        y: stepTop + TILE - 10,
        w: TILE,
        h: WORLD_H - (stepTop + TILE - 10) + 80,
        type: "stub",
      });
      buildSlots.push({
        x: stairX + i * TILE,
        y: stepTop,
        w: TILE,
        h: TILE,
        id: i,
      });
    }
    const platY = lowY - 3 * TILE;
    addGround(2160, worldW, platY);
    chest = { x: 2280, y: platY - TILE, w: TILE, h: TILE };

    // decor
    [90, 280, 520, 800, 2200, 2400].forEach((x) => {
      const y = x < 760 ? GROUND : x < 1040 ? HIGH : x < 1960 ? lowY : platY;
      decor.push({ type: "tree", x, y });
    });
    [150, 400, 700, 2250].forEach((x) => {
      const y = x < 760 ? GROUND : x < 1960 ? lowY : platY;
      decor.push({ type: "bush", x, y });
    });
    for (let i = 0; i < 12; i++) {
      decor.push({
        type: "cloud",
        x: 40 + i * 190,
        y: 30 + (i % 3) * 24,
        s: 0.7 + (i % 3) * 0.18,
      });
    }
    decor.push({ type: "sign", x: 1000, y: HIGH, text: "TOBOGÃ" });
  }

  function resetGame() {
    state.lives = MAX_LIVES;
    state.coins = 0;
    state.level = 1;
    state.unlocked = {
      start: true,
      climb: false,
      blocks: false,
      slide: false,
      river: false,
      stairs: false,
      chest: false,
    };
    state.collected = 0;
    state.inventory = 0;
    state.broken = [false, false, false];
    state.placed = [false, false, false];
    state.chestOpen = false;
    state.checkpoint = { x: 70, y: GROUND - PLAYER_H };
    state.hintId = "start";
    chestOpenAt = 0;
    winScheduled = false;
    worldTip = "";
    buildWorld();
    player.x = 70;
    player.y = GROUND - PLAYER_H;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.swing = 0;
    player.onSlide = false;
    player.invuln = 0;
    player.slideCoast = 0;
    cameraX = 0;
    hideLevelBanner();
    progressChipEl.classList.remove("is-level-up");
    updateHUD();
    setHint(tip(
      "Level 1/7 · Próximo: Suba a plataforma · ← → andar · Espaço pular",
      "Level 1/7 · Próximo: Suba a plataforma · ◀ ▶ andar · ⬆ pular"
    ));
  }

  function updateHUD() {
    blocksEl.textContent = `Blocos: ${state.collected}/3`;
    livesEl.textContent = `Vidas: ${state.lives}`;
    coinsEl.textContent = `Moedas: ${state.coins}`;
    const info = LEVELS[state.level];
    if (state.level >= MAX_LEVEL) {
      progressTextEl.textContent = `Level ${state.level}/${MAX_LEVEL} · FINAL`;
    } else if (info && info.nextGoal) {
      progressTextEl.textContent = `L${state.level}/${MAX_LEVEL} → ${info.nextGoal}`;
    } else {
      progressTextEl.textContent = `Level ${state.level}/${MAX_LEVEL}`;
    }
    progressFillEl.style.width = `${((state.level - 1) / (MAX_LEVEL - 1)) * 100}%`;
    if (info) progressChipEl.title = info.nextGoal || info.label;
  }

  function hideLevelBanner() {
    levelBannerEl.classList.add("hidden");
    levelBannerEl.classList.remove("is-show");
  }

  function showLevelBanner(levelNum) {
    const info = LEVELS[levelNum];
    if (!info) return;
    levelBannerKickerEl.textContent = `LEVEL ${levelNum} DE ${MAX_LEVEL}`;
    levelBannerTitleEl.textContent = info.title;
    if (levelNum >= MAX_LEVEL) {
      levelBannerNextEl.textContent = "Missão completa · surpresa revelada!";
    } else {
      levelBannerNextEl.textContent = `Próximo → Level ${levelNum + 1}: ${info.nextGoal}`;
    }
    levelBannerEl.classList.remove("hidden");
    levelBannerEl.classList.remove("is-show");
    // reinicia animação
    void levelBannerEl.offsetWidth;
    levelBannerEl.classList.add("is-show");
    clearTimeout(levelBannerTimer);
    levelBannerTimer = setTimeout(hideLevelBanner, 2800);

    progressChipEl.classList.remove("is-level-up");
    void progressChipEl.offsetWidth;
    progressChipEl.classList.add("is-level-up");
  }

  function sfxCoin() {
    beep(660, 0.07, "square", 0.035);
    setTimeout(() => beep(880, 0.09, "square", 0.03), 50);
  }

  function sfxLevelUp() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => beep(f, 0.1, "square", 0.04), i * 70));
  }

  function reachLevel(levelNum) {
    if (levelNum <= state.level || levelNum > MAX_LEVEL) return;
    const info = LEVELS[levelNum];
    if (!info || state.unlocked[info.id]) return;

    state.unlocked[info.id] = true;
    state.level = levelNum;
    if (info.coins > 0) {
      state.coins += info.coins;
      floatingTexts.push({
        x: player.x - 10,
        y: player.y - 8,
        text: `+${info.coins}`,
        life: 1.2,
        color: "#ffd24a",
      });
    }
    updateHUD();
    sfxLevelUp();
    sfxCoin();
    showLevelBanner(levelNum);
    floatingTexts.push({
      x: player.x - 36,
      y: player.y - 30,
      text: `LEVEL ${levelNum}!`,
      life: 1.8,
      color: "#fff8dc",
    });
    if (levelNum >= MAX_LEVEL) {
      setHint(`Level ${levelNum}/${MAX_LEVEL} · Missão completa!`);
    } else {
      setHint(
        `Level ${levelNum}/${MAX_LEVEL} · Próximo: ${info.nextGoal}` +
          (info.coins ? ` · +${info.coins} moedas` : "")
      );
    }
    hintLockUntil = performance.now() + 2800;
  }

  function checkChallengeProgress() {
    // Level 2: subiu a plataforma alta
    if (player.x >= 780 && player.y < HIGH + 20) reachLevel(2);
    // Level 3: quebrou os 3 blocos
    if (state.collected >= 3) reachLevel(3);
    // Level 4: chegou na grama depois do tobogã
    if (player.x >= 1320 && player.x < 1520 && player.onGround && !player.onSlide) {
      reachLevel(4);
    }
    // Level 5: atravessou o rio
    if (player.x >= 1960 && player.onGround) reachLevel(5);
    // Level 6: montou a escada
    if (state.placed.every(Boolean)) reachLevel(6);
    // Level 7 acontece ao abrir o baú
  }

  function setHint(text) {
    hintEl.textContent = text;
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep(freq, dur, type, gain) {
    if (muted || !audioCtx) return;
    const t0 = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function sfxJump() {
    beep(280, 0.08, "square", 0.03);
    setTimeout(() => beep(380, 0.08, "square", 0.025), 40);
  }
  function sfxBreak() {
    beep(120, 0.06, "sawtooth", 0.05);
    beep(90, 0.1, "triangle", 0.04);
  }
  function sfxPlace() {
    beep(220, 0.07, "square", 0.04);
    beep(330, 0.08, "square", 0.03);
  }
  function sfxWin() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, "square", 0.05), i * 120));
  }
  function sfxOpen() {
    beep(180, 0.12, "triangle", 0.05);
    setTimeout(() => beep(360, 0.2, "triangle", 0.04), 100);
  }
  function sfxHurt() {
    beep(90, 0.2, "sawtooth", 0.05);
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function getSolidRects() {
    const list = solids.slice();
    breakables.forEach((b, i) => {
      if (!state.broken[i]) list.push(b);
    });
    buildSlots.forEach((s, i) => {
      if (state.placed[i]) list.push(s);
    });
    return list;
  }

  function resolveStuckInSolids() {
    const solidsNow = getSolidRects();
    const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
    for (const s of solidsNow) {
      if (s.type === "slide") continue;
      if (!rectsOverlap(p, s)) continue;

      // Prefere sair por cima do bloco (caso típico ao construir)
      const upDist = player.y + PLAYER_H - s.y;
      const leftDist = player.x + PLAYER_W - s.x;
      const rightDist = s.x + s.w - player.x;

      if (upDist > 0 && upDist <= PLAYER_H + 8) {
        player.y = s.y - PLAYER_H;
        player.vy = 0;
        player.onGround = true;
        p.y = player.y;
        continue;
      }

      if (leftDist <= rightDist) {
        player.x = s.x - PLAYER_W;
      } else {
        player.x = s.x + s.w;
      }
      player.vx = 0;
      p.x = player.x;
    }
  }

  function moveAndCollide(dt) {
    player.vy += GRAVITY * dt;

    if (player.onSlide) {
      // escorrega sozinho até a grama
      player.facing = 1;
      player.vx = 420;
      player.vy = Math.max(player.vy, 300);
    }
    player.x += player.vx * dt;

    const solidsNow = getSolidRects();
    const p = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };

    for (const s of solidsNow) {
      if (rectsOverlap(p, s)) {
        if (player.onSlide && s.type === "slide") continue;
        if (player.vx > 0) player.x = s.x - PLAYER_W;
        else if (player.vx < 0) player.x = s.x + s.w;
        else {
          // parado, mas dentro: empurra para o lado mais próximo
          const leftDist = player.x + PLAYER_W - s.x;
          const rightDist = s.x + s.w - player.x;
          player.x = leftDist <= rightDist ? s.x - PLAYER_W : s.x + s.w;
        }
        if (!(player.onSlide && s.type === "slide")) {
          player.vx = player.onSlide ? 420 : 0;
        }
        p.x = player.x;
      }
    }

    player.y += player.vy * dt;
    p.y = player.y;
    player.onGround = false;
    const wasSlide = player.onSlide;
    player.onSlide = false;

    for (const s of solidsNow) {
      if (rectsOverlap(p, s)) {
        if (player.vy > 0) {
          player.y = s.y - PLAYER_H;
          player.vy = 0;
          player.onGround = true;
          if (s.type === "slide") player.onSlide = true;
          if (wasSlide && s.type === "ground") {
            player.vx = 280;
            player.slideCoast = 1.2;
          }
        } else if (player.vy < 0) {
          player.y = s.y + s.h;
          player.vy = 0;
        } else {
          // vy == 0 e ainda sobreposto: sobe para o topo
          player.y = s.y - PLAYER_H;
          player.onGround = true;
          if (s.type === "slide") player.onSlide = true;
        }
        p.y = player.y;
      }
    }

    resolveStuckInSolids();
    if (player.y > H + 140) loseLife();
  }

  function loseLife() {
    if (!running || player.invuln > 0) return;
    state.lives -= 1;
    updateHUD();
    sfxHurt();
    if (state.lives <= 0) {
      finishGameOver();
      return;
    }
    respawn();
  }

  function respawn() {
    player.x = state.checkpoint.x;
    player.y = state.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.onSlide = false;
    player.slideCoast = 0;
    player.invuln = 1.4;
  }

  function updateCheckpoint() {
    if (!player.onGround || player.onSlide || player.invuln > 0) return;
    if (player.x <= state.checkpoint.x + 40) return;
    const under = getSolidRects().some(
      (s) =>
        s.type !== "slide" &&
        player.x + PLAYER_W > s.x &&
        player.x < s.x + s.w &&
        Math.abs(player.y + PLAYER_H - s.y) < 3
    );
    if (under) state.checkpoint = { x: player.x, y: player.y };
  }

  function nearRect(r, pad) {
    return rectsOverlap(
      { x: player.x - pad, y: player.y - pad, w: PLAYER_W + pad * 2, h: PLAYER_H + pad * 2 },
      r
    );
  }

  function updateGators(dt) {
    const now = performance.now() / 1000;
    for (const g of gators) {
      g.x = g.baseX + Math.sin(now * 1.6 + g.phase) * g.range;
      if (player.invuln > 0) continue;
      const hit = {
        x: g.x,
        y: g.y,
        w: g.w,
        h: g.h,
      };
      if (rectsOverlap({ x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }, hit)) {
        loseLife();
        break;
      }
    }
  }

  function updateActionMode() {
    if (state.chestOpen) {
      actionMode = "none";
      worldTip = "";
      return;
    }

    worldTip = "";
    if (nearRect(chest, 22) && state.placed.every(Boolean)) {
      actionMode = "open";
      worldTip = tip("Aperte E para abrir", "Toque em ABRIR");
    } else {
      let mode = "none";
      for (let i = 0; i < buildSlots.length; i++) {
        if (state.placed[i]) continue;
        if (i > 0 && !state.placed[i - 1]) break;
        if (nearRect(buildSlots[i], 26) && state.inventory > 0) {
          mode = "build";
          worldTip = tip("Aperte B para construir", "Toque em CONSTRUIR");
          break;
        }
      }
      if (mode === "none") {
        const nearBreak = breakables.some((b, i) => !state.broken[i] && nearRect(b, 20));
        if (nearBreak) {
          mode = "break";
          worldTip = tip("Clique 2× ou aperte E", "Toque 2× ou QUEBRAR");
        }
      }
      actionMode = mode;
    }

    // dicas de zona mesmo sem ação
    if (!worldTip) {
      if (player.onSlide || (player.x > 1000 && player.x < 1320)) {
        worldTip = "Tobogã → grama no final";
      } else if (player.x >= 1320 && player.x < 1520) {
        worldTip = tip("Pare com ← e pule com Espaço", "Pare com ◀ e pule com ⬆");
      } else if (player.x >= 1520 && player.x < 1960) {
        worldTip = tip("Pule as pedras (Espaço)", "Pule as pedras (⬆)");
      }
    }

    if (actionMode === "break") setActLabel("Quebrar");
    else if (actionMode === "build") setActLabel("Construir");
    else if (actionMode === "open") setActLabel("Abrir");
    else setActLabel("Ação");
  }

  function tryBreak() {
    for (let i = 0; i < breakables.length; i++) {
      if (state.broken[i]) continue;
      const b = breakables[i];
      if (!nearRect(b, 22)) continue;
      state.broken[i] = true;
      state.collected = Math.min(3, state.collected + 1);
      state.inventory = Math.min(3, state.inventory + 1);
      player.swing = 0.25;
      spawnBurst(b.x + b.w / 2, b.y + b.h / 2, ["#8b5a2b", "#5aad32", "#c4894f"], 14);
      sfxBreak();
      updateHUD();
      floatingTexts.push({ x: b.x + 6, y: b.y - 4, text: "+1", life: 0.8, color: "#fff" });
      if (state.collected >= 3) reachLevel(3);
      return true;
    }
    return false;
  }

  function tryBuild() {
    if (state.inventory <= 0) return false;
    for (let i = 0; i < buildSlots.length; i++) {
      if (state.placed[i]) continue;
      if (i > 0 && !state.placed[i - 1]) return false;
      const s = buildSlots[i];
      if (!nearRect(s, 30)) continue;
      state.placed[i] = true;
      state.inventory -= 1;
      spawnBurst(s.x + s.w / 2, s.y + s.h / 2, ["#c4a574", "#a06a3a"], 10);
      sfxPlace();

      // Se o bloco nasceu em cima/dentro do personagem, sobe ele para o topo
      const body = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
      if (rectsOverlap(body, s)) {
        player.y = s.y - PLAYER_H;
        player.vy = 0;
        player.onGround = true;
        player.vx = 0;
      }
      resolveStuckInSolids();

      if (state.placed.every(Boolean)) reachLevel(6);
      return true;
    }
    return false;
  }

  function tryOpenChest() {
    if (state.chestOpen || winScheduled) return false;
    if (!state.placed.every(Boolean)) return false;
    if (!nearRect(chest, 24)) return false;
    state.chestOpen = true;
    chestOpenAt = performance.now();
    sfxOpen();
    reachLevel(7);
    spawnBurst(chest.x + chest.w / 2, chest.y, ["#ffd24a", "#fff7b0", "#ffe566"], 28);
    winScheduled = true;
    setTimeout(finishWin, 1000);
    return true;
  }

  function doAction() {
    if (actionMode === "break") tryBreak();
    else if (actionMode === "build") tryBuild();
    else if (actionMode === "open") tryOpenChest();
  }

  function spawnBurst(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 240,
        vy: -Math.random() * 220 - 30,
        life: 0.45 + Math.random() * 0.5,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 5,
      });
    }
  }

  function updateHintsByProgress() {
    if (state.chestOpen) return;
    if (performance.now() < hintLockUntil) return;
    if (state.placed.every(Boolean)) {
      setHint(tip("Chegue no baú e aperte E", "Chegue no baú e toque em ABRIR"));
      state.hintId = "chest";
    } else if (state.collected === 3 || state.placed.some(Boolean)) {
      if (player.x < 1320) setHint("Desça o tobogã até a grama!");
      else if (player.x < 1520) setHint(tip("Pare (←) e pule (Espaço)!", "Pare (◀) e pule (⬆)!"));
      else if (player.x < 1960) setHint(tip("Pule as pedras do rio!", "Pule as pedras do rio!"));
      else setHint(tip("Suba: B para colocar blocos", "Suba: toque em CONSTRUIR"));
      state.hintId = "build";
    } else if (player.x >= 780 || state.broken.some(Boolean)) {
      setHint(tip("Quebre: clique 2× ou E", "Quebre: toque 2× ou QUEBRAR"));
      state.hintId = "break";
    } else if (player.x > 500) {
      setHint("Suba os degraus de madeira!");
      state.hintId = "climb";
    } else {
      setHint(tip("← → andar · Espaço pular", "◀ ▶ andar · ⬆ pular"));
      state.hintId = "start";
    }
  }

  function update(dt) {
    if (!running) return;

    let move = 0;
    if (keys.left) move -= 1;
    if (keys.right) move += 1;

    if (player.onSlide) {
      player.facing = 1;
    } else if (player.slideCoast > 0) {
      // impulso do tobogã: seta esquerda freia; direita continua e pode cair no rio
      player.slideCoast -= dt;
      if (keys.left) {
        player.vx = -MOVE_SPEED;
        player.slideCoast = 0;
        player.facing = -1;
      } else if (keys.right) {
        player.vx = MOVE_SPEED + 40;
        player.facing = 1;
      } else {
        player.vx *= Math.max(0, 1 - dt * 1.8);
        if (Math.abs(player.vx) < 20) {
          player.vx = 0;
          player.slideCoast = 0;
        }
      }
      if (keys.jumpPressed && player.onGround) {
        player.vy = JUMP_VEL;
        player.onGround = false;
        player.slideCoast = 0;
        sfxJump();
      }
    } else {
      player.vx = move * MOVE_SPEED;
      if (move) {
        player.facing = move > 0 ? 1 : -1;
        player.walkPhase += dt * 10;
      }
      if (keys.jumpPressed && player.onGround) {
        player.vy = JUMP_VEL;
        player.onGround = false;
        sfxJump();
      }
    }
    keys.jumpPressed = false;

    if (keys.actionPressed) {
      doAction();
      keys.actionPressed = false;
    }
    if (keys.buildPressed) {
      tryBuild();
      keys.buildPressed = false;
    }

    if (player.swing > 0) player.swing -= dt;
    if (player.invuln > 0) player.invuln -= dt;

    moveAndCollide(dt);
    updateGators(dt);
    updateCheckpoint();
    updateActionMode();
    updateHintsByProgress();
    checkChallengeProgress();
    updateTouchHints();

    particles = particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 620 * dt;
      return p.life > 0;
    });
    floatingTexts = floatingTexts.filter((t) => {
      t.life -= dt;
      t.y -= 28 * dt;
      return t.life > 0;
    });

    const target = player.x - W * 0.35;
    cameraX += (target - cameraX) * Math.min(1, dt * 6);
    cameraX = Math.max(0, Math.min(cameraX, Math.max(0, worldW - W)));
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2f86d8");
    g.addColorStop(0.5, "#7ec8ff");
    g.addColorStop(0.5, "#b8e8ff");
    g.addColorStop(1, "#9fd6ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function roundBlock(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(c) {
    const x = c.x - cameraX * 0.35;
    const s = c.s || 1;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundBlock(x, c.y, 70 * s, 28 * s, 6);
    roundBlock(x + 24 * s, c.y - 12 * s, 50 * s, 28 * s, 6);
  }

  function drawTree(d) {
    const x = d.x - cameraX;
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(x + 14, d.y - 48, 12, 48);
    ctx.fillStyle = "#3f8a22";
    ctx.fillRect(x, d.y - 78, 40, 36);
    ctx.fillStyle = "#5aad32";
    ctx.fillRect(x + 4, d.y - 92, 32, 24);
  }

  function drawBush(d) {
    const x = d.x - cameraX;
    ctx.fillStyle = "#4e9a2e";
    ctx.fillRect(x, d.y - 18, 34, 18);
    ctx.fillStyle = "#5aad32";
    ctx.fillRect(x + 8, d.y - 26, 22, 12);
  }

  function drawSign(d) {
    const x = d.x - cameraX;
    const label = d.text || "TOBOGÃ";
    ctx.font = '9px "Press Start 2P", monospace';
    const tw = ctx.measureText(label).width;
    const boxW = Math.max(96, Math.ceil(tw + 20));
    const boxH = 32;
    const boxX = x - (boxW - 42) / 2;
    const boxY = d.y - 82;

    ctx.fillStyle = "#6b4226";
    ctx.fillRect(x + 18, d.y - 50, 6, 50);
    ctx.fillStyle = "#f0d9a0";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "#1a1208";
    ctx.textAlign = "center";
    ctx.fillText(label, boxX + boxW / 2, boxY + 21);
    ctx.textAlign = "left";
  }

  function drawGroundTile(s) {
    const x = s.x - cameraX;
    if (x + s.w < -60 || x > W + 60) return;

    if (s.type === "rock") {
      ctx.fillStyle = "#7a7f86";
      ctx.fillRect(x, s.y, s.w, s.h);
      ctx.fillStyle = "#9aa0a8";
      ctx.fillRect(x + 4, s.y + 4, Math.max(4, s.w - 10), 8);
      ctx.strokeStyle = "#1a1208";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      return;
    }

    if (s.type === "wood") {
      ctx.fillStyle = "#c4a574";
      ctx.fillRect(x, s.y, s.w, s.h);
      ctx.fillStyle = "#a67c52";
      for (let yy = s.y + 8; yy < s.y + s.h; yy += 12) ctx.fillRect(x, yy, s.w, 2);
      ctx.strokeStyle = "#1a1208";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 0.5, s.y + 0.5, s.w - 1, Math.min(s.h, 80));
      return;
    }

    if (s.type === "slide") {
      ctx.fillStyle = "#3d9be9";
      ctx.fillRect(x, s.y, s.w, 14);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(x + 4, s.y + 4, s.w - 8, 6);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x, s.y + 14, s.w, Math.min(s.h - 14, 100));
      return;
    }

    if (s.type === "stub") {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(x, s.y, s.w, Math.min(s.h, 90));
      ctx.fillStyle = "#5aad32";
      ctx.fillRect(x, s.y, s.w, 5);
      return;
    }

    ctx.fillStyle = "#5aad32";
    ctx.fillRect(x, s.y, s.w, 10);
    ctx.fillStyle = "#3f8a22";
    ctx.fillRect(x, s.y + 10, s.w, 6);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(x, s.y + 16, s.w, Math.min(s.h - 16, 220));
  }

  function drawWater(w) {
    const x = w.x - cameraX;
    ctx.fillStyle = "rgba(40, 130, 200, 0.55)";
    ctx.fillRect(x, w.y, w.w, w.h);
    ctx.fillStyle = "rgba(180, 230, 255, 0.35)";
    for (let i = 0; i < 8; i++) {
      const ox = (performance.now() / 30 + i * 40) % w.w;
      ctx.fillRect(x + ox, w.y + 4, 18, 3);
    }
  }

  function drawGator(g) {
    const x = g.x - cameraX;
    const y = g.y;
    ctx.fillStyle = "#2f6b2f";
    ctx.fillRect(x, y + 6, g.w, 12);
    ctx.fillStyle = "#3f8a3f";
    ctx.fillRect(x + 4, y, 18, 10);
    // olhos
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(x + 8, y + 2, 3, 3);
    ctx.fillRect(x + 14, y + 2, 3, 3);
    // dentes
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 22 + i * 6, y + 6, 3, 4);
    // rabo
    ctx.fillStyle = "#2f6b2f";
    ctx.fillRect(x - 10, y + 10, 12, 6);
  }

  function drawBreakable(b, i) {
    if (state.broken[i]) return;
    const x = b.x - cameraX;
    ctx.fillStyle = "#a06a3a";
    ctx.fillRect(x, b.y, b.w, b.h);
    ctx.fillStyle = "#c4894f";
    ctx.fillRect(x + 4, b.y + 4, b.w - 8, 10);
    ctx.fillStyle = "#5aad32";
    ctx.fillRect(x, b.y, b.w, 8);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, b.y + 1, b.w - 2, b.h - 2);

    if (nearRect(b, 40)) {
      drawWorldBubble(b.x + b.w / 2, b.y - 18, tip("Clique 2×", "Toque 2×"));
    }
  }

  function drawBuildSlot(s, i) {
    const x = s.x - cameraX;
    if (state.placed[i]) {
      ctx.fillStyle = "#a06a3a";
      ctx.fillRect(x, s.y, s.w, s.h);
      ctx.fillStyle = "#5aad32";
      ctx.fillRect(x, s.y, s.w, 8);
      ctx.strokeStyle = "#1a1208";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, s.y + 1, s.w - 2, s.h - 2);
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(performance.now() / 260);
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 2, s.y + 2, s.w - 4, s.h - 4);
    ctx.fillStyle = "rgba(255,210,74,0.2)";
    ctx.fillRect(x + 2, s.y + 2, s.w - 4, s.h - 4);
    ctx.restore();

    if (i === 0 && state.inventory > 0 && nearRect(s, 50)) {
      drawWorldBubble(s.x + s.w / 2, s.y - 18, tip("B construir", "Construir"));
    }
  }

  function drawWorldBubble(wx, wy, text) {
    if (!text) return;
    const x = wx - cameraX;
    const y = wy + Math.sin(performance.now() / 220) * 3;
    ctx.font = '10px "Press Start 2P", monospace';
    const tw = ctx.measureText(text).width;
    const bw = tw + 16;
    const bh = 22;
    ctx.fillStyle = "rgba(255,248,220,0.95)";
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.fillRect(x - bw / 2, y - bh, bw, bh);
    ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
    ctx.fillStyle = "#1a1208";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y - 7);
    ctx.textAlign = "left";
  }

  function drawMinecraftSun(cx, cy) {
    ctx.fillStyle = "#ffe566";
    ctx.fillRect(cx - 14, cy - 14, 28, 28);
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(cx - 10, cy - 10, 20, 20);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 14, cy - 14, 28, 28);
    ctx.strokeStyle = "#ffe566";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      ctx.lineTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
      ctx.stroke();
    }
  }

  function drawChest() {
    const x = chest.x - cameraX;
    const y = chest.y;
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() / 300);
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(x - 8, y - 8, chest.w + 16, chest.h + 16);
    ctx.restore();

    ctx.fillStyle = "#b8860b";
    ctx.fillRect(x, y + 12, chest.w, chest.h - 12);
    ctx.fillStyle = "#daa520";
    if (state.chestOpen) {
      ctx.fillRect(x - 2, y - 12, chest.w + 4, 14);
      ctx.fillStyle = "rgba(255,230,120,0.55)";
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 12);
      ctx.lineTo(x + chest.w / 2, y - 70);
      ctx.lineTo(x + chest.w - 4, y + 12);
      ctx.fill();
      const elapsed = (performance.now() - chestOpenAt) / 900;
      // sol sobe; o prêmio (20%) só aparece na tela de vitória
      const sunY = Math.max(70, y - 18 - 40 * Math.min(1, Math.max(0, elapsed)));
      drawMinecraftSun(x + chest.w / 2, sunY);
    } else {
      ctx.fillRect(x, y, chest.w, 16);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(x + chest.w / 2 - 4, y + 10, 8, 10);
      if (state.placed.every(Boolean) && nearRect(chest, 50)) {
        drawWorldBubble(chest.x + chest.w / 2, chest.y - 16, tip("E abrir", "Abrir"));
      }
    }
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, chest.w - 2, chest.h - 2);
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0) return;

    const x = player.x - cameraX;
    const y = player.y;
    const bob = player.onGround && !player.onSlide ? Math.sin(player.walkPhase) * 1.5 : 0;
    const f = player.facing >= 0 ? 1 : -1;
    const walk = player.onGround && Math.abs(player.vx) > 20 ? Math.sin(player.walkPhase) : 0;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + 5, y + PLAYER_H - 3, PLAYER_W - 10, 3);

    ctx.save();
    ctx.translate(x + PLAYER_W / 2, y + bob);
    ctx.scale(f, 1);

    // pernas (azul Steve) + sapatos
    ctx.fillStyle = "#3c44aa";
    ctx.fillRect(-10, 26, 8, 14 + walk * 2);
    ctx.fillRect(2, 26, 8, 14 - walk * 2);
    ctx.fillStyle = "#565656";
    ctx.fillRect(-10, 38 + walk * 2, 8, 4);
    ctx.fillRect(2, 38 - walk * 2, 8, 4);

    // tronco ciano
    ctx.fillStyle = "#00aaaa";
    ctx.fillRect(-10, 14, 20, 14);
    // detalhe peito
    ctx.fillStyle = "#009999";
    ctx.fillRect(-8, 16, 16, 3);

    // braço atrás
    ctx.fillStyle = "#00aaaa";
    ctx.fillRect(-14, 14, 5, 12);
    ctx.fillStyle = "#c68642";
    ctx.fillRect(-14, 24, 5, 5);

    // cabeça + cabelo
    ctx.fillStyle = "#c68642";
    ctx.fillRect(-9, 0, 18, 16);
    ctx.fillStyle = "#3b2214";
    ctx.fillRect(-9, 0, 18, 5);
    ctx.fillRect(-9, 5, 3, 4);
    ctx.fillRect(6, 5, 3, 4);

    // olhos / nariz
    ctx.fillStyle = "#fff";
    ctx.fillRect(-4, 7, 4, 3);
    ctx.fillRect(2, 7, 4, 3);
    ctx.fillStyle = "#2a2a8a";
    ctx.fillRect(-2, 8, 2, 2);
    ctx.fillRect(4, 8, 2, 2);
    ctx.fillStyle = "#6b3a2a";
    ctx.fillRect(0, 11, 2, 2);
    ctx.fillRect(-1, 13, 4, 1);

    // braço da frente + picareta
    const swing = player.swing > 0 ? -Math.sin((1 - player.swing / 0.25) * Math.PI) * 1.15 : 0;
    ctx.save();
    ctx.translate(10, 16);
    ctx.rotate(0.25 + swing + walk * 0.15);
    ctx.fillStyle = "#00aaaa";
    ctx.fillRect(0, 0, 5, 12);
    ctx.fillStyle = "#c68642";
    ctx.fillRect(0, 10, 5, 5);
    // cabo + cabeça da picareta
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(3, -2, 3, 16);
    ctx.fillStyle = "#8a9199";
    ctx.fillRect(-2, -6, 14, 5);
    ctx.fillRect(8, -4, 4, 7);
    ctx.restore();

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const t of floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color || "#fff";
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(t.text, t.x - cameraX, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHudTipBanner() {
    if (!worldTip || !running) return;
    ctx.font = '11px "Press Start 2P", monospace';
    const tw = ctx.measureText(worldTip).width;
    const bw = Math.min(W - 24, tw + 24);
    const x = (W - bw) / 2;
    const y = H - (isTouch ? 168 : 28);
    ctx.fillStyle = "rgba(26,18,8,0.72)";
    ctx.fillRect(x, y - 18, bw, 26);
    ctx.strokeStyle = "#ffd24a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y - 18, bw, 26);
    ctx.fillStyle = "#fff8dc";
    ctx.textAlign = "center";
    ctx.fillText(worldTip, W / 2, y);
    ctx.textAlign = "left";
  }

  function draw() {
    drawSky();
    decor.forEach((d) => {
      if (d.type === "cloud") drawCloud(d);
    });
    waters.forEach(drawWater);
    decor.forEach((d) => {
      if (d.type === "tree") drawTree(d);
      if (d.type === "bush") drawBush(d);
      if (d.type === "sign") drawSign(d);
    });
    solids.forEach(drawGroundTile);
    breakables.forEach(drawBreakable);
    buildSlots.forEach(drawBuildSlot);
    gators.forEach(drawGator);
    drawChest();
    drawPlayer();
    drawParticles();
    drawHudTipBanner();
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function finishWin() {
    running = false;
    hideLevelBanner();
    trackMissao("finalizou");
    sfxWin();
    spawnConfetti();
    if (winStatsEl) {
      winStatsEl.textContent = `LEVEL ${state.level}/${MAX_LEVEL} · ${state.coins} moedas`;
    }
    winScreen.classList.remove("hidden");
    winScreen.scrollTop = 0;
    document.body.classList.add("showing-win");
    touchUI.classList.add("hidden");
  }

  function finishGameOver() {
    running = false;
    hideLevelBanner();
    player.vx = 0;
    player.vy = 0;
    beep(80, 0.35, "sawtooth", 0.06);
    setTimeout(() => beep(60, 0.4, "triangle", 0.05), 180);
    overScreen.classList.remove("hidden");
    overScreen.scrollTop = 0;
    touchUI.classList.add("hidden");
  }

  function spawnConfetti() {
    const box = document.getElementById("confetti");
    if (!box) return;
    box.innerHTML = "";
    const colors = ["#ffd24a", "#5aad32", "#3d9be9", "#ff6b6b", "#fff"];
    for (let i = 0; i < 36; i++) {
      const el = document.createElement("i");
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.width = `${6 + Math.random() * 8}px`;
      el.style.height = `${6 + Math.random() * 8}px`;
      el.style.animationDelay = `${Math.random() * 0.45}s`;
      el.style.animationDuration = `${1.1 + Math.random() * 0.9}s`;
      box.appendChild(el);
    }
  }

  function missaoSessionId() {
    try {
      const key = "missao_energetica_sid";
      let sid = sessionStorage.getItem(key);
      if (!sid) {
        sid =
          "m" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(key, sid);
      }
      return sid;
    } catch (_) {
      return "m" + Date.now().toString(36);
    }
  }

  const missaoFlags = { entrou: false, iniciou: false, finalizou: false, clicou_20: false };

  function trackMissao(evento) {
    if (!evento || missaoFlags[evento]) return;
    missaoFlags[evento] = true;
    try {
      if (window.ArturApi && typeof ArturApi.missaoEvento === "function" && ArturApi.ready()) {
        ArturApi.missaoEvento(missaoSessionId(), evento);
      }
    } catch (_) {}
    try {
      if (window.ArturAnalytics && typeof ArturAnalytics.event === "function") {
        ArturAnalytics.event("missao_" + evento, {
          event_category: "missao_energetica",
          session_id: missaoSessionId(),
        });
      }
    } catch (_) {}
  }

  function startGame() {
    ensureAudio();
    menu.classList.add("hidden");
    winScreen.classList.add("hidden");
    overScreen.classList.add("hidden");
    document.body.classList.remove("showing-win");
    hud.classList.remove("hidden");
    if (isTouch) {
      touchUI.classList.remove("hidden");
      touchUI.setAttribute("aria-hidden", "false");
    }
    resetGame();
    running = true;
    trackMissao("iniciou");
  }

  function handleDoubleAction(clientX, clientY) {
    if (!running) return;
    const now = performance.now();
    const isDouble = now - lastTap < 380;
    lastTap = now;
    if (!isDouble) return;

    // converter para mundo (opcional: só precisa estar perto)
    if (actionMode === "break") tryBreak();
    else if (actionMode === "open") tryOpenChest();
    else if (actionMode === "build") tryBuild();
    else tryBreak();
  }

  window.addEventListener("keydown", (e) => {
    if (!running) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      if (!keys.jump) keys.jumpPressed = true;
      keys.jump = true;
    }
    if (e.code === "KeyE") keys.actionPressed = true;
    if (e.code === "KeyB") keys.buildPressed = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keys.jump = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!running) return;
    // evita conflito com botões touch
    if (isTouch && e.target !== canvas) return;
    handleDoubleAction(e.clientX, e.clientY);
  });

  function bindHold(el, on, off) {
    if (!el) return;
    const start = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      try {
        el.setPointerCapture(ev.pointerId);
      } catch (_) {}
      el.classList.add("is-held");
      on();
    };
    const end = (ev) => {
      ev.preventDefault();
      el.classList.remove("is-held");
      off();
    };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }

  const btnLeft = document.getElementById("btn-left") || touchUI.querySelector('[data-dir="left"]');
  const btnRight = document.getElementById("btn-right") || touchUI.querySelector('[data-dir="right"]');
  const btnJump = document.getElementById("btn-jump") || touchUI.querySelector('[data-action="jump"]');

  bindHold(btnLeft, () => (keys.left = true), () => (keys.left = false));
  bindHold(btnRight, () => (keys.right = true), () => (keys.right = false));
  bindHold(
    btnJump,
    () => {
      if (!keys.jump) keys.jumpPressed = true;
      keys.jump = true;
    },
    () => (keys.jump = false)
  );

  function updateTouchHints() {
    if (!isTouch || !running) {
      btnLeft && btnLeft.classList.remove("is-flash");
      btnJump && btnJump.classList.remove("is-flash");
      return;
    }
    const onGrass = player.x >= 1320 && player.x < 1520 && !player.onSlide;
    const needStop = player.slideCoast > 0 || onGrass;
    const needJump = onGrass && player.onGround && player.slideCoast <= 0;
    btnLeft && btnLeft.classList.toggle("is-flash", needStop && !keys.left);
    btnJump && btnJump.classList.toggle("is-flash", needJump);
  }

  actBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    doAction();
  });

  // toque duplo no botão de ação também conta
  let lastActTap = 0;
  actBtn.addEventListener("click", () => {
    const now = performance.now();
    if (now - lastActTap < 380 && actionMode === "break") tryBreak();
    lastActTap = now;
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      if (running) e.preventDefault();
    },
    { passive: false }
  );

  btnPlay.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);
  btnRetry.addEventListener("click", startGame);
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  });

  const btnDesconto = document.getElementById("btn-desconto");
  if (btnDesconto) {
    btnDesconto.addEventListener("click", () => {
      trackMissao("clicou_20");
    });
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));

  resize();
  buildWorld();
  draw();
  trackMissao("entrou");
  requestAnimationFrame(loop);
})();
