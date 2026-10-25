import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_documents_visibilite" AS ENUM('tous', 'inscrits');
  CREATE TYPE "public"."enum_events_format" AS ENUM('sur-place', 'visio', 'communique');
  CREATE TYPE "public"."enum_events_acces" AS ENUM('tous', 'membres', 'invitation');
  CREATE TYPE "public"."enum_events_statut" AS ENUM('brouillon', 'publie', 'complet', 'annule', 'reporte', 'termine');
  CREATE TYPE "public"."enum_registrations_statut" AS ENUM('inscrit', 'attente', 'annule', 'present');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'rappelVeille';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'rappelVeille';
  CREATE TABLE "events_programme" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heure" varchar,
  	"intitule" varchar NOT NULL
  );
  
  CREATE TABLE "events_intervenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"fonction" varchar,
  	"photo_id" integer
  );
  
  CREATE TABLE "events_documents" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"document_id" integer NOT NULL,
  	"visibilite" "enum_events_documents_visibilite" DEFAULT 'tous'
  );
  
  CREATE TABLE "events_galerie" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL,
  	"slug" varchar,
  	"type_id" integer,
  	"commission_id" integer,
  	"chapeau" varchar,
  	"description" jsonb,
  	"debut" timestamp(3) with time zone NOT NULL,
  	"fin" timestamp(3) with time zone,
  	"format" "enum_events_format" DEFAULT 'sur-place',
  	"lieu" varchar,
  	"ville_id" integer,
  	"adresse" varchar,
  	"lien_carte" varchar,
  	"indications_acces" varchar,
  	"image_id" integer,
  	"acces" "enum_events_acces" DEFAULT 'tous',
  	"capacite" numeric,
  	"cloture" timestamp(3) with time zone,
  	"liste_attente" boolean DEFAULT true,
  	"rappel_veille" boolean DEFAULT true,
  	"billet_qr" boolean DEFAULT true,
  	"tarif" varchar,
  	"compte_rendu" jsonb,
  	"participants" numeric,
  	"actualite_id" integer,
  	"statut" "enum_events_statut" DEFAULT 'brouillon',
  	"message_inscrits" varchar,
  	"nouvelle_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer
  );
  
  CREATE TABLE "registrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"evenement_id" integer NOT NULL,
  	"membre_id" integer,
  	"statut" "enum_registrations_statut" DEFAULT 'inscrit',
  	"visiteur_nom" varchar,
  	"visiteur_email" varchar,
  	"visiteur_telephone" varchar,
  	"visiteur_entreprise" varchar,
  	"position" numeric,
  	"numero_billet" varchar,
  	"pointe_le" timestamp(3) with time zone,
  	"pointe_par" varchar,
  	"annule_le" timestamp(3) with time zone,
  	"rappel_envoye" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "registrations_id" integer;
  ALTER TABLE "events_programme" ADD CONSTRAINT "events_programme_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_intervenants" ADD CONSTRAINT "events_intervenants_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_intervenants" ADD CONSTRAINT "events_intervenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_documents" ADD CONSTRAINT "events_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_documents" ADD CONSTRAINT "events_documents_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_galerie" ADD CONSTRAINT "events_galerie_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_galerie" ADD CONSTRAINT "events_galerie_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_type_id_event_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."event_types"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_ville_id_localities_id_fk" FOREIGN KEY ("ville_id") REFERENCES "public"."localities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_actualite_id_news_id_fk" FOREIGN KEY ("actualite_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_evenement_id_events_id_fk" FOREIGN KEY ("evenement_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "registrations" ADD CONSTRAINT "registrations_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_programme_order_idx" ON "events_programme" USING btree ("_order");
  CREATE INDEX "events_programme_parent_id_idx" ON "events_programme" USING btree ("_parent_id");
  CREATE INDEX "events_intervenants_order_idx" ON "events_intervenants" USING btree ("_order");
  CREATE INDEX "events_intervenants_parent_id_idx" ON "events_intervenants" USING btree ("_parent_id");
  CREATE INDEX "events_intervenants_photo_idx" ON "events_intervenants" USING btree ("photo_id");
  CREATE INDEX "events_documents_order_idx" ON "events_documents" USING btree ("_order");
  CREATE INDEX "events_documents_parent_id_idx" ON "events_documents" USING btree ("_parent_id");
  CREATE INDEX "events_documents_document_idx" ON "events_documents" USING btree ("document_id");
  CREATE INDEX "events_galerie_order_idx" ON "events_galerie" USING btree ("_order");
  CREATE INDEX "events_galerie_parent_id_idx" ON "events_galerie" USING btree ("_parent_id");
  CREATE INDEX "events_galerie_image_idx" ON "events_galerie" USING btree ("image_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_type_idx" ON "events" USING btree ("type_id");
  CREATE INDEX "events_commission_idx" ON "events" USING btree ("commission_id");
  CREATE INDEX "events_debut_idx" ON "events" USING btree ("debut");
  CREATE INDEX "events_ville_idx" ON "events" USING btree ("ville_id");
  CREATE INDEX "events_image_idx" ON "events" USING btree ("image_id");
  CREATE INDEX "events_actualite_idx" ON "events" USING btree ("actualite_id");
  CREATE INDEX "events_statut_idx" ON "events" USING btree ("statut");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_sectors_id_idx" ON "events_rels" USING btree ("sectors_id");
  CREATE INDEX "registrations_evenement_idx" ON "registrations" USING btree ("evenement_id");
  CREATE INDEX "registrations_membre_idx" ON "registrations" USING btree ("membre_id");
  CREATE INDEX "registrations_statut_idx" ON "registrations" USING btree ("statut");
  CREATE INDEX "registrations_visiteur_visiteur_email_idx" ON "registrations" USING btree ("visiteur_email");
  CREATE INDEX "registrations_numero_billet_idx" ON "registrations" USING btree ("numero_billet");
  CREATE INDEX "registrations_updated_at_idx" ON "registrations" USING btree ("updated_at");
  CREATE INDEX "registrations_created_at_idx" ON "registrations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_registrations_fk" FOREIGN KEY ("registrations_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_registrations_id_idx" ON "payload_locked_documents_rels" USING btree ("registrations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_programme" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_intervenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_galerie" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "registrations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_programme" CASCADE;
  DROP TABLE "events_intervenants" CASCADE;
  DROP TABLE "events_documents" CASCADE;
  DROP TABLE "events_galerie" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "registrations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_registrations_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_registrations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "registrations_id";
  DROP TYPE "public"."enum_events_documents_visibilite";
  DROP TYPE "public"."enum_events_format";
  DROP TYPE "public"."enum_events_acces";
  DROP TYPE "public"."enum_events_statut";
  DROP TYPE "public"."enum_registrations_statut";`)
}
