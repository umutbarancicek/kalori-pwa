export function AboutScreen() {
  return (
    <div>
      <h2>Hakkında</h2>
      <p>
        Bu uygulama sunucusuz çalışır; tüm veriler yalnızca bu cihazdaki tarayıcıda
        (IndexedDB) saklanır.
      </p>
      <h3>Veri Kaynakları</h3>
      <p>
        Ürün verileri{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
          Open Food Facts
        </a>
        'tan alınmıştır ve{' '}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
          Open Database License (ODbL) v1.0
        </a>{' '}
        altında lisanslanmıştır. © Open Food Facts katkıda bulunanları.
      </p>
      <p>
        Genel besin değerleri{' '}
        <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">
          USDA FoodData Central
        </a>{' '}
        verilerinden türetilmiştir.
      </p>
    </div>
  );
}
