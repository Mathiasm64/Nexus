/**
 * DATENBANKSCHEMA DEFINITIONEN
 * 
 * Dieses Modul definiert alle Datenbanktabellen für die WarehouseHub Anwendung
 * unter Verwendung von Drizzle ORM mit PostgreSQL
 * 
 * Tabellen:
 * - userTable: Benutzer mit Authentifizierung
 * - lagerTable: Lagerstätten/Warehouse
 * - LagerplatzTable: Spezifische Lagerplätze (Shelf-Positionen)
 * - productTable: Produkte mit Barcodes
 * - ZuordnungTable: Verknüpfung zwischen Produkten und Lagerplätzen
 */

import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * User Tabelle - Speichert Benutzerinformationen für Authentifizierung
 * 
 * Felder:
 * - benutzerId: Eindeutige Benutzer-ID (Primary Key)
 * - benutzername: Eindeutiger Benutzername für Login
 * - email: Eindeutige Email-Adresse
 * - passwortHash: BCrypt-gehashtes Passwort (niemals im Klartext speichern!)
 * - rolle: Benutzerrolle (z.B. ADMIN, USER)
 * - created_at: Zeitstempel der Erstellung
 */
export const userTable = pgTable('userTable', {
  benutzerId: serial("benutzer_id").primaryKey(),
  benutzername: text("benutzername").notNull().unique(),
  email: text("email").notNull().unique(),
  passwortHash: text("passwort_hash").notNull(),
  rolle: varchar({ length: 256 }).notNull(),
  created_at: timestamp().defaultNow().notNull(),
});

/**
 * Lager Tabelle - Hauptlagerstandorte
 * Ein Lager kann mehrere Lagerplätze (Regale) enthalten
 * 
 * Felder:
 * - lagerId: Eindeutige Lager-ID (Primary Key)
 * - lagerName: Name des Lagers (z.B. "Main Warehouse")
 * - standort: Physischer Standort (z.B. "Building A")
 * - created_at: Zeitstempel der Erstellung
 */
export const lagerTable = pgTable('lagerTable', {
  lagerId: serial("lager_id").primaryKey(),
  lagerName: text("lager_name").notNull(),
  standort: text("standort").notNull(),
  created_at: timestamp().defaultNow().notNull(),
});

/**
 * Lagerplatz Tabelle - Definiert spezifische Shelf-Positionen in einem Lager
 * Ein Lagerplatz wird durch Regal-Nummer, Section und Shelf definiert
 * 
 * Felder:
 * - lagerplatzId: Eindeutige Lagerplatz-ID (Primary Key)
 * - lagerId: Fremdschlüssel zur Lager Tabelle
 * - regalNR: Regal-Nummer (z.B. "A", "B")
 * - regalSection: Section innerhalb des Regals (z.B. "01", "02")
 * - regalShelf: Shelf/Ebene innerhalb der Section (z.B. "01", "02")
 */
export const LagerplatzTable = pgTable('lagerplatzTable', {
  lagerplatzId: serial("lagerplatz_id").primaryKey(),
  lagerId: serial("lager_id").notNull(),
  regalNR: varchar({ length: 10 }).notNull(),
  regalSection: varchar({ length: 10 }).notNull(),
  regalShelf: varchar({ length: 10 }).notNull(),
});

/**
 * Zuordnung Tabelle - Verknüpft Produkte mit Lagerplätzen
 * Eine Zuordnung ist eine Beziehung zwischen einem Produkt und einem Lagerplatz mit Menge
 * 
 * Felder:
 * - plId: Eindeutige Zuordnungs-ID (Primary Key)
 *         "plID" steht für Produkt-Lagerplatz ID
 * - lagerplatzId: Fremdschlüssel zu LagerplatzTable
 * - productId: Fremdschlüssel zu productTable
 * - menge: Anzahl der Produkte an diesem Lagerplatz
 */
export const ZuordnungTable = pgTable('zuordnungTable', {
  plId: serial("pl_id").primaryKey(),
  lagerplatzId: serial("lagerplatz_id").notNull(),
  productId: serial("product_id").notNull(),
  menge: integer("menge").notNull(),
});

/**
 * Product Tabelle - Speichert Produktinformationen
 * Jedes Produkt hat einen eindeutigen Barcode zur Identifikation
 * 
 * Felder:
 * - productId: Eindeutige Produkt-ID (Primary Key)
 * - produktName: Name des Produkts
 * - kategorie: Kategorie des Produkts (optional, z.B. "Raw Materials")
 * - mindestBestand: Minimaler Lagerbestand (für Warnungen)
 * - aktuellerBestand: Aktueller Lagerbestand
 * - barcode: Eindeutiger Barcode zur Produktidentifikation (z.B. EAN-Code)
 * - lastChange: Zeitstempel der letzten Änderung
 */
export const productTable = pgTable('productTable', {
  productId: serial("product_id").primaryKey(),
  produktName: text("produkt_name").notNull(),
  kategorie: text("kategorie"),
  mindestBestand: integer("mindest_bestand").notNull(),
  aktuellerBestand: integer("aktueller_bestand").notNull(),
  barcode: varchar({ length: 128 }).notNull().unique(),
  lastChange: timestamp().defaultNow().notNull(),
});
