import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_questions_type" AS ENUM('texte', 'paragraphe', 'nombre', 'email', 'telephone', 'date', 'choix-unique', 'choix-multiple', 'liste', 'case', 'fichier');
  CREATE TYPE "public"."enum_events_questions_pour" AS ENUM('tous', 'visiteurs', 'membres');
  CREATE TABLE "events_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar NOT NULL,
  	"type" "enum_events_questions_type" DEFAULT 'texte' NOT NULL,
  	"aide" varchar,
  	"options" varchar,
  	"obligatoire" boolean DEFAULT false,
  	"pour" "enum_events_questions_pour" DEFAULT 'tous' NOT NULL
  );
  
  CREATE TABLE "registrations_reponses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"libelle" varchar,
  	"type" varchar,
  	"valeur" varchar,
  	"fichier_id" integer
  );
  
  CREATE TABLE "inscription_fichiers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inscription_fichiers_id" integer;
  ALTER TABLE "events_questions" ADD CONSTRAINT "events_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "registrations_reponses" ADD CONSTRAINT "registrations_reponses_fichier_id_inscription_fichiers_id_fk" FOREIGN KEY ("fichier_id") REFERENCES "public"."inscription_fichiers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations_reponses" ADD CONSTRAINT "registrations_reponses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_questions_order_idx" ON "events_questions" USING btree ("_order");
  CREATE INDEX "events_questions_parent_id_idx" ON "events_questions" USING btree ("_parent_id");
  CREATE INDEX "registrations_reponses_order_idx" ON "registrations_reponses" USING btree ("_order");
  CREATE INDEX "registrations_reponses_parent_id_idx" ON "registrations_reponses" USING btree ("_parent_id");
  CREATE INDEX "registrations_reponses_fichier_idx" ON "registrations_reponses" USING btree ("fichier_id");
  CREATE INDEX "inscription_fichiers_updated_at_idx" ON "inscription_fichiers" USING btree ("updated_at");
  CREATE INDEX "inscription_fichiers_created_at_idx" ON "inscription_fichiers" USING btree ("created_at");
  CREATE UNIQUE INDEX "inscription_fichiers_filename_idx" ON "inscription_fichiers" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inscription_fichiers_fk" FOREIGN KEY ("inscription_fichiers_id") REFERENCES "public"."inscription_fichiers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_inscription_fichiers_id_idx" ON "payload_locked_documents_rels" USING btree ("inscription_fichiers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registrations_reponses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inscription_fichiers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_questions" CASCADE;
  DROP TABLE "registrations_reponses" CASCADE;
  DROP TABLE "inscription_fichiers" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inscription_fichiers_fk";
  
  DROP INDEX "payload_locked_documents_rels_inscription_fichiers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inscription_fichiers_id";
  DROP TYPE "public"."enum_events_questions_type";
  DROP TYPE "public"."enum_events_questions_pour";`)
}
