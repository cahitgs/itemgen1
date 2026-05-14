# Cogitem — Claude'a Notlar

> Eski adı **NeoCorvus**. Şu an **Cogitem** (cogito + item). Repo adı `itemgen1`.
> Geçmiş kayıtların IndexedDB'si `'neocorvus'`'tu, şimdi `'cogitem'`.

> Bu dosya yeni bir Claude oturumunun **projeye 5 dakikada vakıf olmasını** sağlamak için yazıldı. Aşağıdan kronolojik (özet → detay) okumayı öner.

---

## 🎯 30 Saniyelik Özet

**Cogitem** non-verbal bilişsel test platformu. Tarayıcıda, backend yok. Generate (toplu üret) → Library (IndexedDB'de sakla) → Mixer (karıştır) → Player (oyna, CSV indir) akışı.

- **Canlı**: <https://cahitgs.github.io/itemgen1/>
- **Repo**: <https://github.com/cahitgs/itemgen1>
- **Kullanıcı**: Türkçe konuşur (cahitgs), portfolyo + olası akademik kullanım
- **Konum**: `C:\Users\tekno\Desktop\neocorvus` (proje), `C:\Users\tekno\Desktop\Corvus-master` (orijinal Corvus + çalışma dizini)
- **GitHub Pages otomatik deploy**: `git push` → ~2 dk sonra canlı

---

## ⚙️ Geliştirme Ortamı

| | |
|---|---|
| **Node** | v22 |
| **npm** | v10 — ⚠ **her zaman `npm.cmd`** kullan (PowerShell exec policy npm.ps1'i blokluyor) |
| **OS** | Windows |
| **Çalışma dizini** | Genelde `C:\Users\tekno\Desktop\Corvus-master`. Proje klasörü: `C:\Users\tekno\Desktop\neocorvus`. Komutlarda `Set-Location` ile geç. |
| **Dev server portu** | Genelde 5173. Boşsa 5174'e otomatik düşer. |

### Komutlar

```powershell
Set-Location C:\Users\tekno\Desktop\neocorvus

npm.cmd run dev      # Vite dev (HMR ile canlı yenileme)
npm.cmd run build    # tsc + vite build
npm.cmd run preview  # Production build önizleme

# Push deploy
git add .
git commit -m "Mesaj"
git push   # → GitHub Actions otomatik deploy
```

### Git Kimliği

Lokal config: `user.name=cahitgs`, `user.email=cahitgs@gmail.com`. Sadece bu repoda; global config'e dokunulmadı.

---

## 🛠 Tech Stack

| Paket | Versiyon | Notes |
|---|---|---|
| **Vite** | 8 | `base: './'` (statik deploy için), Tailwind v4 plugin yüklü |
| **React** | 19 | `useId` hook'u kullanılıyor (SectorPie'de SVG pattern ID'leri için) |
| **TypeScript** | 6.x (strict) | `noUnusedLocals: true` → dead code = build hata |
| **Tailwind CSS** | v4 | `@import "tailwindcss"` + `@theme {...}` — config dosyası yok |
| **React Router** | 7 | **HashRouter** (statik hosting için zorunlu) |
| **Dexie** | latest | IndexedDB CRUD |
| **PapaParse** | latest | CSV export |
| **Zustand** | latest | Kurulu ama henüz kullanılmıyor |

---

## 📊 Güncel Envanter — *Şu Anki Tam Kapsam*

### Şekiller (14)

| Şekil | Render | Primary Param | Fold | Bool Op? |
|---|---|---|---|---|
| `annulus` | İç içe halkalar | `ringCount` (1-4) | 360° | — |
| `dice` | Zar yüzü, 1-9 nokta | `dotCount` (1-9) | 1/2/4 (paterne göre) | — |
| `polygon` | Düzgün çokgen (3-8 kenar) | `sides` (3-8) | n-fold | — |
| `star` | n-köşeli yıldız (4-10) | `points` (4-10) | n-fold | — |
| `arrow` | Yönlü ok (asimetrik) | yok | 1 | — |
| `petals` | Çiçek (3-12 yaprak) | `petalCount` (3-12) | n-fold | — |
| `spike-ring` | Dikenli halka (4-16 diken) | `spikeCount` (4-16) | n-fold | — |
| `hammer` | Çekiç + corner marker | yok | 1 | — |
| `bars` | Paralel çizgi grubu (1-6) | `barCount` (1-6) | 2 | — |
| `grid-dots` | m×n nokta grid'i | `rows` (1-4) | 2 veya 4 | — |
| `checkerboard` | m×n dolu/boş kare | yok | 1 | ✓ (`pattern` bit-mask) |
| `box-lines` | Kutu + iç çizgi (6-bit lineMask) | yok | 1 | — |
| `nested-polygon` | İç içe çokgen (outer + inner) | `outerSides` (3-8) | min(o,i) | — |
| `sector-pie` | Pasta dilim + per-sektör pattern | `sectorCount` (2-8) | 1 | ✓ (`sectorPatterns` 3-bit/sektör) |

### Mantıklar (15 — RuleKind union)

| Kural | Uygulama | Hangi şekiller |
|---|---|---|
| `identity` | Hepsi aynı | Hepsi |
| `dist-of-3` | Latin karesi 3 varyant | Hepsi |
| `dist-of-2` | 2 varyant + boş hücre (sentinel `params.blank = 1`) | 9 net şekil (grid-dots, checkerboard hariç) — **UI'da gizli** |
| `progression` | 2 eksenli artış (primary col, secondary row) | Hepsi |
| `rotation` | Saf rotasyon, sliding-window (r+c)×Δ | Sadece fold<4: arrow, hammer |
| `addition` | col0+col1=col2 | COUNT_PARAM_SHAPES |
| `subtraction` | col0-col1=col2 | COUNT_PARAM_SHAPES |
| `multiplication` | col0×col1=col2 | COUNT_PARAM_SHAPES |
| `mirror` | row 2 = row 0'ın aynası (180° rotation) | MIRROR_SHAPES (asimetrik şekiller) |
| `and`, `or`, `xor`, `xnor` | Bit-bit boolean op | sector-pie, checkerboard |
| `pattern-completion` | Büyük desende boşluk doldurma | "Pattern" virtual shape (UI-only) |
| `odd-one-out` | N öğeden farklı olanı bul | Hepsi |

### Puzzle Tipleri (3)

| Tip | type discriminator | Render bileşeni |
|---|---|---|
| 3×3 Matrix | `Matrix3x3Puzzle` (`type: '3x3'`) | `PuzzleGrid` + `OptionPanel` |
| Pattern Completion | `PatternCompletionPuzzle` (`type: 'pattern-completion'`) | `PatternCompletionGrid` + `FragmentOptionPanel` |
| Odd-One-Out | `OddOneOutPuzzle` (`type: 'odd-one-out'`) | (yok) + `OddOneOutPanel` |
| 2×2 Matrix | `Matrix2x2Puzzle` | **Tip union'da var, generator+UI henüz yok** |
| Series | `SeriesPuzzle` | **Tip union'da var, generator+UI henüz yok** |

---

## 📁 Klasör Yapısı

```
neocorvus/
├── CLAUDE.md                              ← BURASI (Claude için handoff)
├── README.md                              ← Kullanıcı dökümantasyonu
├── .github/workflows/deploy.yml           ← GitHub Actions Pages deploy
├── src/
│   ├── App.tsx                            ← HashRouter + routes
│   ├── main.tsx
│   ├── index.css                          ← Tailwind + @theme renkleri
│   │
│   ├── types/puzzle.ts                    ← ShapeKind, RuleKind, PuzzleItem union, SavedTest, etc.
│   │
│   ├── components/
│   │   ├── shapes/                        ← Her şekil için 1 SVG bileşeni + Shape.tsx dispatcher
│   │   │   ├── Shape.tsx                  ← switch(kind) → render
│   │   │   ├── Annulus.tsx, Dice.tsx, Polygon.tsx, Star.tsx, Arrow.tsx,
│   │   │   ├── Petals.tsx, SpikeRing.tsx
│   │   │   ├── Hammer.tsx                 ← Çekiç + marker (cell coords'ta marker)
│   │   │   ├── Bars.tsx                   ← N paralel çizgi, 3 orientation
│   │   │   ├── GridDots.tsx               ← m×n nokta grid'i
│   │   │   ├── Checkerboard.tsx           ← m×n dolu/boş kare (inset düzeltmesi var)
│   │   │   ├── BoxLines.tsx               ← Kutu + 6-bit lineMask
│   │   │   ├── NestedPolygon.tsx          ← İç içe çokgen
│   │   │   └── SectorPie.tsx              ← Per-sektör pattern (useId ile SVG pattern defs)
│   │   │
│   │   └── puzzle/
│   │       ├── PuzzleGrid.tsx             ← 3×3 grid + blank cell + "?" handling
│   │       ├── OptionPanel.tsx            ← 4 ShapeConfig şıkkı
│   │       ├── PatternCompletionGrid.tsx  ← Büyük motif desen + boşluk overlay
│   │       ├── FragmentOptionPanel.tsx    ← Fragment grid şıkları
│   │       └── OddOneOutPanel.tsx         ← N şekil, 1'i farklı
│   │
│   ├── pages/
│   │   ├── Home.tsx                       ← 4 ana kart
│   │   ├── Player.tsx                     ← Test runner — puzzle.type switch'li
│   │   ├── Generate.tsx                   ← Bulk üretim UI (Pattern + 14 normal şekil dropdown'da)
│   │   ├── Library.tsx                    ← IndexedDB CRUD UI
│   │   ├── Mixer.tsx                      ← Çoklu kaynak örnekleme
│   │   └── Editor.tsx                     ← Yer tutucu (Faz 2'de yapılacak)
│   │
│   ├── logic/                             ← TÜM matematik (EN KRİTİK)
│   │   ├── rng.ts                         ← mulberry32 + sample/pick/shuffle helpers
│   │   ├── generator.ts                   ← Tüm kural üreteçleri + visualSignature + helpers
│   │   ├── patternCompletion.ts           ← Pattern-completion generator (ayrı dosya)
│   │   ├── bulk.ts                        ← bulkGenerate + SUPPORTED matrix + isPuzzleValid
│   │   └── difficulty.ts                  ← Dinamik difficulty kalibrasyonu (B6)
│   │
│   ├── db/dexie.ts                        ← IndexedDB schema + CRUD
│   │
│   └── utils/csv.ts                       ← AnswerLog → CSV download
```

---

## 🧬 Veri Modeli (`types/puzzle.ts`)

### ShapeKind (14)
```ts
type ShapeKind =
  | 'annulus' | 'dice' | 'polygon' | 'star' | 'arrow'
  | 'petals' | 'spike-ring' | 'hammer' | 'bars'
  | 'grid-dots' | 'checkerboard' | 'box-lines'
  | 'nested-polygon' | 'sector-pie'
```

### RuleKind (15)
```ts
type RuleKind =
  | 'identity' | 'dist-of-3' | 'dist-of-2'
  | 'addition' | 'subtraction' | 'multiplication'
  | 'progression' | 'rotation' | 'mirror'
  | 'pattern-completion' | 'odd-one-out'
  | 'and' | 'or' | 'xor' | 'xnor'
```

### ShapeConfig
```ts
interface ShapeConfig {
  kind: ShapeKind
  size: number          // 0-1
  rotation: number      // 0-360
  fill: string | null
  stroke: string
  strokeWidth: number
  params: Record<string, number>   // şekil-spesifik: ringCount, dotCount, sides, points,
                                   // petalCount, spikeCount, barCount, rows, cols,
                                   // lineMask, outerSides, innerSides, innerScale,
                                   // sectorCount, sectorPatterns, fillMask (legacy),
                                   // markerPos, blank (sentinel for dist-of-2), ...
}
```

### Puzzle types (discriminated by `type`)
```ts
Matrix3x3Puzzle { type: '3x3', cells: ShapeConfig[][], options, correctIndex, ... }
Matrix2x2Puzzle { type: '2x2', ... }  // generator/UI HENÜZ YOK
SeriesPuzzle    { type: 'series', cells: ShapeConfig[], ... }  // generator/UI HENÜZ YOK
OddOneOutPuzzle { type: 'odd-one-out', options: ShapeConfig[], correctIndex, ... }
PatternCompletionPuzzle {
  type: 'pattern-completion',
  motifs: ShapeConfig[],
  pattern: number[][],                 // büyük grid, her hücre motif index'i
  blank: { row, col, rows, cols },
  fragmentOptions: number[][][],       // her seçenek bir mini grid
  correctIndex,
}

type PuzzleItem = ...union of all above
```

### SavedTest (Dexie)
```ts
interface SavedTest {
  id?: number
  name: string
  shape: ShapeKind | 'mixed'           // 'mixed' = Mixer ile yapılmış
  rule: RuleKind | 'mixed'
  count: number
  seed: number
  puzzles: PuzzleItem[]
  createdAt: number
  sources?: MixerSource[]              // Mixer kaynağı
}
```

---

## 🧠 Kritik Kavramlar — Görsel Benzersizlik

Bu **projenin kalbi** — dedup ve şık ayrıştırması bunlar üzerine kurulu.

### 1. `visualSignature(s: ShapeConfig): string` (`generator.ts`)

"Bu iki şekil **gözle aynı** mı?" sorusunu cevaplar. Rotasyonu simetri fold'una göre normalize eder, params + tüm görsel özellikleri serileştirir.

```ts
const fold = rotationSymmetryFold(s)
const period = 360 / fold
const effRot = Math.round(s.rotation % period)
return `${s.kind}(sz=${s.size},rot=${effRot},sw=${s.strokeWidth},stk=${s.stroke},fill=${s.fill},${params})`
```

### 2. `rotationSymmetryFold(s): number`

Her şekil için N-fold simetri:

| Şekil | Fold | Açıklama |
|---|---|---|
| `annulus` | 360 | Tam simetrik (daireler) |
| `dice` (1,4,5,8,9) | 4 | 90° simetrik |
| `dice` (2,3,6,7) | 2 | 180° simetrik |
| `polygon`, `star`, `petals`, `spike-ring`, `nested-polygon` | `params.X` veya `min(o,i)` | n-fold |
| `arrow`, `hammer` | 1 | Asimetrik |
| `bars` | 2 | Paralel çizgiler 180° simetrik |
| `grid-dots` | 4 (rows==cols) veya 2 | Grid simetri |
| `checkerboard`, `box-lines`, `sector-pie` | 1 | Pattern-bağımlı, konservatif |

### 3. `makeDistinctDistractors(rng, correct, siblings, count)` (`generator.ts`)

Distractor üretirken `visualSignature` çakışma kontrolü. 7 tier'lı candidate pool:

| Tier | Tweak |
|---|---|
| 1 | `paramTweaks(correct, 1)` — primary count ±1 |
| 1.5 | **Hammer için**: markerPos perturbation |
| 2 | Renk değişimi (STROKE_PALETTE) |
| 3 | Büyük size delta (×0.55 veya ×1.25) |
| 4 | `paramTweaks(correct, 2)` |
| 5 | Fill aç/kapat |
| 6 | Rotasyon (sadece fold<4) |
| 7 | strokeWidth ±2-3 |

Tier sırasına göre denenir, ilk benzersiz seçilir.

### 4. `PRIMARY_PARAM` haritası

Her şeklin "ana sayım parametresi" — aritmetik kuralları (addition/subtraction/multiplication) bunu kullanır.

```ts
{ annulus: 'ringCount', dice: 'dotCount', polygon: 'sides',
  star: 'points', petals: 'petalCount', 'spike-ring': 'spikeCount',
  bars: 'barCount', 'grid-dots': 'rows',
  'nested-polygon': 'outerSides', 'sector-pie': 'sectorCount',
  arrow: null, hammer: null, checkerboard: null, 'box-lines': null }
```

`null` olanlar `COUNT_PARAM_SHAPES`'e dahil değil → aritmetik kurallar uygulanmaz.

### 5. `isPuzzleValid(p: PuzzleItem): boolean` (`bulk.ts`)

Tip-aware doğrulama:
- **3×3 dist-of-3**: row 0'da 3 distinct hücre
- **3×3 progression**: hem row 0 hem col 0'da 3 distinct
- **3×3 addition/subtraction/multiplication**: her satır 3 distinct
- **3×3 dist-of-2**: her satır 1 blank + 2 distinct shape
- **odd-one-out**: tam 1 farklı sig, diğer N-1 aynı sig
- **pattern-completion**: `isPatternCompletionValid` (fragment options pairwise distinct)

### 6. Sector-Pie Pattern Encoding (`generator.ts` helpers)

Sektör başına 3 bit, 8 sektör → 24-bit packed number:

```ts
packSectorPatterns(patterns: number[]): number
unpackSectorPatterns(packed: number, count: number): number[]
patternsToFillMask(packed, count): number   // boolean ops için
fillMaskToUniformPatterns(mask, count, patternId=1): number   // sonuç construct
```

Pattern ID'ler: 0=empty, 1=solid, 2=dots, 3=hlines, 4=vlines, 5=diag\\, 6=diag/, 7=cross-hatch.

**Backward compat**: `params.fillMask` (eski) varsa, SectorPie renderer otomatik patterns[1]'e çevirir.

### 7. Blank Cell Sentinel (`dist-of-2` için)

```ts
blankCellConfig(): ShapeConfig   // params.blank = 1, kind='annulus' arbitrarily
isBlankCell(s): boolean           // s.params.blank === 1
```

`PuzzleGrid` blank hücreyi **kesik çerçeve ile boş** render eder.

### 8. Calibrated Difficulty (`difficulty.ts`)

`bulk.ts`'te her üretilen puzzle'a `p.difficulty = calibrateDifficulty(p)` uygulanır. RULE_LOAD + SHAPE_BONUS + optionAdjust formülü.

---

## 🌱 Yeni Şekil Eklemenin Adımları

1. `src/types/puzzle.ts` → `ShapeKind` union'a ekle
2. `src/components/shapes/Foo.tsx` → SVG component'ı
3. `src/components/shapes/Shape.tsx` → import + `case 'foo': return <Foo .../>`
4. `src/logic/generator.ts`:
   - `rotationSymmetryFold` switch'e case
   - `PRIMARY_PARAM` map'e (varsa count param)
   - `SECONDARY_AXES_BY_SHAPE` map'e (size/strokeWidth)
   - `randomBaseShape` switch'e
   - `randomFooVariants(rng)` fonksiyonu yaz
   - `VARIANT_GENERATORS` map'e ekle
   - `pickPrimaryProgression` switch'e
5. `src/logic/bulk.ts`:
   - `ALL_SHAPES`'e ekle
   - (varsa) `COUNT_PARAM_SHAPES`, `DIST_OF_2_SHAPES`, `MIRROR_SHAPES`, `BOOL_OP_SHAPES`, `ROTATION_ONLY_SHAPES`
6. `src/pages/Generate.tsx` → `SHAPE_OPTIONS` dropdown

## 🆕 Yeni Mantık Eklemenin Adımları

1. `src/types/puzzle.ts` → `RuleKind` union'a
2. `src/logic/generator.ts` → `generateRandomFoo3x3()` yaz + export
3. `src/logic/bulk.ts`:
   - SUPPORTED matrisine `[shape, 'foo']` her uyumlu şekil için
   - `bulkGenerate` switch'e case
   - `isPuzzleValid` (kural-spesifik check varsa)
4. `src/pages/Generate.tsx` → `RULE_OPTIONS` dropdown

## 📐 Yeni Puzzle Tipi Eklemenin Adımları

1. `src/types/puzzle.ts` → yeni `XxxPuzzle` interface + PuzzleItem union'a ekle
2. `src/logic/xxx.ts` → ayrı dosyada generator (pattern-completion gibi)
3. `src/components/puzzle/XxxGrid.tsx` veya panel
4. `src/pages/Player.tsx` → `puzzle.type === 'xxx'` branch (render + option panel)
5. `src/pages/Generate.tsx` → önizleme paneline branch
6. `src/pages/Mixer.tsx` → önizleme paneline branch
7. `src/logic/bulk.ts`:
   - SUPPORTED genişle
   - `bulkGenerate` switch
   - `isPuzzleValid` tip-aware extension
   - `puzzleSignature` generator.ts'te tip-aware
8. `src/logic/generator.ts` → `puzzleSignature` switch'e ekle (pattern-completion ve odd-one-out gibi)

---

## ⚠ Bilinen Tuzaklar (önceden çözülmüş hatalar)

1. **Rotation distractor on annulus**: daireler simetrik → `visualSignature` rotasyonu fold'a göre normalize eder
2. **Dice 8-nokta yanlış kategoride**: `DICE_90_SYMMETRIC = {1,4,5,8,9}`, `DICE_180_SYMMETRIC = {2,3,6,7}`
3. **strokeWidth zarda subtle**: dice için `SECONDARY_AXES_BY_SHAPE = ['size']` (strokeWidth hariç). Arrow için de aynı
4. **Aritmetik satırda (1,1,2) ambiguous**: `sampleArithRows` `a≠b≠c` enforce eder
5. **Router state F5'te kaybolur**: Library→Play akışı state ile geçiyor, sayfa yenilenirse puzzles silinir → default samples'a düşer. **TODO**: testId query string'e geçmek
6. **PowerShell npm**: `npm` direkt değil, **`npm.cmd`**
7. **Tailwind v4**: `tailwind.config.js` YOK, `@import "tailwindcss"` + `@theme` CSS'te
8. **Adjacent filled cells in Checkerboard merge**: çözüldü — dolu hücreler %12 inset ile çizilir, dış çerçeve her zaman ayrıntılı görünür
9. **Pattern Completion fillback motif index out-of-bounds**: `pickDistinctFragments` motifCount'la bound'lanır
10. **SectorPie multi-instance SVG pattern ID conflict**: `useId()` ile her instance'a unique prefix
11. **Sector-pie `fillMask` legacy → `sectorPatterns`**: SectorPie renderer ikisini de okur (backward compat). Boolean ops için fillMask binary olarak derive edilir.
12. **`noUnusedLocals: true` TS strict**: import edilip kullanılmayan veya değişken atayıp okunmayan dead code = build hata. Önceden bu yüzden 2 build hatası verdi (`shaftLen`, `randomMotif`, `isDistOf2Compatible`).
13. **dist-of-2 grid-dots/checkerboard'da görsel karışıklık**: bu iki şeklin kendi iç boşluğu blank cell'le çakışıyor → DIST_OF_2_SHAPES listesinden hariç tutuldu (9 net şekil only)
14. **dist-of-2 UI'da gizli**: `Generate.tsx RULE_OPTIONS`'da satır yorum içinde — re-enable için uncomment

---

## 📊 Şu Anki Durum (Faz İlerlemesi)

### Tamamlananlar ✅

- **Faz 1 MVP**: Player, 3×3, identity + dist-of-3, library, mixer, CSV export, deploy
- **Yeni şekiller**: hammer, bars, grid-dots, checkerboard, box-lines, nested-polygon, sector-pie
- **Yeni kurallar**: dist-of-2 (gizli), progression, rotation, multiplication, mirror, AND/OR/XOR/XNOR, pattern-completion, odd-one-out
- **Yeni puzzle tipleri**: pattern-completion, odd-one-out
- **B6 dinamik difficulty kalibrasyonu**
- **Sector-pie per-sektör pattern dolguları** (dots/lines/diagonal/cross-hatch)
- **AND/OR/XOR/XNOR'un hem sector-pie hem checkerboard'da çalışması**
- **Pattern'in UI'da "Pattern" virtual shape olarak coupling'i**
- **GitHub Pages otomatik deploy** çalışıyor

### Kalan İşler ⏳

**Faz A eksikleri (kullanıcı tarafından bilinçli ertelendi)**:
- **A2**: Series (1×N) puzzle tipi — tip union'da var, generator+UI yok
- **A3**: 2×2 puzzle tipi — tip union'da var, generator+UI yok

**Faz C — akademik / portfolyo cilası**:
- **C1**: Analogy (A:B::C:?) puzzle tipi + set-operations kuralı
- **C2**: letter-glyph + wave-line şekilleri + modulo kuralı
- **C3**: Item Analysis Dashboard (Recharts: hover heatmap, RT histogramı, item difficulty grafiği)
- **C4**: IRT estimator (Rasch 1PL parametre tahmini, makale altyapısı)

**Polish**:
- testId-based routing (F5-resilient Library→Play)
- JSON import (kütüphaneye dışarıdan dosya yükleme)
- Tema toggle (dark/light)
- i18n (TR/EN)
- Mobil dokunmatik
- PDF export (yazdırılabilir A4)

---

## 🤝 Kullanıcı ile İletişim Stili

- **Dil**: Türkçe (kullanıcı her zaman Türkçe yazar, Claude da Türkçe cevaplar)
- **Yaklaşım**: "Neden"i istiyor, sadece "ne" değil
- **Tempo**: Hızlı; her adımda görsel doğrulama yapar (ekran görüntüsü gönderir)
- **Push tercihleri**: Bazen "local'de göster, push yok" diye spesifik ister — saygı göster
- **Önemli kontroller**: Kullanıcı sıklıkla "şıklar benzersiz mi?" diye soruyor — `visualSignature` mekanizmasını her yeni özelliğe dahil et
- **Onay döngüsü**: Önemli mimari kararlardan önce `AskUserQuestion` ile sor

---

## 🗺 Mimari Akış Diyagramı

```
                           ┌──────────────────────────┐
                           │      pages/Home.tsx       │
                           │  4 kart navigasyonu      │
                           └─────────┬────────────────┘
                                     │
        ┌──────────────────┬─────────┼─────────┬──────────────────┐
        │                  │         │         │                  │
        ↓                  ↓         ↓         ↓                  ↓
   /generate           /mixer    /library    /play             /editor
        │                  │         │         │              (yer tutucu)
        │                  │         │         │
        │ bulkGenerate     │ getTest │ getTest │ Player render switch
        │                  │         │         │  ├─ 3×3 → PuzzleGrid + OptionPanel
        │                  │         │         │  ├─ pattern-completion → Pattern… + Fragment…
        │                  │         │         │  └─ odd-one-out → (no grid) + OddOneOutPanel
        ↓                  ↓         ↓         ↓
   ┌──────────────────────────────────────────────────┐
   │  logic/bulk.ts — bulkGenerate(spec)              │
   │   ↓                                              │
   │   for-loop generateOne() (rule switch):          │
   │     • generateRandomIdentity                     │
   │     • generateRandomDistOf3                      │
   │     • generateRandomDistOf2                      │
   │     • generateRandomProgression3x3               │
   │     • generateRandomRotation3x3                  │
   │     • generateRandomArithmetic3x3 (+/-/*)        │
   │     • generateRandomMirror3x3                    │
   │     • generateRandomBoolOp3x3 (AND/OR/XOR/XNOR)  │
   │     • generateRandomPatternCompletion            │
   │     • generateRandomOddOneOut                    │
   │   ↓                                              │
   │   calibrateDifficulty(p) → p.difficulty          │
   │   ↓                                              │
   │   isPuzzleValid(p) filter                        │
   │   ↓                                              │
   │   puzzleSignature(p) → Set dedup                 │
   └──────────────────────────────────────────────────┘
        │
        ↓
   ┌──────────────────────────────────────────────────┐
   │  db/dexie.ts — IndexedDB 'cogitem' database      │
   │  tests: { id, name, shape, rule, count, seed,    │
   │           puzzles: PuzzleItem[], createdAt,      │
   │           sources?: MixerSource[] }              │
   └──────────────────────────────────────────────────┘
```

---

## 🎨 CSS Değişkenleri (`index.css`)

```css
--color-bg          #0f0f12
--color-surface     #1a1b22
--color-surface-2   #23252e
--color-border      #2e303a
--color-text        #e4e4e7
--color-text-muted  #9ca3af
--color-accent      #a78bfa
--color-accent-hover #8b5cf6
--color-success     #34d399
--color-danger      #f87171
```

`bg-[var(--color-surface)]` formuyla kullanılır.

### STROKE_PALETTE (mantık renkleri) — `generator.ts`
```
#e4e4e7 (light gray, default)
#a78bfa (purple), #34d399 (green), #f59e0b (amber), #60a5fa (blue)
```

### MOTIF_COLORS (pattern-completion için) — `patternCompletion.ts`
```
#a78bfa #34d399 #f59e0b #60a5fa #ec4899 #06b6d4 #84cc16 #f87171
```

---

## 📜 Önemli Karar Kayıtları

1. **HashRouter** seçildi (BrowserRouter yerine) → GitHub Pages gibi statik sunucularda server-side rewrite gerek değil
2. **Vite `base: './'`** — statik deploy için zorunlu relative paths
3. **Dexie tek satırda denormalize `puzzles[]`** — basit, 1000 puzzle ~150KB
4. **`listTestsMeta`** ayrı endpoint → Library listesi puzzles[] yüklemez (perf)
5. **mulberry32** PRNG — küçük, hızlı, integer-seedable
6. **Pattern Completion ayrı dosya** (`patternCompletion.ts`) — generator.ts'i şişirmemek için
7. **'pattern' UI virtual shape** — ShapeKind union'a eklenmedi (tip kirliliği), Generate.tsx'te lokal `ShapeUiValue` tipi
8. **Sector-pie patterns 3-bit/sektör encoding** — array yerine packed number (params: Record<string,number> kısıtı)
9. **Blank cell sentinel `params.blank = 1`** — `cells: (ShapeConfig | null)[][]` yerine (tip değişikliği invasive olurdu)
10. **'pattern' shape'i `effectiveShape: 'polygon'`'a substitute** — bulkGenerate ShapeKind beklediği için
11. **`useId()` SVG pattern ID'leri için** — React 18+ hook, multi-instance unique
12. **B6 difficulty bulk.ts'te override** — her generator ayrı difficulty veriyor, merkezi kalibrasyon ile bypass
13. **Boolean ops sector-pie + checkerboard** — bit-mask carrier'lar; diğer şekiller count-based
14. **dist-of-2 UI'da gizli** ama implementasyon kalıyor — kullanıcı erteledi

---

## 🚀 Yeni Bir Oturuma Başlarken (Claude için)

1. **Bu dosyayı sonuna kadar oku.**
2. `src/types/puzzle.ts` → veri modeli
3. `src/logic/generator.ts` → `visualSignature`, `rotationSymmetryFold`, `makeDistinctDistractors`, `PRIMARY_PARAM` — sistemin kalbi
4. `src/logic/bulk.ts` → SUPPORTED matrix + `isPuzzleValid` — orchestration
5. Kullanıcı isteğini anla (Türkçe). Yeni şekil mi, kural mı, format mı?
6. "Yeni X Ekleme Adımları" listelerini takip et
7. **`npm.cmd run build`** ile TypeScript doğrula
8. Her yeni özellikten sonra **görsel uniqueness'i kullanıcıya doğrulat**
9. Push politikası: kullanıcı "push" demedikçe `git push` yapma, sadece local commit
10. Commit mesajları başına faz/madde belirt (ör. "B5: Add odd-one-out")

---

## 📦 Eklenmeyen Ama Önemli Olabilecek

- **Test coverage** yok — manuel test ediyoruz
- **Lint** kurulu (`npm.cmd run lint`) ama her commit'te çağırılmıyor
- **CI tests** yok — sadece GitHub Actions build+deploy
- **Type-safe SUPPORTED**: array literal, exhaustive değil — yanlış kombinasyon eklenirse runtime fark eder
- **i18n**: tüm string'ler Türkçe hardcode

---

**Son güncelleme**: ~~14 Mayıs 2026~~ (kullanıcı compact yapacak, bu commit'e bak)
**Son commit**: `b8a8670` (Bool ops + checkerboard)
**Toplam local commit**: 8+ (Faz B'nin tamamı)
