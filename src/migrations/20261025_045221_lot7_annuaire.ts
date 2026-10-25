import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_connection_requests_statut" AS ENUM('attente', 'acceptee', 'refusee', 'annulee', 'signalee');
  CREATE TYPE "public"."enum_directory_ads_format" AS ENUM('standard', 'logo', 'demi', 'pleine');
  CREATE TYPE "public"."enum_directory_ads_statut" AS ENUM('inclus', 'a-payer', 'paye', 'annule');
  CREATE TABLE "connection_requests_fil" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"auteur_id" integer,
  	"texte" varchar,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "connection_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"demandeur_id" integer,
  	"destinataire_id" integer,
  	"entreprise_id" integer NOT NULL,
  	"objet" varchar,
  	"message" varchar NOT NULL,
  	"statut" "enum_connection_requests_statut" DEFAULT 'attente',
  	"date_reponse" timestamp(3) with time zone,
  	"signalement_motif" varchar,
  	"signalement_par_id" integer,
  	"signalement_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "directory_ads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"edition" varchar,
  	"membre_id" integer NOT NULL,
  	"format" "enum_directory_ads_format" NOT NULL,
  	"montant" numeric,
  	"paiement_id" integer,
  	"statut" "enum_directory_ads_statut" DEFAULT 'a-payer',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "members" ADD COLUMN "relations_suspendues" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "connection_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "directory_ads_id" integer;
  ALTER TABLE "connection_requests_fil" ADD CONSTRAINT "connection_requests_fil_auteur_id_members_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "connection_requests_fil" ADD CONSTRAINT "connection_requests_fil_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."connection_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_demandeur_id_members_id_fk" FOREIGN KEY ("demandeur_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_destinataire_id_members_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_entreprise_id_companies_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_signalement_par_id_members_id_fk" FOREIGN KEY ("signalement_par_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "directory_ads" ADD CONSTRAINT "directory_ads_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "directory_ads" ADD CONSTRAINT "directory_ads_paiement_id_payments_id_fk" FOREIGN KEY ("paiement_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "connection_requests_fil_order_idx" ON "connection_requests_fil" USING btree ("_order");
  CREATE INDEX "connection_requests_fil_parent_id_idx" ON "connection_requests_fil" USING btree ("_parent_id");
  CREATE INDEX "connection_requests_fil_auteur_idx" ON "connection_requests_fil" USING btree ("auteur_id");
  CREATE INDEX "connection_requests_demandeur_idx" ON "connection_requests" USING btree ("demandeur_id");
  CREATE INDEX "connection_requests_destinataire_idx" ON "connection_requests" USING btree ("destinataire_id");
  CREATE INDEX "connection_requests_entreprise_idx" ON "connection_requests" USING btree ("entreprise_id");
  CREATE INDEX "connection_requests_statut_idx" ON "connection_requests" USING btree ("statut");
  CREATE INDEX "connection_requests_signalement_signalement_par_idx" ON "connection_requests" USING btree ("signalement_par_id");
  CREATE INDEX "connection_requests_updated_at_idx" ON "connection_requests" USING btree ("updated_at");
  CREATE INDEX "connection_requests_created_at_idx" ON "connection_requests" USING btree ("created_at");
  CREATE INDEX "directory_ads_edition_idx" ON "directory_ads" USING btree ("edition");
  CREATE INDEX "directory_ads_membre_idx" ON "directory_ads" USING btree ("membre_id");
  CREATE INDEX "directory_ads_paiement_idx" ON "directory_ads" USING btree ("paiement_id");
  CREATE INDEX "directory_ads_updated_at_idx" ON "directory_ads" USING btree ("updated_at");
  CREATE INDEX "directory_ads_created_at_idx" ON "directory_ads" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_connection_requests_fk" FOREIGN KEY ("connection_requests_id") REFERENCES "public"."connection_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_directory_ads_fk" FOREIGN KEY ("directory_ads_id") REFERENCES "public"."directory_ads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_connection_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("connection_requests_id");
  CREATE INDEX "payload_locked_documents_rels_directory_ads_id_idx" ON "payload_locked_documents_rels" USING btree ("directory_ads_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "connection_requests_fil" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "connection_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "directory_ads" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "connection_requests_fil" CASCADE;
  DROP TABLE "connection_requests" CASCADE;
  DROP TABLE "directory_ads" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_connection_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_directory_ads_fk";
  
  DROP INDEX "payload_locked_documents_rels_connection_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_directory_ads_id_idx";
  ALTER TABLE "members" DROP COLUMN "relations_suspendues";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "connection_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "directory_ads_id";
  DROP TYPE "public"."enum_connection_requests_statut";
  DROP TYPE "public"."enum_directory_ads_format";
  DROP TYPE "public"."enum_directory_ads_statut";`)
}
