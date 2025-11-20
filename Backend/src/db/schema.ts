import { integer, pgTable, serial, text, timestamp,varchar } from 'drizzle-orm/pg-core';

export const userTable = pgTable('userTable', {
  benutzerId: serial("benutzer_id").primaryKey(),
  benutzername: text("benutzername").notNull().unique(), // Drizzle unterstützt kein CITEXT direkt
  email: text("email").notNull().unique(),
  passwortHash: text("passwort_hash").notNull(),
  rolle: varchar({ length: 256 }).notNull(),
  created_at: timestamp().defaultNow().notNull(),
});

export const lagerTable = pgTable('lagerTable', {
  lagerId: serial("lager_id").primaryKey(),
  lagerName: text("lager_name").notNull(),
  standort: text("standort").notNull(),
  created_at: timestamp().defaultNow().notNull(),
});

export const LagerplatzTable = pgTable('lagerplatzTable', {
  lagerplatzId: serial("lagerplatz_id").primaryKey(),
  lagerId: serial("lager_id").notNull(),
  regalNR: varchar({ length: 10 }).notNull(),
  regalSection: varchar({ length: 10 }).notNull(),
  regalShelf: varchar({ length: 10 }).notNull(),
});

export const ZuordnungTable = pgTable('zuordnungTable', {
  plId: serial("pl_id").primaryKey(), //plID steht für Produkt-Lagerplatz ID
  lagerplatzId: serial("lagerplatz_id").notNull(),
  productId: serial("product_id").notNull(),
  menge: integer("menge").notNull(),
});

export const productTable = pgTable('productTable', {
  productId: serial("product_id").primaryKey(),
  produktName: text("produkt_name").notNull(),
  mindestBestand: integer("mindest_bestand").notNull(),
  aktuellerBestand: integer("aktueller_bestand").notNull(),
  barcode: varchar({ length: 128 }).notNull().unique(),
  lastChange: timestamp().defaultNow().notNull(),
});
