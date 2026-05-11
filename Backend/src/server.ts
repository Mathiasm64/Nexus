/**
 * WAREHOUSEHUB - BACKEND HAUPTSERVER
 * 
 * Dieser Server ist das Herzstück der WarehouseHub Lagerverwaltungsanwendung.
 * Er verwaltet alle Datenbankoperationen und stellt REST-APIs für das Frontend bereit.
 * 
 * Features:
 * - Benutzerauthentifizierung (Login, Register)
 * - Lagerverwaltung (CRUD-Operationen)
 * - Produktverwaltung mit Barcode-Unterstützung
 * - Lagerplatzverwaltung
 * - Produktzuordnungen zu Lagerplätzen
 * - Berechtigungsverwaltung (Admin-Schutz)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { userTable, lagerTable, LagerplatzTable, ZuordnungTable, productTable } from './db/schema';
import { neon } from '@neondatabase/serverless';
import path from 'path';

// Umgebungsvariablen aus .env Datei laden
dotenv.config();

// Express App initialisieren
const app = express();
// CORS ermöglichen für Frontend-Anfragen
app.use(cors());
// JSON Parsing für Request-Bodies
app.use(express.json());

// Frontend-Dateien (HTML, CSS, JS) als statische Dateien bereitstellen
const frontendPath = path.join(__dirname, '../../Frontend');
app.use('/Frontend', express.static(frontendPath));

// Konfiguration aus Umgebungsvariablen mit Fallback-Werten
const PORT = process.env.PORT ? Number(process.env.PORT) : 5500;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Health-Check Endpoint - wird verwendet um zu prüfen ob der Server läuft
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});


// ==============================================
// LAGER (Warehouse) CRUD OPERATIONEN
// ==============================================
// Ein Lager ist ein physischer Lagerort mit mehreren Lagerplätzen

/** GET /lager - Alle Lager abrufen */
app.get('/lager', async (_req: Request, res: Response) => {
  try {
    const lager = await db.select().from(lagerTable);
    return res.json(lager);
  } catch (err) {
    console.error('Lager fetch error:', err);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Lager' });
  }
});

