/* ==========================================================================
   SHADOW WILDERNESS: Procedural World Generation, Weather & Lighting Engine
   ========================================================================== */

// FreeEnvironment pack sprites used to render resource nodes on the map.
const ENV_SPRITES = {};
const ENV_PACK = 'assets/environment/';
function loadEnvSprite(key, file) { ENV_SPRITES[key] = new Image(); ENV_SPRITES[key].src = ENV_PACK + file; }
loadEnvSprite('tree_pine_dark', 'tree_pine_dark.png');
loadEnvSprite('tree_pine_snow', 'tree_pine_snow.png');
loadEnvSprite('tree_round_dark', 'tree_round_dark.png');
loadEnvSprite('tree_round_med', 'tree_round_med.png');
loadEnvSprite('tree_bare', 'tree_bare.png');
loadEnvSprite('rock_gray', 'rock_gray.png');
loadEnvSprite('rock_ice', 'rock_ice.png');
loadEnvSprite('coral_red', 'coral_red.png');
loadEnvSprite('coral_orange', 'coral_orange.png');
loadEnvSprite('coral_purple', 'coral_purple.png');
loadEnvSprite('bush_spiky', 'bush_spiky.png');
loadEnvSprite('plant_aloe', 'plant_aloe.png');
loadEnvSprite('cactus_tall_1', 'cactus_tall_1.png');
loadEnvSprite('cactus_tall_2', 'cactus_tall_2.png');
loadEnvSprite('cactus_flower', 'cactus_flower.png');
loadEnvSprite('fruit_apple', 'fruit_apple.png');
loadEnvSprite('fruit_grapes', 'fruit_grapes.png');
// Variant pools per resource type, so the map doesn't look repetitive.
const ENV_VARIANTS = {
  oak: ['tree_round_dark', 'tree_round_med'],
  pine: ['tree_pine_dark', 'tree_pine_snow'],
  desert: ['cactus_tall_1', 'cactus_tall_2'],
  stone: ['rock_gray'],
  iron: ['rock_gray'],
  crystal: ['coral_purple', 'coral_red', 'coral_orange'],
  berry: ['bush_spiky', 'plant_aloe', 'cactus_flower'],
};
function pickEnvVariant(subType, seedX, seedY) {
  const pool = ENV_VARIANTS[subType] || ['rock_gray'];
  const idx = Math.abs(Math.floor(seedX * 7 + seedY * 13)) % pool.length;
  return pool[idx];
}

class World {
  constructor(cols = 160, rows = 160, tileSize = 64) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.width = cols * tileSize;
    this.height = rows * tileSize;
    
    this.noise = new PerlinNoise();
    this.tiles = []; // 2D array of tile types
    this.resources = []; // Trees, rocks, berries, iron nodes
    
    // Day / Night Cycle (In seconds)
    this.dayDuration = 120; // 2 minutes total day/night cycle
    this.time = 30; // Starts in morning (0-60 Day, 60-120 Night)
    this.dayCount = 1;
    this.darkness = 0; // 0 (bright noon) to 0.88 (pitch black night)
    
    // Weather & Atmosphere
    this.weather = 'clear'; // 'clear', 'rain', 'fog', 'snow'
    this.particles = [];
    this.lights = []; // Dynamic light sources
    
    this.pathGrid = new AStarGrid(cols, rows, tileSize);
    
