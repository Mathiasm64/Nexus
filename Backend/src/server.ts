import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
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
    
    // Hole alle Produkte für dieses Lager
    // Über die Beziehung: Lager -> Lagerplatz -> Zuordnung -> Produkt
    const produkte = await db
      .select({
        productId: productTable.productId,
        produktName: productTable.produktName,
        mindestBestand: productTable.mindestBestand,
        aktuellerBestand: productTable.aktuellerBestand,
        barcode: productTable.barcode,
        menge: ZuordnungTable.menge,
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