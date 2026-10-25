import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_statuts_membres_lignes_categorie" AS ENUM('A', 'B', 'C', 'expert', 'partenaire', 'honneur');
  CREATE TYPE "public"."enum__pages_v_blocks_statuts_membres_lignes_categorie" AS ENUM('A', 'B', 'C', 'expert', 'partenaire', 'honneur');
  CREATE TYPE "public"."enum_applications_objectifs" AS ENUM('projet', 'formations', 'afterworks', 'affaires', 'visibilite', 'formalisation');
  CREATE TYPE "public"."enum_applications_source" AS ENUM('en-ligne', 'papier');
  CREATE TYPE "public"."enum_applications_civilite" AS ENUM('madame', 'monsieur');
  CREATE TYPE "public"."enum_applications_tranche_age" AS ENUM('18-25', '26-35', '36-45', '46+');
  CREATE TYPE "public"."enum_applications_forme_juridique" AS ENUM('informelle', 'individuelle', 'sarl', 'sa', 'autre');
  CREATE TYPE "public"."enum_applications_effectif" AS ENUM('porteur', '1-9', '10-49', '50+');
  CREATE TYPE "public"."enum_applications_anciennete" AS ENUM('porteur', 'moins-1', '1-3', '3-5', 'plus-5');
  CREATE TYPE "public"."enum_applications_connu_par" AS ENUM('membre', 'whatsapp', 'reseaux', 'evenement', 'autre');
  CREATE TYPE "public"."enum_applications_categorie" AS ENUM('A', 'B', 'C', 'expert', 'partenaire', 'honneur');
  CREATE TYPE "public"."enum_applications_modalite" AS ENUM('une-fois', 'deux-tranches');
  CREATE TYPE "public"."enum_applications_mode_paiement" AS ENUM('mobile', 'siege');
  CREATE TYPE "public"."enum_applications_operateur" AS ENUM('mtn', 'airtel');
  CREATE TYPE "public"."enum_applications_statut" AS ENUM('recue', 'en-examen', 'complement', 'acceptee', 'active', 'refusee', 'archivee');
  CREATE TYPE "public"."enum_payments_statut" AS ENUM('en-attente', 'paye', 'echoue', 'remboursement', 'rembourse');
  CREATE TYPE "public"."enum_payments_objet" AS ENUM('adhesion', 'adhesion-tranche', 'droit', 'tranche1', 'tranche2', 'cotisation', 'encart');
  CREATE TYPE "public"."enum_payments_mode" AS ENUM('mtn', 'airtel', 'especes', 'virement');
  CREATE TYPE "public"."enum_pieces_type" AS ENUM('justificatif', 'bulletin');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'verifierPaiements';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'verifierPaiements';
  ALTER TYPE "public"."enum_email_templates_modeles_cle" ADD VALUE 'remboursementATraiter' BEFORE 'nouveauDocument';
  CREATE TABLE "pages_blocks_comparatif_lignes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"visiteur" boolean DEFAULT false,
  	"membre" boolean DEFAULT true
  );
  
  CREATE TABLE "pages_blocks_comparatif" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"titre" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_statuts_membres_lignes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nom" varchar,
  	"categorie" "enum_pages_blocks_statuts_membres_lignes_categorie",
  	"pour" varchar,
  	"droits" varchar
  );
  
  CREATE TABLE "pages_blocks_statuts_membres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"titre" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparatif_lignes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"visiteur" boolean DEFAULT false,
  	"membre" boolean DEFAULT true,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_comparatif" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"titre" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statuts_membres_lignes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar,
  	"categorie" "enum__pages_v_blocks_statuts_membres_lignes_categorie",
  	"pour" varchar,
  	"droits" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statuts_membres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"titre" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "applications_objectifs" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_applications_objectifs",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "applications_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"auteur_nom" varchar,
  	"date" timestamp(3) with time zone,
  	"texte" varchar NOT NULL
  );
  
  CREATE TABLE "applications_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"auteur" varchar,
  	"modele" varchar,
  	"objet" varchar
  );
  
  CREATE TABLE "applications_historique" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"auteur" varchar,
  	"action" varchar
  );
  
  CREATE TABLE "applications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" numeric,
  	"source" "enum_applications_source" DEFAULT 'en-ligne',
  	"papier_lieu" varchar,
  	"bulletin_id" integer,
  	"civilite" "enum_applications_civilite",
  	"fonction" varchar,
  	"nom" varchar NOT NULL,
  	"prenom" varchar NOT NULL,
  	"telephone" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"tranche_age" "enum_applications_tranche_age",
  	"piece_identite" varchar,
  	"raison_sociale" varchar NOT NULL,
  	"forme_juridique" "enum_applications_forme_juridique",
  	"rccm" varchar,
  	"annee_creation" varchar,
  	"effectif" "enum_applications_effectif",
  	"localite_id" integer NOT NULL,
  	"quartier" varchar,
  	"description" varchar,
  	"services" varchar,
  	"anciennete" "enum_applications_anciennete",
  	"connu_par" "enum_applications_connu_par",
  	"parrain" varchar,
  	"categorie" "enum_applications_categorie" NOT NULL,
  	"modalite" "enum_applications_modalite",
  	"mode_paiement" "enum_applications_mode_paiement",
  	"operateur" "enum_applications_operateur",
  	"numero_payeur" varchar,
  	"autorisations_annuaire" boolean DEFAULT false,
  	"autorisations_coordonnees" boolean DEFAULT false,
  	"autorisations_logo" boolean DEFAULT false,
  	"autorisations_portrait" boolean DEFAULT false,
  	"consentement" boolean,
  	"acceptation_textes" boolean,
  	"statut" "enum_applications_statut" DEFAULT 'recue',
  	"responsable_id" integer,
  	"rendez_vous" timestamp(3) with time zone,
  	"motif_refus" varchar,
  	"piece_verifiee" boolean DEFAULT false,
  	"charte_signee" boolean DEFAULT false,
  	"avis_commission" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "applications_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer,
  	"pieces_id" integer
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" numeric,
  	"statut" "enum_payments_statut" DEFAULT 'en-attente',
  	"candidature_id" integer,
  	"objet" "enum_payments_objet" NOT NULL,
  	"exercice" varchar,
  	"montant" numeric NOT NULL,
  	"mode" "enum_payments_mode" NOT NULL,
  	"reference_operateur" varchar,
  	"telephone_payeur" varchar,
  	"date_paiement" timestamp(3) with time zone,
  	"id_operateur" varchar,
  	"journal_operateur" jsonb,
  	"enregistre_par_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pieces" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_pieces_type" DEFAULT 'justificatif',
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
  
  CREATE TABLE "counters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"value" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "testimonials" ADD COLUMN "logo_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "applications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pieces_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "counters_id" integer;
  ALTER TABLE "pages_blocks_comparatif_lignes" ADD CONSTRAINT "pages_blocks_comparatif_lignes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_comparatif"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_comparatif" ADD CONSTRAINT "pages_blocks_comparatif_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statuts_membres_lignes" ADD CONSTRAINT "pages_blocks_statuts_membres_lignes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_statuts_membres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statuts_membres" ADD CONSTRAINT "pages_blocks_statuts_membres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparatif_lignes" ADD CONSTRAINT "_pages_v_blocks_comparatif_lignes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_comparatif"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_comparatif" ADD CONSTRAINT "_pages_v_blocks_comparatif_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statuts_membres_lignes" ADD CONSTRAINT "_pages_v_blocks_statuts_membres_lignes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_statuts_membres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statuts_membres" ADD CONSTRAINT "_pages_v_blocks_statuts_membres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_objectifs" ADD CONSTRAINT "applications_objectifs_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_notes" ADD CONSTRAINT "applications_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_emails" ADD CONSTRAINT "applications_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_historique" ADD CONSTRAINT "applications_historique_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_bulletin_id_pieces_id_fk" FOREIGN KEY ("bulletin_id") REFERENCES "public"."pieces"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_localite_id_localities_id_fk" FOREIGN KEY ("localite_id") REFERENCES "public"."localities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications" ADD CONSTRAINT "applications_responsable_id_users_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "applications_rels" ADD CONSTRAINT "applications_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_rels" ADD CONSTRAINT "applications_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "applications_rels" ADD CONSTRAINT "applications_rels_pieces_fk" FOREIGN KEY ("pieces_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_candidature_id_applications_id_fk" FOREIGN KEY ("candidature_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_enregistre_par_id_users_id_fk" FOREIGN KEY ("enregistre_par_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_comparatif_lignes_order_idx" ON "pages_blocks_comparatif_lignes" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparatif_lignes_parent_id_idx" ON "pages_blocks_comparatif_lignes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparatif_order_idx" ON "pages_blocks_comparatif" USING btree ("_order");
  CREATE INDEX "pages_blocks_comparatif_parent_id_idx" ON "pages_blocks_comparatif" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_comparatif_path_idx" ON "pages_blocks_comparatif" USING btree ("_path");
  CREATE INDEX "pages_blocks_statuts_membres_lignes_order_idx" ON "pages_blocks_statuts_membres_lignes" USING btree ("_order");
  CREATE INDEX "pages_blocks_statuts_membres_lignes_parent_id_idx" ON "pages_blocks_statuts_membres_lignes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statuts_membres_order_idx" ON "pages_blocks_statuts_membres" USING btree ("_order");
  CREATE INDEX "pages_blocks_statuts_membres_parent_id_idx" ON "pages_blocks_statuts_membres" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statuts_membres_path_idx" ON "pages_blocks_statuts_membres" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_comparatif_lignes_order_idx" ON "_pages_v_blocks_comparatif_lignes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparatif_lignes_parent_id_idx" ON "_pages_v_blocks_comparatif_lignes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparatif_order_idx" ON "_pages_v_blocks_comparatif" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_comparatif_parent_id_idx" ON "_pages_v_blocks_comparatif" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_comparatif_path_idx" ON "_pages_v_blocks_comparatif" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_statuts_membres_lignes_order_idx" ON "_pages_v_blocks_statuts_membres_lignes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statuts_membres_lignes_parent_id_idx" ON "_pages_v_blocks_statuts_membres_lignes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statuts_membres_order_idx" ON "_pages_v_blocks_statuts_membres" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statuts_membres_parent_id_idx" ON "_pages_v_blocks_statuts_membres" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statuts_membres_path_idx" ON "_pages_v_blocks_statuts_membres" USING btree ("_path");
  CREATE INDEX "applications_objectifs_order_idx" ON "applications_objectifs" USING btree ("order");
  CREATE INDEX "applications_objectifs_parent_idx" ON "applications_objectifs" USING btree ("parent_id");
  CREATE INDEX "applications_notes_order_idx" ON "applications_notes" USING btree ("_order");
  CREATE INDEX "applications_notes_parent_id_idx" ON "applications_notes" USING btree ("_parent_id");
  CREATE INDEX "applications_emails_order_idx" ON "applications_emails" USING btree ("_order");
  CREATE INDEX "applications_emails_parent_id_idx" ON "applications_emails" USING btree ("_parent_id");
  CREATE INDEX "applications_historique_order_idx" ON "applications_historique" USING btree ("_order");
  CREATE INDEX "applications_historique_parent_id_idx" ON "applications_historique" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "applications_numero_idx" ON "applications" USING btree ("numero");
  CREATE INDEX "applications_bulletin_idx" ON "applications" USING btree ("bulletin_id");
  CREATE INDEX "applications_telephone_idx" ON "applications" USING btree ("telephone");
  CREATE INDEX "applications_email_idx" ON "applications" USING btree ("email");
  CREATE INDEX "applications_localite_idx" ON "applications" USING btree ("localite_id");
  CREATE INDEX "applications_statut_idx" ON "applications" USING btree ("statut");
  CREATE INDEX "applications_responsable_idx" ON "applications" USING btree ("responsable_id");
  CREATE INDEX "applications_updated_at_idx" ON "applications" USING btree ("updated_at");
  CREATE INDEX "applications_created_at_idx" ON "applications" USING btree ("created_at");
  CREATE INDEX "applications_rels_order_idx" ON "applications_rels" USING btree ("order");
  CREATE INDEX "applications_rels_parent_idx" ON "applications_rels" USING btree ("parent_id");
  CREATE INDEX "applications_rels_path_idx" ON "applications_rels" USING btree ("path");
  CREATE INDEX "applications_rels_sectors_id_idx" ON "applications_rels" USING btree ("sectors_id");
  CREATE INDEX "applications_rels_pieces_id_idx" ON "applications_rels" USING btree ("pieces_id");
  CREATE UNIQUE INDEX "payments_numero_idx" ON "payments" USING btree ("numero");
  CREATE INDEX "payments_statut_idx" ON "payments" USING btree ("statut");
  CREATE INDEX "payments_candidature_idx" ON "payments" USING btree ("candidature_id");
  CREATE INDEX "payments_id_operateur_idx" ON "payments" USING btree ("id_operateur");
  CREATE INDEX "payments_enregistre_par_idx" ON "payments" USING btree ("enregistre_par_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "pieces_updated_at_idx" ON "pieces" USING btree ("updated_at");
  CREATE INDEX "pieces_created_at_idx" ON "pieces" USING btree ("created_at");
  CREATE UNIQUE INDEX "pieces_filename_idx" ON "pieces" USING btree ("filename");
  CREATE UNIQUE INDEX "counters_name_idx" ON "counters" USING btree ("name");
  CREATE INDEX "counters_updated_at_idx" ON "counters" USING btree ("updated_at");
  CREATE INDEX "counters_created_at_idx" ON "counters" USING btree ("created_at");
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_applications_fk" FOREIGN KEY ("applications_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pieces_fk" FOREIGN KEY ("pieces_id") REFERENCES "public"."pieces"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_counters_fk" FOREIGN KEY ("counters_id") REFERENCES "public"."counters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "testimonials_logo_idx" ON "testimonials" USING btree ("logo_id");
  CREATE INDEX "payload_locked_documents_rels_applications_id_idx" ON "payload_locked_documents_rels" USING btree ("applications_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_pieces_id_idx" ON "payload_locked_documents_rels" USING btree ("pieces_id");
  CREATE INDEX "payload_locked_documents_rels_counters_id_idx" ON "payload_locked_documents_rels" USING btree ("counters_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_comparatif_lignes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_comparatif" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statuts_membres_lignes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statuts_membres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparatif_lignes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_comparatif" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statuts_membres_lignes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statuts_membres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications_objectifs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications_historique" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "applications_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pieces" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "counters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_comparatif_lignes" CASCADE;
  DROP TABLE "pages_blocks_comparatif" CASCADE;
  DROP TABLE "pages_blocks_statuts_membres_lignes" CASCADE;
  DROP TABLE "pages_blocks_statuts_membres" CASCADE;
  DROP TABLE "_pages_v_blocks_comparatif_lignes" CASCADE;
  DROP TABLE "_pages_v_blocks_comparatif" CASCADE;
  DROP TABLE "_pages_v_blocks_statuts_membres_lignes" CASCADE;
  DROP TABLE "_pages_v_blocks_statuts_membres" CASCADE;
  DROP TABLE "applications_objectifs" CASCADE;
  DROP TABLE "applications_notes" CASCADE;
  DROP TABLE "applications_emails" CASCADE;
  DROP TABLE "applications_historique" CASCADE;
  DROP TABLE "applications" CASCADE;
  DROP TABLE "applications_rels" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "pieces" CASCADE;
  DROP TABLE "counters" CASCADE;
  ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_logo_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_applications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pieces_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_counters_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE text;
  DROP TYPE "public"."enum_email_templates_modeles_cle";
  CREATE TYPE "public"."enum_email_templates_modeles_cle" AS ENUM('candidatureConfirmation', 'candidatureAlerte', 'candidatureComplement', 'bienvenueActivation', 'refusMotive', 'inscriptionConfirmation', 'inscriptionListeAttente', 'placeLiberee', 'rappelVeille', 'evenementAnnuleReporte', 'echeanceCotisation', 'relanceCotisation', 'recuPaiement', 'constatPerte', 'demandeExpert', 'relanceExpert', 'miseEnRelationRecue', 'miseEnRelationReponse', 'reponseAnnonce', 'decisionModeration', 'demandeModificationTraitee', 'disciplineGriefs', 'disciplineDecision', 'reinitialisationMotDePasse', 'nouvelAppareil', 'invitationAdmin', 'accuseReceptionFormulaire', 'alerteMessage', 'nouveauDocument', 'opportuniteSecteur', 'lienConnexion');
  ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE "public"."enum_email_templates_modeles_cle" USING "cle"::"public"."enum_email_templates_modeles_cle";
  DROP INDEX "testimonials_logo_idx";
  DROP INDEX "payload_locked_documents_rels_applications_id_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_pieces_id_idx";
  DROP INDEX "payload_locked_documents_rels_counters_id_idx";
  ALTER TABLE "testimonials" DROP COLUMN "logo_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "applications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pieces_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "counters_id";
  DROP TYPE "public"."enum_pages_blocks_statuts_membres_lignes_categorie";
  DROP TYPE "public"."enum__pages_v_blocks_statuts_membres_lignes_categorie";
  DROP TYPE "public"."enum_applications_objectifs";
  DROP TYPE "public"."enum_applications_source";
  DROP TYPE "public"."enum_applications_civilite";
  DROP TYPE "public"."enum_applications_tranche_age";
  DROP TYPE "public"."enum_applications_forme_juridique";
  DROP TYPE "public"."enum_applications_effectif";
  DROP TYPE "public"."enum_applications_anciennete";
  DROP TYPE "public"."enum_applications_connu_par";
  DROP TYPE "public"."enum_applications_categorie";
  DROP TYPE "public"."enum_applications_modalite";
  DROP TYPE "public"."enum_applications_mode_paiement";
  DROP TYPE "public"."enum_applications_operateur";
  DROP TYPE "public"."enum_applications_statut";
  DROP TYPE "public"."enum_payments_statut";
  DROP TYPE "public"."enum_payments_objet";
  DROP TYPE "public"."enum_payments_mode";
  DROP TYPE "public"."enum_pieces_type";`)
}