/** GET /lager/:id - Ein bestimmtes Lager abrufen */
app.get('/lager/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(lagerTable).where(eq(lagerTable.lagerId, id));
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

/** POST /lager - Neues Lager erstellen */
app.post('/lager', async (req: Request, res: Response) => {
  try {
    const { lagerName, standort } = req.body;
    if (!lagerName || !standort) return res.status(400).json({ error: 'lagerName und standort benötigt' });
    const result = await db.insert(lagerTable).values({ lagerName, standort }).returning();
    return res.status(201).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

/** PUT /lager/:id - Lager aktualisieren */
app.put('/lager/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { lagerName, standort } = req.body;
    const result = await db.update(lagerTable).set({ lagerName, standort }).where(eq(lagerTable.lagerId, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

/** DELETE /lager/:id - Lager löschen */
app.delete('/lager/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(lagerTable).where(eq(lagerTable.lagerId, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ==============================================
// USER (Benutzer) CRUD OPERATIONEN
// ==============================================
// Benutzer haben unterschiedliche Rollen (ADMIN, USER)

/** GET /user - Alle Benutzer abrufen */
app.get('/user', async (_req: Request, res: Response) => {
  try {
    const users = await db.select().from(userTable);
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der User' });
  }
});

/** GET /user/:id - Ein bestimmten Benutzer abrufen */
app.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(userTable).where(eq(userTable.benutzerId, id));
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

/** POST /user - Neuen Benutzer erstellen */
app.post('/user', async (req: Request, res: Response) => {
  try {
    const { benutzername, email, passwortHash, rolle } = req.body;
    if (!benutzername || !email || !passwortHash || !rolle) return res.status(400).json({ error: 'Alle Felder benötigt' });
    const result = await db.insert(userTable).values({ benutzername, email, passwortHash, rolle }).returning();
    return res.status(201).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

/** PUT /user/:id - Benutzer aktualisieren */
app.put('/user/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { benutzername, email, passwortHash, rolle } = req.body;
    const result = await db.update(userTable).set({ benutzername, email, passwortHash, rolle }).where(eq(userTable.benutzerId, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

/** DELETE /user/:id - Benutzer löschen (mit Admin-Schutz) */
app.delete('/user/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.benutzerId, id))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }

    // Admin-Benutzer können nicht gelöscht werden - Schutz vor Sperrung
    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    const normalizedRole = String(user.rolle || '').trim().toUpperCase();

    if (normalizedEmail === 'admin@example.com' || normalizedRole === 'ADMIN') {
      return res.status(403).json({ error: 'Admin-Benutzer kann nicht gelöscht werden' });
    }

    await db.delete(userTable).where(eq(userTable.benutzerId, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});


// ==============================================
// LAGERPLATZ (Shelf Location) CRUD OPERATIONEN
// ==============================================
// Ein Lagerplatz definiert eine physische Position im Regal (Regal-NR, Section, Shelf)

/** GET /lagerplatz - Alle Lagerplätze abrufen */
app.get('/lagerplatz', async (_req: Request, res: Response) => {
  try {
    const lagerplaetze = await db.select().from(LagerplatzTable);
    return res.json(lagerplaetze);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der Lagerplätze' });
  }
});

/** GET /lagerplatz/:id - Ein bestimmten Lagerplatz abrufen */
app.get('/lagerplatz/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(LagerplatzTable).where(eq(LagerplatzTable.lagerplatzId, id));
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

/** POST /lagerplatz - Neuen Lagerplatz erstellen */
app.post('/lagerplatz', async (req: Request, res: Response) => {
  try {
    const { lagerId, regalNR, regalSection, regalShelf } = req.body;
    if (!lagerId || !regalNR || !regalSection || !regalShelf) return res.status(400).json({ error: 'Alle Felder benötigt' });
    const result = await db.insert(LagerplatzTable).values({ lagerId, regalNR, regalSection, regalShelf }).returning();
    return res.status(201).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

/** PUT /lagerplatz/:id - Lagerplatz aktualisieren */
app.put('/lagerplatz/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { lagerId, regalNR, regalSection, regalShelf } = req.body;
    const result = await db.update(LagerplatzTable).set({ lagerId, regalNR, regalSection, regalShelf }).where(eq(LagerplatzTable.lagerplatzId, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

/** DELETE /lagerplatz/:id - Lagerplatz löschen */
app.delete('/lagerplatz/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(LagerplatzTable).where(eq(LagerplatzTable.lagerplatzId, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});


// ==============================================
// ZUORDNUNG (Product-Shelf Assignment) CRUD OPERATIONEN
// ==============================================
// Eine Zuordnung verbindet ein Produkt mit einem Lagerplatz und einer Menge

/** GET /zuordnung - Alle Zuordnungen abrufen */
app.get('/zuordnung', async (_req: Request, res: Response) => {
  try {
    const zuordnungen = await db.select().from(ZuordnungTable);
    return res.json(zuordnungen);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der Zuordnungen' });
  }
});

/** GET /zuordnung/:id - Eine bestimmte Zuordnung abrufen */
app.get('/zuordnung/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(ZuordnungTable).where(eq(ZuordnungTable.plId, id));
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

/** POST /zuordnung - Neue Zuordnung erstellen */
app.post('/zuordnung', async (req: Request, res: Response) => {
  try {
    const { lagerplatzId, productId, menge } = req.body;
    if (!lagerplatzId || !productId || menge === undefined) return res.status(400).json({ error: 'Alle Felder benötigt' });
    const result = await db.insert(ZuordnungTable).values({ lagerplatzId, productId, menge }).returning();
    return res.status(201).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

/** PUT /zuordnung/:id - Zuordnung aktualisieren */
app.put('/zuordnung/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { lagerplatzId, productId, menge } = req.body;
    const result = await db.update(ZuordnungTable).set({ lagerplatzId, productId, menge }).where(eq(ZuordnungTable.plId, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

/** DELETE /zuordnung/:id - Zuordnung löschen */
app.delete('/zuordnung/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(ZuordnungTable).where(eq(ZuordnungTable.plId, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});


// ==============================================
// PRODUKT (Product) CRUD OPERATIONEN
// ==============================================
// Produkte sind die Artikel die im Lager gelagert werden, eindeutig durch Barcode

/** GET /produkt - Alle Produkte abrufen (optional nach Kategorie filtern) */
app.get('/produkt', async (req: Request, res: Response) => {
  try {
    const { kategorie } = req.query;
    let produkte;
    if (kategorie) {
      // Nur Produkte einer bestimmten Kategorie abrufen
      produkte = await db.select().from(productTable).where(eq(productTable.kategorie, String(kategorie)));
    } else {
      // Alle Produkte abrufen
      produkte = await db.select().from(productTable);
    }
    return res.json(produkte);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der Produkte' });
  }
});

/** GET /produkt/:id - Ein bestimmtes Produkt abrufen */
app.get('/produkt/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.select().from(productTable).where(eq(productTable.productId, id));
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Abrufen' });
  }
});

/** POST /produkt - Neues Produkt erstellen */
app.post('/produkt', async (req: Request, res: Response) => {
  try {
    const { produktName, kategorie, mindestBestand, aktuellerBestand, barcode } = req.body;
    if (!produktName || !barcode || mindestBestand === undefined || aktuellerBestand === undefined) 
      return res.status(400).json({ error: 'Alle Felder benötigt' });
    const result = await db.insert(productTable).values({ produktName, kategorie, mindestBestand, aktuellerBestand, barcode }).returning();
    return res.status(201).json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
});

/** PUT /produkt/:id - Produkt aktualisieren */
app.put('/produkt/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { produktName, kategorie, mindestBestand, aktuellerBestand, barcode } = req.body;
    const result = await db.update(productTable).set({ produktName, kategorie, mindestBestand, aktuellerBestand, barcode }).where(eq(productTable.productId, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    return res.json(result[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

/** DELETE /produkt/:id - Produkt löschen */
app.delete('/produkt/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productTable).where(eq(productTable.productId, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});


// ==============================================
// SPEZIELLE PRODUKT-OPERATIONEN
// ==============================================

/**
 * GET /lager/:lagerId/produkte - Alle Produkte eines bestimmten Lagers abrufen
 * Diese komplexe Abfrage verknüpft mehrere Tabellen:
 * Lager -> Lagerplatz -> Zuordnung -> Produkt
 */
app.get('/lager/:lagerId/produkte', async (req: Request, res: Response) => {
  try {
    const { lagerId } = req.params;
    const lagerIdNum = parseInt(lagerId);

    if (Number.isNaN(lagerIdNum)) {
      return res.status(400).json({ error: 'Ungültige lagerId' });
    }
    
    // Hole alle Produkte für dieses Lager mit vollständigen Informationen
    // über die Verknüpfungen: Lager -> Lagerplatz -> Zuordnung -> Produkt
    const produkte = await db
      .select({
        plId: ZuordnungTable.plId,
        productId: productTable.productId,
        produktName: productTable.produktName,
        kategorie: productTable.kategorie,
        mindestBestand: productTable.mindestBestand,
        aktuellerBestand: productTable.aktuellerBestand,
        lastChange: productTable.lastChange,
        barcode: productTable.barcode,
        menge: ZuordnungTable.menge,
        regalNR: LagerplatzTable.regalNR,
        regalSection: LagerplatzTable.regalSection,
        regalShelf: LagerplatzTable.regalShelf,
      })
      .from(productTable)
      .innerJoin(ZuordnungTable, eq(ZuordnungTable.productId, productTable.productId))
      .innerJoin(LagerplatzTable, eq(LagerplatzTable.lagerplatzId, ZuordnungTable.lagerplatzId))
      .where(eq(LagerplatzTable.lagerId, lagerIdNum));
    
    return res.json(produkte);
  } catch (err) {
    console.error('Produkte fetch error:', err);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Produkte' });
  }
});

/**
 * parseLocation - Hilfsfunktion zum Parsen des Standort-Strings
 * Format: "REGAL-SECTION-SHELF" z.B. "A-01-01"
 * @param location - Der zu parsende Location-String
 * @returns Objekt mit regalNR, regalSection, regalShelf
 */
function parseLocation(location?: string) {
  const fallback = { regalNR: 'A', regalSection: '01', regalShelf: '01' };

  if (!location) {
    return fallback;
  }

  const parts = location.trim().split('-');
  if (parts.length !== 3 || parts.some((p) => p.trim().length === 0)) {
    return fallback;
  }

  return {
    regalNR: parts[0].trim(),
    regalSection: parts[1].trim(),
    regalShelf: parts[2].trim(),
  };
}


/**
 * POST /lager/:lagerId/produkte - Neues Produkt in einem Lager hinzufügen
 * Diese Operation:
 * 1. Prüft ob der Barcode bereits existiert
 * 2. Erstellt oder findet den passenden Lagerplatz
 * 3. Erstellt das neue Produkt
 * 4. Verknüpft Produkt mit Lagerplatz (Zuordnung)
 */
app.post('/lager/:lagerId/produkte', async (req: Request, res: Response) => {
  try {
    const lagerIdNum = Number.parseInt(req.params.lagerId, 10);

    if (Number.isNaN(lagerIdNum)) {
      return res.status(400).json({ error: 'Ungültige lagerId' });
    }

    const {
      produktName,
      barcode,
      menge,
      kategorie,
      location,
    } = req.body as {
      produktName?: string;
      barcode?: string;
      menge?: number;
      kategorie?: string;
      location?: string;
    };

    // Validierung: Erforderliche Felder prüfen
    if (!produktName || !barcode || menge === undefined) {
      return res.status(400).json({ error: 'produktName, barcode und menge sind erforderlich' });
    }

    const mengeNum = Number.parseInt(String(menge), 10);

    if (Number.isNaN(mengeNum) || mengeNum < 0) {
      return res.status(400).json({ error: 'Ungültige menge' });
    }

    // Prüfe ob dieser Barcode bereits existiert
    const existingBarcode = await db
      .select({ productId: productTable.productId })
      .from(productTable)
      .where(eq(productTable.barcode, barcode.trim()))
      .limit(1);

    if (existingBarcode.length > 0) {
      return res.status(409).json({ error: 'Barcode existiert bereits' });
    }

    // Parse die Lagerplatz-Position
    const parsedLocation = parseLocation(location);

    // Suche oder erstelle den Lagerplatz
    let lagerplatz = await db
      .select({ lagerplatzId: LagerplatzTable.lagerplatzId })
      .from(LagerplatzTable)
      .where(
        and(
          eq(LagerplatzTable.lagerId, lagerIdNum),
          eq(LagerplatzTable.regalNR, parsedLocation.regalNR),
          eq(LagerplatzTable.regalSection, parsedLocation.regalSection),
          eq(LagerplatzTable.regalShelf, parsedLocation.regalShelf)
        )
      )
      .limit(1);

    if (lagerplatz.length === 0) {
      // Lagerplatz existiert noch nicht, erstelle ihn
      lagerplatz = await db
        .insert(LagerplatzTable)
        .values({
          lagerId: lagerIdNum,
          regalNR: parsedLocation.regalNR,
          regalSection: parsedLocation.regalSection,
          regalShelf: parsedLocation.regalShelf,
        })
        .returning({ lagerplatzId: LagerplatzTable.lagerplatzId });
    }

    // Erstelle das neue Produkt
    const newProduct = await db
      .insert(productTable)
      .values({
        produktName: produktName.trim(),
        barcode: barcode.trim(),
        kategorie: kategorie?.trim() || null,
        mindestBestand: 0,
        aktuellerBestand: 0,
      })
      .returning({
        productId: productTable.productId,
        produktName: productTable.produktName,
        barcode: productTable.barcode,
        mindestBestand: productTable.mindestBestand,
        aktuellerBestand: productTable.aktuellerBestand,
        lastChange: productTable.lastChange,
      });

    // Erstelle die Zuordnung zwischen Produkt und Lagerplatz
    const newZuordnung = await db
      .insert(ZuordnungTable)
      .values({
        lagerplatzId: lagerplatz[0].lagerplatzId,
        productId: newProduct[0].productId,
        menge: mengeNum,
      })
      .returning({ plId: ZuordnungTable.plId, menge: ZuordnungTable.menge });

    return res.status(201).json({
      ...newProduct[0],
      ...newZuordnung[0],
      location: `${parsedLocation.regalNR}-${parsedLocation.regalSection}-${parsedLocation.regalShelf}`,
    });
  } catch (err) {
    console.error('Produkt create error:', err);
    return res.status(500).json({ error: 'Fehler beim Erstellen des Produkts' });
  }
});


/**
 * PUT /lager/:lagerId/produkte/:plId - Produkt aktualisieren
 * Aktualisiert Produktinformationen und die Zuordnung zum Lagerplatz
 */
app.put('/lager/:lagerId/produkte/:plId', async (req: Request, res: Response) => {
  try {
    const lagerIdNum = Number.parseInt(req.params.lagerId, 10);
    const plIdNum = Number.parseInt(req.params.plId, 10);

    if (Number.isNaN(lagerIdNum) || Number.isNaN(plIdNum)) {
      return res.status(400).json({ error: 'Ungültige IDs' });
    }

    const {
      produktName,
      barcode,
      menge,
      kategorie,
      location,
    } = req.body as {
      produktName?: string;
      barcode?: string;
      menge?: number;
      kategorie?: string;
      location?: string;
    };

    if (!produktName || !barcode || menge === undefined) {
      return res.status(400).json({ error: 'produktName, barcode und menge sind erforderlich' });
    }

    const mengeNum = Number.parseInt(String(menge), 10);
    const mindestNum = 0;
    const bestandNum = 0;

    if (Number.isNaN(mengeNum) || mengeNum < 0) {
      return res.status(400).json({ error: 'Ungültige menge' });
    }

    // Finde die Zuordnung und das Produkt
    const mapping = await db
      .select({
        productId: ZuordnungTable.productId,
        lagerplatzId: ZuordnungTable.lagerplatzId,
      })
      .from(ZuordnungTable)
      .innerJoin(LagerplatzTable, eq(LagerplatzTable.lagerplatzId, ZuordnungTable.lagerplatzId))
      .where(and(eq(ZuordnungTable.plId, plIdNum), eq(LagerplatzTable.lagerId, lagerIdNum)))
      .limit(1);

    if (mapping.length === 0) {
      return res.status(404).json({ error: 'Produktzuordnung nicht gefunden' });
    }

    // Prüfe Barcode-Eindeutigkeit
    const existingBarcode = await db
      .select({ productId: productTable.productId })
      .from(productTable)
      .where(eq(productTable.barcode, barcode.trim()))
      .limit(1);

    if (existingBarcode.length > 0 && existingBarcode[0].productId !== mapping[0].productId) {
      return res.status(409).json({ error: 'Barcode existiert bereits' });
    }

    // Aktualisiere Produktinformation
    await db
      .update(productTable)
      .set({
        produktName: produktName.trim(),
        barcode: barcode.trim(),
        kategorie: kategorie?.trim() || null,
        mindestBestand: mindestNum,
        aktuellerBestand: bestandNum,
        lastChange: new Date(),
      })
      .where(eq(productTable.productId, mapping[0].productId));

    // Aktualisiere die Menge in der Zuordnung
    await db
      .update(ZuordnungTable)
      .set({ menge: mengeNum })
      .where(eq(ZuordnungTable.plId, plIdNum));

    // Parse neue Location wenn angegeben
    const parsedLocation = parseLocation(location);

    // Suche oder erstelle neuen Lagerplatz
    let lagerplatz = await db
      .select({ lagerplatzId: LagerplatzTable.lagerplatzId })
      .from(LagerplatzTable)
      .where(
        and(
          eq(LagerplatzTable.lagerId, lagerIdNum),
          eq(LagerplatzTable.regalNR, parsedLocation.regalNR),
          eq(LagerplatzTable.regalSection, parsedLocation.regalSection),
          eq(LagerplatzTable.regalShelf, parsedLocation.regalShelf)
        )
      )
      .limit(1);

    if (lagerplatz.length === 0) {
      lagerplatz = await db
        .insert(LagerplatzTable)
        .values({
          lagerId: lagerIdNum,
          regalNR: parsedLocation.regalNR,
          regalSection: parsedLocation.regalSection,
          regalShelf: parsedLocation.regalShelf,
        })
        .returning({ lagerplatzId: LagerplatzTable.lagerplatzId });
    }

    // Aktualisiere den Lagerplatz der Zuordnung
    await db
      .update(ZuordnungTable)
      .set({ lagerplatzId: lagerplatz[0].lagerplatzId })
      .where(eq(ZuordnungTable.plId, plIdNum));

    return res.json({ success: true });
  } catch (err) {
    console.error('Produkt update error:', err);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Produkts' });
  }
});

/**
 * DELETE /lager/:lagerId/produkte/:plId - Produkt aus Lager löschen
 * Löscht die Zuordnung und cascaded das Produkt wenn es nirgendwo sonst verwendet wird
 */
app.delete('/lager/:lagerId/produkte/:plId', async (req: Request, res: Response) => {
  try {
    const lagerIdNum = Number.parseInt(req.params.lagerId, 10);
    const plIdNum = Number.parseInt(req.params.plId, 10);

    if (Number.isNaN(lagerIdNum) || Number.isNaN(plIdNum)) {
      return res.status(400).json({ error: 'Ungültige IDs' });
    }

    // Finde das Produkt dieser Zuordnung
    const mapping = await db
      .select({ productId: ZuordnungTable.productId })
      .from(ZuordnungTable)
      .innerJoin(LagerplatzTable, eq(LagerplatzTable.lagerplatzId, ZuordnungTable.lagerplatzId))
      .where(and(eq(ZuordnungTable.plId, plIdNum), eq(LagerplatzTable.lagerId, lagerIdNum)))
      .limit(1);

    if (mapping.length === 0) {
      return res.status(404).json({ error: 'Produktzuordnung nicht gefunden' });
    }

    // Lösche die Zuordnung
    await db.delete(ZuordnungTable).where(eq(ZuordnungTable.plId, plIdNum));

    // Prüfe ob dieses Produkt noch irgendwo zugeordnet ist
    const remainingMappings = await db
      .select({ plId: ZuordnungTable.plId })
      .from(ZuordnungTable)
      .where(eq(ZuordnungTable.productId, mapping[0].productId))
      .limit(1);

    // Wenn das Produkt nirgendwo sonst verwendet wird, lösche auch das Produkt
    if (remainingMappings.length === 0) {
      await db.delete(productTable).where(eq(productTable.productId, mapping[0].productId));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Produkt delete error:', err);
    return res.status(500).json({ error: 'Fehler beim Löschen des Produkts' });
  }
});

/**
 * GET /produkte/barcode/:barcode - Produkt anhand Barcode suchen
 * Liefert umfassende Informationen mit Lagerplatzangaben
 */
app.get('/produkte/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const barcode = (req.params.barcode || '').trim();

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode fehlt' });
    }

    // Komplexe Abfrage um alle Lagerplätze des Produkts zu finden
    const rows = await db
      .select({
        productId: productTable.productId,
        produktName: productTable.produktName,
        barcode: productTable.barcode,
        aktuellerBestand: productTable.aktuellerBestand,
        mindestBestand: productTable.mindestBestand,
        lagerName: lagerTable.lagerName,
        regalNR: LagerplatzTable.regalNR,
        regalSection: LagerplatzTable.regalSection,
        regalShelf: LagerplatzTable.regalShelf,
        menge: ZuordnungTable.menge,
      })
      .from(productTable)
      .leftJoin(ZuordnungTable, eq(ZuordnungTable.productId, productTable.productId))
      .leftJoin(LagerplatzTable, eq(LagerplatzTable.lagerplatzId, ZuordnungTable.lagerplatzId))
      .leftJoin(lagerTable, eq(lagerTable.lagerId, LagerplatzTable.lagerId))
      .where(eq(productTable.barcode, barcode));

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }

    const first = rows[0];
    // Sammle alle Lagerplätze dieses Produkts
    const lagerplaetze = rows
      .filter((row) => row.regalNR !== null && row.regalSection !== null && row.regalShelf !== null)
      .map((row) => ({
        lagerName: row.lagerName,
        position: `${row.regalNR}-${row.regalSection}-${row.regalShelf}`,
        menge: row.menge,
      }));

    return res.json({
      product: {
        productId: first.productId,
        produktName: first.produktName,
        barcode: first.barcode,
        aktuellerBestand: first.aktuellerBestand,
        mindestBestand: first.mindestBestand,
      },
      lagerplaetze,
    });
  } catch (err) {
    console.error('Barcode lookup error:', err);
    return res.status(500).json({ error: 'Fehler bei der Barcode-Suche' });
  }
});

app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort benötigt' });
    }

    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const ok = await bcrypt.compare(password, user.passwortHash);
    if (!ok) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = jwt.sign(
      { uid: user.benutzerId, role: user.rolle, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      user: {
        id: user.benutzerId,
        name: user.benutzername,
        email: user.email,
        role: user.rolle,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});



// Nach dem Import von db
(async () => {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`; // Test connection
    await sql`
      CREATE OR REPLACE FUNCTION prevent_admin_user_delete()
      RETURNS trigger AS $$
      BEGIN
        IF lower(coalesce(OLD.email, '')) = 'admin@example.com'
           OR upper(coalesce(OLD.rolle, '')) = 'ADMIN' THEN
          RAISE EXCEPTION 'Admin-Benutzer kann nicht gelöscht werden';
        END IF;

        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await sql`DROP TRIGGER IF EXISTS trg_prevent_admin_user_delete ON "userTable";`;
    await sql`
      CREATE TRIGGER trg_prevent_admin_user_delete
      BEFORE DELETE ON "userTable"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_admin_user_delete();
    `;
    console.log('Datenbankverbindung erfolgreich');
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    process.exit(1);
  }
})();

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Auth server läuft auf http://127.0.0.1:${PORT}`);
});


//register Anfang
app.post('/register', async (req: Request, res: Response) => {
  try {
    const body: any = req.body || {};
    const username = body.username || body.benutzername;
    const email = body.email;
    const password = body.password;
    const roleRaw = body.role || body.rolle || 'USER';
    const rolle = String(roleRaw).toUpperCase();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Benutzername, Email und Passwort benötigt' });
    }

    // Check if user already exists
    const existing = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email existiert bereits' });
    }

    // Hash password
    const passwortHash = await bcrypt.hash(password, 10);

    // Insert new user with provided role
    const result = await db
      .insert(userTable)
      .values({
        benutzername: username,
        email: email,
        passwortHash: passwortHash,
        rolle: rolle,
      })
      .returning({ id: userTable.benutzerId });

    return res.status(201).json({
      message: 'Benutzer erfolgreich erstellt',
      user: {
        id: result[0].id,
        username: username,
        email: email,
        role: rolle,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});
//register Ende