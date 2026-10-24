import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('superadmin', 'admin', 'editeur', 'evenements', 'membres', 'tresorier');
  CREATE TYPE "public"."enum_users_statut" AS ENUM('actif', 'invite', 'desactive');
  CREATE TYPE "public"."enum_audit_log_categorie" AS ENUM('connexion', 'validation', 'publication', 'export', 'parametres', 'utilisateurs', 'paiement', 'discipline');
  CREATE TYPE "public"."enum_audit_log_auteur_type" AS ENUM('utilisateur', 'membre', 'systeme', 'visiteur');
  CREATE TYPE "public"."enum_email_templates_modeles_cle" AS ENUM('candidatureConfirmation', 'candidatureAlerte', 'candidatureComplement', 'bienvenueActivation', 'refusMotive', 'inscriptionConfirmation', 'inscriptionListeAttente', 'placeLiberee', 'rappelVeille', 'evenementAnnuleReporte', 'echeanceCotisation', 'relanceCotisation', 'recuPaiement', 'constatPerte', 'demandeExpert', 'relanceExpert', 'miseEnRelationRecue', 'miseEnRelationReponse', 'reponseAnnonce', 'decisionModeration', 'demandeModificationTraitee', 'disciplineGriefs', 'disciplineDecision', 'reinitialisationMotDePasse', 'nouvelAppareil', 'invitationAdmin', 'accuseReceptionFormulaire', 'nouveauDocument', 'opportuniteSecteur', 'lienConnexion');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_known_devices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar,
  	"ville" varchar,
  	"first_seen" timestamp(3) with time zone
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"categorie" "enum_audit_log_categorie" NOT NULL,
  	"cible" varchar,
  	"auteur_type" "enum_audit_log_auteur_type",
  	"auteur_id" integer,
  	"auteur_nom" varchar,
  	"ip" varchar,
  	"ville" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "email_templates_modeles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cle" "enum_email_templates_modeles_cle" NOT NULL,
  	"objet" varchar NOT NULL,
  	"corps" varchar NOT NULL
  );
  
  CREATE TABLE "email_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users" ADD COLUMN "name" varchar NOT NULL;
  ALTER TABLE "users" ADD COLUMN "photo_id" integer;
  ALTER TABLE "users" ADD COLUMN "statut" "enum_users_statut" DEFAULT 'actif' NOT NULL;
  ALTER TABLE "users" ADD COLUMN "last_login" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "two_factor" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_log_id" integer;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_known_devices" ADD CONSTRAINT "users_known_devices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_auteur_id_users_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "email_templates_modeles" ADD CONSTRAINT "email_templates_modeles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_known_devices_order_idx" ON "users_known_devices" USING btree ("_order");
  CREATE INDEX "users_known_devices_parent_id_idx" ON "users_known_devices" USING btree ("_parent_id");
  CREATE INDEX "audit_log_categorie_idx" ON "audit_log" USING btree ("categorie");
  CREATE INDEX "audit_log_auteur_idx" ON "audit_log" USING btree ("auteur_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "email_templates_modeles_order_idx" ON "email_templates_modeles" USING btree ("_order");
  CREATE INDEX "email_templates_modeles_parent_id_idx" ON "email_templates_modeles" USING btree ("_parent_id");
  ALTER TABLE "users" ADD CONSTRAINT "users_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_photo_idx" ON "users" USING btree ("photo_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_roles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_known_devices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_templates_modeles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "email_templates" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_known_devices" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "email_templates_modeles" CASCADE;
  DROP TABLE "email_templates" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT "users_photo_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_log_fk";
  
  DROP INDEX "users_photo_idx";
  DROP INDEX "payload_locked_documents_rels_audit_log_id_idx";
  ALTER TABLE "users" DROP COLUMN "name";
  ALTER TABLE "users" DROP COLUMN "photo_id";
  ALTER TABLE "users" DROP COLUMN "statut";
  ALTER TABLE "users" DROP COLUMN "last_login";
  ALTER TABLE "users" DROP COLUMN "two_factor";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_log_id";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_users_statut";
  DROP TYPE "public"."enum_audit_log_categorie";
  DROP TYPE "public"."enum_audit_log_auteur_type";
  DROP TYPE "public"."enum_email_templates_modeles_cle";`)
}
