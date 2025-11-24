CREATE TABLE "lagerplatzTable" (
	"lagerplatz_id" serial PRIMARY KEY NOT NULL,
	"lager_id" serial NOT NULL,
	"regalNR" varchar(10) NOT NULL,
	"regalSection" varchar(10) NOT NULL,
	"regalShelf" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zuordnungTable" (
	"pl_id" serial PRIMARY KEY NOT NULL,
	"lagerplatz_id" serial NOT NULL,
	"product_id" serial NOT NULL,
	"menge" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lagerTable" (
	"lager_id" serial PRIMARY KEY NOT NULL,
	"lager_name" text NOT NULL,
	"standort" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productTable" (
	"product_id" serial PRIMARY KEY NOT NULL,
	"produkt_name" text NOT NULL,
	"mindest_bestand" integer NOT NULL,
	"aktueller_bestand" integer NOT NULL,
	"barcode" varchar(128) NOT NULL,
	"lastChange" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "productTable_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "userTable" (
	"benutzer_id" serial PRIMARY KEY NOT NULL,
	"benutzername" text NOT NULL,
	"email" text NOT NULL,
	"passwort_hash" text NOT NULL,
	"rolle" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userTable_benutzername_unique" UNIQUE("benutzername"),
	CONSTRAINT "userTable_email_unique" UNIQUE("email")
);
