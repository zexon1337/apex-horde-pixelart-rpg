# Apex Horde ⚔️🧟

Türkçe arayüzlü, piksel sanatlı, tarayıcı üzerinde çalışan bir "survivor" tarzı hayatta kalma oyunu. Hiçbir build adımı veya bağımlılık gerektirmez — saf HTML/CSS/JS + Canvas.

## Özellikler

- 🥊 **4 Operatif Sınıfı** — Dövüşçü, Avcı, Büyücü, Tank; her birinin kendine özgü başlangıç silahı ve bonusları var
- 🌊 **Dalga Sistemi** — sürekli gelen düşman ordularına karşı hayatta kal, dalga aralarında Cephanelik'ten silah/eşya satın al
- ⚔️ **Otomatik Ateş** — WASD/ok tuşlarıyla hareket et, silahlar otomatik ateşler
- 📈 **Seviye Atlama & Mutasyonlar** — XP topla, seviye atla, güç veren mutasyonlar arasından seç
- 🔫 **6 Farklı Silah** — SMG, Pompalı Tüfek, Lazer Tüfeği, Döner Bıçak, Yıldırım Yüzüğü, Tırpan/Kılıç (aynı silahın iki kopyası otomatik üst Tier'a birleşir)
- ☠️ **Boss Savaşları** — Apex Mutant gibi güçlü boss'larla karşılaş
- 🗺️ **Mini Harita** ve gerçek zamanlı HUD (can, XP, altın, hasar/hız bonusları, öldürme sayısı)
- 🎵 Arka plan müziği ve ses efektleri

## Çalıştırma

Sadece `index.html` dosyasını tarayıcıda aç. Ya da basit bir sunucu ile:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

**Canlı demo:** https://zexon1337.github.io/apex-horde-pixelart-rpg/

## Dosyalar

- `index.html` — sayfa yapısı ve HUD
- `css/` — stiller (`style.css`, `clean-ui.css`, `cryo-ui.css`)
- `js/`
  - `game.js` — ana oyun motoru
  - `entities.js` — oyuncu, düşman, mermi tanımları
  - `weapons.js` — silah verileri ve davranışları
  - `shop.js` — dalga arası cephanelik/mağaza
  - `systems.js` — envanter ve yardımcı sistemler
  - `world.js` — harita ve dünya üretimi
  - `audio.js` — ses yönetimi
  - `utils.js` — yardımcı fonksiyonlar
- `Tiny RPG Character Asset Pack 01 v2.0 -Free Soldier&Orc/`, `Tiny Swords (Free Pack)/`, `Cryo's Mini GUI/` — kullanılan piksel sanat varlık paketleri
