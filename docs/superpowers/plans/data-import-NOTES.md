# Toplu Besin Verisi — Manuel Çalıştırma Notları

Bu adım build pipeline'ının (CI/`npm run build`) bir parçası değildir; bir kerelik
(veya periyodik güncellemede tekrar edilen) manuel veri hazırlama adımıdır.
`public/data/foods-bulk.json(.gz)` ve `public/data/foods-generic.json(.gz)`
dosyaları buradan üretilip repoya commit edilir; uygulama bu dosyaları `fetch`
ile okur (bkz. `src/lib/bulkDataSource.ts`, `seedBulkDataIfNeeded`).

## 1. Open Food Facts (OFF) Türkiye verisi

`world.openfoodfacts.org`'un tam dünya export'u (`openfoodfacts-products.jsonl.gz`)
birkaç GB ve ülkeye göre önceden filtrelenmiş bir versiyonu yok. Ayrıca
`world.openfoodfacts.org` anonim script trafiğini rate-limit'liyor (503 döner).

Bunun yerine `search.openfoodfacts.org` (search-a-licious API, ayrı ve daha hafif
bir host) Türkiye filtreli sorguyu doğrudan destekliyor:

```bash
node scripts/fetchOffTurkey.mjs off-turkey-raw.jsonl
```

Bu script `countries_tags:"en:turkey"` sorgusuyla sayfalayarak tüm Türkiye
ürünlerini çeker (çalıştırıldığında ~2787 ürün, ~650 KB JSONL; OFF veritabanı
büyüdükçe bu sayı artar) ve `scripts/transformOffRecord.ts`'in beklediği
`OffRawProduct` şeklinde JSONL olarak yazar. API'ye nazik davranmak için
sayfalar arası 300ms bekler.

`transformOffRecord` her satırı okuyup `countries_tags` içinde `en:turkey`/`tr`
olup olmadığını tekrar doğrular, isim veya barkod eksikse `null` döner (satır
atlanır).

**Not (veri kalitesi):** OFF kullanıcı katkılı bir veritabanı olduğu için bazı
ürün isimleri kısa/eksik/anlamsız olabilir (örn. tek kelimelik kısaltmalar).
Bu kaynağın kendi veri kalitesi sınırıdır; `source: 'bulk'` rozetiyle
işaretlenen kayıtlar kullanıcı tarafından düzenlenip `verified`'a
yükseltilebilir (bkz. tasarım dokümanı, kaynak rozeti akışı).

## 2. USDA / genel besin listesi

USDA FoodData Central'ın tam "Foundation Foods" dökümü yüz MB'ın üzerinde ve
barkodsuz temel besinler (ekmek, pirinç, tavuk göğsü, elma vb.) için bu kadar
büyük bir dosyaya gerek yok. Bunun yerine `usda-generic-sample.json` elle
hazırlanmış, ~20 yaygın temel besinden oluşan küçük bir liste (USDA/bilinen
ortalama değerlerden türetilmiştir). İstenirse gerçek USDA dökümüyle
(`https://fdc.nal.usda.gov/download-datasets.html`, "Foundation Foods" JSON)
değiştirilebilir — `buildFoodData` aynı `UsdaRawFood` şeklini bekler.

`transformUsdaRecord` (`scripts/buildFoodData.ts`) şu USDA besin adı/birim
eşlemesini kullanır:

| USDA `nutrientName` | `unitName` | Alan | Not |
|---|---|---|---|
| Energy | KCAL | kcal | kJ değeri yoksayılır |
| Protein | G | protein | |
| Carbohydrate, by difference | G | carb | |
| Sugars, total including NLEA | G | sugar | |
| Total lipid (fat) | G | fat | |
| Fatty acids, total saturated | G | satFat | |
| Fiber, total dietary | G | fiber | |
| Sodium, Na | MG | salt | mg → g dönüşümü: `sodium_mg * 2.5 / 1000` |

## 3. Script'i çalıştırma

```bash
npx tsx scripts/buildFoodData.ts off-turkey-raw.jsonl usda-generic-sample.json public/data
```

Çıktı: `public/data/foods-bulk.json`, `public/data/foods-bulk.json.gz`,
`public/data/foods-generic.json`, `public/data/foods-generic.json.gz`.

Mevcut veriyle (2026-11-23 itibarıyla) çıktı boyutu: `foods-bulk.json` ~628 KB,
`foods-generic.json` ~4 KB — "birkaç on MB" hedefinin çok altında; OFF
veritabanı büyüdükçe veya USDA tam dökümü kullanılırsa boyut artabilir, o
durumda yeniden kontrol et.
