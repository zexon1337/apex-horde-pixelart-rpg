class ShopManager {
  constructor(){ this.offers=[]; this.rerollCost=10; }
  makeOffer(){
    if (Math.random() < .42) { const available=PASSIVE_ITEMS.filter(x=>!gameEngine.player.passives.some(p=>p.id===x.id)); if(available.length){const item=available[Math.floor(Math.random()*available.length)];return {kind:'passive',item,price:item.price,locked:false};} }
    const pool=Object.values(WEAPON_DATABASE),weapon=pool[Math.floor(Math.random()*pool.length)],tier=Math.random()<.62?1:Math.random()<.83?2:Math.random()<.96?3:4; return {kind:'weapon',weapon,tier,price:18+tier*17+Math.floor(Math.random()*9),locked:false};
  }
  generateShopOffers(){ const locked=this.offers.filter(o=>o.locked); this.offers=[...locked]; while(this.offers.length<4)this.offers.push(this.makeOffer()); }
  renderShopModal(){ const p=gameEngine.player,grid=document.getElementById('shop-grid'); document.getElementById('shop-gold-text').innerText=`${p.gold} 💰`; grid.innerHTML='';
    this.offers.forEach((offer,index)=>{const card=document.createElement('article'); const passive=offer.kind==='passive';card.className=`shop-item-card ${passive?'passive-card':'tier-'+offer.tier}`; const rarity=passive?'KALICI PASİF':['ORTAK','NADİR','EPİK','EFSANEVİ'][offer.tier-1]; const icon=passive?offer.item.icon:offer.weapon.icon,name=passive?offer.item.name:offer.weapon.name,desc=passive?offer.item.desc:`${rarity} · TIER ${offer.tier}<br>Hasar ${Math.round(offer.weapon.baseDamage*(1+(offer.tier-1)*.45))}`; card.innerHTML=`<div class="shop-item-icon">${icon}</div><div class="shop-item-name">${name}</div><div class="shop-item-desc">${rarity}<br>${desc}</div><button class="shop-buy-btn" ${p.gold<offer.price?'disabled':''}>AL · ${offer.price} 💰</button><button class="lock-btn ${offer.locked?'locked':''}">${offer.locked?'🔒 KİLİTLİ':'🔓 KİLİTLE'}</button>`;
      card.querySelector('.shop-buy-btn').onclick=()=>this.buy(index); card.querySelector('.lock-btn').onclick=()=>{offer.locked=!offer.locked;this.renderShopModal()};grid.appendChild(card); }); this.renderInventory(); }
  buy(index){ const offer=this.offers[index],p=gameEngine.player; if(!offer||p.gold<offer.price)return; p.gold-=offer.price;
    if(offer.kind==='passive'){offer.item.apply(p);p.passives.push(offer.item);gameEngine.addToast(`✦ PASİF AKTİF — ${offer.item.name}`)}
    else {const twin=p.weapons.findIndex(w=>w.id===offer.weapon.id&&w.tier===offer.tier); if(twin>=0&&offer.tier<4){p.weapons[twin].upgrade();gameEngine.addToast(`✦ BİRLEŞTİRİLDİ — ${offer.weapon.name} T${offer.tier+1}`)}else if(p.weapons.length<6){p.weapons.push(new Weapon(offer.weapon,offer.tier));gameEngine.addToast(`⚔ ${offer.weapon.name} kuşanıldı`)}else{p.gold+=offer.price;gameEngine.addToast('⚠ 6 silah slotu dolu');return}} AudioSFX.buyShop();this.offers.splice(index,1);this.renderShopModal();gameEngine.updateHUD(); }
  recycle(index){const p=gameEngine.player,w=p.weapons[index];if(!w)return;p.gold+=Math.ceil(w.value*.75);p.weapons.splice(index,1);gameEngine.addToast(`♻ ${w.name} geri dönüştürüldü`);AudioSFX.buyShop();this.renderShopModal();gameEngine.updateHUD()}
  renderInventory(){const el=document.getElementById('inventory-weapons'),p=gameEngine.player;el.innerHTML='';p.weapons.forEach((w,i)=>{const x=document.createElement('span');x.className='inventory-weapon';x.innerHTML=`${w.icon} ${w.name} T${w.tier}<button class="recycle-btn">♻</button>`;x.querySelector('button').onclick=()=>this.recycle(i);el.appendChild(x)});p.passives.forEach(item=>{const x=document.createElement('span');x.className='inventory-weapon passive-owned';x.textContent=`${item.icon} ${item.name}`;el.appendChild(x)});}
  reroll(){const p=gameEngine.player;if(p.gold<this.rerollCost){gameEngine.addToast('Yeterli altın yok');return}p.gold-=this.rerollCost;this.generateShopOffers();AudioSFX.buyShop();this.renderShopModal();gameEngine.updateHUD()}
}
const LEVEL_UP_UPGRADES=[
 {title:'+20% Hasar',icon:'⚔️',desc:'Tüm silah sistemleri daha sert vurur.',apply:p=>p.stats.damageMult+=.2},{title:'+15% Saldırı Hızı',icon:'⚡',desc:'Otomatik silahların bekleme süresi azalır.',apply:p=>p.stats.attackSpeedMult+=.15},{title:'+25 Maks Can',icon:'❤️',desc:'Maksimum can ve anlık iyileşme.',apply:p=>{p.stats.maxHp+=25;p.hp+=25}},{title:'+10% Kritik',icon:'🎯',desc:'Kritikler iki kat hasar verir.',apply:p=>p.stats.critChance+=.1},{title:'+10% Can Çalma',icon:'🩸',desc:'Vuruşlarda can kazanma şansı.',apply:p=>p.stats.lifeSteal+=.1},{title:'+50% Mıknatıs',icon:'🧲',desc:'Kristaller daha uzaktan akın eder.',apply:p=>p.stats.magnetRange*=1.5},{title:'+2 Zırh',icon:'🛡️',desc:'Gelen her vuruş azaltılır.',apply:p=>p.stats.armor+=2},{title:'+8 Hasat',icon:'💰',desc:'Her dalga sonunda bedava altın.',apply:p=>p.stats.harvest+=8}
];
const PASSIVE_ITEMS=[
 {id:'lucky-clover',name:'Şans Yoncası',icon:'🍀',price:42,desc:'+12% kritik şansı.',apply:p=>p.stats.critChance+=.12},
 {id:'iron-vest',name:'Demir Yelek',icon:'🥋',price:48,desc:'+3 zırh, +15 maksimum can.',apply:p=>{p.stats.armor+=3;p.stats.maxHp+=15;p.hp+=15}},
 {id:'moon-charm',name:'Ay Tılsımı',icon:'🌙',price:46,desc:'+1.5 HP/s yenilenme.',apply:p=>p.stats.hpRegen+=1.5},
 {id:'magnet-belt',name:'Mıknatıs Kemer',icon:'🧲',price:38,desc:'+90 toplama menzili.',apply:p=>p.stats.magnetRange+=90},
 {id:'golden-hoe',name:'Altın Çapa',icon:'⛏️',price:44,desc:'+12 hasat, her dalga gelirini artırır.',apply:p=>p.stats.harvest+=12},
 {id:'coin-pouch',name:'Madeni Para Kesesi',icon:'🪙',price:47,desc:'+25% kristal altını.',apply:p=>p.stats.goldGain+=.25},
 {id:'scholar-book',name:'Kadim Rehber',icon:'📗',price:52,desc:'+20% XP kazanımı.',apply:p=>p.stats.xpGain+=.2},
 {id:'swift-boots',name:'Rüzgâr Çizmeleri',icon:'👢',price:40,desc:'+15% hareket hızı, +8% kaçınma.',apply:p=>{p.stats.speed*=1.15;p.stats.dodge+=.08}},
 {id:'war-drum',name:'Savaş Davulu',icon:'🥁',price:56,desc:'+12% hasar, +10% saldırı hızı.',apply:p=>{p.stats.damageMult+=.12;p.stats.attackSpeedMult+=.1}}
];
