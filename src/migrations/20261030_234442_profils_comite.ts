import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { slugify } from '../fields/slug'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_people_rubriques_disposition" AS ENUM('chronologie', 'cartes');
  CREATE TABLE "people_chiffres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valeur" varchar NOT NULL,
  	"libelle" varchar NOT NULL
  );
  
  CREATE TABLE "people_rubriques_entrees" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"periode" varchar,
  	"lieu" varchar,
  	"titre" varchar NOT NULL,
  	"organisation" varchar,
  	"description" varchar,
  	"points" varchar
  );
  
  CREATE TABLE "people_rubriques" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL,
  	"disposition" "enum_people_rubriques_disposition" DEFAULT 'chronologie' NOT NULL
  );
  
  CREATE TABLE "people_competences" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL,
  	"texte" varchar
  );
  
  ALTER TABLE "people" ADD COLUMN "accroche" varchar;
  ALTER TABLE "people" ADD COLUMN "lieu" varchar;
  ALTER TABLE "people" ADD COLUMN "presentation" varchar;
  ALTER TABLE "people" ADD COLUMN "domaines" varchar;
  ALTER TABLE "people" ADD COLUMN "slug" varchar;
  ALTER TABLE "people_chiffres" ADD CONSTRAINT "people_chiffres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_rubriques_entrees" ADD CONSTRAINT "people_rubriques_entrees_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people_rubriques"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_rubriques" ADD CONSTRAINT "people_rubriques_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_competences" ADD CONSTRAINT "people_competences_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "people_chiffres_order_idx" ON "people_chiffres" USING btree ("_order");
  CREATE INDEX "people_chiffres_parent_id_idx" ON "people_chiffres" USING btree ("_parent_id");
  CREATE INDEX "people_rubriques_entrees_order_idx" ON "people_rubriques_entrees" USING btree ("_order");
  CREATE INDEX "people_rubriques_entrees_parent_id_idx" ON "people_rubriques_entrees" USING btree ("_parent_id");
  CREATE INDEX "people_rubriques_order_idx" ON "people_rubriques" USING btree ("_order");
  CREATE INDEX "people_rubriques_parent_id_idx" ON "people_rubriques" USING btree ("_parent_id");
  CREATE INDEX "people_competences_order_idx" ON "people_competences" USING btree ("_order");
  CREATE INDEX "people_competences_parent_id_idx" ON "people_competences" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");`)

  // Fiches déjà en base : chacune reçoit son adresse, l'identifiant départage les homonymes.
  const { rows } = await db.execute(sql`SELECT "id", "nom" FROM "people" ORDER BY "id"`)
  const prises = new Set<string>()
  for (const p of rows as { id: number; nom: string }[]) {
    const base = slugify(p.nom) || 'personne'
    const slug = prises.has(base) ? `${base}-${p.id}` : base
    prises.add(slug)
    await db.execute(sql`UPDATE "people" SET "slug" = ${slug} WHERE "id" = ${p.id}`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people_chiffres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people_rubriques_entrees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people_rubriques" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people_competences" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "people_chiffres" CASCADE;
  DROP TABLE "people_rubriques_entrees" CASCADE;
  DROP TABLE "people_rubriques" CASCADE;
  DROP TABLE "people_competences" CASCADE;
  DROP INDEX "people_slug_idx";
  ALTER TABLE "people" DROP COLUMN "accroche";
  ALTER TABLE "people" DROP COLUMN "lieu";
  ALTER TABLE "people" DROP COLUMN "presentation";
  ALTER TABLE "people" DROP COLUMN "domaines";
  ALTER TABLE "people" DROP COLUMN "slug";
  DROP TYPE "public"."enum_people_rubriques_disposition";`)
}
