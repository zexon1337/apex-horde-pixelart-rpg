/* ==========================================================================
   BROTATO x VAMPIRE SURVIVORS: Entities (Player, Horde Enemies, Gems, Loot)
   ========================================================================== */

// Supplied Tiny RPG pack: each walk sheet has eight 100px frames.
const RPG_SPRITES = {};
const RPG_PACK = 'Tiny RPG Character Asset Pack 01 v2.0 -Free Soldier&Orc/Characters(100x100 split)/';
function loadRpgSprite(key, path) { RPG_SPRITES[key] = new Image(); RPG_SPRITES[key].src = RPG_PACK + path; }
loadRpgSprite('soldierWalk', 'Soldier/Soldier with shadows/Soldier_Walk.png');
loadRpgSprite('soldierAttack1', 'Soldier/Soldier with shadows/Soldier_Attack01.png');
loadRpgSprite('soldierAttack2', 'Soldier/Soldier with shadows/Soldier_Attack02.png');
loadRpgSprite('soldierIdle', 'Soldier/Soldier with shadows/Soldier_Idle.png');
loadRpgSprite('orcWalk', 'Orc/Orc with shadows/Orc_Walk.png');
loadRpgSprite('orcAttack1', 'Orc/Orc with shadows/Orc_Attack01.png');
loadRpgSprite('orcAttack2', 'Orc/Orc with shadows/Orc_Attack02.png');
loadRpgSprite('orcIdle', 'Orc/Orc with shadows/Orc_Idle.png');

class Player {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.radius = 34;

    // Character Base Stats
    this.stats = {
      maxHp: 100,
      hpRegen: 0.5, // per second
      lifeSteal: 0, // % chance
      damageMult: 1.0,
      attackSpeedMult: 1.0,
      critChance: 0.05,
      armor: 0,
      speed: 230,
      magnetRange: 160,
      harvest: 5,
      dodge: 0,
      goldGain: 1,
      xpGain: 1
    };

    this.hp = 100;
    this.level = 1;
    this.exp = 0;
    this.expToNextLevel = 35;
    this.gold = 50; // Starting gold

    // 6 Weapon Slots (Brotato Mechanic)
    this.weapons = [];
    this.passives = [];
    this.pendingLevels = 0;
    this.animationTime = 0;
    this.spriteKey = 'soldierWalk';
  }

  update(dt, input, worldWidth, worldHeight) {
    this.animationTime += dt;
    // Regenerate HP
    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.hpRegen * dt);

    // WASD Movement
    let moveX = 0;
    let moveY = 0;
    if (input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp')) moveY -= 1;
    if (input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown')) moveY += 1;
    if (input.isKeyDown('KeyA') || input.isKeyDown('ArrowLeft')) moveX -= 1;
    if (input.isKeyDown('KeyD') || input.isKeyDown('ArrowRight')) moveX += 1;

    const moveVec = new Vector2(moveX, moveY);
    if (moveVec.mag() > 0) {
      moveVec.normalize();
      this.vel.set(moveVec.x * this.stats.speed, moveVec.y * this.stats.speed);
    } else {
      this.vel.set(0, 0);
    }

    // Clamp inside world arena
    this.pos.x = Utils.clamp(this.pos.x + this.vel.x * dt, 50, worldWidth - 50);
    this.pos.y = Utils.clamp(this.pos.y + this.vel.y * dt, 50, worldHeight - 50);

    // Update active weapons
    for (const w of this.weapons) {
      w.update(dt, this, gameEngine.enemies, gameEngine.projectiles);
    }
  }

  addExp(amount) {
    this.exp += amount * this.stats.xpGain;
    while (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.level++;
      this.expToNextLevel = Math.floor(this.expToNextLevel * 1.22 + 8);
      this.pendingLevels++;
    }
    if (this.pendingLevels && !gameEngine.isPaused) gameEngine.triggerLevelUpModal();
  }

  takeDamage(amount) {
    if (Math.random() < this.stats.dodge) { gameEngine.addFloatingText(this.pos.x, this.pos.y - 20, 'KAÇINDI', '#9cffc7'); return; }
    const reducedDamage = Math.max(1, amount - this.stats.armor);
    this.hp -= reducedDamage;
    AudioSFX.orbitalSlice();
    gameEngine.triggerScreenShake(6);
    gameEngine.addFloatingText(this.pos.x, this.pos.y - 20, `-${Math.round(reducedDamage)}`, '#ff3366');

    if (this.hp <= 0) {
      this.hp = 0;
      gameEngine.triggerGameOver();
    }
  }

  render(ctx, camera) {
    const sx = this.pos.x - camera.x;
    const sy = this.pos.y - camera.y;

    const sprite = RPG_SPRITES[this.spriteKey];
    if (sprite.complete && sprite.naturalWidth) {
      const frame = Math.floor(this.animationTime * (this.vel.mag() > 0 ? 10 : 3)) % Math.max(1, Math.floor(sprite.naturalWidth / 100));
      ctx.save(); ctx.translate(sx, sy); if (this.vel.x < 0) ctx.scale(-1, 1);
      ctx.drawImage(sprite, frame * 100, 0, 100, 100, -120, -166, 240, 240); ctx.restore();
    } else { ctx.fillStyle='#e8a64c';ctx.fillRect(sx-24,sy-32,48,56); }

    // Render Orbital Weapons
    for (let i = 0; i < this.weapons.length; i++) {
      this.weapons[i].render(ctx, camera, this, i);
    }
  }
}

