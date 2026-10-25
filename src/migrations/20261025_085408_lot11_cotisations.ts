import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dues_tranches_statut" AS ENUM('a-payer', 'paye');
  CREATE TYPE "public"."enum_dues_statut" AS ENUM('a-jour', 'a-venir', 'en-relance', 'perte');
  CREATE TYPE "public"."enum_disciplinary_cases_griefs" AS ENUM('charte', 'statuts', 'illicite', 'escroquerie', 'autre');
  CREATE TYPE "public"."enum_disciplinary_cases_statut" AS ENUM('ouverte', 'griefs', 'defense', 'avis', 'decision', 'recours', 'close');
  CREATE TYPE "public"."enum_disciplinary_cases_sanction_envisagee" AS ENUM('rappel', 'avertissement', 'suspension', 'exclusion');
  CREATE TYPE "public"."enum_disciplinary_cases_sanction" AS ENUM('rappel', 'avertissement', 'suspension', 'exclusion');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'suiviAdhesions';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'suiviAdhesions';
  CREATE TABLE "dues_tranches" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numero" numeric,
  	"montant" numeric,
  	"echeance" timestamp(3) with time zone,
  	"statut" "enum_dues_tranches_statut" DEFAULT 'a-payer',
  	"paiement_id" integer
  );
  
  CREATE TABLE "dues_relances" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"numero" numeric,
  	"date" timestamp(3) with time zone,
  	"canal" varchar
  );
  
  CREATE TABLE "dues" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membre_id" integer NOT NULL,
  	"categorie" varchar,
  	"statut" "enum_dues_statut" DEFAULT 'a-venir',
  	"exercice_debut" timestamp(3) with time zone,
  	"exercice_fin" timestamp(3) with time zone,
  	"exercice_libelle" varchar,
  	"droit" numeric,
  	"montant" numeric,
  	"date_limite" timestamp(3) with time zone,
  	"constat_date" timestamp(3) with time zone,
  	"constat_pv" varchar,
  	"rappels" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "disciplinary_cases_griefs" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_disciplinary_cases_griefs",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "disciplinary_cases_historique" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"etape" varchar,
  	"auteur" varchar
  );
  
  CREATE TABLE "disciplinary_cases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" varchar,
  	"membre_id" integer NOT NULL,
  	"statut" "enum_disciplinary_cases_statut" DEFAULT 'ouverte',
  	"faits" varchar,
  	"sanction_envisagee" "enum_disciplinary_cases_sanction_envisagee",
  	"date_griefs" timestamp(3) with time zone,
  	"fin_defense" timestamp(3) with time zone,
  	"date_defense" timestamp(3) with time zone,
  	"defense" varchar,
  	"date_avis" timestamp(3) with time zone,
  	"avis" varchar,
  	"sanction" "enum_disciplinary_cases_sanction",
  	"duree_mois" numeric,
  	"date_decision" timestamp(3) with time zone,
  	"fin_recours" timestamp(3) with time zone,
  	"motivation" varchar,
  	"recours_date" timestamp(3) with time zone,
  	"recours_texte" varchar,
  	"issue" varchar,
  	"date_cloture" timestamp(3) with time zone,
  	"exclusion_appliquee" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "disciplinary_cases_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"fichiers_id" integer
  );
  
  ALTER TABLE "members" ADD COLUMN "suspendu_jusquau" timestamp(3) with time zone;
  ALTER TABLE "payments" ADD COLUMN "echeance_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dues_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "disciplinary_cases_id" integer;
  ALTER TABLE "dues_tranches" ADD CONSTRAINT "dues_tranches_paiement_id_payments_id_fk" FOREIGN KEY ("paiement_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dues_tranches" ADD CONSTRAINT "dues_tranches_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dues_relances" ADD CONSTRAINT "dues_relances_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dues" ADD CONSTRAINT "dues_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disciplinary_cases_griefs" ADD CONSTRAINT "disciplinary_cases_griefs_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."disciplinary_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "disciplinary_cases_historique" ADD CONSTRAINT "disciplinary_cases_historique_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."disciplinary_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "disciplinary_cases" ADD CONSTRAINT "disciplinary_cases_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "disciplinary_cases_rels" ADD CONSTRAINT "disciplinary_cases_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."disciplinary_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "disciplinary_cases_rels" ADD CONSTRAINT "disciplinary_cases_rels_fichiers_fk" FOREIGN KEY ("fichiers_id") REFERENCES "public"."fichiers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "dues_tranches_order_idx" ON "dues_tranches" USING btree ("_order");
  CREATE INDEX "dues_tranches_parent_id_idx" ON "dues_tranches" USING btree ("_parent_id");
  CREATE INDEX "dues_tranches_paiement_idx" ON "dues_tranches" USING btree ("paiement_id");
  CREATE INDEX "dues_relances_order_idx" ON "dues_relances" USING btree ("_order");
  CREATE INDEX "dues_relances_parent_id_idx" ON "dues_relances" USING btree ("_parent_id");
  CREATE INDEX "dues_membre_idx" ON "dues" USING btree ("membre_id");
  CREATE INDEX "dues_statut_idx" ON "dues" USING btree ("statut");
  CREATE INDEX "dues_exercice_exercice_debut_idx" ON "dues" USING btree ("exercice_debut");
  CREATE INDEX "dues_updated_at_idx" ON "dues" USING btree ("updated_at");
  CREATE INDEX "dues_created_at_idx" ON "dues" USING btree ("created_at");
  CREATE INDEX "disciplinary_cases_griefs_order_idx" ON "disciplinary_cases_griefs" USING btree ("order");
  CREATE INDEX "disciplinary_cases_griefs_parent_idx" ON "disciplinary_cases_griefs" USING btree ("parent_id");
  CREATE INDEX "disciplinary_cases_historique_order_idx" ON "disciplinary_cases_historique" USING btree ("_order");
  CREATE INDEX "disciplinary_cases_historique_parent_id_idx" ON "disciplinary_cases_historique" USING btree ("_parent_id");
  CREATE INDEX "disciplinary_cases_numero_idx" ON "disciplinary_cases" USING btree ("numero");
  CREATE INDEX "disciplinary_cases_membre_idx" ON "disciplinary_cases" USING btree ("membre_id");
  CREATE INDEX "disciplinary_cases_updated_at_idx" ON "disciplinary_cases" USING btree ("updated_at");
  CREATE INDEX "disciplinary_cases_created_at_idx" ON "disciplinary_cases" USING btree ("created_at");
  CREATE INDEX "disciplinary_cases_rels_order_idx" ON "disciplinary_cases_rels" USING btree ("order");
  CREATE INDEX "disciplinary_cases_rels_parent_idx" ON "disciplinary_cases_rels" USING btree ("parent_id");
  CREATE INDEX "disciplinary_cases_rels_path_idx" ON "disciplinary_cases_rels" USING btree ("path");
  CREATE INDEX "disciplinary_cases_rels_fichiers_id_idx" ON "disciplinary_cases_rels" USING btree ("fichiers_id");
  ALTER TABLE "payments" ADD CONSTRAINT "payments_echeance_id_dues_id_fk" FOREIGN KEY ("echeance_id") REFERENCES "public"."dues"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dues_fk" FOREIGN KEY ("dues_id") REFERENCES "public"."dues"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_disciplinary_cases_fk" FOREIGN KEY ("disciplinary_cases_id") REFERENCES "public"."disciplinary_cases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payments_echeance_idx" ON "payments" USING btree ("echeance_id");
  CREATE INDEX "payload_locked_documents_rels_dues_id_idx" ON "payload_locked_documents_rels" USING btree ("dues_id");
  CREATE INDEX "payload_locked_documents_rels_disciplinary_cases_id_idx" ON "payload_locked_documents_rels" USING btree ("disciplinary_cases_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dues_tranches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dues_relances" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dues" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "disciplinary_cases_griefs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "disciplinary_cases_historique" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "disciplinary_cases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "disciplinary_cases_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dues_tranches" CASCADE;
  DROP TABLE "dues_relances" CASCADE;
  DROP TABLE "dues" CASCADE;
  DROP TABLE "disciplinary_cases_griefs" CASCADE;
  DROP TABLE "disciplinary_cases_historique" CASCADE;
  DROP TABLE "disciplinary_cases" CASCADE;
  DROP TABLE "disciplinary_cases_rels" CASCADE;
  ALTER TABLE "payments" DROP CONSTRAINT "payments_echeance_id_dues_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dues_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_disciplinary_cases_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille', 'expirerOpportunites', 'demandesSansReponse');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes', 'verifierPaiements', 'rappelVeille', 'expirerOpportunites', 'demandesSansReponse');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payments_echeance_idx";
  DROP INDEX "payload_locked_documents_rels_dues_id_idx";
  DROP INDEX "payload_locked_documents_rels_disciplinary_cases_id_idx";
  ALTER TABLE "members" DROP COLUMN "suspendu_jusquau";
  ALTER TABLE "payments" DROP COLUMN "echeance_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dues_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "disciplinary_cases_id";
  DROP TYPE "public"."enum_dues_tranches_statut";
  DROP TYPE "public"."enum_dues_statut";
  DROP TYPE "public"."enum_disciplinary_cases_griefs";
  DROP TYPE "public"."enum_disciplinary_cases_statut";
  DROP TYPE "public"."enum_disciplinary_cases_sanction_envisagee";
  DROP TYPE "public"."enum_disciplinary_cases_sanction";`)
}