    this.initWorld();
  }

  initWorld() {
    this.tiles = new Array(this.cols).fill(0).map(() => new Array(this.rows).fill(0));
    
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        // Map borders are deep ocean water
        if (x < 3 || y < 3 || x > this.cols - 4 || y > this.rows - 4) {
          this.tiles[x][y] = 'water';
          this.pathGrid.setObstacle(x, y, true);
          continue;
        }

        const n = this.noise.noise2D(x * 0.05, y * 0.05);
        let type = 'grass';
        if (n < -0.35) type = 'water';
        else if (n < -0.2) type = 'sand';
        else if (n > 0.35) type = 'dark_grass';

        this.tiles[x][y] = type;
        if (type === 'water') {
          this.pathGrid.setObstacle(x, y, true);
        }
      }
    }

    this.spawnProceduralResources();
  }

  spawnProceduralResources() {
    this.resources = [];
    
    for (let x = 5; x < this.cols - 5; x++) {
      for (let y = 5; y < this.rows - 5; y++) {
        if (this.tiles[x][y] === 'water') continue;

        // Keep safe zone around player spawn (middle of map)
        const distFromCenter = Math.hypot(x - this.cols / 2, y - this.rows / 2);
        if (distFromCenter < 6) continue;

        const rand = Math.random();
        const posX = (x + 0.5) * this.tileSize;
        const posY = (y + 0.5) * this.tileSize;

        if (rand < 0.12) {
          // Tree (Wood)
          let treeType = this.tiles[x][y] === 'dark_grass' ? 'pine' : 'oak';
          if (this.tiles[x][y] === 'sand') treeType = 'desert';
          this.resources.push(new ResourceNode(posX, posY, 'tree', treeType, 100));
          this.pathGrid.setObstacle(x, y, true);
        } else if (rand < 0.16) {
          // Stone / Iron / Crystal Rock
          const rockType = rand < 0.14 ? 'stone' : (rand < 0.155 ? 'iron' : 'crystal');
          this.resources.push(new ResourceNode(posX, posY, 'rock', rockType, 120));
          this.pathGrid.setObstacle(x, y, true);
        } else if (rand < 0.18) {
          // Berry Bush (Food/HP)
          this.resources.push(new ResourceNode(posX, posY, 'bush', 'berry', 40));
        }
      }
    }
  }

  update(dt) {
    // Update Day/Night clock
    this.time += dt;
    if (this.time >= this.dayDuration) {
      this.time = 0;
      this.dayCount++;
      AudioSFX.toastMsg && AudioSFX.toastMsg(`Gün ${this.dayCount} Başladı!`);
    }

    // Calculate darkness intensity
    const normalizedTime = (this.time / this.dayDuration) * Math.PI * 2;
    // Sin wave: peak darkness at midnight
    const sunPos = Math.sin(normalizedTime);
    if (sunPos > 0) {
      this.darkness = Math.max(0, (1 - sunPos) * 0.4); // Day time (0 to 0.4 twilight)
    } else {
      this.darkness = Math.min(0.88, 0.4 + Math.abs(sunPos) * 0.48); // Night time (up to 0.88 dark)
    }

    // Weather toggle per day
    if (Math.floor(this.time) === 1 && Math.random() < 0.4) {
      const wTypes = ['clear', 'rain', 'fog'];
      this.weather = wTypes[Math.floor(Math.random() * wTypes.length)];
    }

    this.updateWeatherParticles(dt);
  }

  updateWeatherParticles(dt) {
    if (this.weather === 'rain') {
      if (this.particles.length < 150) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          speedY: Utils.randomFloat(400, 700),
          length: Utils.randomFloat(10, 20)
        });
      }
    } else if (this.weather === 'fog') {
      if (this.particles.length < 40) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Utils.randomFloat(80, 180),
          alpha: Utils.randomFloat(0.05, 0.15),
          vx: Utils.randomFloat(-10, 10)
        });
      }
    }

    // Update particle positions
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (this.weather === 'rain') {
        p.y += p.speedY * dt;
        p.x -= 50 * dt;
        if (p.y > this.height) p.y = 0;
      } else if (this.weather === 'fog') {
        p.x += p.vx * dt;
      }
    }
  }

  addLight(x, y, radius, color = '#ffb700', intensity = 1.0) {
    this.lights.push({ x, y, radius, color, intensity });
  }

  render(ctx, camera) {
    // Render Tiles inside camera view
    const startCol = Math.max(0, Math.floor(camera.x / this.tileSize));
    const endCol = Math.min(this.cols - 1, Math.ceil((camera.x + camera.w) / this.tileSize));
    const startRow = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endRow = Math.min(this.rows - 1, Math.ceil((camera.y + camera.h) / this.tileSize));

    for (let x = startCol; x <= endCol; x++) {
      for (let y = startRow; y <= endRow; y++) {
        const tile = this.tiles[x][y];
        const screenX = x * this.tileSize - camera.x;
        const screenY = y * this.tileSize - camera.y;

        if (tile === 'grass') ctx.fillStyle = '#2d5a27';
        else if (tile === 'dark_grass') ctx.fillStyle = '#1e3d1a';
        else if (tile === 'sand') ctx.fillStyle = '#d4b26f';
        else if (tile === 'water') ctx.fillStyle = '#1a4968';

        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.03)';
        ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
      }
    }

    // Render Resource Nodes
    for (const res of this.resources) {
      if (res.inView(camera)) {
        res.render(ctx, camera);
      }
    }

    // Render Weather Particles
    if (this.weather === 'rain') {
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.x >= camera.x && p.x <= camera.x + camera.w &&
            p.y >= camera.y && p.y <= camera.y + camera.h) {
          const sx = p.x - camera.x;
          const sy = p.y - camera.y;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - 4, sy + p.length);
        }
      }
      ctx.stroke();
    }
  }

  // Soft Lighting Mask overlay for Day/Night and light sources
  renderLighting(ctx, camera) {
    if (this.darkness <= 0.05 && this.lights.length === 0) return;

    // Create dark night mask canvas overlay
    ctx.save();
    ctx.fillStyle = `rgba(5, 8, 18, ${this.darkness})`;
    ctx.fillRect(0, 0, camera.w, camera.h);

    // Punch out light circles using destination-out blend mode
    ctx.globalCompositeOperation = 'destination-out';

    for (const light of this.lights) {
      const sx = light.x - camera.x;
      const sy = light.y - camera.y;

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, light.radius);
      grad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
      grad.addColorStop(0.7, `rgba(0, 0, 0, ${light.intensity * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.lights = []; // Clear lights for next frame
  }
}

// Resource Node Entity (Trees, Rocks, Bushes)
const ENV_DRAW_HEIGHT = { tree: 108, rock: 56, bush: 40 };
class ResourceNode {
  constructor(x, y, category, subType, hp) {
    this.x = x;
    this.y = y;
    this.category = category; // 'tree', 'rock', 'bush'
    this.subType = subType; // 'oak', 'pine', 'desert', 'stone', 'iron', 'crystal', 'berry'
    this.hp = hp;
    this.maxHp = hp;
    this.radius = 24;
    this.spriteKey = pickEnvVariant(subType, x, y);
  }

  inView(camera) {
    return this.x + this.radius >= camera.x &&
           this.x - this.radius <= camera.x + camera.w &&
           this.y + this.radius >= camera.y &&
           this.y - this.radius <= camera.y + camera.h;
  }

  takeDamage(amount) {
    this.hp -= amount;
    AudioSFX.hitSound();
    return this.hp <= 0;
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    // Draw shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 14, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const sprite = ENV_SPRITES[this.spriteKey];
    if (sprite && sprite.complete && sprite.naturalWidth) {
      const h = ENV_DRAW_HEIGHT[this.category] || 60;
      const w = h * (sprite.naturalWidth / sprite.naturalHeight);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, sx - w / 2, sy - h + 12, w, h);
    } else if (this.category === 'tree') {
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(sx - 6, sy - 5, 12, 20);
      ctx.fillStyle = this.subType === 'pine' ? '#1b4d2e' : '#2e7d32';
      ctx.beginPath();
      ctx.arc(sx, sy - 18, 22, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.category === 'rock') {
      ctx.fillStyle = this.subType === 'iron' ? '#8c6d58' : (this.subType === 'crystal' ? '#7000ff' : '#78909c');
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.category === 'bush') {
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e91e63';
      ctx.beginPath();
      ctx.arc(sx - 4, sy - 3, 4, 0, Math.PI * 2);
      ctx.arc(sx + 5, sy + 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw HP bar if damaged
    if (this.hp < this.maxHp) {
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx - 20, sy - 35, 40, 6);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(sx - 20, sy - 35, 40 * pct, 6);
    }
  }
}
