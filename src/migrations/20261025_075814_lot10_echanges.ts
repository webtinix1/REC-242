import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_expert_requests_fil_auteur_type" AS ENUM('membre', 'expert', 'rec242', 'systeme');
  CREATE TYPE "public"."enum_expert_requests_preference" AS ENUM('whatsapp', 'email', 'siege');
  CREATE TYPE "public"."enum_expert_requests_statut" AS ENUM('envoyee', 'en-cours', 'repondue', 'sans-reponse', 'reattribuee', 'cloturee');
  CREATE TYPE "public"."enum_commission_requests_statut" AS ENUM('attente', 'acceptee', 'refusee');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'demandesSansReponse';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'demandesSansReponse';
  CREATE TABLE "connection_requests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "opportunity_replies_fil" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"auteur_id" integer,
  	"texte" varchar,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "opportunity_replies_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  CREATE TABLE "expert_requests_fil" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"auteur_type" "enum_expert_requests_fil_auteur_type",
  	"auteur_nom" varchar,
  	"texte" varchar,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "expert_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membre_id" integer,
  	"etiquette_id" integer NOT NULL,
  	"personne_id" integer NOT NULL,
  	"question" varchar NOT NULL,
  	"preference" "enum_expert_requests_preference" DEFAULT 'email',
  	"statut" "enum_expert_requests_statut" DEFAULT 'envoyee',
  	"echeance" timestamp(3) with time zone,
  	"opportunite_id" integer,
  	"relances" numeric DEFAULT 0,
  	"non_lu_membre" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "commission_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membre_id" integer,
  	"commission_id" integer NOT NULL,
  	"statut" "enum_commission_requests_statut" DEFAULT 'attente',
  	"apport" varchar,
  	"traite_par" varchar,
  	"date_traitement" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "expert_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commission_requests_id" integer;
  ALTER TABLE "connection_requests_rels" ADD CONSTRAINT "connection_requests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."connection_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "connection_requests_rels" ADD CONSTRAINT "connection_requests_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunity_replies_fil" ADD CONSTRAINT "opportunity_replies_fil_auteur_id_members_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunity_replies_fil" ADD CONSTRAINT "opportunity_replies_fil_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opportunity_replies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunity_replies_rels" ADD CONSTRAINT "opportunity_replies_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."opportunity_replies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opportunity_replies_rels" ADD CONSTRAINT "opportunity_replies_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "expert_requests_fil" ADD CONSTRAINT "expert_requests_fil_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."expert_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "expert_requests" ADD CONSTRAINT "expert_requests_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expert_requests" ADD CONSTRAINT "expert_requests_etiquette_id_expertise_tags_id_fk" FOREIGN KEY ("etiquette_id") REFERENCES "public"."expertise_tags"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expert_requests" ADD CONSTRAINT "expert_requests_personne_id_people_id_fk" FOREIGN KEY ("personne_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expert_requests" ADD CONSTRAINT "expert_requests_opportunite_id_opportunities_id_fk" FOREIGN KEY ("opportunite_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commission_requests" ADD CONSTRAINT "commission_requests_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commission_requests" ADD CONSTRAINT "commission_requests_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "connection_requests_rels_order_idx" ON "connection_requests_rels" USING btree ("order");
  CREATE INDEX "connection_requests_rels_parent_idx" ON "connection_requests_rels" USING btree ("parent_id");
  CREATE INDEX "connection_requests_rels_path_idx" ON "connection_requests_rels" USING btree ("path");
  CREATE INDEX "connection_requests_rels_members_id_idx" ON "connection_requests_rels" USING btree ("members_id");
  CREATE INDEX "opportunity_replies_fil_order_idx" ON "opportunity_replies_fil" USING btree ("_order");
  CREATE INDEX "opportunity_replies_fil_parent_id_idx" ON "opportunity_replies_fil" USING btree ("_parent_id");
  CREATE INDEX "opportunity_replies_fil_auteur_idx" ON "opportunity_replies_fil" USING btree ("auteur_id");
  CREATE INDEX "opportunity_replies_rels_order_idx" ON "opportunity_replies_rels" USING btree ("order");
  CREATE INDEX "opportunity_replies_rels_parent_idx" ON "opportunity_replies_rels" USING btree ("parent_id");
  CREATE INDEX "opportunity_replies_rels_path_idx" ON "opportunity_replies_rels" USING btree ("path");
  CREATE INDEX "opportunity_replies_rels_members_id_idx" ON "opportunity_replies_rels" USING btree ("members_id");
  CREATE INDEX "expert_requests_fil_order_idx" ON "expert_requests_fil" USING btree ("_order");
  CREATE INDEX "expert_requests_fil_parent_id_idx" ON "expert_requests_fil" USING btree ("_parent_id");
  CREATE INDEX "expert_requests_membre_idx" ON "expert_requests" USING btree ("membre_id");
  CREATE INDEX "expert_requests_etiquette_idx" ON "expert_requests" USING btree ("etiquette_id");
  CREATE INDEX "expert_requests_personne_idx" ON "expert_requests" USING btree ("personne_id");
  CREATE INDEX "expert_requests_statut_idx" ON "expert_requests" USING btree ("statut");
  CREATE INDEX "expert_requests_opportunite_idx" ON "expert_requests" USING btree ("opportunite_id");
  CREATE INDEX "expert_requests_updated_at_idx" ON "expert_requests" USING btree ("updated_at");
  CREATE INDEX "expert_requests_created_at_idx" ON "expert_requests" USING btree ("created_at");
  CREATE INDEX "commission_requests_membre_idx" ON "commission_requests" USING btree ("membre_id");
  CREATE INDEX "commission_requests_commission_idx" ON "commission_requests" USING btree ("commission_id");
  CREATE INDEX "commission_requests_statut_idx" ON "commission_requests" USING btree ("statut");
  CREATE INDEX "commission_requests_updated_at_idx" ON "commission_requests" USING btree ("updated_at");
  CREATE INDEX "commission_requests_created_at_idx" ON "commission_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_expert_requests_fk" FOREIGN KEY ("expert_requests_id") REFERENCES "public"."expert_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commission_requests_fk" FOREIGN KEY ("commission_requests_id") REFERENCES "public"."commission_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_expert_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("expert_requests_id");
  CREATE INDEX "payload_locked_documents_rels_commission_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("commission_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "connection_requests_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opportunity_replies_fil" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "opportunity_replies_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "expert_requests_fil" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "expert_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commission_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "connection_requests_rels" CASCADE;
  DROP TABLE "opportunity_replies_fil" CASCADE;
  DROP TABLE "opportunity_replies_rels" CASCADE;
  DROP TABLE "expert_requests_fil" CASCADE;
  DROP TABLE "expert_requests" CASCADE;
  DROP TABLE "commission_requests" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_expert_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commission_requests_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille', 'expirerOpportunites');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille', 'expirerOpportunites');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_expert_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_commission_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "expert_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commission_requests_id";
  DROP TYPE "public"."enum_expert_requests_fil_auteur_type";
  DROP TYPE "public"."enum_expert_requests_preference";
  DROP TYPE "public"."enum_expert_requests_statut";
  DROP TYPE "public"."enum_commission_requests_statut";`)
}
