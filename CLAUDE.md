# NeoCorvus — Claude'a Notlar

> Bu dosya yeni bir Claude oturumunun **projeye 5 dakikada vakıf olmasını** sağlamak için yazıldı. Aşağıdan kronolojik (özet → detay) okumayı öner.

---

## 🎯 30 Saniyelik Özet

**NeoCorvus**, Raven Progressive Matrices tarzı non-verbal bilişsel testlerin **modern, tarayıcı-yerel** üreticisi ve oynatıcısı. [Isaac Thimbleby'nin Corvus](https://github.com/Thimbleby/Corvus) projesinden esinlenmiş, sıfırdan React + TypeScript ile yeniden yazılmış.

- **Kullanıcı**: Türkçe konuşur, portfolyo projesi olarak geliştiriyor
- **Hedef**: Tek tıkla binlerce benzersiz soru üretebilen, tarayıcıda çalışan, paylaşılabilir bir test platformu
- **Backend yok**: Tüm veri IndexedDB'de (Dexie)
- **Konum**: `C:\Users\tekno\Desktop\neocorvus`

---

## ⚙️ Geliştirme Ortamı

| | |
|---|---|
| **Node** | v22 |
| **npm** | v10 — ⚠ PowerShell execution policy yüzünden **her zaman `npm.cmd` kullan** (`npm` doğrudan çalışmaz) |
| **OS** | Windows (path'lerde `\` kullan) |
| **IDE bağlamı** | Çalışma dizini genelde `C:\Users\tekno\Desktop\Corvus-master` (Corvus orijinali). Proje farklı klasörde: `C:\Users\tekno\Desktop\neocorvus`. Çoğu komutta `Set-Location` ile geçmek gerekir. |

### Komutlar

```powershell
# Proje köküne git
Set-Location C:\Users\tekno\Desktop\neocorvus

npm.cmd run dev      # Vite dev server (http://localhost:5173, HashRouter kullanır → #/play etc.)
npm.cmd run build    # tsc + vite build → dist/
npm.cmd run preview  # Production build önizleme
```

---

## 🛠 Tech Stack

| Paket | Versiyon | Niye |
|---|---|---|
| **Vite** | 8 | Hızlı dev, kolay deploy |
| **React** | 19 | UI |
| **TypeScript** | 5.x | Tip güvenliği (özellikle ShapeKind/RuleKind union'larında kritik) |
| **Tailwind CSS** | v4 | `@import "tailwindcss"` + `@theme { ... }` — config dosyası yok |
| **React Router** | 7 | **HashRouter** (statik deploy uyumlu) |
| **Zustand** | latest | Kurulu ama henüz kullanılmıyor (gelecek Editor için) |
| **Dexie** | latest | IndexedDB CRUD |
| **PapaParse** | latest | CSV export |

---

## 📁 Klasör Yapısı

```
neocorvus/
├── CLAUDE.md                    ← BURASI
├── README.md
├── package.json
├── vite.config.ts               ← Tailwind plugin + base: './'
├── src/
│   ├── App.tsx                  ← HashRouter + routes
│   ├── main.tsx
│   ├── index.css                ← Tailwind import + @theme renkleri
│   ├── types/
│   │   └── puzzle.ts            ← Tüm veri modelleri (ShapeKind, RuleKind, PuzzleItem)
│   ├── components/
│   │   ├── shapes/              ← Her şekil için SVG bileşeni
│   │   │   ├── Shape.tsx        ← Dispatcher (kind → component)
│   │   │   ├── Annulus.tsx, Dice.tsx
│   │   │   ├── Polygon.tsx, Star.tsx, Arrow.tsx
│   │   │   └── Petals.tsx, SpikeRing.tsx
│   │   └── puzzle/
│   │       ├── PuzzleGrid.tsx   ← 3×3 + ? render
│   │       └── OptionPanel.tsx  ← Cevap şıkları
│   ├── pages/
│   │   ├── Home.tsx             ← 4 ana navigasyon kartı
│   │   ├── Player.tsx           ← Test oynatıcı + CSV export
│   │   ├── Generate.tsx         ← Bulk üretim UI
│   │   ├── Mixer.tsx            ← Çoklu kaynaktan rastgele örnekleme
│   │   ├── Library.tsx          ← Kaydedilmiş testler
│   │   └── Editor.tsx           ← Faz 2 placeholder
│   ├── logic/
│   │   ├── generator.ts         ← TÜM rule generators (büyük dosya, en kritik)
│   │   ├── bulk.ts              ← bulkGenerate, SUPPORTED matrix, isPuzzleValid
│   │   └── rng.ts               ← mulberry32 PRNG
│   ├── db/
│   │   └── dexie.ts             ← IndexedDB schema + CRUD
│   ├── store/                   ← (boş — Zustand gelecekte)
│   └── utils/
│       └── csv.ts               ← AnswerLog → CSV download
```

---

## 🧬 Veri Modeli (types/puzzle.ts)

### ShapeKind
```ts
type ShapeKind =
  | 'annulus'      // iç içe halkalar
  | 'dice'         // zar yüzü (1-9 nokta)
  | 'polygon'      // düzgün çokgen (3-8 kenar)
  | 'star'         // n-köşeli yıldız (4-10)
  | 'arrow'        // yönlü ok
  | 'petals'       // çiçek (3-12 yaprak)
  | 'spike-ring'   // dikenli halka (4-16 diken)
  | 'box-lines'    // legacy Corvus (henüz implement edilmedi)
```

### RuleKind
```ts
type RuleKind =
  | 'identity'      // hepsi aynı  (DONE)
  | 'dist-of-3'     // Latin karesi 3 varyant   (DONE)
  | 'dist-of-2'     // 2 varyant + boş hücre    (TODO)
  | 'addition'      // col0 + col1 = col2       (DONE)
  | 'subtraction'   // col0 − col1 = col2       (DONE)
  | 'progression'   // iki eksenli artış         (DONE)
  | 'and' | 'or' | 'xor' | 'xnor'  // (TODO — bit-pattern mantığı)
```

### ShapeConfig
```ts
interface ShapeConfig {
  kind: ShapeKind
  size: number          // 0–1
  rotation: number      // 0–360
  fill: string | null   // CSS color veya null
  stroke: string        // CSS color
  strokeWidth: number   // px (size=1'de)
  params: Record<string, number>   // ringCount / dotCount / sides / points / petalCount / spikeCount / ...
}
```

### Matrix3x3Puzzle
```ts
interface Matrix3x3Puzzle {
  id: string
  type: '3x3'
  rule: RuleKind
  shape: ShapeKind
  cells: ShapeConfig[][]       // 3×3, cells[2][2] = "?" olarak render edilir
  options: ShapeConfig[]       // 4 cevap şıkkı (1 doğru + 3 distractor)
  correctIndex: number
  optionCount: number
  difficulty: 1 | 2 | 3 | 4 | 5
}
```

### SavedTest (Dexie)
```ts
interface SavedTest {
  id?: number                       // auto-increment
  name: string
  description?: string
  shape: ShapeKind | 'mixed'        // 'mixed' = Mixer-built test
  rule: RuleKind | 'mixed'
  count: number
  seed: number
  puzzles: Matrix3x3Puzzle[]
  createdAt: number
  sources?: MixerSource[]           // Mixer ile yapılanlar için: kaynak testler + çekilen sayılar
}

interface MixerSource {
  testId: number
  testName: string
  drawn: number
}
```

---

## 🧠 Kritik Kavramlar — Şıkların Benzersizliği

Bu projenin **en zor problemi** ve en titiz çözülen yeri burası. Yeni Claude'un bunu kavraması şart.

### 1. `visualSignature(s: ShapeConfig): string`

"İki şekil **gözle aynı** mı?" sorusunu cevaplar. Rotasyonu **simetri fold'una göre normalize eder**:

```ts
const fold = rotationSymmetryFold(s)
const period = 360 / fold
const effRot = Math.round(s.rotation % period)
return `${s.kind}(sz=${s.size},rot=${effRot},sw=${s.strokeWidth},stk=${s.stroke},fill=${s.fill},${params})`
```

### 2. `rotationSymmetryFold(s): number`

Her şekil için N-fold simetri değerini döner:

| Şekil | Fold | Açıklama |
|---|---|---|
| annulus | 360 | Tam simetrik (daireler) → rotasyon görünmez |
| dice (1,4,5,8,9 nokta) | 4 | 90° simetrik |
| dice (2,3,6,7 nokta) | 2 | Sadece 180° simetrik |
| polygon | `params.sides` | n-fold |
| star | `params.points` | n-fold |
| arrow | 1 | Asimetrik (yön matters!) |
| petals | `params.petalCount` | n-fold |
| spike-ring | `params.spikeCount` | n-fold |

> ⚠ Yeni şekil eklerken bu listeyi MUTLAKA güncelle.

### 3. `makeDistinctDistractors(rng, correct, siblings, count)`

Distractor üretirken çakışma yapanı atar. Sırasıyla:
1. Siblings (zaten dağıtılan varyantlar) → eklenir
2. `candidatePerturbations(correct)`'tan **tier sırasıyla** dene (Tier 1 → Tier 7)
3. Her aday için `visualSignature` çakışıyor mu? Hayır ise ekle.

### 4. `candidatePerturbations` — 7 Tier

| Tier | Tweak | Görsel etki |
|---|---|---|
| 1 | `paramTweaks(correct, 1)` — primary ±1 | En yüksek |
| 2 | Renk değişimi | Çok belirgin |
| 3 | Boyut ×0.55 veya ×1.25 | Belirgin |
| 4 | `paramTweaks(correct, 2)` — primary ±2 | Belirgin |
| 5 | Dolgu aç/kapat | Orta |
| 6 | Rotasyon (sadece fold < 4) | Şekle bağlı |
| 7 | strokeWidth | En subtle |

`makeDistinctDistractors` artık **karıştırma yapmaz** — sırayla geçer, böylece Tier 1 her zaman önce denenir.

### 5. `PRIMARY_PARAM` Haritası

Her şeklin "ana sayım parametresi":

```ts
const PRIMARY_PARAM: Record<ShapeKind, { name, min, max } | null> = {
  annulus:      { name: 'ringCount',  min: 1, max: 4  },
  dice:         { name: 'dotCount',   min: 1, max: 9  },
  polygon:      { name: 'sides',      min: 3, max: 8  },
  star:         { name: 'points',     min: 4, max: 10 },
  petals:       { name: 'petalCount', min: 3, max: 12 },
  'spike-ring': { name: 'spikeCount', min: 4, max: 16 },
  arrow:        null,   // count param yok, rotation primary
  'box-lines':  null,
}
```

> Aritmetik (addition/subtraction) sadece `null` olmayan şekillerde çalışır.

### 6. `SECONDARY_AXES_BY_SHAPE` (Progression için)

Progression kuralında **secondary axis** (satır eksen) seçimi şekil-aware:

```ts
{
  annulus:      ['size', 'strokeWidth'],
  dice:         ['size'],                // strokeWidth zarda subtle, hariç
  polygon:      ['size', 'strokeWidth'],
  star:         ['size', 'strokeWidth'],
  arrow:        ['size'],                // strokeWidth ok'ta subtle, hariç
  petals:       ['size', 'strokeWidth'],
  'spike-ring': ['size', 'strokeWidth'],
}
```

### 7. `isPuzzleValid(p)` — Son Güvenlik Ağı

bulk.ts'te. Her bulmaca kaydedilmeden önce:

```ts
// 1. Şıklar pairwise distinct (visualSignature ile)
// 2. dist-of-3: row 0 = 3 distinct
// 3. progression: row 0 VE col 0 = 3 distinct (her iki eksen görünür)
// 4. addition/subtraction: her satır = 3 distinct (a≠b≠c)
```

Eşleşme varsa bulmaca **atılır, yenisi denenir**.

---

## 🌱 Yeni Şekil Eklemenin 11 Adımı

1. `src/types/puzzle.ts` → `ShapeKind` union'a ekle
2. `src/components/shapes/Foo.tsx` → SVG bileşeni yaz
3. `src/components/shapes/Shape.tsx` → dispatcher switch'e ekle
4. `src/logic/generator.ts`:
   - `randomFooVariants(rng)` fonksiyonu (4 farklı axis için switch)
   - `VARIANT_GENERATORS` map'e ekle
   - `PRIMARY_PARAM` map'e ekle (varsa count param)
   - `rotationSymmetryFold` switch'e ekle
   - `SECONDARY_AXES_BY_SHAPE` map'e ekle
   - `randomBaseShape` switch'e ekle
   - `pickPrimaryProgression` switch'e ekle (progression desteği için)
5. `src/logic/bulk.ts` → `ALL_SHAPES` ve (count varsa) `COUNT_PARAM_SHAPES`'e ekle
6. `src/pages/Generate.tsx` → `SHAPE_OPTIONS` dropdown'a ekle

---

## 🆕 Yeni Mantık Eklemenin 5 Adımı

1. `src/types/puzzle.ts` → `RuleKind` union'a ekle
2. `src/logic/generator.ts` → `generateRandomFoo3x3()` yaz
3. `src/logic/bulk.ts`:
   - `SUPPORTED` matrix'e ekle
   - `bulkGenerate` switch'e case ekle
   - `isPuzzleValid` genişlet (kurala özgü doğrulama)
4. `src/pages/Generate.tsx` → `RULE_OPTIONS` dropdown'a ekle

---

## ⚠ Bilinen Tuzaklar (önceden çözülmüş hatalar)

1. **Rotation distractor on annulus** — daireler simetrik, 90° döndürme görünmez. Çözüm: `rotationSymmetryFold` ile normalize.
2. **8-nokta zar yanlış kategorideydi** — dış halka 90° simetrik, ama eski kod 180° sayıyordu. Çözüm: `DICE_90_SYMMETRIC = {1,4,5,8,9}`.
3. **strokeWidth on dice subtle** — sadece dış çerçeve kalınlığını değiştirir, nokta boyutu sabit. Çözüm: zar için `SECONDARY_AXES_BY_SHAPE` listesinden çıkarıldı.
4. **Aritmetik satırda (1,1,2) ambiguous** — "toplama" mı "ikiye katlama" mı? Çözüm: `sampleArithRows` `a≠b≠c` enforce eder.
5. **Router state F5'te kaybolur** — Library→Play akışı state ile geçiyor, sayfa yenilenirse puzzles silinir, default samples'a düşer. **TODO**: testId query string'e geçmek.
6. **PowerShell npm script blocking** — `npm` direkt çalışmaz, `npm.cmd` kullan.
7. **Tailwind v4 syntax** — `tailwind.config.js` yok, `@import "tailwindcss"` + `@theme { ... }` CSS'te.

---

## 📊 Şu Anki Durum

### ✅ Tamamlanmış
- 7 şekil tam çalışıyor
- 5 mantık tam çalışıyor: identity, dist-of-3, progression, addition, subtraction
- Tohumlu (seed-based) bulk üretim → reproducible
- `visualSignature` + `makeDistinctDistractors` + `isPuzzleValid` üçlüsü → görsel uniqueness garantor
- IndexedDB kütüphanesi: save, list, delete, export JSON, replay
- Generate → Library → Play akışı
- **Mixer**: Çoklu kaynak testten N'er soru rastgele çekip karışık test oluşturma. Aynı tohumla aynı karışım reproducible. Karışık test "mixed" shape/rule ile kaydedilir, sources[] ile kaynak izi tutulur.
- Player: hover tracking + süre ölçümü + CSV export
- ~32,000+ benzersiz soru üretebilir

### 🚧 Yapılacaklar (öncelik sırasıyla)

| Görev | Etki | Çaba |
|---|---|---|
| **testId query string** ile Play sayfası F5-resilient hale | 🔥 | ⚡ |
| **GitHub Pages deploy** | 🔥🔥🔥 | ⚡ |
| **JSON Import** kütüphaneye | 🔥 | ⚡ |
| **Dashboard** (Recharts grafik + hover heatmap) | 🔥🔥 | ⚡⚡ |
| **Editor** (WYSIWYG tek soru) | 🔥 | ⚡⚡⚡ |
| **2×2, Seri, Tek-farklı** bulmaca tipleri | 🔥🔥 | ⚡⚡⚡ |
| **Dist-of-2** (blank cell desteği) | 🔥 | ⚡⚡ |
| **AND/OR/XOR** mantığı (bit-pattern üzerinden) | 🔥 | ⚡⚡⚡ |
| **Mirror / Rotation Progression** kuralları | 🔥 | ⚡⚡ |
| **Box-lines** şekli (legacy Corvus) | 🔥 | ⚡⚡ |
| **PDF export** (yazdırılabilir A4) | 🔥 | ⚡⚡ |
| **i18n** (TR/EN dil seçici) | 🔥 | ⚡⚡ |
| **Tema toggle** (dark/light) | 🔥 | ⚡ |
| **Mobil dokunmatik** | 🔥 | ⚡⚡ |

---

## 🤝 Kullanıcı ile İletişim Stili

- **Dil**: Türkçe (Claude da Türkçe cevaplar)
- **Yaklaşım**: Kullanıcı "neden"i anlamak ister, sadece "ne" yetmez
- **Tempo**: Hızlı ilerlemeyi sever; her adımda görsel doğrulama yapar
- **İzlenmesi gereken davranış**: Yeni özellik eklerken hep "şıklar benzersiz mi?" sorusuna geri döner — `visualSignature` kontrolünü ihmal etme
- **Ekran görüntüsü ile debug** — kullanıcı genelde sorunu screenshot ile gösterir, kodda root cause bulmak gerek

---

## 🗺 Mimari Diyagram

```
┌─────────────────────────────────────────────────────────┐
│  src/pages/                                             │
│  Home → Player ←──────┐                                 │
│   │      ↑            │                                 │
│   │      │ router     │ "Oyna" + state                  │
│   │      │ state      │                                 │
│   ↓      │            ↑                                 │
│  Generate ───────→ Library                              │
│   │                  ↑                                  │
│   │ "Kaydet"          │ listTestsMeta + getTest         │
│   ↓                  │                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ src/db/dexie.ts — IndexedDB                          │
│  │ tests: { id, name, shape, rule, count, seed,         │
│  │          puzzles, createdAt }                         │
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  Generate butonu →                                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │ src/logic/bulk.ts — bulkGenerate(spec)               │
│  │   ↓ for-loop until count                              │
│  │   src/logic/generator.ts                              │
│  │     • generateRandomIdentity                          │
│  │     • generateRandomDistOf3                           │
│  │     • generateRandomProgression3x3                    │
│  │     • generateRandomArithmetic3x3                     │
│  │       ↓ each uses                                     │
│  │     • randomBaseShape(kind, rng)                      │
│  │     • makeDistinctDistractors                         │
│  │     • visualSignature                                 │
│  │   ↓ filter via                                        │
│  │   isPuzzleValid(p)                                    │
│  │   ↓ dedup via                                         │
│  │   puzzleSignature(p) set                              │
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Stil Kuralları (CSS değişkenleri)

`src/index.css`'te `@theme` bloğu ile tanımlı:

```css
--color-bg          #0f0f12   (sayfa arkaplanı)
--color-surface     #1a1b22   (kart arkaplanı)
--color-surface-2   #23252e   (iç kart/hücre)
--color-border      #2e303a
--color-text        #e4e4e7
--color-text-muted  #9ca3af
--color-accent      #a78bfa   (mor — primary CTA)
--color-accent-hover #8b5cf6
--color-success     #34d399   (yeşil — doğru cevap)
--color-danger      #f87171   (kırmızı — yanlış cevap)
```

> Tailwind class'ında `bg-[var(--color-surface)]` formuyla kullanılıyor. Stil tutarlılığı için yeni renkler eklerken bu blokta tanımla.

---

## 📜 Önemli Karar Kayıtları

1. **HashRouter > BrowserRouter** — GitHub Pages gibi statik sunucularda server-side rewrite gerektirmez. `#/play`, `#/generate` gibi URL'ler.
2. **Vite `base: './'`** — relative path build, statik deploy için zorunlu.
3. **Dexie tek satırda denormalize puzzles[]** — 1000 puzzle'lık bir test ~150KB. IndexedDB rahat kaldırır. Tek sorguda yüklenir.
4. **`listTestsMeta` ayrı endpoint** — Library liste sayfası `puzzles[]` yüklemez, sadece metadata. Play tıklanınca `getTest(id)` ile full row çekilir.
5. **mulberry32 PRNG** — küçük, hızlı, integer-seedable. Reproducibility için kritik.
6. **rule-specific distractors yerine generic** — `makeDistinctDistractors` her kural için aynı şekilde çalışır, sadece "siblings" parametresi farklı sağlanır (örn. progression için grid neighbors).

---

## 🚀 Yeni Bir Oturuma Başlarken (Claude için)

1. **Önce bu dosyayı sonuna kadar oku.**
2. `src/types/puzzle.ts`'i oku — tüm veri modeli orada.
3. `src/logic/generator.ts`'in başını ve `rotationSymmetryFold`, `visualSignature`, `makeDistinctDistractors`'ı oku — sistemin kalbi.
4. Kullanıcının ne istediğini anla; "yeni şekil" mi yoksa "yeni mantık" mı, ya da başka bir şey mi.
5. Yukarıdaki "Yeni Şekil/Mantık Ekleme" kontrol listelerini takip et.
6. Build doğrula (`npm.cmd run build`) — TypeScript hataları yakalanır.
7. Kullanıcıya tarayıcıda nasıl test edeceğini söyle (genelde `/generate`'te seed verip preview'da gez).
8. Şıkların görsel olarak benzersiz olduğunu kullanıcıya **özellikle doğrulat** — bu projenin en hassas noktası.
