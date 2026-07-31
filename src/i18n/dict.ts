/**
 * TR → EN dictionary. Turkish UI strings are the canonical keys; `t()` looks
 * up the English translation and falls back to the key itself (so untranslated
 * strings render as Turkish instead of breaking).
 *
 * Template strings use {placeholders}, replaced by t() after lookup.
 */
export const DICT: Record<string, string> = {
  // ── Home ──
  'non-verbal bilişsel test platformu. Görsel-mantıksal bulmacaları üret, karıştır, oynat. Binlerce benzersiz soru, tek tıkla.':
    'a non-verbal cognitive testing platform. Generate, mix, and play visual-logic puzzles. Thousands of unique items in one click.',
  'Teste Başla': 'Start Test',
  'Hazır örnek sorularla testi dene. Sonuçları CSV olarak indir.':
    'Try the test with sample items. Download results as CSV.',
  'Toplu Üret': 'Bulk Generate',
  'Şekil + kural + adet seç → binlerce benzersiz soruyu tek seferde üret.':
    'Pick a shape + rule + count → generate thousands of unique items at once.',
  'Özel Soru Oluştur': 'Design an Item',
  'Hücre hücre elle tasarla. Şekil, renk, döndürme, parametreler — tam kontrol.':
    'Hand-craft cell by cell. Shape, color, rotation, parameters — full control.',
  'Karışık Test': 'Mixed Test',
  "Birden çok testten N'er soru çek, karışık bir test yap.":
    'Draw N items from multiple tests to build a mixed test.',
  'Kütüphane': 'Library',
  'Kaydettiğin testler. Tekrar oyna, JSON indir, sil.':
    'Your saved tests. Replay, download JSON, delete.',
  '15 şekil · 18 kural · 6 soru tipi · manuel editör · tohumlu toplu üretim · CSV dışa aktarım':
    '15 shapes · 18 rules · 6 item types · manual editor · seeded bulk generation · CSV export',

  // ── Player ──
  'Örnek Test': 'Sample Test',
  'Test Tamamlandı': 'Test Complete',
  'Skor:': 'Score:',
  'Doğru': 'Correct',
  'Süre': 'Time',
  'Hover sayısı': 'Hovers',
  '{s} sn': '{s} s',
  'CSV İndir': 'Download CSV',
  'Ana Sayfa': 'Home',
  '← Ana Sayfa': '← Home',
  'Soru {n} / {total}': 'Item {n} / {total}',
  'Bu soruyu atla': 'Skip this item',
  'Bu puzzle tipi henüz desteklenmiyor: {type}': 'This puzzle type is not supported yet: {type}',
  'Boş alanı dolduran fragment hangisi?': 'Which fragment completes the empty area?',
  'Diğerlerinden farklı olan hangisi?': 'Which one is different from the others?',
  'Bu yapı oktaki yönden bakıldığında hangi silüetle eşleşir?':
    'Viewed from the arrow direction, which silhouette matches this structure?',
  'Bu şeklin verilen eksendeki ayna görüntüsü hangisidir?':
    'Which is the mirror image of this shape across the given axis?',
  'Kağıt açılınca delikler hangi düzende ortaya çıkar?':
    'When the paper is unfolded, where do the holes appear?',
  'Sağdaki seçeneklerden eksik hücreye uyanı seç:':
    'Pick the option that fits the missing cell:',
  'Bitir': 'Finish',
  'Sonraki Soru →': 'Next Item →',

  // ── Generate: shape labels ──
  'Annulus (Halkalar)': 'Annulus (Rings)',
  'Dice (Zar)': 'Dice',
  'Polygon (Çokgen)': 'Polygon',
  'Star (Yıldız)': 'Star',
  'Arrow (Ok)': 'Arrow',
  'Petals (Çiçek)': 'Petals',
  'Spike Ring (Dikenli Halka)': 'Spike Ring',
  'Hammer (Çekiç + Marker)': 'Hammer (+ corner marker)',
  'Bars (Paralel Çizgi)': 'Bars (Parallel Lines)',
  'Grid-Dots (Nokta Izgarası)': 'Grid Dots',
  'Checkerboard (Dolu/Boş Kareler)': 'Checkerboard (Filled/Empty Cells)',
  'Box-Lines (Kutu + İç Çizgiler)': 'Box Lines (Box + Inner Lines)',
  'Nested Polygon (İç İçe Çokgen)': 'Nested Polygon',
  'Sector Pie (Pasta Dilim)': 'Sector Pie',
  'Pattern (Renkli Motif Deseni)': 'Pattern (Colored Motif Grid)',
  'Cube Stack (3D Blok Yığını)': 'Cube Stack (3D Blocks)',
  'Block Letter (Asimetrik F/L/T Glyph)': 'Block Letter (Asymmetric F/L/T Glyph)',
  'Reflection (Otomatik karmaşık şekiller)': 'Reflection (Auto asymmetric shapes)',
  'Paper Folding (Kağıt Katlama)': 'Paper Folding',

  // ── Generate: rule labels ──
  'Identity — hepsi aynı': 'Identity — all cells identical',
  'Distribution-of-3 — Latin karesi': 'Distribution-of-3 — Latin square',
  'Progression — iki eksenli artış': 'Progression — two-axis increase',
  'Rotation — saf dönüş (sadece Arrow/Hammer)': 'Rotation — pure rotation (Arrow/Hammer only)',
  "Mirror — satır 2 = satır 0'ın aynası (asimetrik şekiller)":
    'Mirror — row 2 mirrors row 0 (asymmetric shapes)',
  'AND — col0 ∧ col1 = col2 (Sector Pie veya Checkerboard)':
    'AND — col0 ∧ col1 = col2 (Sector Pie or Checkerboard)',
  'OR — col0 ∨ col1 = col2 (Sector Pie veya Checkerboard)':
    'OR — col0 ∨ col1 = col2 (Sector Pie or Checkerboard)',
  'XOR — col0 ⊻ col1 = col2 (Sector Pie veya Checkerboard)':
    'XOR — col0 ⊻ col1 = col2 (Sector Pie or Checkerboard)',
  'XNOR — ¬(col0 ⊻ col1) = col2 (Sector Pie veya Checkerboard)':
    'XNOR — ¬(col0 ⊻ col1) = col2 (Sector Pie or Checkerboard)',
  'Odd-One-Out — farklı olanı bul': 'Odd-One-Out — find the different one',
  'Pattern Completion — boş yere ne gelir?': 'Pattern Completion — what fills the gap?',
  'Cube Projection — 3D yapıdan 2D silüet': 'Cube Projection — 2D silhouette of a 3D structure',
  'Reflection — ayna görüntüsünü bul (sadece asimetrik şekiller)':
    'Reflection — find the mirror image (asymmetric shapes only)',
  'Paper Folding — kağıt katlama, delikler nereye gelir?':
    'Paper Folding — fold & punch, where do the holes go?',

  // ── Generate: page ──
  'Toplu Soru Üretimi': 'Bulk Item Generation',
  'Şekil': 'Shape',
  'Mantık': 'Rule',
  'Adet': 'Count',
  'Tohum (seed)': 'Seed',
  'Aynı seed = aynı sorular. Boş bırakırsan rastgele.':
    'Same seed = same items. Leave empty for random.',
  'örn. 42': 'e.g. 42',
  '⚠ Bu kombinasyon henüz desteklenmiyor.': '⚠ This combination is not supported yet.',
  'Bu kombinasyon henüz desteklenmiyor: {combo}': 'This combination is not supported yet: {combo}',
  'Üretiliyor…': 'Generating…',
  '{count} soru üret': 'Generate {count} items',
  'JSON İndir': 'Download JSON',
  'Kütüphaneye Kaydet': 'Save to Library',
  'Test ismi': 'Test name',
  'örn. annulus-progression-100': 'e.g. annulus-progression-100',
  'Kaydediliyor…': 'Saving…',
  'Kaydet': 'Save',
  'İptal': 'Cancel',
  'Test tarayıcının IndexedDB veritabanında saklanır.':
    "Tests are stored in your browser's IndexedDB.",
  'Kütüphanede görüntüle →': 'View in Library →',
  'Bir isim gerekli': 'A name is required',
  '✓ "{name}" kütüphaneye eklendi': '✓ "{name}" added to the library',
  'Hata: {msg}': 'Error: {msg}',
  'Kütüphaneye git →': 'Go to Library →',
  'Üretildi': 'Generated',
  'Yinelenmiş atlandı': 'Duplicates skipped',
  'Geçersiz atlandı': 'Invalid skipped',
  'Toplam deneme': 'Total attempts',
  'ℹ Parametre uzayı tükendi — daha fazla soru üretmek için ek varyasyon eksenleri gerekir (renk paleti, ek şekiller, daha geniş döndürme aralığı).':
    'ℹ Parameter space exhausted — generating more items would need extra variation axes (color palette, more shapes, wider rotation range).',
  'Önizleme': 'Preview',
  'Rastgele': 'Random',
  'Odd-One-Out: tüm seçenekler sağda gösteriliyor': 'Odd-One-Out: all options are shown on the right',
  'Cevap şıkları (doğru:': 'Answer options (correct:',

  // ── Library ──
  '"{name}" silinsin mi?': 'Delete "{name}"?',
  'Test bulunamadı (silinmiş olabilir).': 'Test not found (it may have been deleted).',
  '+ Yeni test üret': '+ Generate new test',
  'Yükleniyor…': 'Loading…',
  'Henüz kaydedilmiş test yok.': 'No saved tests yet.',
  'İlk testini üret': 'Generate your first test',
  'İsim': 'Name',
  'Kural': 'Rule',
  'Tarih': 'Date',
  'İşlemler': 'Actions',
  'Mixer ile yapıldı': 'Built with the Mixer',
  'Oyna': 'Play',
  'Sil': 'Delete',
  "Kütüphane bu tarayıcıda IndexedDB'de saklanır. Farklı tarayıcı/cihazda görünmez. Paylaşmak için JSON olarak dışa aktarın.":
    "The library lives in this browser's IndexedDB — it won't appear in other browsers or devices. Export as JSON to share.",

  // ── Mixer ──
  'Karışık Test Oluştur': 'Build a Mixed Test',
  'Kütüphane →': 'Library →',
  'Kütüphanedeki testlerden istediğin kadar soru çekip yeni bir karışık test oluştur. Farklı şekil ve mantıklardan örnekleyerek kademeli bir zorluk eğrisi yapabilirsin.':
    'Draw any number of items from your library tests to build a new mixed test. Sample across shapes and rules to create a graded difficulty curve.',
  'Henüz kaydedilmiş test yok. Önce kütüphaneye birkaç test eklemelisin.':
    'No saved tests yet. Add a few tests to the library first.',
  'Test üretmeye git': 'Go generate tests',
  'Havuz': 'Pool',
  'Kaç çek?': 'Draw?',
  'Tohum (opsiyonel) — aynı tohum = aynı karışım': 'Seed (optional) — same seed = same mix',
  'Seçilen:': 'Selected:',
  'kaynak,': 'sources,',
  'soru': 'items',
  'Karıştırılıyor…': 'Mixing…',
  'Karıştır': 'Mix',
  'Karışım Hazır': 'Mix Ready',
  'Toplam soru': 'Total items',
  'Kaynak sayısı': 'Sources',
  'Tohum': 'Seed',
  'Kaynaklar:': 'Sources:',
  'Kaydet & Oyna': 'Save & Play',
  'Sadece Oyna': 'Just Play',
  'İsim gerekli': 'Name required',
  '✓ "{name}" kaydedildi': '✓ "{name}" saved',
  'Mixer ({n} soru)': 'Mixer ({n} items)',

  // ── Editor ──
  'Editör': 'Editor',
  'Hücre hücre soru tasarla. Her hücreye tıkla, sağ panelden ayarla. Sağ alt hücre cevap.':
    'Design an item cell by cell. Click any cell, tune it in the right panel. The bottom-right cell is the answer.',
  'Soru Izgarası — tıkla & düzenle': 'Item Grid — click & edit',
  'Doğru cevap hücresi': 'Correct-answer cell',
  '✓ cevap': '✓ answer',
  '📋 Seçiliyi tümüne uygula': '📋 Apply selected to all',
  'Seçili hücreyi 9 yere kopyala (identity başlangıç)': 'Copy the selected cell to all 9 (identity start)',
  '🎲 Tümünü rastgele': '🎲 Randomize all',
  'Tüm hücreleri rastgele yap (aynı şekil, farklı parametreler)':
    'Randomize all cells (same shape, different parameters)',
  '↺ Sıfırla': '↺ Reset',
  'Hepsini varsayılan başlangıca döndür': 'Reset everything to the default start',
  'Oynanma Önizlemesi': 'Play Preview',
  "Test adı (ör. 'Yıldız Döndürme Soru #1')": "Test name (e.g. 'Star Rotation Item #1')",
  '💾 Kaydet': '💾 Save',
  'Lütfen bir test adı gir.': 'Please enter a test name.',
  'Kaydedildi (id={id}). Kütüphaneden oynayabilirsin.':
    'Saved (id={id}). You can play it from the Library.',
  "Kaydedilince Kütüphane sayfasından oynayabilir ya da Karışık Test'e dahil edebilirsin.":
    'Once saved, play it from the Library or include it in a Mixed Test.',
  'Özel Soru': 'Custom Item',
  'Editör ile elle tasarlanmış soru.': 'Hand-crafted item from the editor.',
  '[{r},{c}] — DOĞRU CEVAP HÜCRESİ': '[{r},{c}] — CORRECT ANSWER CELL',
  '[{r},{c}] — Hücre Düzenleme': '[{r},{c}] — Edit Cell',

  // ── CellEditor ──
  'Halkalar (Annulus)': 'Annulus',
  'Zar (Dice)': 'Dice',
  'Çokgen (Polygon)': 'Polygon',
  'Yıldız (Star)': 'Star',
  'Ok (Arrow)': 'Arrow',
  'Çiçek (Petals)': 'Petals',
  'Dikenli Halka (Spike-Ring)': 'Spike Ring',
  'Çekiç (Hammer)': 'Hammer',
  'Çizgiler (Bars)': 'Bars',
  'Nokta Izgarası (Grid-Dots)': 'Grid Dots',
  'Kareli Tahta (Checkerboard)': 'Checkerboard',
  'İç İçe Çokgen (Nested-Polygon)': 'Nested Polygon',
  'Pasta Dilim (Sector-Pie)': 'Sector Pie',
  'Kutu Çizgileri (Box-Lines)': 'Box Lines',
  'Blok Glyph (F/L/T)': 'Block Glyph (F/L/T)',
  'Halka Sayısı': 'Ring Count',
  'Halka Aralığı': 'Ring Gap',
  'Nokta Sayısı': 'Dot Count',
  'Kenar Sayısı': 'Side Count',
  'Köşe Sayısı': 'Point Count',
  'İç Yarıçap Oranı': 'Inner Radius Ratio',
  'Uç Boyutu': 'Head Size',
  'Gövde Kalınlığı': 'Shaft Width',
  'Yaprak Sayısı': 'Petal Count',
  'Yaprak Genişliği': 'Petal Width',
  'Diken Sayısı': 'Spike Count',
  'Diken Derinliği': 'Spike Depth',
  'Sap Uzunluğu': 'Handle Length',
  'Başlık Genişliği': 'Head Width',
  'Başlık Kalınlığı': 'Head Thickness',
  'Marker Konumu (0=yok,1-4=köşe)': 'Marker Position (0=none, 1-4=corner)',
  'Marker Boyutu': 'Marker Size',
  'Çizgi Sayısı': 'Bar Count',
  'Yön (0=yatay,1=dikey,2=diag)': 'Orientation (0=horiz., 1=vert., 2=diag.)',
  'Satır Sayısı': 'Row Count',
  'Sütun Sayısı': 'Column Count',
  'Nokta Boyutu': 'Dot Size',
  'Satır': 'Rows',
  'Sütun': 'Columns',
  'Dış Kenar Sayısı': 'Outer Sides',
  'İç Kenar Sayısı': 'Inner Sides',
  'İç Ölçek': 'Inner Scale',
  'Dilim Sayısı': 'Sector Count',
  'Döndürme (derece)': 'Rotation (degrees)',
  'Renk': 'Color',
  'Gelişmiş ayarlar': 'Advanced settings',
  'Boyut': 'Size',
  'Çizgi Kalınlığı': 'Stroke Width',
  'Dolu (fill ile)': 'Filled',
  'Dilim Desenleri': 'Sector Patterns',
  'Hücre Doluluk (tıkla)': 'Cell Fill (click)',
  'Çizgiler': 'Lines',
  'boş': 'empty',
  'dolu': 'solid',
  'noktalı': 'dotted',
  'yatay': 'horizontal',
  'dikey': 'vertical',
  'çapraz': 'cross',
  'Sol': 'Left',
  'Sağ': 'Right',
  'Üst': 'Top',
  'Alt': 'Bottom',

  // ── Editor OptionsPanel ──
  'Cevap Şıkları': 'Answer Options',
  '🎲 Çeldirici Üret': '🎲 Generate Distractors',
  'Çeldiricileri yeniden üretir (doğru cevap aynı kalır, ama konumu değişir)':
    'Regenerates distractors (the correct answer stays, its position may change)',
  'Doğru cevap (tıkla = farklı şıkkı doğru yap)': 'Correct answer (click another tile to change it)',
  'Bu şıkkı doğru olarak işaretle': 'Mark this option as the correct one',
  'Yeşil daireli şık doğru cevaptır. Farklı bir şıkkı doğru yapmak için üzerine tıkla.':
    'The highlighted tile is the correct answer. Click another tile to make it the correct one.',

  // ── Paper Folding ──
  'Sağa katla': 'Fold right',
  'Sola katla': 'Fold left',
  'Yukarı katla': 'Fold up',
  'Aşağı katla': 'Fold down',
  'Kağıt {n} kez katlanmış, sonra delinmiş. Açılınca delikler nereye gelir?':
    'The paper was folded {n} time(s), then punched. When unfolded, where do the holes appear?',

  // ── Cube Projection ──
  'üstten': 'from the top',
  'önden': 'from the front',
  'arkadan': 'from the back',
  'soldan': 'from the left',
  'sağdan': 'from the right',
  'Bakış yönü:': 'Viewing direction:',
}
