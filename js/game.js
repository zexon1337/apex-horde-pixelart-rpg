/* ==========================================================================
   BROTATO x VAMPIRE SURVIVORS: Game Loop, Spawner & Render Controller
   ========================================================================== */

// FreeEnvironment pack sprites used for map decoration (trees/rocks/bushes).
const ENV_SPRITES = {};
const ENV_PACK = 'assets/environment/';
function loadEnvSprite(key, file) { ENV_SPRITES[key] = new Image(); ENV_SPRITES[key].src = ENV_PACK + file; }
loadEnvSprite('tree_pine_dark', 'tree_pine_dark.png');
loadEnvSprite('tree_pine_snow', 'tree_pine_snow.png');
loadEnvSprite('tree_round_dark', 'tree_round_dark.png');
loadEnvSprite('tree_round_med', 'tree_round_med.png');
loadEnvSprite('tree_bare', 'tree_bare.png');
loadEnvSprite('rock_gray', 'rock_gray.png');
loadEnvSprite('coral_red', 'coral_red.png');
loadEnvSprite('coral_orange', 'coral_orange.png');
loadEnvSprite('coral_purple', 'coral_purple.png');
loadEnvSprite('bush_spiky', 'bush_spiky.png');
loadEnvSprite('plant_aloe', 'plant_aloe.png');
const ENV_TREE_VARIANTS = ['tree_round_dark', 'tree_round_med', 'tree_pine_dark', 'tree_pine_snow'];
const ENV_ROCK_VARIANTS = ['rock_gray', 'bush_spiky', 'plant_aloe', 'coral_purple'];

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'gameCanvas';
      (document.getElementById('game-container') || document.body).appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d');

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.worldWidth = 5200;
    this.worldHeight = 5200;

    this.player = new Player(this.worldWidth / 2, this.worldHeight / 2);
    this.shop = new ShopManager();

    this.enemies = [];
    this.gems = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.kills = 0;

    // Wave Clock
    this.wave = 1;
    this.waveTimer = 30; // 30 seconds per wave
    this.isWaveActive = false;
    this.spawnTimer = 0;
    this.hudTimer = 0;
    this.maxEnemies = 72;

    // Camera with Screen Shake
    this.camera = { x: 0, y: 0, w: this.width, h: this.height, shake: 0 };
    this.input = new InputHandler();
    this.lastTime = 0;
    this.isPaused = false;

    this.initEvents();
    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.camera.w = this.width;
    this.camera.h = this.height;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
  }

  selectCharacter(charType) {
    document.getElementById('char-select-screen').style.display = 'none';

    if (charType === 'brawler') { // Dövüşçü -> Knight (Soldier)
      this.player.stats.attackSpeedMult = 1.4;
      this.player.spriteKey = 'soldierWalk';
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.katana, 1));
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.sawblade, 1));
    } else if (charType === 'ranger') { // Avcı -> Archer
      this.player.stats.damageMult = 1.2;
      this.player.spriteKey = 'archerRun';
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.smg, 1));
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.laser, 1));
    } else if (charType === 'mage') { // Büyücü -> Wizard (Monk)
      this.player.stats.damageMult = 1.3;
      this.player.spriteKey = 'wizardRun';
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.lightning, 1));
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.laser, 1));
    } else { // Tank -> Armored Axeman (Orc)
      this.player.spriteKey = 'orcWalk';
      this.player.stats.maxHp = 150;
      this.player.hp = 150;
      this.player.stats.armor = 4;
      this.player.stats.lifeSteal = 0.15;
      this.player.stats.speed = 190;
      this.player.weapons.push(new Weapon(WEAPON_DATABASE.shotgun, 1));
    }

    this.startWave();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  startWave() {
    this.isWaveActive = true;
    this.waveTimer = 30 + (this.wave - 1) * 5; // Waves get 5s longer
    AudioSFX.waveHorn();
    this.addToast(`🔥 DALGA ${this.wave} BAŞLADI! HAKLAMA ZAMANI!`);
    this.updateHUD();
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isPaused && this.isWaveActive) {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 1. Wave Timer
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.endWave();
      return;
    }

    // 2. Player Update
    this.player.update(dt, this.input, this.worldWidth, this.worldHeight);

    // 3. Camera Lerp Follow
    const targetCamX = this.player.pos.x - this.camera.w / 2;
    const targetCamY = this.player.pos.y - this.camera.h / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    if (this.camera.shake > 0) {
      this.camera.shake -= dt * 30;
      this.camera.x += (Math.random() - 0.5) * this.camera.shake;
      this.camera.y += (Math.random() - 0.5) * this.camera.shake;
    }

    // 4. Horde Enemy Spawner (Massive Horde Density)
    this.spawnTimer += dt;
    const targetEnemies = Math.min(this.maxEnemies, 22 + this.wave * 4);
    const spawnInterval = Math.max(.32, .62 - this.wave * .018);
    if (this.spawnTimer > spawnInterval && this.enemies.length < targetEnemies) {
      this.spawnTimer = 0;
      this.spawnHordeCluster();
    }

    // 5. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt, this.player);
    }

    // 6. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const dead = proj.update(dt);
      if (dead) {
        this.projectiles.splice(i, 1);
        continue;
      }
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dx = proj.pos.x - enemy.pos.x, dy = proj.pos.y - enemy.pos.y;
        const hitRadius = proj.radius + enemy.radius;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          const isDead = enemy.takeDamage(proj.damage, this.player);
          enemy.pos.add(proj.vel.clone().normalize().mult(proj.knockback));
          this.addParticle(proj.pos.x, proj.pos.y, '#ff3366', 4);
          if (isDead) {
            this.killEnemy(enemy);
          }
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }

    // 7. Update XP Gems (Magnet Mechanics)
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const pickedUp = this.gems[i].update(dt, this.player);
      if (pickedUp) this.gems.splice(i, 1);
    }

    // 8. Update Particles & Floating Text
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2.0;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 30 * dt;
      ft.alpha -= dt * 1.5;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }

    this.hudTimer += dt;
    if (this.hudTimer > .12) { this.hudTimer = 0; this.updateHUD(); }
  }

  spawnHordeCluster() {
    const angle = Math.random() * Math.PI * 2;
    // Spawn only around the visible play field; intensity comes from the wave target, not off-screen piles.
    const spawnDist = Math.min(900, Math.max(520, Math.max(this.camera.w, this.camera.h) * .62));
    const spawnX = Utils.clamp(this.player.pos.x + Math.cos(angle) * spawnDist, 50, this.worldWidth - 50);
    const spawnY = Utils.clamp(this.player.pos.y + Math.sin(angle) * spawnDist, 50, this.worldHeight - 50);

    const types = ['zombie', 'runner', 'tank'];
    const chosen = types[Math.floor(Math.random() * types.length)];

    // Boss spawn on wave 5 & 10
    if (this.wave % 5 === 0 && !this.enemies.some(e => e.type === 'boss')) {
      this.enemies.push(new HordeEnemy(spawnX, spawnY, 'boss', this.wave));
      this.addToast('⚠️ DEV HORDE BOSS SAVAŞA GİRDİ!');
      return;
    }

    const targetEnemies = Math.min(this.maxEnemies, 22 + this.wave * 4);
    const count = Math.min(1 + Math.floor(this.wave / 6), 3, targetEnemies - this.enemies.length);
    for (let i = 0; i < count; i++) this.enemies.push(new HordeEnemy(spawnX + Utils.randomFloat(-55,55), spawnY + Utils.randomFloat(-55,55), chosen, this.wave));
  }

  killEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    this.spawnGemsAndGold(enemy.pos.x, enemy.pos.y, enemy.expValue);
    this.enemies.splice(index, 1);
    this.kills++;
    if (enemy.type === 'boss') this.addToast('☠ APEX MUTANT YOK EDİLDİ!');
  }

  spawnGemsAndGold(x, y, expValue) {
    this.gems.push(new XPGem(x, y, expValue));
  }

  endWave() {
    this.isWaveActive = false;
    this.player.gold += this.player.stats.harvest; // Harvest bonus
    this.enemies = []; // Clear current wave enemies
    this.shop.generateShopOffers();
    this.shop.renderShopModal();
    document.getElementById('shop-modal').classList.add('active');
  }

  startNextWaveFromShop() {
    document.getElementById('shop-modal').classList.remove('active');
    this.wave++;
    this.startWave();
  }

  triggerLevelUpModal() {
    if (!this.player.pendingLevels) return;
    this.isPaused = true;
    const container = document.getElementById('upgrade-cards-container');
    container.innerHTML = '';

    // Pick 3 random card upgrades
    const shuffled = [...LEVEL_UP_UPGRADES].sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const up of shuffled) {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-icon">${up.icon}</div>
        <div class="upgrade-title">${up.title}</div>
        <div class="upgrade-desc">${up.desc}</div>
      `;
      card.onclick = () => {
        up.apply(this.player);
        this.player.pendingLevels--;
        document.getElementById('level-up-modal').classList.remove('active');
        this.isPaused = false;
        AudioSFX.buyShop();
        this.updateHUD();
        if (this.player.pendingLevels) requestAnimationFrame(() => this.triggerLevelUpModal());
      };
      container.appendChild(card);
    }

    document.getElementById('level-up-modal').classList.add('active');
  }

  addParticle(x, y, color = '#fff', count = 4) {
    if (this.particles.length > 420) return;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x, y: y,
        vx: Utils.randomFloat(-150, 150),
        vy: Utils.randomFloat(-150, 150),
        color: color, alpha: 1.0
      });
    }
  }

  addFloatingText(x, y, text, color = '#fff') {
    this.floatingTexts.push({ x, y, text, color, alpha: 1.0 });
  }

  triggerScreenShake(intensity = 8) {
    this.camera.shake = intensity;
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Pixel-art grassland: deterministic tiles avoid per-frame random work.
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = '#37633b';
    this.ctx.fillRect(0, 0, this.width, this.height);
    // Fine 16px terrain cells: paths, ponds and foliage form shapes rather than large square tiles.
    const tile=16, startX=Math.floor(this.camera.x/tile)*tile, startY=Math.floor(this.camera.y/tile)*tile;
    const decorSpots = [];
    for(let y=startY;y<this.camera.y+this.height+tile;y+=tile)for(let x=startX;x<this.camera.x+this.width+tile;x+=tile){
      const sx=x-this.camera.x,sy=y-this.camera.y,gx=x/tile,gy=y/tile;
      const seed=Math.abs((gx*17+gy*31)%97), seed2=Math.abs((gx*53+gy*29)%61);
      const road=Math.abs(y-this.worldHeight/2)<42 || Math.abs(x-this.worldWidth/2)<28;
      const dPondA=(x-2150)*(x-2150)/17000+(y-2260)*(y-2260)/9000;
      const dPondB=(x-3180)*(x-3180)/12000+(y-2920)*(y-2920)/20000;
      const pondA=dPondA<1, pondB=dPondB<1;
      const shoreA=!pondA&&dPondA<1.2, shoreB=!pondB&&dPondB<1.25;

      if(pondA||pondB){
        this.ctx.fillStyle=seed%7===0?'#4a87a4':(seed%3===0?'#356a86':'#3b7391');
        this.ctx.fillRect(sx,sy,16,16);
        if(seed%5===0){this.ctx.fillStyle='#8fc3d5';this.ctx.fillRect(sx+3,sy+5,8,2)}
        if(seed2%11===0){this.ctx.fillStyle='#254f66';this.ctx.fillRect(sx+2,sy+10,5,1)}
      } else if((shoreA||shoreB)&&!road){
        this.ctx.fillStyle=seed%2?'#cdac6d':'#d8b97c';
        this.ctx.fillRect(sx,sy,16,16);
        if(seed2%4===0){this.ctx.fillStyle='#b8925a';this.ctx.fillRect(sx+(seed%9),sy+(seed2%9),2,1)}
      } else if(road){
        this.ctx.fillStyle=seed%9===0?'#9c7c4e':(seed%2?'#a88758':'#b09362');
        this.ctx.fillRect(sx,sy,16,16);
        if(seed2%6===0){this.ctx.fillStyle='#7c623c';this.ctx.fillRect(sx+(seed%10),sy+(seed2%10),2,2)}
      } else {
        this.ctx.fillStyle=seed<7?'#2e5230':seed<15?'#365e37':seed<72?'#3e713d':'#487d47';
        this.ctx.fillRect(sx,sy,16,16);
        if(seed2%5===0){this.ctx.fillStyle=seed%2?'#4d8a4a':'#2c4f2d';this.ctx.fillRect(sx+(seed2%11),sy+(seed%11),1,2)}
      }

      if(road||pondA||pondB||shoreA||shoreB) continue;
      if(seed===13){decorSpots.push({sx:sx+8,sy:sy+16,gx,gy,kind:'tree'})}
      else if(seed===37){decorSpots.push({sx:sx+8,sy:sy+16,gx,gy,kind:'rock'})}
      else if(seed%17===0){this.ctx.fillStyle=seed%2?'#8cb84d':'#f2dc6d';this.ctx.fillRect(sx+7,sy+5,2,6);this.ctx.fillRect(sx+5,sy+7,6,2)}
    }
    // Decoration pass: draw real sprites on top, sorted by depth (lower on screen = drawn later = in front).
    decorSpots.sort((a,b)=>a.sy-b.sy);
    for(const d of decorSpots){
      const pool = d.kind==='tree' ? ENV_TREE_VARIANTS : ENV_ROCK_VARIANTS;
      const key = pool[Math.abs(Math.floor(d.gx*7+d.gy*13))%pool.length];
      const sprite = ENV_SPRITES[key];
      const h = d.kind==='tree' ? 84 : 40;
      if(sprite && sprite.complete && sprite.naturalWidth){
        const w = h*(sprite.naturalWidth/sprite.naturalHeight);
        this.ctx.drawImage(sprite, d.sx-w/2, d.sy-h+8, w, h);
      } else if(d.kind==='tree'){
        this.ctx.fillStyle='#24502d';this.ctx.fillRect(d.sx-4,d.sy-13,9,11);this.ctx.fillStyle='#589349';this.ctx.fillRect(d.sx-6,d.sy-16,12,7);
      } else {
        this.ctx.fillStyle='#778056';this.ctx.fillRect(d.sx-4,d.sy-8,9,5);this.ctx.fillStyle='#a8a47a';this.ctx.fillRect(d.sx-2,d.sy-11,5,4);
      }
    }

    // Render XP Gems
    for (const g of this.gems) g.render(this.ctx, this.camera);

    // Render Enemies
    for (const e of this.enemies) e.render(this.ctx, this.camera);

    // Render Player
    this.player.render(this.ctx, this.camera);

    // Render Projectiles
    for (const p of this.projectiles) p.render(this.ctx, this.camera);

    // Render Particles & Floating Damage Numbers
    for (const p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;

    for (const ft of this.floatingTexts) {
      this.ctx.fillStyle = ft.color;
      this.ctx.font = '800 15px monospace';
      this.ctx.fillText(ft.text, ft.x - this.camera.x, ft.y - this.camera.y);
    }
  }

  updateHUD() {
    document.getElementById('hp-fill').style.width = `${(this.player.hp / this.player.stats.maxHp) * 100}%`;
    document.getElementById('hp-val').innerText = `${Math.round(this.player.hp)} / ${this.player.stats.maxHp}`;

    document.getElementById('exp-fill').style.width = `${(this.player.exp / this.player.expToNextLevel) * 100}%`;
    document.getElementById('exp-val').innerText = `SEVİYE ${this.player.level}`;

    document.getElementById('wave-title').innerText = `DALGA ${this.wave}`;
    document.getElementById('wave-timer').innerText = `${Math.max(0, Math.ceil(this.waveTimer))}s`;

    document.getElementById('hud-gold').innerText = `${this.player.gold} 💰`;
    document.getElementById('hud-dmg').innerText = `+%${Math.round((this.player.stats.damageMult - 1) * 100)}`;
    document.getElementById('hud-spd').innerText = `+%${Math.round((this.player.stats.attackSpeedMult - 1) * 100)}`;
    document.getElementById('hud-kills').innerText = this.kills;
    document.getElementById('level-badge').innerText = `LVL ${this.player.level}`;

    const boss = this.enemies.find(e => e.type === 'boss');
    const bossBar = document.getElementById('boss-bar');
    bossBar.classList.toggle('active', !!boss);
    if (boss) document.getElementById('boss-fill').style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`;

    // Update Weapons HUD Slots
    const wContainer = document.getElementById('weapons-hud');
    wContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const w = this.player.weapons[i];
      const div = document.createElement('div');
      div.className = `weapon-slot-hud ${w ? 'tier-' + w.tier : ''}`;
      div.innerHTML = `
        ${w ? w.icon : ''}
        ${w ? `<span class="weapon-tier-badge">T${w.tier}</span>` : ''}
      `;
      wContainer.appendChild(div);
    }
    this.renderMinimap();
  }

  renderMinimap() {
    const map = document.getElementById('minimap'); if (!map) return;
    const c = map.getContext('2d'), s = map.width;
    c.clearRect(0,0,s,s); c.fillStyle = '#07101c'; c.fillRect(0,0,s,s);
    c.strokeStyle = 'rgba(81,229,255,.2)'; c.strokeRect(1,1,s-2,s-2);
    const scale = s / this.worldWidth;
    c.fillStyle = '#ff5576'; for (const e of this.enemies.slice(0,250)) c.fillRect(e.pos.x*scale-1,e.pos.y*scale-1,2,2);
    c.fillStyle = '#51e5ff'; c.beginPath(); c.arc(this.player.pos.x*scale,this.player.pos.y*scale,3,0,Math.PI*2); c.fill();
  }

  addToast(msg) {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerText = msg;
    area.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  triggerGameOver() {
    this.isWaveActive = false;
    document.getElementById('char-select-screen').style.display = 'flex';
    document.getElementById('char-select-screen').innerHTML = `
      <h1 class="main-title" style="color:#ff3366">ÖLDÜNÜZ!</h1>
      <p class="subtitle">Ulaştığınız Dalga: <strong>${this.wave}</strong> | Seviye: <strong>${this.player.level}</strong></p>
      <button class="btn-primary" onclick="location.reload()">TEKRAR OYNA</button>
    `;
  }
}

class InputHandler {
  constructor() {
    this.keys = {};
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
  }
  isKeyDown(code) { return !!this.keys[code]; }
}

var gameEngine;
function initEngine() {
  if (!gameEngine) {
    gameEngine = new GameEngine();
    window.gameEngine = gameEngine;
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}
window.onload = initEngine;
