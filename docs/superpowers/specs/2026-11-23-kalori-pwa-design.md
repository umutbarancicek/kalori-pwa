# Kalori Takip PWA — Tasarım

## Context

Kullanıcı telefonda kullanacağı kişisel, sunucusuz bir kalori takip PWA'sı istiyor. Önceliği elle veri giriş yükünü azaltmak: yazarken yerel arama, barkod okutma, bilinmeyen ürünü etiket fotoğrafından (OCR) ekleme, son/favori/şablon kısayolları ve serbest metin ayrıştırma ("peynir 50"). Veriler tamamen tarayıcıda (IndexedDB) tutulacak, dışa/içe JSON aktarımı olacak. Başlangıç verisi Open Food Facts (Türkiye, ODbL) ve USDA türevi genel besin listesinden toplu olarak gelecek.

Netleştirme turunda şu mimari kararlar kullanıcı tarafından onaylandı:
- OCR: Google Cloud Vision API (bulut), cihaz üstü OCR değil — doğruluk için.
- Vision API key: proxy yok, doğrudan tarayıcıdan çağrı, kullanıcı kendi key'ini girer (Google Cloud konsolunda Vision API + referrer/IP kısıtlaması önerilir).
- Barkod yerelde yoksa: internet varsa Open Food Facts API'den çekilir, cihaza kalıcı kaydedilir; yoksa foto/manuel girişe düşer.
- Toplu veri kapsamı: geniş (Türkiye'de satılan ürünlerin büyük kısmı).
- Dağıtım: statik hosting (GitHub Pages), oradan telefona PWA olarak kurulur.

## Hedefler / Hedef Olmayanlar

**Hedefler:** elle giriş yükünü azaltmak, offline çalışabilmek (barkod/OCR online gerektirir, geri kalanı offline), tek kullanıcı (kendisi) için hızlı günlük kayıt akışı, veri taşınabilirliği (JSON export/import), veri kaynağı şeffaflığı (rozet).

**Hedef olmayanlar:** çoklu kullanıcı/hesap sistemi, sunucu/backend, sosyal özellikler, detaylı mikro besin takibi (vitamin/mineral) — sadece kalori + temel makrolar (protein, karbonhidrat, şeker, yağ, doymuş yağ, lif, tuz) MVP kapsamında.

**Anti-hedefler:** OCR/barkod akışı manuel girişten daha yavaş/karmaşık hissettirmemeli; toplu veri boyutu telefonu/tarayıcıyı yormamalı.

## Yaklaşımlar (değerlendirilen ve seçilen)

1. **Cihaz üstü OCR (Tesseract.js) — elendi:** tam offline ama küçük/bulanık Türkçe etiketlerde doğruluk düşük, kullanıcı giriş yükünü azaltma hedefiyle çelişir.
2. **Bulut OCR + gizli proxy (Cloudflare Worker) — elendi:** daha güvenli key yönetimi ama "sunucusuz" ilkesinden sapma, ekstra bakım yükü.
3. **Bulut OCR (Google Cloud Vision), doğrudan tarayıcıdan, kullanıcı kendi key'i — seçildi:** en yüksek doğruluk, sıfır sunucu bileşeni, tek kullanıcılık senaryoda key expose riski kabul edilebilir (API kısıtlamasıyla azaltılır).

Barkod ve veri kapsamı için benzer şekilde: tam-offline-only ve dar-veri alternatifleri, isabet oranı/giriş yükü azaltma hedefiyle çelişmeleri nedeniyle elendi; online-fallback + geniş-veri seçildi.

## Teknoloji Kararları

- Vite + React + TypeScript, `vite-plugin-pwa` ile service worker / installable PWA.
- IndexedDB erişimi: Dexie.js.
- Arama: Fuse.js + Türkçe normalizasyon fonksiyonu (ç→c, ş→s, ğ→g, ö→o, ü→u, ı/İ→i, böylece "corba" "çorba"yı bulur).
- Barkod: native `BarcodeDetector` API varsa onu kullan, yoksa `@zxing/library` ile kamera akışından okuma.
- Build-time veri hazırlama: Node script, OFF TR exportunu indirip (ad, barkod, marka, 100g başına enerji/protein/karbonhidrat/şeker/yağ/doymuş yağ/lif/tuz) gerekli alanlara indirger, gzip'li JSON olarak `public/data/` altına gömer; USDA türevi liste aynı şekilde ayrı dosya.
- Hosting: GitHub Pages (HTTPS zorunlu, kamera ve PWA install için gerekli).

## Veri Modeli (IndexedDB, Dexie tabloları)

- `foods`: id, name, brand?, barcode?, nutrientsPer100g {kcal, protein, carb, sugar, fat, satFat, fiber, salt}, source (`bulk` | `user` | `verified`), lastQuantityGrams?, usageCount, lastUsedAt.
- `diaryEntries`: id, date, foodId, quantityGrams, snapshotNutrients (kayıt anındaki değer, sonradan foods değişse bile geçmiş bozulmaz), createdAt.
- `mealTemplates`: id, name, items [{foodId, quantityGrams}].
- `settings`: visionApiKey, lastExportAt.

## Akışlar

**Arama ve ekleme:** yazarken Fuse.js ile normalize edilmiş isim üzerinden anlık sonuç; her sonuçta rozet (toplu/kullanıcı/doğrulandı) ve son kullanılan miktar önerisi.

**Barkod:** kamera aç → `BarcodeDetector`/ZXing ile oku → yerel `foods.barcode` eşleşmesi → yoksa (internet varsa) OFF API sorgusu, sonucu `foods` tablosuna `source: bulk` olarak kaydet → yoksa etiket fotoğrafı/manuel girişe yönlendir.

**Etiket fotoğrafı (bilinmeyen ürün):** fotoğraf çek → Vision API `TEXT_DETECTION` → regex ile Türkçe etiket kalıplarını (Enerji/Energy, Protein, Karbonhidrat, Şeker, Yağ, Doymuş, Lif, Tuz/Sodyum) ayıkla → **düzenlenebilir onay ekranı**: her değer için 100 g / porsiyon kolonu açıkça seçilir, kullanıcı düzeltebilir → kaydedilince `source: user` (kullanıcı "doğrulandı" işaretlerse `verified`).

**Serbest metin ("peynir 50"):** regex ile `<isim> <sayı>(g|gr)?` ayrıştırılır, isim Fuse.js ile eşleştirilir, miktar yoksa son kullanılan miktar varsayılır.

**Öğün şablonları:** birden fazla besini tek dokunuşla günlüğe ekleyen kayıtlı liste.

**Günlük toplam/geçmiş:** tarihe göre `diaryEntries` toplamı, geçmiş günler listesi.

**JSON export/import:** tüm tabloların tam dökümü/geri yüklemesi.

## Builder'a Bırakılan Kararlar

- Tam UI ekran düzeni/bileşen detayları.
- Vision API regex kalıplarının kesin implementasyonu (iterasyonla geliştirilecek).
- OFF export indirme/filtreleme scriptinin tam detayları (OFF'un güncel export formatına göre).

## Doğrulama Planı

- `npm run build` ile üretim derlemesi hatasız tamamlanmalı.
- Yerel `vite preview` üzerinden: arama, barkod (kamera izniyle), OCR onay ekranı, serbest metin ayrıştırma, şablon, export/import akışları manuel test edilecek.
- Build-time veri scripti çalıştırılıp üretilen JSON boyutu kontrol edilecek (telefon için makul olmalı, hedef: birkaç on MB sıkıştırılmış).
- PWA installability: Chrome DevTools Lighthouse PWA denetimi.
- ODbL atıf metni (OFF kaynak belirtimi) ve USDA atfı bir "Hakkında" ekranında gösterilecek.
