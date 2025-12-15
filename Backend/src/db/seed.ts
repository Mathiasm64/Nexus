// db/seed.ts



import { db } from "./index";
import {
  userTable,
  lagerTable,
  LagerplatzTable,
  ZuordnungTable,
  productTable,
} from "./schema";

async function seed() {
  // Optional: vorhandene Daten löschen (Reihenfolge wegen FK-Konzept)
  // await db.delete(ZuordnungTable);
  // await db.delete(LagerplatzTable);
  // await db.delete(productTable);
  // await db.delete(lagerTable);
  // await db.delete(userTable);

  // 1. User
  const insertedUsers = await db
    .insert(userTable)
    .values([
      {
        benutzername: "admin",
        email: "admin@example.com",
        passwortHash: "testhashadmin",
        rolle: "ADMIN",
      },
      {
        benutzername: "user1",
        email: "user1@example.com",
        passwortHash: "testhashuser1",
        rolle: "USER",
      },
    ])
    .returning(); // bekommt benutzerId zurück

  // 2. Lager
  const insertedLager = await db
    .insert(lagerTable)
    .values([
      {
        lagerName: "Lager1",
        standort: "München",
      },
      {
        lagerName: "Lager2",
        standort: "Berlin",
      },
    ])
    .returning(); // bekommt lagerId zurück

  // 3. Lagerplätze (nutzt lagerId)
  const insertedLagerplaetze = await db
    .insert(LagerplatzTable)
    .values([
      { //0
        lagerId: insertedLager[0].lagerId,
        regalNR: "R1",
        regalSection: "S1",
        regalShelf: "F1",
      },
      { //1
        lagerId: insertedLager[0].lagerId,
        regalNR: "R1",
        regalSection: "S1",
        regalShelf: "F2",
      },
      { //2
        lagerId: insertedLager[1].lagerId,
        regalNR: "R2",
        regalSection: "S1",
        regalShelf: "F1",
      },
    ])
    .returning(); // bekommt lagerplatzId zurück

  // 4. Produkte
  const insertedProducts = await db
    .insert(productTable)
    .values([
      {
        produktName: "Schraube M6",
        mindestBestand: 50,
        aktuellerBestand: 200,
        barcode: "SCREW-M6-001",
      },
      {
        produktName: "Mutter M6",
        mindestBestand: 50,
        aktuellerBestand: 150,
        barcode: "NUT-M6-001",
      },
      {
        produktName: "Unterlegscheibe M6",
        mindestBestand: 50,
        aktuellerBestand: 300,
        barcode: "WASHER-M6-001",
      },
      {
        produktName: "Flasche",
        mindestBestand: 1,
        aktuellerBestand: 4,
        barcode: "Flasche-001",
      },
      {
        produktName: "Laptop",
        mindestBestand: 1,
        aktuellerBestand: 1,
        barcode: "Laptop-Adrian",
      },
    ])
    .returning(); // bekommt productId zurück

  // 5. Zuordnungen Produkt ↔ Lagerplatz
  await db.insert(ZuordnungTable).values([
    {
      lagerplatzId: insertedLagerplaetze[0].lagerplatzId,
      productId: insertedProducts[0].productId,
      menge: 100,
    },
    {
      lagerplatzId: insertedLagerplaetze[1].lagerplatzId,
      productId: insertedProducts[1].productId,
      menge: 80,
    },
    {
      lagerplatzId: insertedLagerplaetze[2].lagerplatzId,
      productId: insertedProducts[2].productId,
      menge: 150,
    },
  ]);

  console.log("Seeding erfolgreich abgeschlossen");
}

seed()
  .catch((err) => {
    console.error("Fehler beim Seeding:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
