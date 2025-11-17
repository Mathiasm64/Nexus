import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const userTable = pgTable('userTable', {
    benutzerId: serial("benutzer_id").primaryKey(),
  benutzername: text("benutzername").notNull().unique(), // Drizzle unterstützt kein CITEXT direkt
  email: text("email").notNull().unique(),
  passwortHash: text("passwort_hash").notNull(),

  rolle: text("rolle", { length: 20 })
    .notNull(),

  createdBy: uuid("created_by").references(() => benutzer.benutzerId, {
    onDelete: "set null",
});