/* ==========================================================================
   BROTATO x VAMPIRE SURVIVORS: Weapons Engine & Auto-Fire Systems
   ========================================================================== */

class Weapon {
  constructor(data, tier = 1) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.type = data.type; // 'ranged', 'orbital', 'aoe', 'melee'
    this.tier = tier; // 1: Common, 2: Rare, 3: Epic, 4: Legendary

    // Base stats multiplied by Tier
    const tierMultiplier = 1 + (tier - 1) * 0.45;
    this.damage = Math.round(data.baseDamage * tierMultiplier);
    this.fireRate = data.baseFireRate / (1 + (tier - 1) * 0.15); // seconds per shot
    this.range = data.baseRange;
    this.knockback = data.knockback || 50;
    this.value = 18 + tier * 17;

    this.cooldownTimer = 0;
    this.orbitAngle = 0; // for orbital blades
  }

  upgrade() {
    if (this.tier >= 4) return;
    this.tier++;
    this.damage = Math.round(this.damage * 1.45);
    this.fireRate *= 0.85;
    this.value = 18 + this.tier * 17;
  }

  update(dt, player, enemies, projectiles) {
    if (this.type === 'orbital') {
      // Spinning blade around player
      this.orbitAngle += dt * 3.5;
      const radius = 90;
      const bladeX = player.pos.x + Math.cos(this.orbitAngle) * radius;
      const bladeY = player.pos.y + Math.sin(this.orbitAngle) * radius;

      // Contact damage to enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (Math.hypot(bladeX - enemy.pos.x, bladeY - enemy.pos.y) < 28 + enemy.radius) {
          if (!enemy.lastOrbitalHit || Date.now() - enemy.lastOrbitalHit > 250) {
            enemy.lastOrbitalHit = Date.now();
            const isDead = enemy.takeDamage(this.damage * player.stats.damageMult, player);
            AudioSFX.orbitalSlice();
            gameEngine.addParticle(bladeX, bladeY, '#a855f7', 4);
            if (isDead) {
              gameEngine.killEnemy(enemy);
            }
          }
        }
      }
      return;
    }

    // Cooldown management for auto-aim weapons
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
      return;
    }

    // Find nearest enemy in range
    let closestEnemy = null;
    let minDist = this.range;

    for (const enemy of enemies) {
      const d = player.pos.dist(enemy.pos);
      if (d < minDist) {
        minDist = d;
        closestEnemy = enemy;
      }
    }

    if (closestEnemy) {
      this.cooldownTimer = this.fireRate / player.stats.attackSpeedMult;
      this.fire(player, closestEnemy, projectiles);
    }
  }

  fire(player, target, projectiles) {
    if (this.type === 'ranged') {
      projectiles.push(new Projectile(
        player.pos.x, player.pos.y,
        target.pos,
        650,
        this.damage * player.stats.damageMult,
        this.id === 'laser' ? 'laser' : 'bullet',
        this.knockback
      ));
      if (this.id === 'laser') AudioSFX.laserShot();
      else AudioSFX.shootGun();
    } else if (this.type === 'aoe') {
      // Lightning strike directly on target
      if (target.takeDamage(this.damage * player.stats.damageMult, player)) gameEngine.killEnemy(target);
      gameEngine.addParticle(target.pos.x, target.pos.y, '#00f0ff', 15);
      gameEngine.addFloatingText(target.pos.x, target.pos.y - 20, '⚡ LIGHTNING', '#00f0ff');
      AudioSFX.explosion();
    } else if (this.type === 'melee') {
      // Melee Cleave
      AudioSFX.orbitalSlice();
      const dir = target.pos.clone().sub(player.pos).normalize();
      for (const enemy of [...gameEngine.enemies]) {
        if (player.pos.dist(enemy.pos) < 110) {
          if (enemy.takeDamage(this.damage * player.stats.damageMult, player)) gameEngine.killEnemy(enemy);
          enemy.pos.add(dir.clone().mult(this.knockback));
        }
      }
    }
  }

  render(ctx, camera, player, index) {
    if (this.type === 'orbital') {
      const radius = 90;
      const bladeX = player.pos.x + Math.cos(this.orbitAngle) * radius - camera.x;
      const bladeY = player.pos.y + Math.sin(this.orbitAngle) * radius - camera.y;

      ctx.save();
      ctx.translate(bladeX, bladeY);
      ctx.rotate(this.orbitAngle * 3);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-14, -6, 28, 12);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(-14, -6, 28, 12);
      ctx.restore();
    }
  }
}

// Master Weapons Database
const WEAPON_DATABASE = {
  smg: { id: 'smg', name: 'Hızlı SMG', icon: '🔫', type: 'ranged', baseDamage: 12, baseFireRate: 0.18, baseRange: 420 },
  shotgun: { id: 'shotgun', name: 'Pompalı Tüfek', icon: '💥', type: 'ranged', baseDamage: 32, baseFireRate: 0.75, baseRange: 320, knockback: 120 },
  laser: { id: 'laser', name: 'Lazer Tüfeği', icon: '⚡', type: 'ranged', baseDamage: 45, baseFireRate: 0.45, baseRange: 550 },
  sawblade: { id: 'sawblade', name: 'Döner Bıçak', icon: '⚙️', type: 'orbital', baseDamage: 25, baseFireRate: 0, baseRange: 90 },
  lightning: { id: 'lightning', name: 'Yıldırım Yüzüğü', icon: '🌩️', type: 'aoe', baseDamage: 70, baseFireRate: 1.1, baseRange: 450 },
  katana: { id: 'katana', name: 'Tırpan/Kılıç', icon: '⚔️', type: 'melee', baseDamage: 55, baseFireRate: 0.55, baseRange: 110, knockback: 100 }
};
