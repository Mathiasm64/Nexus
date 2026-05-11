/**
 * DRIZZLE ORM KONFIGURATION
 * 
 * Diese Konfigurationsdatei wird von Drizzle Kit verwendet,
 * um Datenbankmigrationen zu generieren und zu verwalten
 */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Umgebungsvariablen laden
dotenv.config();

export default defineConfig({
  // Pfad zur Schema-Definition
  schema: "./src/db/schema.ts",
  
  // Ausgabeverzeichnis für Migrationen
  out: "./drizzle",
  
  // Datenbank-Dialekt (PostgreSQL)
  dialect: "postgresql",
  
  // Datenbankverbindung - URL aus .env lesen
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});


