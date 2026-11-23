# Kalori Takip PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sunucusuz, tarayıcıda (IndexedDB) veri tutan kişisel kalori takip PWA'sı; barkod, OCR, yerel arama ve şablonlarla elle giriş yükünü azaltır.

**Architecture:** Vite + React + TypeScript SPA, Dexie (IndexedDB) tek veri katmanı, Fuse.js ile Türkçe-tolerant yerel arama, build-time Node script ile toplu besin verisi (OFF TR + USDA türevi) gömülü JSON olarak gelir, barkod/OCR online API çağrıları (OFF API, Google Vision) sadece gerektiğinde yapılır.

**Tech Stack:** Vite, React, TypeScript, Dexie.js, Fuse.js, @zxing/library, vite-plugin-pwa, Vitest + fake-indexeddb (test), GitHub Pages (deploy).

**Spec:** [docs/superpowers/specs/2026-11-23-kalori-pwa-design.md](../specs/2026-11-23-kalori-pwa-design.md)

## Global Constraints

- Sunucu/backend yok; tüm kalıcı veri IndexedDB'de tutulur.
- Vision API key proxy'siz, doğrudan tarayıcıdan çağrılır, kullanıcı ayarlardan kendi key'ini girer.
- Barkod yerelde yoksa internet varsa OFF API'den çekilir ve kalıcı kaydedilir; yoksa foto/manuel girişe düşer.
- Her `foods` kaydının `source` alanı `bulk` | `user` | `verified` değerlerinden biri olmalı ve UI'da rozet olarak gösterilmeli.
- OCR'dan gelen değerler kaydedilmeden önce kullanıcı onayından (100g/porsiyon kolonu açıkça seçilmiş, değerler düzenlenebilir) geçmeli.
- Besin değerleri temel makrolarla sınırlı: kcal, protein, karbonhidrat, şeker, yağ, doymuş yağ, lif, tuz.
- Dağıtım hedefi GitHub Pages (statik, HTTPS).
- ODbL (OFF) ve USDA atıfları "Hakkında" ekranında gösterilmeli.

## Review Focus

- Barkod okutulup hem yerel veritabanında hem OFF API'de bulunamayan ürün: akış kullanıcıyı foto/manuel girişe yönlendirmeli, sessizce takılıp kalmamalı (Task 10).
- OCR'dan dönen metinde beklenen besin kalıplarından biri (örn. "Tuz") hiç bulunamazsa: ilgili alan boş/düzenlenebilir kalmalı, confirm ekranı çökmemeli (Task 11).
- Serbest metin girişinde miktar belirtilmemiş ve o besin için `lastQuantityGrams` da yoksa: varsayılan 100 g kullanılmalı, parser hata fırlatmamalı (Task 5).
- JSON import sırasında mevcut veritabanında zaten kayıt varsa (id çakışması): import mevcut veriyi sessizce bozmamalı, kullanıcıya üzerine yazma/birleştirme seçeneği sunulmalı (Task 13).
- Toplu veri (bulk) seed'i ikinci açılışta tekrar çalışıp mevcut `user`/`verified` kayıtlarını veya kullanıcının diary geçmişini ezmemeli (Task 7).

---

## Task 1: Proje İskeleti

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `App` React bileşeni, Vite dev/build/test script'leri (`npm run dev`, `npm run build`, `npm test`).

- [ ] **Step 1: Vite + React + TS scaffold oluştur**

`npm create vite@latest . -- --template react-ts` eşdeğeri yapı; `react`, `react-dom`, `dexie`, `fuse.js`, `@zxing/library`, `vite-plugin-pwa` bağımlılıklarını ekle; `vitest`, `@testing-library/react`, `fake-indexeddb` dev bağımlılıklarını ekle.

- [ ] **Step 2: `npm run build` çalıştır, hatasız tamamlandığını doğrula**

Run: `npm run build`
Expected: `dist/` üretilir, hata yok.

- [ ] **Step 3: Vitest yapılandır, örnek bir testle doğrula**

`vitest.config.ts` içinde `environment: 'jsdom'`. Örnek `src/App.test.tsx`: `App` render edilince crash olmadığını doğrula.

