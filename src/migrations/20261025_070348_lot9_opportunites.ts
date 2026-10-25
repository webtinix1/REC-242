import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_opportunities_type" AS ENUM('partenariat', 'evenement', 'appel-offres', 'financement', 'b2b', 'offre-membre');
  CREATE TYPE "public"."enum_opportunities_visibilite" AS ENUM('public', 'membres');
  CREATE TYPE "public"."enum_opportunities_auteur" AS ENUM('rec242', 'membre');
  CREATE TYPE "public"."enum_opportunities_statut" AS ENUM('brouillon', 'a-moderer', 'modification', 'publiee', 'refusee', 'expiree');
  CREATE TYPE "public"."enum_fichiers_visibilite" AS ENUM('public', 'membres', 'prive');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'expirerOpportunites';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'expirerOpportunites';
  CREATE TABLE "opportunities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_opportunities_type" NOT NULL,
  	"visibilite" "enum_opportunities_visibilite" DEFAULT 'membres',
  	"date_limite" timestamp(3) with time zone,
  	"titre" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"source_lien" varchar,
  	"source_libelle" varchar,
  	"comment_repondre" varchar,
  	"piece_jointe_id" integer,
  	"auteur" "enum_opportunities_auteur" DEFAULT 'rec242',
  	"membre_id" integer,
  	"prevenir_secteurs" boolean DEFAULT false,
  	"mise_en_avant" boolean DEFAULT false,
  	"statut" "enum_opportunities_statut" DEFAULT 'brouillon',
  	"message_moderation" varchar,
  	"motif_refus" varchar,
  	"coordonnees" varchar,
  	"publie_le" timestamp(3) with time zone,
  	"alerte_envoyee" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "opportunities_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer
  );
  
  CREATE TABLE "opportunity_replies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"opportunite_id" integer NOT NULL,
  	"membre_id" integer,
  	"message" varchar NOT NULL,
  	"piece_jointe_id" integer,
  	"lue" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "fichiers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"visibilite" "enum_fichiers_visibilite" DEFAULT 'prive',
  	"proprietaire_id" integer,
  	"destinataire_id" integer,
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
  
  ALTER TABLE "people" ADD COLUMN "email" varchar;
  ALTER TABLE "people" ADD COLUMN "membre_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "opportunities_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "opportunity_replies_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fichiers_id" integer;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_piece_jointe_id_fichiers_id_fk" FOREIGN KEY ("piece_jointe_id") REFERENCES "public"."fichiers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunities_rels" ADD CONSTRAINT "opportunities_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunity_replies" ADD CONSTRAINT "opportunity_replies_opportunite_id_opportunities_id_fk" FOREIGN KEY ("opportunite_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_replies" ADD CONSTRAINT "opportunity_replies_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_replies" ADD CONSTRAINT "opportunity_replies_piece_jointe_id_fichiers_id_fk" FOREIGN KEY ("piece_jointe_id") REFERENCES "public"."fichiers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fichiers" ADD CONSTRAINT "fichiers_proprietaire_id_members_id_fk" FOREIGN KEY ("proprietaire_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fichiers" ADD CONSTRAINT "fichiers_destinataire_id_members_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "opportunities_date_limite_idx" ON "opportunities" USING btree ("date_limite");
  CREATE INDEX "opportunities_piece_jointe_idx" ON "opportunities" USING btree ("piece_jointe_id");
  CREATE INDEX "opportunities_membre_idx" ON "opportunities" USING btree ("membre_id");
  CREATE INDEX "opportunities_statut_idx" ON "opportunities" USING btree ("statut");
  CREATE INDEX "opportunities_updated_at_idx" ON "opportunities" USING btree ("updated_at");
  CREATE INDEX "opportunities_created_at_idx" ON "opportunities" USING btree ("created_at");
  CREATE INDEX "opportunities_rels_order_idx" ON "opportunities_rels" USING btree ("order");
  CREATE INDEX "opportunities_rels_parent_idx" ON "opportunities_rels" USING btree ("parent_id");
  CREATE INDEX "opportunities_rels_path_idx" ON "opportunities_rels" USING btree ("path");
  CREATE INDEX "opportunities_rels_sectors_id_idx" ON "opportunities_rels" USING btree ("sectors_id");
  CREATE INDEX "opportunity_replies_opportunite_idx" ON "opportunity_replies" USING btree ("opportunite_id");
  CREATE INDEX "opportunity_replies_membre_idx" ON "opportunity_replies" USING btree ("membre_id");
  CREATE INDEX "opportunity_replies_piece_jointe_idx" ON "opportunity_replies" USING btree ("piece_jointe_id");
  CREATE INDEX "opportunity_replies_updated_at_idx" ON "opportunity_replies" USING btree ("updated_at");
  CREATE INDEX "opportunity_replies_created_at_idx" ON "opportunity_replies" USING btree ("created_at");
  CREATE INDEX "fichiers_proprietaire_idx" ON "fichiers" USING btree ("proprietaire_id");
  CREATE INDEX "fichiers_destinataire_idx" ON "fichiers" USING btree ("destinataire_id");
  CREATE INDEX "fichiers_updated_at_idx" ON "fichiers" USING btree ("updated_at");
  CREATE INDEX "fichiers_created_at_idx" ON "fichiers" USING btree ("created_at");
  CREATE UNIQUE INDEX "fichiers_filename_idx" ON "fichiers" USING btree ("filename");
  ALTER TABLE "people" ADD CONSTRAINT "people_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunities_fk" FOREIGN KEY ("opportunities_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opportunity_replies_fk" FOREIGN KEY ("opportunity_replies_id") REFERENCES "public"."opportunity_replies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fichiers_fk" FOREIGN KEY ("fichiers_id") REFERENCES "public"."fichiers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "people_membre_idx" ON "people" USING btree ("membre_id");
  CREATE INDEX "payload_locked_documents_rels_opportunities_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunities_id");
  CREATE INDEX "payload_locked_documents_rels_opportunity_replies_id_idx" ON "payload_locked_documents_rels" USING btree ("opportunity_replies_id");
  CREATE INDEX "payload_locked_documents_rels_fichiers_id_idx" ON "payload_locked_documents_rels" USING btree ("fichiers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "opportunities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opportunities_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opportunity_replies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "fichiers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "opportunities" CASCADE;
  DROP TABLE "opportunities_rels" CASCADE;
  DROP TABLE "opportunity_replies" CASCADE;
  DROP TABLE "fichiers" CASCADE;
  ALTER TABLE "people" DROP CONSTRAINT "people_membre_id_members_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_opportunities_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_opportunity_replies_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fichiers_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "people_membre_idx";
  DROP INDEX "payload_locked_documents_rels_opportunities_id_idx";
  DROP INDEX "payload_locked_documents_rels_opportunity_replies_id_idx";
  DROP INDEX "payload_locked_documents_rels_fichiers_id_idx";
  ALTER TABLE "people" DROP COLUMN "email";
  ALTER TABLE "people" DROP COLUMN "membre_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "opportunities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "opportunity_replies_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fichiers_id";
  DROP TYPE "public"."enum_opportunities_type";
  DROP TYPE "public"."enum_opportunities_visibilite";
  DROP TYPE "public"."enum_opportunities_auteur";
  DROP TYPE "public"."enum_opportunities_statut";
  DROP TYPE "public"."enum_fichiers_visibilite";`)
}
