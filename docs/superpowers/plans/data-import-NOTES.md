# Toplu Besin Verisi — Manuel Çalıştırma Notları

Bu adım build pipeline'ının (CI/`npm run build`) bir parçası değildir; bir kerelik
(veya periyodik güncellemede tekrar edilen) manuel veri hazırlama adımıdır.
`public/data/foods-bulk.json(.gz)` ve `public/data/foods-generic.json(.gz)`
dosyaları buradan üretilip repoya commit edilir; uygulama bu dosyaları `fetch`
ile okur (bkz. Task 7, `seedBulkDataIfNeeded`).

## 1. Open Food Facts (OFF) Türkiye export'u

OFF, tüm dünya ürünlerini içeren JSONL formatında tam export sağlar
(`https://world.openfoodfacts.org/data` üzerindeki "Products (jsonl)" dökümü).
Tüm dünya dump'ı çok büyük olduğu için:

1. Tam `.jsonl.gz` dosyasını indir.
2. `zcat products.jsonl.gz | jq -c 'select(.countries_tags // [] | any(. == "en:turkey" or . == "tr"))' > off-turkey.jsonl`
   benzeri bir ön filtreleme ile sadece Türkiye etiketli satırları ayıkla
   (tam dosyayı diske indirmeden işlemek istersen stream + filtre pipeline'ı kur).
3. Sonuç `off-turkey.jsonl` dosyasını `buildFoodData`'ya `offDumpPath` olarak ver.

`transformOffRecord` (`scripts/transformOffRecord.ts`) her satırı okuyup
`countries_tags` içinde `en:turkey`/`tr` olup olmadığını tekrar doğrular, isim
veya barkod eksikse `null` döner (satır atlanır).

## 2. USDA FoodData Central

`https://fdc.nal.usda.gov/download-datasets.html` üzerinden "Foundation Foods"
JSON dökümünü indir (tek bir JSON dizisi, satır satır değil). Dosyayı olduğu
gibi `usdaDumpPath` olarak ver.

`buildFoodData` içindeki `transformUsdaRecord` şu USDA besin adı eşlemesini
kullanır (builder kararı, gerekirse genişletilebilir):

| USDA `nutrientName` | Alan |
|---|---|
| Energy | kcal |
| Protein | protein |
| Carbohydrate, by difference | carb |
| Sugars, total including NLEA | sugar |
| Total lipid (fat) | fat |
| Fatty acids, total saturated | satFat |
| Fiber, total dietary | fiber |
| Sodium, Na | salt |

## 3. Script'i çalıştırma

```bash
npx tsx scripts/buildFoodData.ts off-turkey.jsonl usda-foundation-foods.json public/data
```

Çıktı: `public/data/foods-bulk.json`, `public/data/foods-bulk.json.gz`,
`public/data/foods-generic.json`, `public/data/foods-generic.json.gz`.

Üretilen dosyaların toplam boyutunu kontrol et (telefon için makul olmalı,
hedef: birkaç on MB sıkıştırılmış — bkz. tasarım dokümanının Doğrulama Planı).
