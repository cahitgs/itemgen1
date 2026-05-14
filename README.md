# NeoCorvus

Modern, tarayıcıda çalışan **non-verbal bilişsel test üreteci ve oynatıcısı**.
Raven'ın Progressive Matrices'ine benzer 3×3 görsel-mantıksal bulmacalar üretir,
karıştırır, oynatır.

> [Corvus](https://github.com/Thimbleby/Corvus) projesinden ilham alındı,
> ancak sıfırdan modern bir stack üzerine yeniden yazıldı.

🌐 **Canlı demo**: [Pages URL buraya gelecek — repoyu deploy ettikten sonra]

## Özellikler

- **7 şekil**: Annulus, Dice, Polygon, Star, Arrow, Petals, Spike-Ring
- **5 mantık**: Identity, Distribution-of-3, Progression, Addition, Subtraction
- **Toplu üretim**: Tek seferde binlerce benzersiz soru, tohumlu (reproducible)
- **Kütüphane**: Üretilen testleri tarayıcıda kaydet (IndexedDB), tekrar oyna,
  JSON olarak indir
- **Mixer**: Birden çok testten N'er soru çekip karışık test yap
- **Sonuç dışa aktarım**: Cevaplar, süre, fare hover izleri CSV olarak
- **Görsel uniqueness garantor**: Aynı görünen şıklar otomatik elimine edilir
  ([detay](./CLAUDE.md#-kritik-kavramlar--şıkların-benzersizliği))

## Eski Corvus'tan Farkı

| Eski Corvus | NeoCorvus |
| --- | --- |
| D3 v3 + jQuery (2013), Edge çalışmaz | React 19 + TypeScript, tüm modern tarayıcılar |
| `txt indir → klasör değiştir → yeniden adlandır` akışı | Tek tıkla oyna, sonuç CSV |
| Cevaplar `?` ile gizli, hover'da açılır | Cevaplar baştan görünür (hover yine ölçülür) |
| Şifreli veri `[[3,3],[0],[2],[1,[1,1,0]]…]` | Okunabilir JSON `{type:'3x3', rule:'dist-of-3', …}` |
| Sadece 5 şekil + 8 mantık (eski) | 7 şekil + 5 mantık + Mixer (modern) |

## Hızlı Başlangıç

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # üretim build'i → dist/
npm run preview  # build'i lokal önizle
```

## Tech Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **React Router 7** (HashRouter — statik deploy uyumlu)
- **Dexie** (IndexedDB)
- **PapaParse** (CSV)
- **Zustand** (state)

## Klasör Yapısı

```
src/
├── components/
│   ├── shapes/      7 SVG şekil bileşeni + dispatcher
│   └── puzzle/      PuzzleGrid + OptionPanel
├── pages/           Home, Player, Generate, Mixer, Library, Editor
├── logic/
│   ├── generator.ts   Tüm kural üreteçleri (en kritik dosya)
│   ├── bulk.ts        Toplu üretim, dedup, validation
│   └── rng.ts         Mulberry32 tohumlu PRNG
├── db/dexie.ts        IndexedDB schema + CRUD
├── types/puzzle.ts    Veri modeli
└── utils/csv.ts       CSV export
```

Daha derin mimari + kavramsal detay için: **[CLAUDE.md](./CLAUDE.md)**

## Deploy

GitHub Pages'e otomatik deploy [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ile yapılır:

1. GitHub'da repo aç → kodu push et
2. Repo Settings → Pages → Source: **GitHub Actions** seç
3. `main` branch'e her push → otomatik deploy

## Yol Haritası

- [x] Faz 1 — MVP (7 şekil, 5 mantık, bulk üretim, library, mixer)
- [ ] Faz 2 — Editor (WYSIWYG tek soru tasarımı), F5-resilient routing
- [ ] Faz 3 — 2×2 / Seri / Tek-Farklı bulmaca tipleri, AND/OR/XOR mantıkları
- [ ] Faz 4 — Sonuç dashboard'u (grafikler, heatmap), PDF export, i18n

## Lisans

MIT.
