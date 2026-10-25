import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_members_statut" AS ENUM('attente', 'actif', 'suspendu', 'ancien');
  CREATE TYPE "public"."enum_members_civilite" AS ENUM('madame', 'monsieur');
  CREATE TYPE "public"."enum_members_tranche_age" AS ENUM('18-25', '26-35', '36-45', '46+');
  CREATE TYPE "public"."enum_members_categorie" AS ENUM('A', 'B', 'C', 'expert', 'partenaire', 'honneur');
  CREATE TYPE "public"."enum_members_fin_type" AS ENUM('demission', 'deces', 'perte', 'exclusion');
  CREATE TYPE "public"."enum_companies_effectif" AS ENUM('porteur', '1-9', '10-49', '50+');
  CREATE TYPE "public"."enum_companies_forme_juridique" AS ENUM('informelle', 'individuelle', 'sarl', 'sa', 'autre');
  CREATE TYPE "public"."enum_modification_requests_champ" AS ENUM('nom', 'raisonSociale', 'secteurs', 'villeQuartier', 'telephone', 'email');
  CREATE TYPE "public"."enum_modification_requests_statut" AS ENUM('attente', 'validee', 'refusee');
  CREATE TABLE "members_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero_adherent" varchar,
  	"statut" "enum_members_statut" DEFAULT 'attente',
  	"motif_statut" varchar,
  	"civilite" "enum_members_civilite",
  	"prenom" varchar NOT NULL,
  	"nom" varchar NOT NULL,
  	"nom_complet" varchar,
  	"fonction" varchar,
  	"telephone" varchar,
  	"whatsapp" varchar,
  	"tranche_age" "enum_members_tranche_age",
  	"photo_id" integer,
  	"entreprise_id" integer,
  	"categorie" "enum_members_categorie" NOT NULL,
  	"date_adhesion" timestamp(3) with time zone,
  	"validite_carte" timestamp(3) with time zone,
  	"date_limite_cotisation" timestamp(3) with time zone,
  	"cotisation_droit" numeric,
  	"cotisation_montant" numeric,
  	"cotisation_tranches" numeric,
  	"candidature_id" integer,
  	"notifications_rappels" boolean DEFAULT true,
  	"notifications_opportunites" boolean DEFAULT true,
  	"notifications_echanges" boolean DEFAULT true,
  	"notifications_cotisation" boolean DEFAULT true,
  	"notifications_lettre" boolean DEFAULT false,
  	"consentement_annuaire" timestamp(3) with time zone,
  	"conditions_acceptees" timestamp(3) with time zone,
  	"derniere_connexion" timestamp(3) with time zone,
  	"fin_type" "enum_members_fin_type",
  	"fin_date" timestamp(3) with time zone,
  	"fin_suppression_demandee" timestamp(3) with time zone,
  	"activation_hash" varchar,
  	"activation_expire" timestamp(3) with time zone,
  	"lien_hash" varchar,
  	"lien_expire" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "members_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"commissions_id" integer
  );
  
  CREATE TABLE "companies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"titulaire_id" integer,
  	"slug" varchar,
  	"logo_id" integer,
  	"localite_id" integer,
  	"quartier" varchar,
  	"effectif" "enum_companies_effectif",
  	"forme_juridique" "enum_companies_forme_juridique",
  	"rccm" varchar,
  	"presentation" varchar,
  	"presentation_proposee" varchar,
  	"presentation_en_relecture" boolean DEFAULT false,
  	"services" varchar,
  	"recherches" varchar,
  	"site_web" varchar,
  	"linkedin" varchar,
  	"facebook" varchar,
  	"visibilite_annuaire" boolean DEFAULT true,
  	"visibilite_telephone" boolean DEFAULT false,
  	"visibilite_whatsapp" boolean DEFAULT false,
  	"visibilite_email" boolean DEFAULT false,
  	"visibilite_mise_en_avant" boolean DEFAULT false,
  	"masquee_par_admin" boolean DEFAULT false,
  	"selection_accueil" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "companies_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer
  );
  
  CREATE TABLE "modification_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membre_id" integer NOT NULL,
  	"champ" "enum_modification_requests_champ" NOT NULL,
  	"valeur_actuelle" varchar,
  	"nouvelle_valeur" varchar NOT NULL,
  	"motif" varchar,
  	"justificatif_id" integer,
  	"statut" "enum_modification_requests_statut" DEFAULT 'attente',
  	"motif_refus" varchar,
  	"traite_par_id" integer,
  	"traite_par_nom" varchar,
  	"date_traitement" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "network_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"membre_id" integer,
  	"tous" boolean DEFAULT false,
  	"titre" varchar NOT NULL,
  	"texte" varchar NOT NULL,
  	"lien" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "network_messages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"members_id" integer
  );
  
  ALTER TABLE "applications" ADD COLUMN "membre_id" integer;
  ALTER TABLE "payments" ADD COLUMN "membre_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "companies_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "modification_requests_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "network_messages_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "members_id" integer;
  ALTER TABLE "members_sessions" ADD CONSTRAINT "members_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_entreprise_id_companies_id_fk" FOREIGN KEY ("entreprise_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members" ADD CONSTRAINT "members_candidature_id_applications_id_fk" FOREIGN KEY ("candidature_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "members_rels" ADD CONSTRAINT "members_rels_commissions_fk" FOREIGN KEY ("commissions_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies" ADD CONSTRAINT "companies_titulaire_id_members_id_fk" FOREIGN KEY ("titulaire_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies" ADD CONSTRAINT "companies_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies" ADD CONSTRAINT "companies_localite_id_localities_id_fk" FOREIGN KEY ("localite_id") REFERENCES "public"."localities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "companies_rels" ADD CONSTRAINT "companies_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "companies_rels" ADD CONSTRAINT "companies_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_justificatif_id_pieces_id_fk" FOREIGN KEY ("justificatif_id") REFERENCES "public"."pieces"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "modification_requests" ADD CONSTRAINT "modification_requests_traite_par_id_users_id_fk" FOREIGN KEY ("traite_par_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "network_messages" ADD CONSTRAINT "network_messages_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "network_messages_rels" ADD CONSTRAINT "network_messages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."network_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "network_messages_rels" ADD CONSTRAINT "network_messages_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "members_sessions_order_idx" ON "members_sessions" USING btree ("_order");
  CREATE INDEX "members_sessions_parent_id_idx" ON "members_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "members_numero_adherent_idx" ON "members" USING btree ("numero_adherent");
  CREATE INDEX "members_statut_idx" ON "members" USING btree ("statut");
  CREATE INDEX "members_telephone_idx" ON "members" USING btree ("telephone");
  CREATE INDEX "members_photo_idx" ON "members" USING btree ("photo_id");
  CREATE INDEX "members_entreprise_idx" ON "members" USING btree ("entreprise_id");
  CREATE INDEX "members_candidature_idx" ON "members" USING btree ("candidature_id");
  CREATE INDEX "members_updated_at_idx" ON "members" USING btree ("updated_at");
  CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");
  CREATE UNIQUE INDEX "members_email_idx" ON "members" USING btree ("email");
  CREATE INDEX "members_rels_order_idx" ON "members_rels" USING btree ("order");
  CREATE INDEX "members_rels_parent_idx" ON "members_rels" USING btree ("parent_id");
  CREATE INDEX "members_rels_path_idx" ON "members_rels" USING btree ("path");
  CREATE INDEX "members_rels_commissions_id_idx" ON "members_rels" USING btree ("commissions_id");
  CREATE INDEX "companies_titulaire_idx" ON "companies" USING btree ("titulaire_id");
  CREATE UNIQUE INDEX "companies_slug_idx" ON "companies" USING btree ("slug");
  CREATE INDEX "companies_logo_idx" ON "companies" USING btree ("logo_id");
  CREATE INDEX "companies_localite_idx" ON "companies" USING btree ("localite_id");
  CREATE INDEX "companies_updated_at_idx" ON "companies" USING btree ("updated_at");
  CREATE INDEX "companies_created_at_idx" ON "companies" USING btree ("created_at");
  CREATE INDEX "companies_rels_order_idx" ON "companies_rels" USING btree ("order");
  CREATE INDEX "companies_rels_parent_idx" ON "companies_rels" USING btree ("parent_id");
  CREATE INDEX "companies_rels_path_idx" ON "companies_rels" USING btree ("path");
  CREATE INDEX "companies_rels_sectors_id_idx" ON "companies_rels" USING btree ("sectors_id");
  CREATE INDEX "modification_requests_membre_idx" ON "modification_requests" USING btree ("membre_id");
  CREATE INDEX "modification_requests_justificatif_idx" ON "modification_requests" USING btree ("justificatif_id");
  CREATE INDEX "modification_requests_statut_idx" ON "modification_requests" USING btree ("statut");
  CREATE INDEX "modification_requests_traite_par_idx" ON "modification_requests" USING btree ("traite_par_id");
  CREATE INDEX "modification_requests_updated_at_idx" ON "modification_requests" USING btree ("updated_at");
  CREATE INDEX "modification_requests_created_at_idx" ON "modification_requests" USING btree ("created_at");
  CREATE INDEX "network_messages_membre_idx" ON "network_messages" USING btree ("membre_id");
  CREATE INDEX "network_messages_updated_at_idx" ON "network_messages" USING btree ("updated_at");
  CREATE INDEX "network_messages_created_at_idx" ON "network_messages" USING btree ("created_at");
  CREATE INDEX "network_messages_rels_order_idx" ON "network_messages_rels" USING btree ("order");
  CREATE INDEX "network_messages_rels_parent_idx" ON "network_messages_rels" USING btree ("parent_id");
  CREATE INDEX "network_messages_rels_path_idx" ON "network_messages_rels" USING btree ("path");
  CREATE INDEX "network_messages_rels_members_id_idx" ON "network_messages_rels" USING btree ("members_id");
  ALTER TABLE "applications" ADD CONSTRAINT "applications_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_companies_fk" FOREIGN KEY ("companies_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_modification_requests_fk" FOREIGN KEY ("modification_requests_id") REFERENCES "public"."modification_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_network_messages_fk" FOREIGN KEY ("network_messages_id") REFERENCES "public"."network_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_members_fk" FOREIGN KEY ("members_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "applications_membre_idx" ON "applications" USING btree ("membre_id");
  CREATE INDEX "payments_membre_idx" ON "payments" USING btree ("membre_id");
  CREATE INDEX "payload_locked_documents_rels_members_id_idx" ON "payload_locked_documents_rels" USING btree ("members_id");
  CREATE INDEX "payload_locked_documents_rels_companies_id_idx" ON "payload_locked_documents_rels" USING btree ("companies_id");
  CREATE INDEX "payload_locked_documents_rels_modification_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("modification_requests_id");
  CREATE INDEX "payload_locked_documents_rels_network_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("network_messages_id");
  CREATE INDEX "payload_preferences_rels_members_id_idx" ON "payload_preferences_rels" USING btree ("members_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "members_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "members_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "companies_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "modification_requests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "network_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "network_messages_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "members_sessions" CASCADE;
  DROP TABLE "members" CASCADE;
  DROP TABLE "members_rels" CASCADE;
  DROP TABLE "companies" CASCADE;
  DROP TABLE "companies_rels" CASCADE;
  DROP TABLE "modification_requests" CASCADE;
  DROP TABLE "network_messages" CASCADE;
  DROP TABLE "network_messages_rels" CASCADE;
  ALTER TABLE "applications" DROP CONSTRAINT "applications_membre_id_members_id_fk";
  
  ALTER TABLE "payments" DROP CONSTRAINT "payments_membre_id_members_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_members_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_companies_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_modification_requests_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_network_messages_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_members_fk";
  
  DROP INDEX "applications_membre_idx";
  DROP INDEX "payments_membre_idx";
  DROP INDEX "payload_locked_documents_rels_members_id_idx";
  DROP INDEX "payload_locked_documents_rels_companies_id_idx";
  DROP INDEX "payload_locked_documents_rels_modification_requests_id_idx";
  DROP INDEX "payload_locked_documents_rels_network_messages_id_idx";
  DROP INDEX "payload_preferences_rels_members_id_idx";
  ALTER TABLE "applications" DROP COLUMN "membre_id";
  ALTER TABLE "payments" DROP COLUMN "membre_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "members_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "companies_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "modification_requests_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "network_messages_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "members_id";
  DROP TYPE "public"."enum_members_statut";
  DROP TYPE "public"."enum_members_civilite";
  DROP TYPE "public"."enum_members_tranche_age";
  DROP TYPE "public"."enum_members_categorie";
  DROP TYPE "public"."enum_members_fin_type";
  DROP TYPE "public"."enum_companies_effectif";
  DROP TYPE "public"."enum_companies_forme_juridique";
  DROP TYPE "public"."enum_modification_requests_champ";
  DROP TYPE "public"."enum_modification_requests_statut";`)
}
