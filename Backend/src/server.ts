import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { userTable, lagerTable, LagerplatzTable, ZuordnungTable, productTable } from './db/schema';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/lager', async (_req: Request, res: Response) => {
  try {
    const lager = await db.select().from(lagerTable);
    return res.json(lager);
  } catch (err) {
    console.error('Lager fetch error:', err);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Lager' });
  }
});

app.get('/lager/:lagerId/produkte', async (req: Request, res: Response) => {
  try {
    const { lagerId } = req.params;
    const lagerIdNum = parseInt(lagerId);

    if (Number.isNaN(lagerIdNum)) {
      return res.status(400).json({ error: 'Ungültige lagerId' });
    }
    
    // Hole alle Produkte für dieses Lager
    // Über die Beziehung: Lager -> Lagerplatz -> Zuordnung -> Produkt
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

    if (!produktName || !barcode || menge === undefined) {
      return res.status(400).json({ error: 'produktName, barcode und menge sind erforderlich' });
    }

    const mengeNum = Number.parseInt(String(menge), 10);

    if (Number.isNaN(mengeNum) || mengeNum < 0) {
      return res.status(400).json({ error: 'Ungültige menge' });
    }

    const existingBarcode = await db
      .select({ productId: productTable.productId })
      .from(productTable)
      .where(eq(productTable.barcode, barcode.trim()))
      .limit(1);

    if (existingBarcode.length > 0) {
      return res.status(409).json({ error: 'Barcode existiert bereits' });
    }

    const parsedLocation = parseLocation(location);

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

    const existingBarcode = await db
      .select({ productId: productTable.productId })
      .from(productTable)
      .where(eq(productTable.barcode, barcode.trim()))
      .limit(1);

    if (existingBarcode.length > 0 && existingBarcode[0].productId !== mapping[0].productId) {
      return res.status(409).json({ error: 'Barcode existiert bereits' });
    }

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

    await db
      .update(ZuordnungTable)
      .set({ menge: mengeNum })
      .where(eq(ZuordnungTable.plId, plIdNum));

    const parsedLocation = parseLocation(location);

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

app.delete('/lager/:lagerId/produkte/:plId', async (req: Request, res: Response) => {
  try {
    const lagerIdNum = Number.parseInt(req.params.lagerId, 10);
    const plIdNum = Number.parseInt(req.params.plId, 10);

    if (Number.isNaN(lagerIdNum) || Number.isNaN(plIdNum)) {
      return res.status(400).json({ error: 'Ungültige IDs' });
    }

    const mapping = await db
      .select({ productId: ZuordnungTable.productId })
      .from(ZuordnungTable)
      .innerJoin(LagerplatzTable, eq(LagerplatzTable.lagerplatzId, ZuordnungTable.lagerplatzId))
      .where(and(eq(ZuordnungTable.plId, plIdNum), eq(LagerplatzTable.lagerId, lagerIdNum)))
      .limit(1);

    if (mapping.length === 0) {
      return res.status(404).json({ error: 'Produktzuordnung nicht gefunden' });
    }

    await db.delete(ZuordnungTable).where(eq(ZuordnungTable.plId, plIdNum));

    const remainingMappings = await db
      .select({ plId: ZuordnungTable.plId })
      .from(ZuordnungTable)
      .where(eq(ZuordnungTable.productId, mapping[0].productId))
      .limit(1);

    if (remainingMappings.length === 0) {
      await db.delete(productTable).where(eq(productTable.productId, mapping[0].productId));
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Produkt delete error:', err);
    return res.status(500).json({ error: 'Fehler beim Löschen des Produkts' });
  }
});

app.get('/produkte/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const barcode = (req.params.barcode || '').trim();

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode fehlt' });
    }

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
    console.log('Datenbankverbindung erfolgreich');
  } catch (error) {
    console.error('Datenbankverbindungsfehler:', error);
    process.exit(1);
  }
})();

app.listen(PORT, () => {
  console.log(`Auth server läuft auf Port ${PORT}`);
});


//register Anfang
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as { username?: string; email?: string; password?: string };

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

    // Insert new user
    const result = await db
      .insert(userTable)
      .values({
        benutzername: username,
        email: email,
        passwortHash: passwortHash,
        rolle: 'USER',
      })
      .returning({ id: userTable.benutzerId });

    return res.status(201).json({
      message: 'Benutzer erfolgreich erstellt',
      user: {
        id: result[0].id,
        username: username,
        email: email,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Serverfehler' });
  }
});
//register Ende