/* ==========================================================================
   SHADOW WILDERNESS: Systems (Inventory, Crafting, Skill Tree, Storage & Save)
   ========================================================================== */

class InventorySystem {
  constructor(size = 24) {
    this.size = size;
    this.slots = new Array(size).fill(null);
    
    // Starting items for fast enjoyable gameplay
    this.addItem('wood', 30);
    this.addItem('stone', 20);
    this.addItem('berry', 5);
  }

  addItem(itemId, count = 1) {
    const itemData = ITEM_DATABASE[itemId];
    if (!itemData) return false;

    // Check existing stackable slots
    for (let i = 0; i < this.size; i++) {
      if (this.slots[i] && this.slots[i].id === itemId) {
        this.slots[i].count += count;
        return true;
      }
    }

    // Find empty slot
    for (let i = 0; i < this.size; i++) {
      if (!this.slots[i]) {
        this.slots[i] = { id: itemId, count: count };
        return true;
      }
    }

    gameEngine.addToast('Envanter Dolu!');
    return false;
  }

  hasItem(itemId, count = 1) {
    let total = 0;
    for (const slot of this.slots) {
      if (slot && slot.id === itemId) {
        total += slot.count;
      }
    }
    return total >= count;
  }

  removeItem(itemId, count = 1) {
    if (!this.hasItem(itemId, count)) return false;

    let remaining = count;
    for (let i = 0; i < this.size; i++) {
      const slot = this.slots[i];
      if (slot && slot.id === itemId) {
        if (slot.count > remaining) {
          slot.count -= remaining;
          return true;
        } else {
          remaining -= slot.count;
          this.slots[i] = null;
        }
      }
    }
    return true;
  }
}

// Global Item Database
const ITEM_DATABASE = {
  wood: { name: 'Odun', icon: '🪵', category: 'resource' },
  stone: { name: 'Taş', icon: '🪨', category: 'resource' },
  iron: { name: 'Demir Külçesi', icon: '⚙️', category: 'resource' },
  crystal: { name: 'Sihirli Kristal', icon: '💎', category: 'resource' },
  berry: { name: 'Şifalı Meyve', icon: '🫐', category: 'consumable', hpRestore: 25 },
  
  sword_wood: { name: 'Tahta Kılıç', icon: '🗡️', category: 'weapon', type: 'melee', damage: 30 },
  sword_iron: { name: 'Demir Kılıç', icon: '⚔️', category: 'weapon', type: 'melee', damage: 65 },
  bow: { name: 'Avcı Yayı', icon: '🏹', category: 'weapon', type: 'ranged', damage: 40 },
  staff_fire: { name: 'Ateş Asası', icon: '🪄', category: 'weapon', type: 'magic', damage: 85, manaCost: 20 },
  
  wall_wood: { name: 'Ahşap Duvar', icon: '🪵', category: 'building', buildType: 'wall_wood' },
  wall_stone: { name: 'Taş Duvar', icon: '🧱', category: 'building', buildType: 'wall_stone' },
  turret_ballista: { name: 'Balista Taret', icon: '🏹', category: 'building', buildType: 'turret_ballista' },
  turret_laser: { name: 'Lazer Taret', icon: '⚡', category: 'building', buildType: 'turret_laser' },
  campfire: { name: 'Kamp Ateşi', icon: '🔥', category: 'building', buildType: 'campfire' }
};

// Crafting Recipes List
const CRAFTING_RECIPES = [
  {
    id: 'sword_wood',
    name: 'Tahta Kılıç',
    icon: '🗡️',
    desc: 'Yakın dövüş için temel kılıç (+30 Hasar)',
    reqs: { wood: 15 }
  },
  {
    id: 'sword_iron',
    name: 'Demir Kılıç',
    icon: '⚔️',
    desc: 'Yüksek keskinliğe sahip güçlü kılıç (+65 Hasar)',
    reqs: { wood: 10, iron: 15 }
  },
  {
    id: 'bow',
    name: 'Avcı Yayı',
    icon: '🏹',
    desc: 'Uzak mesafeden düşmanları avlama yayı (+40 Hasar)',
    reqs: { wood: 25, stone: 10 }
  },
  {
    id: 'staff_fire',
    name: 'Ateş Asası',
    icon: '🪄',
    desc: 'Ateş topu patlaması çıkaran büyülü asa (+85 Hasar)',
    reqs: { wood: 20, crystal: 10 }
  },
  {
    id: 'wall_wood',
    name: 'Ahşap Duvar',
    icon: '🪵',
    desc: 'Üssü yaratıklardan korumak için ahşap bariyer',
    reqs: { wood: 10 }
  },
  {
    id: 'wall_stone',
    name: 'Taş Duvar',
    icon: '🧱',
    desc: 'Yüksek dayanıklılığa sahip güçlü taş duvar',
    reqs: { stone: 15 }
  },
  {
    id: 'turret_ballista',
    name: 'Balista Taret',
    icon: '🏹',
    desc: 'Yaklaşan yaratıklara otomatik ok fırlatır',
    reqs: { wood: 30, iron: 10 }
  },
  {
    id: 'turret_laser',
    name: 'Lazer Taret',
    icon: '⚡',
    desc: 'Yüksek hızlı ve yıkıcı lazer atışları yapar',
    reqs: { iron: 20, crystal: 15 }
  },
  {
    id: 'campfire',
    name: 'Kamp Ateşi',
    icon: '🔥',
    desc: 'Gece aydınlığı sağlar ve yakındaki oyuncuyu iyileştirir',
    reqs: { wood: 12, stone: 8 }
  }
];

// Skill Tree Definition
const SKILL_TREE = {
  combat: [
    { id: 'dmg_1', name: 'Keskin Bıçak', desc: '+15% Saldırı Hasarı', unlocked: false },
    { id: 'dmg_2', name: 'Kritik Vuruş', desc: '+25% Kritik Hasar Şansı', unlocked: false }
  ],
  survival: [
    { id: 'hp_1', name: 'Dayanıklılık', desc: '+30 Maksimum Can', unlocked: false },
    { id: 'spd_1', name: 'Hızlı Adımlar', desc: '+15% Hareket Hızı', unlocked: false }
  ],
  engineering: [
    { id: 'turret_1', name: 'Mühendislik', desc: 'Taret Menzili +25%', unlocked: false },
    { id: 'craft_1', name: 'Verimli Üretim', desc: 'İnşaat Ücretleri -20%', unlocked: false }
  ]
};
