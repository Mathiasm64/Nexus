const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedDatabase() {
  try {
    console.log('🌱 Starte Datenbank-Seed via API...');

    // 1. Lager erstellen
    console.log('📦 Erstelle Lager...');
    const lagerResponse = await fetch(`${BASE_URL}/lager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerName: 'Main Manufacturing Warehouse',
        standort: 'Building A',
      }),
    });
    const lager1 = await lagerResponse.json();
    console.log(`✓ Lager 1 erstellt: ${lager1.lagerName}`);

    await sleep(300);

    const lagerResponse2 = await fetch(`${BASE_URL}/lager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerName: 'Distribution Center North',
        standort: 'Building B',
      }),
    });
    const lager2 = await lagerResponse2.json();
    console.log(`✓ Lager 2 erstellt: ${lager2.lagerName}`);

    await sleep(300);

    const lagerResponse3 = await fetch(`${BASE_URL}/lager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerName: 'Assembly Warehouse',
        standort: 'Building C',
      }),
    });
    const lager3 = await lagerResponse3.json();
    console.log(`✓ Lager 3 erstellt: ${lager3.lagerName}`);

    // 2. Produkte erstellen
    console.log('🛠️ Erstelle Produkte...');
    const products = [];

    const produktResponses = await Promise.all([
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Aluminum Sheet Metal',
          kategorie: 'Raw Materials',
          mindestBestand: 50,
          aktuellerBestand: 150,
          barcode: 'BAR-001-ALUMINUM',
        }),
      }),
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Steel Bolts M8',
          kategorie: 'Components',
          mindestBestand: 100,
          aktuellerBestand: 500,
          barcode: 'BAR-002-BOLTS-M8',
        }),
      }),
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Plastic Tubing 10mm',
          kategorie: 'Raw Materials',
          mindestBestand: 30,
          aktuellerBestand: 200,
          barcode: 'BAR-003-TUBING',
        }),
      }),
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Electrical Connectors',
          kategorie: 'Components',
          mindestBestand: 80,
          aktuellerBestand: 300,
          barcode: 'BAR-004-CONNECTORS',
        }),
      }),
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Lubricating Oil',
          kategorie: 'Consumables',
          mindestBestand: 20,
          aktuellerBestand: 75,
          barcode: 'BAR-005-OIL',
        }),
      }),
      fetch(`${BASE_URL}/produkt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produktName: 'Safety Gloves',
          kategorie: 'Consumables',
          mindestBestand: 100,
          aktuellerBestand: 250,
          barcode: 'BAR-006-GLOVES',
        }),
      }),
    ]);

    for (const res of produktResponses) {
      const product = await res.json();
      products.push(product);
      console.log(`✓ Produkt erstellt: ${product.produktName}`);
    }

    // 3. Lagerplätze erstellen und Produkte zuordnen
    console.log('📍 Erstelle Lagerplätze und Zuordnungen...');

    // Lagerplätze für Lager 1
    const lagerplatzRes1 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager1.lagerId,
        regalNR: 'A',
        regalSection: '01',
        regalShelf: '01',
      }),
    });
    const lagerplatz1 = await lagerplatzRes1.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz1.lagerplatzId,
        productId: products[0].productId,
        menge: 100,
      }),
    });
    console.log(`✓ Zuordnung 1 erstellt`);

    // Lagerplatz für Lager 1 - Product 2
    const lagerplatzRes2 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager1.lagerId,
        regalNR: 'A',
        regalSection: '01',
        regalShelf: '02',
      }),
    });
    const lagerplatz2 = await lagerplatzRes2.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz2.lagerplatzId,
        productId: products[1].productId,
        menge: 400,
      }),
    });
    console.log(`✓ Zuordnung 2 erstellt`);

    // Lagerplatz für Lager 1 - Product 3
    const lagerplatzRes3 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager1.lagerId,
        regalNR: 'B',
        regalSection: '02',
        regalShelf: '01',
      }),
    });
    const lagerplatz3 = await lagerplatzRes3.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz3.lagerplatzId,
        productId: products[2].productId,
        menge: 150,
      }),
    });
    console.log(`✓ Zuordnung 3 erstellt`);

    // Lagerplätze für Lager 2
    const lagerplatzRes4 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager2.lagerId,
        regalNR: 'C',
        regalSection: '03',
        regalShelf: '01',
      }),
    });
    const lagerplatz4 = await lagerplatzRes4.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz4.lagerplatzId,
        productId: products[3].productId,
        menge: 250,
      }),
    });
    console.log(`✓ Zuordnung 4 erstellt`);

    // Lagerplatz für Lager 2 - Product 5
    const lagerplatzRes5 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager2.lagerId,
        regalNR: 'D',
        regalSection: '04',
        regalShelf: '02',
      }),
    });
    const lagerplatz5 = await lagerplatzRes5.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz5.lagerplatzId,
        productId: products[4].productId,
        menge: 60,
      }),
    });
    console.log(`✓ Zuordnung 5 erstellt`);

    // Lagerplatz für Lager 3
    const lagerplatzRes6 = await fetch(`${BASE_URL}/lagerplatz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerId: lager3.lagerId,
        regalNR: 'E',
        regalSection: '05',
        regalShelf: '01',
      }),
    });
    const lagerplatz6 = await lagerplatzRes6.json();

    await fetch(`${BASE_URL}/zuordnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagerplatzId: lagerplatz6.lagerplatzId,
        productId: products[5].productId,
        menge: 200,
      }),
    });
    console.log(`✓ Zuordnung 6 erstellt`);

    console.log('');
    console.log('✅ Seed erfolgreich abgeschlossen!');
    console.log('');
    console.log('Erstellt:');
    console.log(`  - 3 Lager`);
    console.log(`  - 6 Produkte`);
    console.log(`  - 6 Lagerplätze`);
    console.log(`  - 6 Zuordnungen`);
    console.log('');
    console.log('Du kannst jetzt die Webseite aktualisieren und solltest die Daten sehen!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Fehler beim Seeding:', err.message);
    process.exit(1);
  }
}

seedDatabase();