- [ ] **Step 4: Testi çalıştır**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src vitest.config.ts
git commit -m "feat: scaffold vite+react+ts app with test setup"
```

---

## Task 2: Türkçe Normalizasyon Yardımcısı

**Files:**
- Create: `src/lib/turkishNormalize.ts`
- Test: `src/lib/turkishNormalize.test.ts`

**Interfaces:**
- Produces: `normalizeTurkish(input: string): string` — küçük harfe çevirir, ç→c, ş→s, ğ→g, ö→o, ü→u, ı/İ→i dönüşümü yapar, aksan/noktalama kaldırır.

- [ ] **Step 1: Başarısız testleri yaz**

```ts
test('çorba -> corba eşleşir', () => {
  expect(normalizeTurkish('ÇORBA')).toBe('corba');
});
test('İstanbul -> istanbul', () => {
  expect(normalizeTurkish('İstanbul')).toBe('istanbul');
});
test('peynir50 gibi karışık girişte harfleri korur', () => {
  expect(normalizeTurkish('Yoğurt')).toBe('yogurt');
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test turkishNormalize`
Expected: FAIL (fonksiyon tanımlı değil)

- [ ] **Step 3: `normalizeTurkish` fonksiyonunu uygula**

Karakter haritası: `{ç:'c', Ç:'c', ş:'s', Ş:'s', ğ:'g', Ğ:'g', ö:'o', Ö:'o', ü:'u', Ü:'u', ı:'i', İ:'i', I:'i'}`, sonra `toLowerCase()`.

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test turkishNormalize`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/turkishNormalize.ts src/lib/turkishNormalize.test.ts
git commit -m "feat: add turkish-tolerant text normalization"
```

---

## Task 3: Veri Modeli ve Dexie Şeması

**Files:**
- Create: `src/db/schema.ts` (tip tanımları: `Food`, `DiaryEntry`, `MealTemplate`, `Settings`)
- Create: `src/db/database.ts` (Dexie sınıfı)
- Test: `src/db/database.test.ts`

**Interfaces:**
- Produces:
  - `interface Nutrients { kcal: number; protein: number; carb: number; sugar: number; fat: number; satFat: number; fiber: number; salt: number }`
  - `interface Food { id: string; name: string; brand?: string; barcode?: string; nutrientsPer100g: Nutrients; source: 'bulk' | 'user' | 'verified'; lastQuantityGrams?: number; usageCount: number; lastUsedAt?: number }`
  - `interface DiaryEntry { id: string; date: string; foodId: string; quantityGrams: number; snapshotNutrients: Nutrients; createdAt: number }`
  - `interface MealTemplate { id: string; name: string; items: { foodId: string; quantityGrams: number }[] }`
  - `class AppDatabase extends Dexie { foods: Table<Food>; diaryEntries: Table<DiaryEntry>; mealTemplates: Table<MealTemplate>; settings: Table<{ key: string; value: unknown }> }`

- [ ] **Step 1: Başarısız test yaz (fake-indexeddb ile)**

```ts
import 'fake-indexeddb/auto';
test('food eklenip barkoddan okunabilir', async () => {
  const db = new AppDatabase();
  await db.foods.add({ id: '1', name: 'Peynir', barcode: '869000', nutrientsPer100g: {...}, source: 'bulk', usageCount: 0 });
  const found = await db.foods.where('barcode').equals('869000').first();
  expect(found?.name).toBe('Peynir');
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test database`
Expected: FAIL

- [ ] **Step 3: `AppDatabase` sınıfını uygula**

`foods` tablosunda `barcode` ve `name` alanlarına index koy (`++id, barcode, name`); `diaryEntries` için `date` index'i; `mealTemplates` için `name`.

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test database`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db
git commit -m "feat: add dexie schema for foods, diary entries, templates"
```

---

## Task 4: Besin Deposu (Repository) ve Arama

**Files:**
- Create: `src/db/foodRepository.ts`
- Test: `src/db/foodRepository.test.ts`

**Interfaces:**
- Consumes: `AppDatabase` (Task 3), `normalizeTurkish` (Task 2), `Fuse` (fuse.js).
- Produces:
  - `searchFoods(db: AppDatabase, query: string, limit?: number): Promise<Food[]>`
  - `findByBarcode(db: AppDatabase, barcode: string): Promise<Food | undefined>`
  - `upsertFood(db: AppDatabase, food: Food): Promise<void>`
  - `recordUsage(db: AppDatabase, foodId: string, quantityGrams: number): Promise<void>` — `usageCount++`, `lastUsedAt`, `lastQuantityGrams` günceller.
  - `getFavoritesAndRecents(db: AppDatabase, limit?: number): Promise<Food[]>` — `usageCount` ve `lastUsedAt`'e göre sıralar.

- [ ] **Step 1: Başarısız testler yaz**

```ts
test('corba araması Çorba kaydını bulur', async () => { /* seed + searchFoods(db,'corba') içinde 'Çorba' var mı */ });
test('recordUsage son miktarı ve kullanım sayısını günceller', async () => { /* ... */ });
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test foodRepository`
Expected: FAIL

- [ ] **Step 3: Repository fonksiyonlarını uygula**

`searchFoods`: tüm `foods` çekilir (veya büyük veri için sayfalı), `name` alanları `normalizeTurkish` ile önceden hesaplanmış bir alanda (`nameNormalized`, Task 3 şemasına eklenir) Fuse.js ile aranır.

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test foodRepository`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/foodRepository.ts src/db/foodRepository.test.ts src/db/schema.ts
git commit -m "feat: add turkish-tolerant food search and usage tracking"
```

---

## Task 5: Günlük Kayıt Servisi ve Serbest Metin Ayrıştırma

**Files:**
- Create: `src/domain/diaryService.ts`
- Create: `src/domain/freeTextParser.ts`
- Test: `src/domain/diaryService.test.ts`, `src/domain/freeTextParser.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `foodRepository` (Task 4).
- Produces:
  - `addDiaryEntry(db: AppDatabase, foodId: string, quantityGrams: number, date: string): Promise<DiaryEntry>` — `food.nutrientsPer100g`'den `quantityGrams/100` oranıyla `snapshotNutrients` hesaplar, `recordUsage` çağırır.
  - `getDailyTotal(db: AppDatabase, date: string): Promise<Nutrients>`
  - `getHistory(db: AppDatabase): Promise<{ date: string; total: Nutrients }[]>`
  - `parseFreeText(input: string): { name: string; quantityGrams?: number }` — `"peynir 50"` → `{ name: 'peynir', quantityGrams: 50 }`; `"peynir"` → `{ name: 'peynir', quantityGrams: undefined }`.

- [ ] **Step 1: Başarısız testler yaz**

```ts
test('parseFreeText miktarlı girişi ayrıştırır', () => {
  expect(parseFreeText('peynir 50')).toEqual({ name: 'peynir', quantityGrams: 50 });
});
test('parseFreeText miktarsız girişte quantityGrams undefined döner', () => {
  expect(parseFreeText('peynir')).toEqual({ name: 'peynir', quantityGrams: undefined });
});
test('addDiaryEntry miktara göre besin değerlerini ölçekler', async () => { /* 100g kcal=200 olan besinden 50g eklenince snapshot kcal=100 */ });
test('miktar yoksa ve lastQuantityGrams de yoksa varsayılan 100g kullanılır', async () => { /* Review Focus */ });
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test diaryService freeTextParser`
Expected: FAIL

- [ ] **Step 3: `parseFreeText` ve `addDiaryEntry`/`getDailyTotal`/`getHistory` fonksiyonlarını uygula**

`parseFreeText` regex: `/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr)?$/i`; eşleşmezse tüm girişi `name` olarak, `quantityGrams: undefined` döner. Miktar çözümü (undefined ise `lastQuantityGrams` ya da 100) çağıran UI/servis katmanında yapılır.

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test diaryService freeTextParser`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add diary entry service and free-text quantity parser"
```

---

## Task 6: Build-Time Toplu Veri Script'i

**Files:**
- Create: `scripts/buildFoodData.ts` (orkestrasyon: indirme + dosya yazma)
- Create: `scripts/transformOffRecord.ts` (saf dönüşüm fonksiyonu)
- Test: `scripts/transformOffRecord.test.ts`
- Create: `docs/superpowers/plans/data-import-NOTES.md` (manuel çalıştırma adımları)

**Interfaces:**
- Produces:
  - `transformOffRecord(raw: OffRawProduct): Food | null` — ülke filtresi (`countries_tags` içinde `en:turkey` veya `tr`), gerekli alanlar eksikse `null` döner.
  - `buildFoodData(offDumpPath: string, usdaDumpPath: string, outDir: string): Promise<void>` — dosyaları okur, `transformOffRecord` ile indirger, `outDir/foods-bulk.json(.gz)` ve `outDir/foods-generic.json(.gz)` yazar.

- [ ] **Step 1: Başarısız test yaz (örnek OFF kaydı fixture'ı ile)**

```ts
test('Türkiye ürünü geçerli Food kaydına dönüşür', () => {
  const result = transformOffRecord(sampleTrProduct);
  expect(result).toMatchObject({ name: expect.any(String), source: 'bulk' });
});
test('Türkiye dışı veya eksik veri null döner', () => {
  expect(transformOffRecord(sampleNonTrProduct)).toBeNull();
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test transformOffRecord`
Expected: FAIL

- [ ] **Step 3: `transformOffRecord` ve `buildFoodData` uygula**

`buildFoodData` gerçek OFF/USDA dump dosyalarını (büyük, repo'ya dahil edilmez) yerel diskten okuyup işler; `data-import-NOTES.md` içine dump dosyalarının nereden indirileceği (OFF ülke filtreli export, USDA FoodData Central) ve script'in nasıl çalıştırılacağı (`npx tsx scripts/buildFoodData.ts <offDump> <usdaDump> public/data`) yazılır — bu adım build pipeline'ının bir parçası değil, bir kerelik manuel veri hazırlama adımıdır.

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test transformOffRecord`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts docs/superpowers/plans/data-import-NOTES.md
git commit -m "feat: add build-time OFF/USDA data transform script"
```

---

## Task 7: İlk Açılışta Toplu Veri Seed'i

**Files:**
- Create: `src/db/seedBulkData.ts`
- Test: `src/db/seedBulkData.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `public/data/foods-bulk.json`, `public/data/foods-generic.json` (fetch ile), `settings` tablosu.
- Produces: `seedBulkDataIfNeeded(db: AppDatabase, fetchBulkData: () => Promise<Food[]>, fetchGenericData: () => Promise<Food[]>): Promise<void>` — `settings.bulkDataVersion` yoksa veya eskiyse, mevcut `user`/`verified` kayıtları ve `diaryEntries`'i etkilemeden sadece `source: 'bulk'` kayıtlarını ekler/günceller; sonra `settings.bulkDataVersion` günceller.

- [ ] **Step 1: Başarısız testler yaz**

```ts
test('ilk çalıştırmada bulk veriler eklenir', async () => { /* ... */ });
test('ikinci çalıştırmada mevcut user kaydı korunur, tekrar seed çalışmaz', async () => {
  // Review Focus: bulk seed kullanıcı/verified veya diary geçmişini ezmemeli
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test seedBulkData`
Expected: FAIL

- [ ] **Step 3: `seedBulkDataIfNeeded` uygula**

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test seedBulkData`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/seedBulkData.ts src/db/seedBulkData.test.ts
git commit -m "feat: seed bulk food data on first launch without clobbering user data"
```

---

## Task 8: Arama ve Ekleme UI

**Files:**
- Create: `src/components/FoodSearch.tsx`
- Create: `src/components/SourceBadge.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `searchFoods`, `getFavoritesAndRecents` (Task 4).
- Produces: `FoodSearch` bileşeni — yazarken `searchFoods` çağırır, her sonuçta `SourceBadge` ve `lastQuantityGrams` gösterir, seçilince `onSelect(food: Food)` callback'i tetikler.

- [ ] **Step 1: `FoodSearch` ve `SourceBadge` bileşenlerini uygula**

Boş girişte favoriler/son kullanılanlar (`getFavoritesAndRecents`) gösterilir.

- [ ] **Step 2: `App.tsx` içine entegre et**

- [ ] **Step 3: Dev server üzerinden manuel doğrula**

Run: `npm run dev`
Expected: Yazarken Türkçe karakter toleranslı sonuçlar anlık görünür, rozetler doğru renk/etiketle gösterilir.

- [ ] **Step 4: Commit**

```bash
git add src/components src/App.tsx
git commit -m "feat: add type-ahead food search UI with source badges"
```

---

## Task 9: Günlük Ekleme Akışı UI

**Files:**
- Create: `src/components/AddEntryForm.tsx`
- Create: `src/components/DailyTotals.tsx`
- Create: `src/components/FreeTextQuickAdd.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `addDiaryEntry`, `getDailyTotal`, `getHistory` (Task 5), `parseFreeText` (Task 5), `FoodSearch` (Task 8).
- Produces: besin seçilince miktar input'u `lastQuantityGrams` ile önceden doldurulur; `FreeTextQuickAdd` serbest metni alır, `parseFreeText` + `searchFoods` ile eşleştirip onay/ekleme akışına yönlendirir.

- [ ] **Step 1: Bileşenleri uygula**

- [ ] **Step 2: `App.tsx`'e entegre et, günlük toplamı ve geçmişi göster**

- [ ] **Step 3: Dev server üzerinden manuel doğrula**

Run: `npm run dev`
Expected: "peynir 50" girişi doğru besini 50g olarak günlüğe ekler; günlük toplam güncellenir.

- [ ] **Step 4: Commit**

```bash
git add src/components src/App.tsx
git commit -m "feat: add diary entry flow with free-text quick add and daily totals"
```

---

## Task 10: Barkod Okuma

**Files:**
- Create: `src/lib/barcodeScanner.ts` (BarcodeDetector/ZXing soyutlaması)
- Create: `src/domain/barcodeLookup.ts`
- Create: `src/components/BarcodeScanner.tsx`
- Test: `src/domain/barcodeLookup.test.ts`

**Interfaces:**
- Consumes: `findByBarcode` (Task 4), `fetch` (OFF API).
- Produces:
  - `lookupBarcode(db: AppDatabase, barcode: string, fetchFromOff: (barcode: string) => Promise<Food | null>): Promise<{ food: Food; isNew: boolean } | null>` — önce yerel, yoksa `fetchFromOff` (online), bulunursa `source: 'bulk'` kaydeder; hiçbiri bulunamazsa `null` döner (Review Focus: UI bu durumda foto/manuel girişe yönlendirir).
  - `BarcodeScanner` bileşeni: kamera akışını açar, okunan barkodu `onDetect(barcode: string)` ile bildirir.

- [ ] **Step 1: Başarısız testler yaz**

```ts
test('yerelde bulunan barkod OFF API çağırmaz', async () => { /* ... */ });
test('yerelde yok, OFF APIden bulunursa bulk olarak kaydedilir', async () => { /* ... */ });
test('hiçbir yerde bulunamazsa null döner', async () => {
  // Review Focus: sessizce takılıp kalmamalı, null -> UI foto/manuel girişe yönlendirir
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test barcodeLookup`
Expected: FAIL

- [ ] **Step 3: `lookupBarcode` uygula; `barcodeScanner.ts` içinde `BarcodeDetector` varlığını kontrol edip yoksa ZXing fallback uygula; `BarcodeScanner.tsx` kamera iznini isteyip akışı gösterir**

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test barcodeLookup`
Expected: PASS

- [ ] **Step 5: Dev server + telefon/kamera üzerinden manuel doğrula**

Expected: Bilinen barkod anında eklenir; bilinmeyen barkod OFF API'den gelirse kaydedilir; hiçbir yerde yoksa kullanıcı foto/manuel girişe yönlendirilir.

- [ ] **Step 6: Commit**

```bash
git add src/lib/barcodeScanner.ts src/domain/barcodeLookup.ts src/components/BarcodeScanner.tsx src/domain/barcodeLookup.test.ts
git commit -m "feat: add barcode scanning with local and OFF API fallback"
```

---

## Task 11: Etiket Fotoğrafından OCR ile Ekleme

**Files:**
- Create: `src/lib/visionApi.ts`
- Create: `src/domain/labelExtractor.ts`
- Create: `src/components/LabelCaptureFlow.tsx`
- Create: `src/components/OcrConfirmScreen.tsx`
- Test: `src/domain/labelExtractor.test.ts`

**Interfaces:**
- Consumes: `settings.visionApiKey`, `fetch` (Vision API).
- Produces:
  - `callVisionTextDetection(imageBase64: string, apiKey: string): Promise<string>` — ham metni döner.
  - `extractNutrientsFromLabelText(text: string): Partial<Record<keyof Nutrients, { per100g?: number; perServing?: number }>>` — Türkçe etiket kalıplarını regex ile ayıklar; bulunamayan alanlar için anahtar hiç eklenmez (Review Focus: eksik alan çökmeye yol açmaz).
  - `OcrConfirmScreen` — her besin değeri için düzenlenebilir input + "100 g" / "porsiyon" seçici; onaylanınca `Food` (source: `'user'`) üretir.

- [ ] **Step 1: Başarısız testler yaz (örnek etiket metni fixture'ı ile)**

```ts
test('tipik TR etiket metninden değerleri ayıklar', () => {
  const result = extractNutrientsFromLabelText(sampleLabelText);
  expect(result.kcal?.per100g).toBeCloseTo(250);
});
test('Tuz satırı yoksa salt alanı undefined kalır, hata fırlatmaz', () => {
  expect(() => extractNutrientsFromLabelText(labelTextWithoutSalt)).not.toThrow();
  expect(extractNutrientsFromLabelText(labelTextWithoutSalt).salt).toBeUndefined();
});
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test labelExtractor`
Expected: FAIL

- [ ] **Step 3: `extractNutrientsFromLabelText` ve `callVisionTextDetection` uygula; `LabelCaptureFlow`/`OcrConfirmScreen` bileşenlerini oluştur**

Regex kalıpları: `Enerji|Energy`, `Protein`, `Karbonhidrat|Carbohydrate`, `(?:içinde )?[Şş]eker|Sugars`, `Ya[ğg]|Fat`, `Doymu[şs]|Saturated`, `Lif|Fiber`, `Tuz|Sodyum|Salt`; her biri için 100g ve porsiyon kolonlarını ayrı yakalamaya çalışır.

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test labelExtractor`
Expected: PASS

- [ ] **Step 5: Dev server + kamera üzerinden manuel doğrula**

Expected: Fotoğraf çekilip Vision API'ye gönderilir, onay ekranında değerler düzenlenebilir ve 100g/porsiyon seçimi net görünür, kaydedilince `source: 'user'` olur.

- [ ] **Step 6: Commit**

```bash
git add src/lib/visionApi.ts src/domain/labelExtractor.ts src/components/LabelCaptureFlow.tsx src/components/OcrConfirmScreen.tsx src/domain/labelExtractor.test.ts
git commit -m "feat: add label-photo OCR flow with editable confirm screen"
```

---

## Task 12: Öğün Şablonları

**Files:**
- Create: `src/domain/mealTemplateService.ts`
- Create: `src/components/MealTemplates.tsx`
- Test: `src/domain/mealTemplateService.test.ts`

**Interfaces:**
- Consumes: `AppDatabase`, `addDiaryEntry` (Task 5).
- Produces:
  - `saveMealTemplate(db: AppDatabase, name: string, items: { foodId: string; quantityGrams: number }[]): Promise<MealTemplate>`
  - `applyMealTemplate(db: AppDatabase, templateId: string, date: string): Promise<DiaryEntry[]>` — şablondaki her kalemi `addDiaryEntry` ile günlüğe ekler.

- [ ] **Step 1: Başarısız test yaz**

```ts
test('şablon uygulanınca tüm kalemler günlüğe eklenir', async () => { /* ... */ });
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `npm test mealTemplateService`
Expected: FAIL

- [ ] **Step 3: Servis fonksiyonlarını ve `MealTemplates` bileşenini uygula**

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `npm test mealTemplateService`
Expected: PASS

- [ ] **Step 5: Dev server üzerinden manuel doğrula; Commit**

```bash
git add src/domain/mealTemplateService.ts src/components/MealTemplates.tsx src/domain/mealTemplateService.test.ts
git commit -m "feat: add meal templates with one-tap diary apply"
```

---

## Task 13: JSON Dışa/İçe Aktarma

**Files:**
- Create: `src/domain/exportImportService.ts`
- Create: `src/components/ExportImport.tsx`
- Test: `src/domain/exportImportService.test.ts`

**Interfaces:**
- Consumes: `AppDatabase` (tüm tablolar).
- Produces:
  - `exportAllData(db: AppDatabase): Promise<string>` — tüm tabloların JSON dökümü.
  - `importAllData(db: AppDatabase, json: string, mode: 'overwrite' | 'merge'): Promise<void>` — `overwrite` mevcut tabloları temizleyip yazar, `merge` id çakışmalarında gelen veriyi tercih eder (Review Focus: sessiz veri kaybı olmamalı, mod açıkça seçilir).

- [ ] **Step 1: Başarısız testler yaz**

```ts
test('export edilen veri import edilince aynı kayıtları üretir (round-trip)', async () => { /* ... */ });
test('merge modunda id çakışmasında mevcut diary geçmişi kaybolmaz', async () => { /* Review Focus */ });
```

- [ ] **Step 2: Testleri çalıştır, başarısız olduğunu doğrula**

Run: `npm test exportImportService`
Expected: FAIL

- [ ] **Step 3: Servis fonksiyonlarını ve `ExportImport` bileşenini (indir/yükle butonları, mod seçici) uygula**

- [ ] **Step 4: Testleri çalıştır, geçtiğini doğrula**

Run: `npm test exportImportService`
Expected: PASS

- [ ] **Step 5: Dev server üzerinden manuel doğrula; Commit**

```bash
git add src/domain/exportImportService.ts src/components/ExportImport.tsx src/domain/exportImportService.test.ts
git commit -m "feat: add JSON export/import with overwrite and merge modes"
```

---

## Task 14: Ayarlar ve Hakkında Ekranı

**Files:**
- Create: `src/components/SettingsScreen.tsx`
- Create: `src/components/AboutScreen.tsx`

**Interfaces:**
- Consumes: `settings` tablosu (Task 3).
- Produces: `SettingsScreen` — Vision API key girişi (kaydedilince `settings.visionApiKey`); `AboutScreen` — ODbL (Open Food Facts) ve USDA atıf metinlerini sabit içerik olarak gösterir.

- [ ] **Step 1: Bileşenleri uygula**

- [ ] **Step 2: `App.tsx`'e navigasyon ekle**

- [ ] **Step 3: Dev server üzerinden manuel doğrula**

Expected: Key girilip kaydedilir, OCR akışı (Task 11) bu key'i kullanır; Hakkında ekranında atıf metinleri görünür.

- [ ] **Step 4: Commit**

```bash
git add src/components/SettingsScreen.tsx src/components/AboutScreen.tsx src/App.tsx
git commit -m "feat: add settings screen for vision api key and attribution page"
```

---

## Task 15: PWA Bitirme ve Dağıtım

**Files:**
- Modify: `vite.config.ts` (vite-plugin-pwa yapılandırması, manifest)
- Create: `public/manifest.webmanifest` (plugin üretmiyorsa)
- Create: `.github/workflows/deploy.yml` (GitHub Pages deploy)

**Interfaces:**
- Produces: installable PWA, offline fallback, GitHub Pages deploy pipeline.

- [ ] **Step 1: `vite-plugin-pwa` yapılandır (manifest adı, ikonlar, `workbox` runtime caching stratejisi: app shell + statik veri dosyaları cache-first, OFF/Vision API ağ istekleri network-only)**

- [ ] **Step 2: `npm run build` çalıştır, PWA dosyalarının üretildiğini doğrula**

Run: `npm run build`
Expected: `dist/manifest.webmanifest`, `dist/sw.js` üretilir.

- [ ] **Step 3: Lighthouse PWA denetimi çalıştır (Chrome DevTools, `vite preview` üzerinde)**

Expected: Installable, offline çalışır (ağ kapalıyken app shell + bulk veri ile arama/ekleme çalışmaya devam eder).

- [ ] **Step 4: GitHub Pages deploy workflow'u ekle, deploy et**

Run: push to `main`, Actions sekmesinden deploy sonucunu kontrol et.
Expected: Site HTTPS üzerinden erişilebilir, telefonda "Ana ekrana ekle" ile PWA kurulabilir.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public .github/workflows/deploy.yml
git commit -m "feat: finalize pwa config and add github pages deploy workflow"
```
