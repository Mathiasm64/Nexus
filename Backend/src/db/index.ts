/**
 * DATENBANKVERBINDUNG SETUP
 * 
 * Dieses Modul initialisiert die Verbindung zur PostgreSQL-Datenbank
 * mit Drizzle ORM und Neon Serverless
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';

// Umgebungsvariablen laden
dotenv.config();

// Neon SQL-Client initialisieren mit Datenbankverbindungs-URL aus .env
// Neon ist ein serverless PostgreSQL-Service
const sql = neon(process.env.DATABASE_URL!);

// Drizzle ORM mit Neon HTTP-Client initialisieren
// Dies wird als globale Datenbankverbindung exportiert
export const db = drizzle(sql);