// Horde Enemy Class (Zombies, Bugs, Elite Bosses)
class HordeEnemy {
  constructor(x, y, type = 'zombie', wave = 1) {
    this.pos = new Vector2(x, y);
    this.vel = new Vector2(0, 0);
    this.type = type;

    if (type === 'runner') {
      this.radius = 30;
      this.maxHp = 25 + wave * 8;
      this.speed = 190;
      this.damage = 8;
      this.color = '#a855f7';
      this.expValue = 10;
    } else if (type === 'tank') {
      this.radius = 50;
      this.maxHp = 120 + wave * 35;
      this.speed = 85;
      this.damage = 18;
      this.color = '#10b981';
      this.expValue = 35;
    } else if (type === 'boss') {
      this.radius = 80;
      this.maxHp = 800 + wave * 300;
      this.speed = 95;
      this.damage = 30;
      this.color = '#ef4444';
      this.expValue = 250;
    } else {
      // Normal Zombie
      this.radius = 38;
      this.maxHp = 40 + wave * 12;
      this.speed = 120;
      this.damage = 10;
      this.color = '#3b82f6';
      this.expValue = 15;
    }

    this.hp = this.maxHp;
    this.attackTimer = 0;
    this.animationTime = Math.random() * 3;
  }

  update(dt, player) {
    this.animationTime += dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;

    // Allocation-free chase loop (important when 200+ enemies are on screen).
    const dx = player.pos.x - this.pos.x, dy = player.pos.y - this.pos.y;
    const distanceSq = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSq) || 1;
    this.vel.set(dx / distance * this.speed, dy / distance * this.speed);
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt;

    // Collision attack player
    const hitRange = this.radius + player.radius;
    if (distanceSq < hitRange * hitRange && this.attackTimer <= 0) {
      this.attackTimer = 0.8;
      player.takeDamage(this.damage);
    }
  }

  takeDamage(amount, player) {
    // Check Crit Chance
    let isCrit = false;
    let finalDamage = amount;
    if (Math.random() < player.stats.critChance) {
      isCrit = true;
      finalDamage *= 2.0;
    }

    this.hp -= finalDamage;
    gameEngine.addFloatingText(this.pos.x, this.pos.y - 15, `${Math.round(finalDamage)}`, isCrit ? '#ffb700' : '#ffffff');

    // Life Steal check
    if (player.stats.lifeSteal > 0 && Math.random() < player.stats.lifeSteal) {
      player.hp = Math.min(player.stats.maxHp, player.hp + 2);
    }

    if (this.hp <= 0) return true; // Dead
    return false;
  }

  render(ctx, camera) {
    const sx = this.pos.x - camera.x;
    const sy = this.pos.y - camera.y;

    const spriteKeys = { zombie: 'orcWalk', runner: 'orcAttack1', tank: 'orcAttack2', boss: 'orcIdle' };
    const sprite = RPG_SPRITES[spriteKeys[this.type] || 'orcWalk'];
    if (sprite.complete && sprite.naturalWidth) {
      const size = this.type === 'boss' ? 320 : this.type === 'tank' ? 230 : this.type === 'runner' ? 150 : 195;
      const frame = Math.floor(this.animationTime * 8) % Math.max(1, Math.floor(sprite.naturalWidth / 100));
      ctx.save(); ctx.translate(sx, sy); if (this.vel.x > 0) ctx.scale(-1, 1);
      ctx.drawImage(sprite, frame * 100, 0, 100, 100, -size/2, -size*.72, size, size); ctx.restore();
      if (this.type === 'boss') { ctx.fillStyle='#e65f52';ctx.fillRect(sx-23,sy-size*.67,46,4); }
    } else { const r=Math.round(this.radius);ctx.fillStyle=this.color;ctx.fillRect(sx-r,sy-r,r*2,r*2); }
  }
}

// XP Gem Pickup Class (Vampire Survivors Magnet Mechanics)
class XPGem {
  constructor(x, y, value = 10) {
    this.pos = new Vector2(x, y);
    this.value = value;
    this.radius = 6;
    this.color = value >= 50 ? '#a855f7' : (value >= 25 ? '#00f0ff' : '#00ff88');
  }

  update(dt, player) {
    const dx = player.pos.x - this.pos.x, dy = player.pos.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Magnet pull effect
    if (dist < player.stats.magnetRange) {
      const pullSpeed = (1 - dist / player.stats.magnetRange) * 550 + 150;
      const factor = pullSpeed * dt / (dist || 1);
      this.pos.x += dx * factor; this.pos.y += dy * factor;
    }

    if (dist < player.radius + this.radius + 5) {
      AudioSFX.gemPickup();
      player.addExp(this.value);
      player.gold += Math.max(1, Math.floor(this.value / 3 * player.stats.goldGain));
      return true; // Picked up
    }
    return false;
  }

  render(ctx, camera) {
    const sx = this.pos.x - camera.x;
    const sy = this.pos.y - camera.y;

    ctx.fillStyle = '#213242'; ctx.fillRect(sx-5,sy-5,10,10);
    ctx.fillStyle = this.color; ctx.fillRect(sx-3,sy-6,6,12); ctx.fillRect(sx-6,sy-3,12,6);
  }
}

// Projectile Class
class Projectile {
  constructor(x, y, targetPos, speed, damage, type = 'bullet', knockback = 50) {
    this.pos = new Vector2(x, y);
    this.type = type;
    this.damage = damage;
    this.radius = 5;
    this.knockback = knockback;

    const dir = targetPos.clone().sub(this.pos).normalize();
    this.vel = dir.mult(speed);
    this.life = 2.0;
  }

  update(dt) {
    this.pos.add(this.vel.clone().mult(dt));
    this.life -= dt;
    return this.life <= 0;
  }

  render(ctx, camera) {
    const sx = this.pos.x - camera.x;
    const sy = this.pos.y - camera.y;

    ctx.fillStyle = this.type === 'laser' ? '#00f0ff' : '#ffb700';
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
