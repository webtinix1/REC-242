import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contact_messages_reponses_canal" AS ENUM('email', 'whatsapp');
  CREATE TYPE "public"."enum_contact_messages_formulaire" AS ENUM('contact', 'partenariat');
  CREATE TYPE "public"."enum_contact_messages_motif" AS ENUM('adhesion', 'partenariat', 'presse', 'evenement', 'autre');
  CREATE TYPE "public"."enum_contact_messages_destination" AS ENUM('membres', 'partenariats', 'communication', 'evenements', 'secretariat');
  CREATE TYPE "public"."enum_contact_messages_statut" AS ENUM('a-traiter', 'traite', 'archive');
  ALTER TYPE "public"."enum_email_templates_modeles_cle" ADD VALUE 'alerteMessage' BEFORE 'nouveauDocument';
  CREATE TABLE "contact_messages_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"auteur_id" integer,
  	"auteur_nom" varchar,
  	"date" timestamp(3) with time zone,
  	"texte" varchar NOT NULL
  );
  
  CREATE TABLE "contact_messages_reponses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"canal" "enum_contact_messages_reponses_canal",
  	"texte" varchar,
  	"auteur_id" integer,
  	"auteur_nom" varchar,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "contact_messages_historique" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"auteur" varchar,
  	"action" varchar
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"formulaire" "enum_contact_messages_formulaire" DEFAULT 'contact' NOT NULL,
  	"motif" "enum_contact_messages_motif" NOT NULL,
  	"objet" varchar,
  	"nom" varchar NOT NULL,
  	"organisation" varchar,
  	"telephone" varchar,
  	"email" varchar,
  	"type_partenariat" varchar,
  	"message" varchar NOT NULL,
  	"qui" varchar,
  	"destination" "enum_contact_messages_destination",
  	"transmis_utilisateur_id" integer,
  	"statut" "enum_contact_messages_statut" DEFAULT 'a-traiter',
  	"page" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_messages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "settings_alertes_reponses_types" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL,
  	"texte" varchar NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_messages_id" integer;
  ALTER TABLE "contact_messages_notes" ADD CONSTRAINT "contact_messages_notes_auteur_id_users_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages_notes" ADD CONSTRAINT "contact_messages_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_messages_reponses" ADD CONSTRAINT "contact_messages_reponses_auteur_id_users_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages_reponses" ADD CONSTRAINT "contact_messages_reponses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_messages_historique" ADD CONSTRAINT "contact_messages_historique_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_transmis_utilisateur_id_users_id_fk" FOREIGN KEY ("transmis_utilisateur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "contact_messages_rels" ADD CONSTRAINT "contact_messages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contact_messages_rels" ADD CONSTRAINT "contact_messages_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_alertes_reponses_types" ADD CONSTRAINT "settings_alertes_reponses_types_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "contact_messages_notes_order_idx" ON "contact_messages_notes" USING btree ("_order");
  CREATE INDEX "contact_messages_notes_parent_id_idx" ON "contact_messages_notes" USING btree ("_parent_id");
  CREATE INDEX "contact_messages_notes_auteur_idx" ON "contact_messages_notes" USING btree ("auteur_id");
  CREATE INDEX "contact_messages_reponses_order_idx" ON "contact_messages_reponses" USING btree ("_order");
  CREATE INDEX "contact_messages_reponses_parent_id_idx" ON "contact_messages_reponses" USING btree ("_parent_id");
  CREATE INDEX "contact_messages_reponses_auteur_idx" ON "contact_messages_reponses" USING btree ("auteur_id");
  CREATE INDEX "contact_messages_historique_order_idx" ON "contact_messages_historique" USING btree ("_order");
  CREATE INDEX "contact_messages_historique_parent_id_idx" ON "contact_messages_historique" USING btree ("_parent_id");
  CREATE INDEX "contact_messages_transmis_utilisateur_idx" ON "contact_messages" USING btree ("transmis_utilisateur_id");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX "contact_messages_rels_order_idx" ON "contact_messages_rels" USING btree ("order");
  CREATE INDEX "contact_messages_rels_parent_idx" ON "contact_messages_rels" USING btree ("parent_id");
  CREATE INDEX "contact_messages_rels_path_idx" ON "contact_messages_rels" USING btree ("path");
  CREATE INDEX "contact_messages_rels_users_id_idx" ON "contact_messages_rels" USING btree ("users_id");
  CREATE INDEX "settings_alertes_reponses_types_order_idx" ON "settings_alertes_reponses_types" USING btree ("_order");
  CREATE INDEX "settings_alertes_reponses_types_parent_id_idx" ON "settings_alertes_reponses_types" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contact_messages_notes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages_reponses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages_historique" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_messages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings_alertes_reponses_types" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "contact_messages_notes" CASCADE;
  DROP TABLE "contact_messages_reponses" CASCADE;
  DROP TABLE "contact_messages_historique" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "contact_messages_rels" CASCADE;
  DROP TABLE "settings_alertes_reponses_types" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_messages_fk";
  
  ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE text;
  DROP TYPE "public"."enum_email_templates_modeles_cle";
  CREATE TYPE "public"."enum_email_templates_modeles_cle" AS ENUM('candidatureConfirmation', 'candidatureAlerte', 'candidatureComplement', 'bienvenueActivation', 'refusMotive', 'inscriptionConfirmation', 'inscriptionListeAttente', 'placeLiberee', 'rappelVeille', 'evenementAnnuleReporte', 'echeanceCotisation', 'relanceCotisation', 'recuPaiement', 'constatPerte', 'demandeExpert', 'relanceExpert', 'miseEnRelationRecue', 'miseEnRelationReponse', 'reponseAnnonce', 'decisionModeration', 'demandeModificationTraitee', 'disciplineGriefs', 'disciplineDecision', 'reinitialisationMotDePasse', 'nouvelAppareil', 'invitationAdmin', 'accuseReceptionFormulaire', 'nouveauDocument', 'opportuniteSecteur', 'lienConnexion');
  ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE "public"."enum_email_templates_modeles_cle" USING "cle"::"public"."enum_email_templates_modeles_cle";
  DROP INDEX "payload_locked_documents_rels_contact_messages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_messages_id";
  DROP TYPE "public"."enum_contact_messages_reponses_canal";
  DROP TYPE "public"."enum_contact_messages_formulaire";
  DROP TYPE "public"."enum_contact_messages_motif";
  DROP TYPE "public"."enum_contact_messages_destination";
  DROP TYPE "public"."enum_contact_messages_statut";`)
}
