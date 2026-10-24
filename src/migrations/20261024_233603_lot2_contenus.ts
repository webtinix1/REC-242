import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  CREATE TYPE "public"."enum_pages_blocks_faq_emplacement" AS ENUM('accueil', 'adherer');
  CREATE TYPE "public"."enum_pages_blocks_antennes_antennes_statut" AS ENUM('siege', 'active', 'creation', 'projet');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  CREATE TYPE "public"."enum__pages_v_blocks_faq_emplacement" AS ENUM('accueil', 'adherer');
  CREATE TYPE "public"."enum__pages_v_blocks_antennes_antennes_statut" AS ENUM('siege', 'active', 'creation', 'projet');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_news_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  CREATE TYPE "public"."enum_news_blocks_faq_emplacement" AS ENUM('accueil', 'adherer');
  CREATE TYPE "public"."enum_news_type" AS ENUM('article', 'communique', 'interview', 'annonce', 'retour');
  CREATE TYPE "public"."enum_news_etat" AS ENUM('brouillon', 'relecture', 'programme', 'publie', 'archive');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  CREATE TYPE "public"."enum__news_v_blocks_faq_emplacement" AS ENUM('accueil', 'adherer');
  CREATE TYPE "public"."enum__news_v_version_type" AS ENUM('article', 'communique', 'interview', 'annonce', 'retour');
  CREATE TYPE "public"."enum__news_v_version_etat" AS ENUM('brouillon', 'relecture', 'programme', 'publie', 'archive');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_documents_rubrique" AS ENUM('textes', 'vie', 'ateliers', 'presse', 'evenements');
  CREATE TYPE "public"."enum_documents_visibilite" AS ENUM('public', 'membres', 'inscrits', 'comite');
  CREATE TYPE "public"."enum_people_role" AS ENUM('fondatrice', 'comite', 'expert');
  CREATE TYPE "public"."enum_people_pole" AS ENUM('direction', 'numerique', 'juridique', 'programme', 'communication', 'relations');
  CREATE TYPE "public"."enum_commissions_ouverture" AS ENUM('ouverte', 'designation');
  CREATE TYPE "public"."enum_faq_emplacements" AS ENUM('accueil', 'adherer');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'publierProgrammes');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'publierProgrammes');
  CREATE TYPE "public"."enum_settings_reseaux_sociaux_reseau" AS ENUM('facebook', 'linkedin', 'instagram', 'x', 'youtube', 'tiktok');
  CREATE TYPE "public"."enum_settings_chiffres_cles_mode" AS ENUM('saisi', 'membresActifs', 'entreprises', 'secteurs');
  CREATE TYPE "public"."enum_settings_alertes_alertes_aussi" AS ENUM('messages', 'candidatures');
  CREATE TABLE "pages_blocks_entete_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "pages_blocks_entete" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"texte" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_texte" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"contenu" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"legende" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_chiffres_cles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cartes_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"lien" varchar,
  	"libelle_lien" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "pages_blocks_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"intro" varchar,
  	"style" "enum_pages_blocks_cartes_style" DEFAULT 'cartes',
  	"reference" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"emplacement" "enum_pages_blocks_faq_emplacement",
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_temoignages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_appel_action_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "pages_blocks_appel_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_antennes_antennes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ville" varchar,
  	"statut" "enum_pages_blocks_antennes_antennes_statut",
  	"adresse" varchar,
  	"referent" varchar,
  	"contact" varchar
  );
  
  CREATE TABLE "pages_blocks_antennes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"chemin" varchar,
  	"menu" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_entete_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_entete" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"texte" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_texte" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"contenu" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"legende" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_chiffres_cles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cartes_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"lien" varchar,
  	"libelle_lien" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"intro" varchar,
  	"style" "enum__pages_v_blocks_cartes_style" DEFAULT 'cartes',
  	"reference" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"emplacement" "enum__pages_v_blocks_faq_emplacement",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_temoignages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appel_action_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_appel_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_antennes_antennes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ville" varchar,
  	"statut" "enum__pages_v_blocks_antennes_antennes_statut",
  	"adresse" varchar,
  	"referent" varchar,
  	"contact" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_antennes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_chemin" varchar,
  	"version_menu" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "news_blocks_texte" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"contenu" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"legende" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_chiffres_cles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_cartes_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"lien" varchar,
  	"libelle_lien" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "news_blocks_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"intro" varchar,
  	"style" "enum_news_blocks_cartes_style" DEFAULT 'cartes',
  	"reference" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"emplacement" "enum_news_blocks_faq_emplacement",
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_appel_action_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "news_blocks_appel_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"slug" varchar,
  	"chapeau" varchar,
  	"image_id" integer,
  	"corps" jsonb,
  	"pdf_id" integer,
  	"type" "enum_news_type" DEFAULT 'article',
  	"date_publication" timestamp(3) with time zone,
  	"reserve_membres" boolean DEFAULT false,
  	"etat" "enum_news_etat" DEFAULT 'brouillon',
  	"auteur_id" integer,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "news_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "news_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer
  );
  
  CREATE TABLE "_news_v_blocks_texte" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"contenu" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"legende" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_chiffres_cles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"note" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_cartes_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"lien" varchar,
  	"libelle_lien" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_news_v_blocks_cartes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"intro" varchar,
  	"style" "enum__news_v_blocks_cartes_style" DEFAULT 'cartes',
  	"reference" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"surtitre" varchar,
  	"titre" varchar,
  	"emplacement" "enum__news_v_blocks_faq_emplacement",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_appel_action_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_news_v_blocks_appel_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar,
  	"texte" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titre" varchar,
  	"version_slug" varchar,
  	"version_chapeau" varchar,
  	"version_image_id" integer,
  	"version_corps" jsonb,
  	"version_pdf_id" integer,
  	"version_type" "enum__news_v_version_type" DEFAULT 'article',
  	"version_date_publication" timestamp(3) with time zone,
  	"version_reserve_membres" boolean DEFAULT false,
  	"version_etat" "enum__news_v_version_etat" DEFAULT 'brouillon',
  	"version_auteur_id" integer,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_news_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_news_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"sectors_id" integer
  );
  
  CREATE TABLE "documents_historique" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"version" numeric,
  	"fichier" varchar,
  	"date" timestamp(3) with time zone
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL,
  	"rubrique" "enum_documents_rubrique" NOT NULL,
  	"visibilite" "enum_documents_visibilite" DEFAULT 'membres' NOT NULL,
  	"date_document" timestamp(3) with time zone,
  	"couverture_id" integer,
  	"version" numeric DEFAULT 1,
  	"telechargements" numeric DEFAULT 0,
  	"annonce_aux_membres" boolean DEFAULT false,
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
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"initiales" varchar,
  	"photo_id" integer,
  	"fonction" varchar NOT NULL,
  	"role" "enum_people_role" NOT NULL,
  	"pole" "enum_people_pole",
  	"ordre" numeric DEFAULT 0,
  	"visible" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "people_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"expertise_tags_id" integer
  );
  
  CREATE TABLE "commissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"slug" varchar,
  	"objet" varchar NOT NULL,
  	"responsable_id" integer,
  	"ouverture" "enum_commissions_ouverture" DEFAULT 'ouverte' NOT NULL,
  	"prochaine_reunion" timestamp(3) with time zone,
  	"affichee_sur_site" boolean DEFAULT true,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "commissions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer,
  	"expertise_tags_id" integer
  );
  
  CREATE TABLE "partners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"logo_id" integer,
  	"lien" varchar,
  	"type" varchar,
  	"description" varchar,
  	"convention_signee" boolean DEFAULT false,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faq_emplacements" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_faq_emplacements",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "faq" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"reponse" varchar NOT NULL,
  	"ordre" numeric DEFAULT 0,
  	"visible" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"citation" varchar NOT NULL,
  	"personne" varchar NOT NULL,
  	"entreprise" varchar,
  	"photo_id" integer,
  	"accord_publication" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sectors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"slug" varchar,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "localities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"slug" varchar,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"slug" varchar,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "expertise_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nom" varchar NOT NULL,
  	"slug" varchar,
  	"ordre" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "settings_reseaux_sociaux" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reseau" "enum_settings_reseaux_sociaux_reseau" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "settings_chiffres_cles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar NOT NULL,
  	"mode" "enum_settings_chiffres_cles_mode" DEFAULT 'saisi' NOT NULL,
  	"valeur" varchar
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"adresse" varchar,
  	"email" varchar,
  	"horaires" varchar,
  	"plan_acces_latitude" numeric,
  	"plan_acces_longitude" numeric,
  	"plan_acces_indications" varchar,
  	"whatsapp_numero" varchar,
  	"whatsapp_lien_chaine" varchar,
  	"whatsapp_lien_groupe" varchar,
  	"tarifs_droit_a" numeric,
  	"tarifs_cotisation_a" numeric,
  	"tarifs_droit_b" numeric,
  	"tarifs_cotisation_b" numeric,
  	"tarifs_droit_c" numeric,
  	"tarifs_cotisation_c" numeric,
  	"tarifs_droit_expert" numeric,
  	"tarifs_cotisation_expert" numeric,
  	"tarifs_delai_mois" numeric,
  	"tarifs_tranches_max" numeric,
  	"tarifs_relances" numeric,
  	"tarifs_intervalle_relances_jours" numeric,
  	"annuaire_edition" varchar,
  	"annuaire_cloture" timestamp(3) with time zone,
  	"annuaire_encart_logo" numeric,
  	"annuaire_encart_demi_page" numeric,
  	"annuaire_encart_pleine_page" numeric,
  	"alertes_adresse_alerte" varchar,
  	"alertes_copie" varchar,
  	"alertes_alertes_aussi" "enum_settings_alertes_alertes_aussi" DEFAULT 'messages',
  	"seo_titre" varchar,
  	"seo_description" varchar,
  	"seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_principal_sous_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar NOT NULL,
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "navigation_principal" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar NOT NULL,
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "navigation_pied_de_page_liens" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar NOT NULL,
  	"page_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "navigation_pied_de_page" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titre" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "media" ADD COLUMN "credits" varchar;
  ALTER TABLE "media" ADD COLUMN "illustration" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_vignette_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_carte_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_grande_filename" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "documents_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "people_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "commissions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "partners_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "faq_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sectors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "localities_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_types_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "expertise_tags_id" integer;
  ALTER TABLE "pages_blocks_entete_boutons" ADD CONSTRAINT "pages_blocks_entete_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_entete"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_entete" ADD CONSTRAINT "pages_blocks_entete_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_entete" ADD CONSTRAINT "pages_blocks_entete_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_texte" ADD CONSTRAINT "pages_blocks_texte_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image" ADD CONSTRAINT "pages_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_chiffres_cles" ADD CONSTRAINT "pages_blocks_chiffres_cles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cartes_cartes" ADD CONSTRAINT "pages_blocks_cartes_cartes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cartes_cartes" ADD CONSTRAINT "pages_blocks_cartes_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cartes" ADD CONSTRAINT "pages_blocks_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_temoignages" ADD CONSTRAINT "pages_blocks_temoignages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logos" ADD CONSTRAINT "pages_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_appel_action_boutons" ADD CONSTRAINT "pages_blocks_appel_action_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_appel_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_appel_action" ADD CONSTRAINT "pages_blocks_appel_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_antennes_antennes" ADD CONSTRAINT "pages_blocks_antennes_antennes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_antennes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_antennes" ADD CONSTRAINT "pages_blocks_antennes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entete_boutons" ADD CONSTRAINT "_pages_v_blocks_entete_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_entete"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entete" ADD CONSTRAINT "_pages_v_blocks_entete_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_entete" ADD CONSTRAINT "_pages_v_blocks_entete_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_texte" ADD CONSTRAINT "_pages_v_blocks_texte_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image" ADD CONSTRAINT "_pages_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_chiffres_cles" ADD CONSTRAINT "_pages_v_blocks_chiffres_cles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cartes_cartes" ADD CONSTRAINT "_pages_v_blocks_cartes_cartes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cartes_cartes" ADD CONSTRAINT "_pages_v_blocks_cartes_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cartes" ADD CONSTRAINT "_pages_v_blocks_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_temoignages" ADD CONSTRAINT "_pages_v_blocks_temoignages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logos" ADD CONSTRAINT "_pages_v_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appel_action_boutons" ADD CONSTRAINT "_pages_v_blocks_appel_action_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_appel_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_appel_action" ADD CONSTRAINT "_pages_v_blocks_appel_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_antennes_antennes" ADD CONSTRAINT "_pages_v_blocks_antennes_antennes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_antennes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_antennes" ADD CONSTRAINT "_pages_v_blocks_antennes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_texte" ADD CONSTRAINT "news_blocks_texte_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_image" ADD CONSTRAINT "news_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_image" ADD CONSTRAINT "news_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_chiffres_cles" ADD CONSTRAINT "news_blocks_chiffres_cles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_cartes_cartes" ADD CONSTRAINT "news_blocks_cartes_cartes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_cartes_cartes" ADD CONSTRAINT "news_blocks_cartes_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_cartes" ADD CONSTRAINT "news_blocks_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_faq" ADD CONSTRAINT "news_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_appel_action_boutons" ADD CONSTRAINT "news_blocks_appel_action_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_blocks_appel_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_appel_action" ADD CONSTRAINT "news_blocks_appel_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_pdf_id_documents_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_auteur_id_users_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_texts" ADD CONSTRAINT "news_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_texte" ADD CONSTRAINT "_news_v_blocks_texte_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_image" ADD CONSTRAINT "_news_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_image" ADD CONSTRAINT "_news_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_chiffres_cles" ADD CONSTRAINT "_news_v_blocks_chiffres_cles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_cartes_cartes" ADD CONSTRAINT "_news_v_blocks_cartes_cartes_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_cartes_cartes" ADD CONSTRAINT "_news_v_blocks_cartes_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_cartes" ADD CONSTRAINT "_news_v_blocks_cartes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_faq" ADD CONSTRAINT "_news_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_appel_action_boutons" ADD CONSTRAINT "_news_v_blocks_appel_action_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v_blocks_appel_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_appel_action" ADD CONSTRAINT "_news_v_blocks_appel_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_pdf_id_documents_id_fk" FOREIGN KEY ("version_pdf_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_auteur_id_users_id_fk" FOREIGN KEY ("version_auteur_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_texts" ADD CONSTRAINT "_news_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents_historique" ADD CONSTRAINT "documents_historique_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_couverture_id_media_id_fk" FOREIGN KEY ("couverture_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "people" ADD CONSTRAINT "people_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "people_rels" ADD CONSTRAINT "people_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "people_rels" ADD CONSTRAINT "people_rels_expertise_tags_fk" FOREIGN KEY ("expertise_tags_id") REFERENCES "public"."expertise_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_responsable_id_people_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "commissions_rels" ADD CONSTRAINT "commissions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commissions_rels" ADD CONSTRAINT "commissions_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commissions_rels" ADD CONSTRAINT "commissions_rels_expertise_tags_fk" FOREIGN KEY ("expertise_tags_id") REFERENCES "public"."expertise_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faq_emplacements" ADD CONSTRAINT "faq_emplacements_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_reseaux_sociaux" ADD CONSTRAINT "settings_reseaux_sociaux_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_chiffres_cles" ADD CONSTRAINT "settings_chiffres_cles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_seo_image_id_media_id_fk" FOREIGN KEY ("seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_principal_sous_menu" ADD CONSTRAINT "navigation_principal_sous_menu_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_principal_sous_menu" ADD CONSTRAINT "navigation_principal_sous_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_principal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_principal" ADD CONSTRAINT "navigation_principal_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_principal" ADD CONSTRAINT "navigation_principal_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_pied_de_page_liens" ADD CONSTRAINT "navigation_pied_de_page_liens_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_pied_de_page_liens" ADD CONSTRAINT "navigation_pied_de_page_liens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_pied_de_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_pied_de_page" ADD CONSTRAINT "navigation_pied_de_page_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_entete_boutons_order_idx" ON "pages_blocks_entete_boutons" USING btree ("_order");
  CREATE INDEX "pages_blocks_entete_boutons_parent_id_idx" ON "pages_blocks_entete_boutons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_entete_order_idx" ON "pages_blocks_entete" USING btree ("_order");
  CREATE INDEX "pages_blocks_entete_parent_id_idx" ON "pages_blocks_entete" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_entete_path_idx" ON "pages_blocks_entete" USING btree ("_path");
  CREATE INDEX "pages_blocks_entete_image_idx" ON "pages_blocks_entete" USING btree ("image_id");
  CREATE INDEX "pages_blocks_texte_order_idx" ON "pages_blocks_texte" USING btree ("_order");
  CREATE INDEX "pages_blocks_texte_parent_id_idx" ON "pages_blocks_texte" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_texte_path_idx" ON "pages_blocks_texte" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_order_idx" ON "pages_blocks_image" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_parent_id_idx" ON "pages_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_path_idx" ON "pages_blocks_image" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_image_idx" ON "pages_blocks_image" USING btree ("image_id");
  CREATE INDEX "pages_blocks_chiffres_cles_order_idx" ON "pages_blocks_chiffres_cles" USING btree ("_order");
  CREATE INDEX "pages_blocks_chiffres_cles_parent_id_idx" ON "pages_blocks_chiffres_cles" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_chiffres_cles_path_idx" ON "pages_blocks_chiffres_cles" USING btree ("_path");
  CREATE INDEX "pages_blocks_cartes_cartes_order_idx" ON "pages_blocks_cartes_cartes" USING btree ("_order");
  CREATE INDEX "pages_blocks_cartes_cartes_parent_id_idx" ON "pages_blocks_cartes_cartes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cartes_cartes_image_idx" ON "pages_blocks_cartes_cartes" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cartes_order_idx" ON "pages_blocks_cartes" USING btree ("_order");
  CREATE INDEX "pages_blocks_cartes_parent_id_idx" ON "pages_blocks_cartes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cartes_path_idx" ON "pages_blocks_cartes" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_temoignages_order_idx" ON "pages_blocks_temoignages" USING btree ("_order");
  CREATE INDEX "pages_blocks_temoignages_parent_id_idx" ON "pages_blocks_temoignages" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_temoignages_path_idx" ON "pages_blocks_temoignages" USING btree ("_path");
  CREATE INDEX "pages_blocks_logos_order_idx" ON "pages_blocks_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logos_parent_id_idx" ON "pages_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logos_path_idx" ON "pages_blocks_logos" USING btree ("_path");
  CREATE INDEX "pages_blocks_appel_action_boutons_order_idx" ON "pages_blocks_appel_action_boutons" USING btree ("_order");
  CREATE INDEX "pages_blocks_appel_action_boutons_parent_id_idx" ON "pages_blocks_appel_action_boutons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appel_action_order_idx" ON "pages_blocks_appel_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_appel_action_parent_id_idx" ON "pages_blocks_appel_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_appel_action_path_idx" ON "pages_blocks_appel_action" USING btree ("_path");
  CREATE INDEX "pages_blocks_antennes_antennes_order_idx" ON "pages_blocks_antennes_antennes" USING btree ("_order");
  CREATE INDEX "pages_blocks_antennes_antennes_parent_id_idx" ON "pages_blocks_antennes_antennes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_antennes_order_idx" ON "pages_blocks_antennes" USING btree ("_order");
  CREATE INDEX "pages_blocks_antennes_parent_id_idx" ON "pages_blocks_antennes" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_antennes_path_idx" ON "pages_blocks_antennes" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_testimonials_id_idx" ON "pages_rels" USING btree ("testimonials_id");
  CREATE INDEX "_pages_v_blocks_entete_boutons_order_idx" ON "_pages_v_blocks_entete_boutons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_entete_boutons_parent_id_idx" ON "_pages_v_blocks_entete_boutons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_entete_order_idx" ON "_pages_v_blocks_entete" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_entete_parent_id_idx" ON "_pages_v_blocks_entete" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_entete_path_idx" ON "_pages_v_blocks_entete" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_entete_image_idx" ON "_pages_v_blocks_entete" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_texte_order_idx" ON "_pages_v_blocks_texte" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_texte_parent_id_idx" ON "_pages_v_blocks_texte" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_texte_path_idx" ON "_pages_v_blocks_texte" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_order_idx" ON "_pages_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_parent_id_idx" ON "_pages_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_path_idx" ON "_pages_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_image_idx" ON "_pages_v_blocks_image" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_chiffres_cles_order_idx" ON "_pages_v_blocks_chiffres_cles" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_chiffres_cles_parent_id_idx" ON "_pages_v_blocks_chiffres_cles" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_chiffres_cles_path_idx" ON "_pages_v_blocks_chiffres_cles" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cartes_cartes_order_idx" ON "_pages_v_blocks_cartes_cartes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cartes_cartes_parent_id_idx" ON "_pages_v_blocks_cartes_cartes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cartes_cartes_image_idx" ON "_pages_v_blocks_cartes_cartes" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_cartes_order_idx" ON "_pages_v_blocks_cartes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cartes_parent_id_idx" ON "_pages_v_blocks_cartes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cartes_path_idx" ON "_pages_v_blocks_cartes" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_temoignages_order_idx" ON "_pages_v_blocks_temoignages" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_temoignages_parent_id_idx" ON "_pages_v_blocks_temoignages" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_temoignages_path_idx" ON "_pages_v_blocks_temoignages" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_logos_order_idx" ON "_pages_v_blocks_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logos_parent_id_idx" ON "_pages_v_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logos_path_idx" ON "_pages_v_blocks_logos" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_appel_action_boutons_order_idx" ON "_pages_v_blocks_appel_action_boutons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appel_action_boutons_parent_id_idx" ON "_pages_v_blocks_appel_action_boutons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appel_action_order_idx" ON "_pages_v_blocks_appel_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_appel_action_parent_id_idx" ON "_pages_v_blocks_appel_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_appel_action_path_idx" ON "_pages_v_blocks_appel_action" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_antennes_antennes_order_idx" ON "_pages_v_blocks_antennes_antennes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_antennes_antennes_parent_id_idx" ON "_pages_v_blocks_antennes_antennes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_antennes_order_idx" ON "_pages_v_blocks_antennes" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_antennes_parent_id_idx" ON "_pages_v_blocks_antennes" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_antennes_path_idx" ON "_pages_v_blocks_antennes" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_testimonials_id_idx" ON "_pages_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "news_blocks_texte_order_idx" ON "news_blocks_texte" USING btree ("_order");
  CREATE INDEX "news_blocks_texte_parent_id_idx" ON "news_blocks_texte" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_texte_path_idx" ON "news_blocks_texte" USING btree ("_path");
  CREATE INDEX "news_blocks_image_order_idx" ON "news_blocks_image" USING btree ("_order");
  CREATE INDEX "news_blocks_image_parent_id_idx" ON "news_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_image_path_idx" ON "news_blocks_image" USING btree ("_path");
  CREATE INDEX "news_blocks_image_image_idx" ON "news_blocks_image" USING btree ("image_id");
  CREATE INDEX "news_blocks_chiffres_cles_order_idx" ON "news_blocks_chiffres_cles" USING btree ("_order");
  CREATE INDEX "news_blocks_chiffres_cles_parent_id_idx" ON "news_blocks_chiffres_cles" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_chiffres_cles_path_idx" ON "news_blocks_chiffres_cles" USING btree ("_path");
  CREATE INDEX "news_blocks_cartes_cartes_order_idx" ON "news_blocks_cartes_cartes" USING btree ("_order");
  CREATE INDEX "news_blocks_cartes_cartes_parent_id_idx" ON "news_blocks_cartes_cartes" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_cartes_cartes_image_idx" ON "news_blocks_cartes_cartes" USING btree ("image_id");
  CREATE INDEX "news_blocks_cartes_order_idx" ON "news_blocks_cartes" USING btree ("_order");
  CREATE INDEX "news_blocks_cartes_parent_id_idx" ON "news_blocks_cartes" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_cartes_path_idx" ON "news_blocks_cartes" USING btree ("_path");
  CREATE INDEX "news_blocks_faq_order_idx" ON "news_blocks_faq" USING btree ("_order");
  CREATE INDEX "news_blocks_faq_parent_id_idx" ON "news_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_faq_path_idx" ON "news_blocks_faq" USING btree ("_path");
  CREATE INDEX "news_blocks_appel_action_boutons_order_idx" ON "news_blocks_appel_action_boutons" USING btree ("_order");
  CREATE INDEX "news_blocks_appel_action_boutons_parent_id_idx" ON "news_blocks_appel_action_boutons" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_appel_action_order_idx" ON "news_blocks_appel_action" USING btree ("_order");
  CREATE INDEX "news_blocks_appel_action_parent_id_idx" ON "news_blocks_appel_action" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_appel_action_path_idx" ON "news_blocks_appel_action" USING btree ("_path");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_image_idx" ON "news" USING btree ("image_id");
  CREATE INDEX "news_pdf_idx" ON "news" USING btree ("pdf_id");
  CREATE INDEX "news_auteur_idx" ON "news" USING btree ("auteur_id");
  CREATE INDEX "news_meta_meta_image_idx" ON "news" USING btree ("meta_image_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "news_texts_order_parent" ON "news_texts" USING btree ("order","parent_id");
  CREATE INDEX "news_rels_order_idx" ON "news_rels" USING btree ("order");
  CREATE INDEX "news_rels_parent_idx" ON "news_rels" USING btree ("parent_id");
  CREATE INDEX "news_rels_path_idx" ON "news_rels" USING btree ("path");
  CREATE INDEX "news_rels_sectors_id_idx" ON "news_rels" USING btree ("sectors_id");
  CREATE INDEX "_news_v_blocks_texte_order_idx" ON "_news_v_blocks_texte" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_texte_parent_id_idx" ON "_news_v_blocks_texte" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_texte_path_idx" ON "_news_v_blocks_texte" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_image_order_idx" ON "_news_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_image_parent_id_idx" ON "_news_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_image_path_idx" ON "_news_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_image_image_idx" ON "_news_v_blocks_image" USING btree ("image_id");
  CREATE INDEX "_news_v_blocks_chiffres_cles_order_idx" ON "_news_v_blocks_chiffres_cles" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_chiffres_cles_parent_id_idx" ON "_news_v_blocks_chiffres_cles" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_chiffres_cles_path_idx" ON "_news_v_blocks_chiffres_cles" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_cartes_cartes_order_idx" ON "_news_v_blocks_cartes_cartes" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_cartes_cartes_parent_id_idx" ON "_news_v_blocks_cartes_cartes" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_cartes_cartes_image_idx" ON "_news_v_blocks_cartes_cartes" USING btree ("image_id");
  CREATE INDEX "_news_v_blocks_cartes_order_idx" ON "_news_v_blocks_cartes" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_cartes_parent_id_idx" ON "_news_v_blocks_cartes" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_cartes_path_idx" ON "_news_v_blocks_cartes" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_faq_order_idx" ON "_news_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_faq_parent_id_idx" ON "_news_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_faq_path_idx" ON "_news_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_appel_action_boutons_order_idx" ON "_news_v_blocks_appel_action_boutons" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_appel_action_boutons_parent_id_idx" ON "_news_v_blocks_appel_action_boutons" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_appel_action_order_idx" ON "_news_v_blocks_appel_action" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_appel_action_parent_id_idx" ON "_news_v_blocks_appel_action" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_appel_action_path_idx" ON "_news_v_blocks_appel_action" USING btree ("_path");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_image_idx" ON "_news_v" USING btree ("version_image_id");
  CREATE INDEX "_news_v_version_version_pdf_idx" ON "_news_v" USING btree ("version_pdf_id");
  CREATE INDEX "_news_v_version_version_auteur_idx" ON "_news_v" USING btree ("version_auteur_id");
  CREATE INDEX "_news_v_version_meta_version_meta_image_idx" ON "_news_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");
  CREATE INDEX "_news_v_texts_order_parent" ON "_news_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_news_v_rels_order_idx" ON "_news_v_rels" USING btree ("order");
  CREATE INDEX "_news_v_rels_parent_idx" ON "_news_v_rels" USING btree ("parent_id");
  CREATE INDEX "_news_v_rels_path_idx" ON "_news_v_rels" USING btree ("path");
  CREATE INDEX "_news_v_rels_sectors_id_idx" ON "_news_v_rels" USING btree ("sectors_id");
  CREATE INDEX "documents_historique_order_idx" ON "documents_historique" USING btree ("_order");
  CREATE INDEX "documents_historique_parent_id_idx" ON "documents_historique" USING btree ("_parent_id");
  CREATE INDEX "documents_couverture_idx" ON "documents" USING btree ("couverture_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  CREATE INDEX "people_photo_idx" ON "people" USING btree ("photo_id");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE INDEX "people_rels_order_idx" ON "people_rels" USING btree ("order");
  CREATE INDEX "people_rels_parent_idx" ON "people_rels" USING btree ("parent_id");
  CREATE INDEX "people_rels_path_idx" ON "people_rels" USING btree ("path");
  CREATE INDEX "people_rels_expertise_tags_id_idx" ON "people_rels" USING btree ("expertise_tags_id");
  CREATE UNIQUE INDEX "commissions_slug_idx" ON "commissions" USING btree ("slug");
  CREATE INDEX "commissions_responsable_idx" ON "commissions" USING btree ("responsable_id");
  CREATE INDEX "commissions_updated_at_idx" ON "commissions" USING btree ("updated_at");
  CREATE INDEX "commissions_created_at_idx" ON "commissions" USING btree ("created_at");
  CREATE INDEX "commissions_rels_order_idx" ON "commissions_rels" USING btree ("order");
  CREATE INDEX "commissions_rels_parent_idx" ON "commissions_rels" USING btree ("parent_id");
  CREATE INDEX "commissions_rels_path_idx" ON "commissions_rels" USING btree ("path");
  CREATE INDEX "commissions_rels_people_id_idx" ON "commissions_rels" USING btree ("people_id");
  CREATE INDEX "commissions_rels_expertise_tags_id_idx" ON "commissions_rels" USING btree ("expertise_tags_id");
  CREATE INDEX "partners_logo_idx" ON "partners" USING btree ("logo_id");
  CREATE INDEX "partners_updated_at_idx" ON "partners" USING btree ("updated_at");
  CREATE INDEX "partners_created_at_idx" ON "partners" USING btree ("created_at");
  CREATE INDEX "faq_emplacements_order_idx" ON "faq_emplacements" USING btree ("order");
  CREATE INDEX "faq_emplacements_parent_idx" ON "faq_emplacements" USING btree ("parent_id");
  CREATE INDEX "faq_updated_at_idx" ON "faq" USING btree ("updated_at");
  CREATE INDEX "faq_created_at_idx" ON "faq" USING btree ("created_at");
  CREATE INDEX "testimonials_photo_idx" ON "testimonials" USING btree ("photo_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE UNIQUE INDEX "sectors_slug_idx" ON "sectors" USING btree ("slug");
  CREATE INDEX "sectors_updated_at_idx" ON "sectors" USING btree ("updated_at");
  CREATE INDEX "sectors_created_at_idx" ON "sectors" USING btree ("created_at");
  CREATE UNIQUE INDEX "localities_slug_idx" ON "localities" USING btree ("slug");
  CREATE INDEX "localities_updated_at_idx" ON "localities" USING btree ("updated_at");
  CREATE INDEX "localities_created_at_idx" ON "localities" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_types_slug_idx" ON "event_types" USING btree ("slug");
  CREATE INDEX "event_types_updated_at_idx" ON "event_types" USING btree ("updated_at");
  CREATE INDEX "event_types_created_at_idx" ON "event_types" USING btree ("created_at");
  CREATE UNIQUE INDEX "expertise_tags_slug_idx" ON "expertise_tags" USING btree ("slug");
  CREATE INDEX "expertise_tags_updated_at_idx" ON "expertise_tags" USING btree ("updated_at");
  CREATE INDEX "expertise_tags_created_at_idx" ON "expertise_tags" USING btree ("created_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "settings_reseaux_sociaux_order_idx" ON "settings_reseaux_sociaux" USING btree ("_order");
  CREATE INDEX "settings_reseaux_sociaux_parent_id_idx" ON "settings_reseaux_sociaux" USING btree ("_parent_id");
  CREATE INDEX "settings_chiffres_cles_order_idx" ON "settings_chiffres_cles" USING btree ("_order");
  CREATE INDEX "settings_chiffres_cles_parent_id_idx" ON "settings_chiffres_cles" USING btree ("_parent_id");
  CREATE INDEX "settings_seo_seo_image_idx" ON "settings" USING btree ("seo_image_id");
  CREATE INDEX "navigation_principal_sous_menu_order_idx" ON "navigation_principal_sous_menu" USING btree ("_order");
  CREATE INDEX "navigation_principal_sous_menu_parent_id_idx" ON "navigation_principal_sous_menu" USING btree ("_parent_id");
  CREATE INDEX "navigation_principal_sous_menu_page_idx" ON "navigation_principal_sous_menu" USING btree ("page_id");
  CREATE INDEX "navigation_principal_order_idx" ON "navigation_principal" USING btree ("_order");
  CREATE INDEX "navigation_principal_parent_id_idx" ON "navigation_principal" USING btree ("_parent_id");
  CREATE INDEX "navigation_principal_page_idx" ON "navigation_principal" USING btree ("page_id");
  CREATE INDEX "navigation_pied_de_page_liens_order_idx" ON "navigation_pied_de_page_liens" USING btree ("_order");
  CREATE INDEX "navigation_pied_de_page_liens_parent_id_idx" ON "navigation_pied_de_page_liens" USING btree ("_parent_id");
  CREATE INDEX "navigation_pied_de_page_liens_page_idx" ON "navigation_pied_de_page_liens" USING btree ("page_id");
  CREATE INDEX "navigation_pied_de_page_order_idx" ON "navigation_pied_de_page" USING btree ("_order");
  CREATE INDEX "navigation_pied_de_page_parent_id_idx" ON "navigation_pied_de_page" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_commissions_fk" FOREIGN KEY ("commissions_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partners_fk" FOREIGN KEY ("partners_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faq_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sectors_fk" FOREIGN KEY ("sectors_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_localities_fk" FOREIGN KEY ("localities_id") REFERENCES "public"."localities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_types_fk" FOREIGN KEY ("event_types_id") REFERENCES "public"."event_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_expertise_tags_fk" FOREIGN KEY ("expertise_tags_id") REFERENCES "public"."expertise_tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_sizes_vignette_sizes_vignette_filename_idx" ON "media" USING btree ("sizes_vignette_filename");
  CREATE INDEX "media_sizes_carte_sizes_carte_filename_idx" ON "media" USING btree ("sizes_carte_filename");
  CREATE INDEX "media_sizes_grande_sizes_grande_filename_idx" ON "media" USING btree ("sizes_grande_filename");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_commissions_id_idx" ON "payload_locked_documents_rels" USING btree ("commissions_id");
  CREATE INDEX "payload_locked_documents_rels_partners_id_idx" ON "payload_locked_documents_rels" USING btree ("partners_id");
  CREATE INDEX "payload_locked_documents_rels_faq_id_idx" ON "payload_locked_documents_rels" USING btree ("faq_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_sectors_id_idx" ON "payload_locked_documents_rels" USING btree ("sectors_id");
  CREATE INDEX "payload_locked_documents_rels_localities_id_idx" ON "payload_locked_documents_rels" USING btree ("localities_id");
  CREATE INDEX "payload_locked_documents_rels_event_types_id_idx" ON "payload_locked_documents_rels" USING btree ("event_types_id");
  CREATE INDEX "payload_locked_documents_rels_expertise_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("expertise_tags_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_entete_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_entete" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_texte" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_chiffres_cles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cartes_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_temoignages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_appel_action_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_appel_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_antennes_antennes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_antennes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entete_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_entete" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_texte" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_chiffres_cles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cartes_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_temoignages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_appel_action_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_appel_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_antennes_antennes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_antennes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_texte" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_chiffres_cles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_cartes_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_appel_action_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_appel_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_texte" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_chiffres_cles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_cartes_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_cartes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_appel_action_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_appel_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "documents_historique" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "people_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commissions_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq_emplacements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sectors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "localities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_types" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "expertise_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings_reseaux_sociaux" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings_chiffres_cles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_principal_sous_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_principal" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_pied_de_page_liens" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_pied_de_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_entete_boutons" CASCADE;
  DROP TABLE "pages_blocks_entete" CASCADE;
  DROP TABLE "pages_blocks_texte" CASCADE;
  DROP TABLE "pages_blocks_image" CASCADE;
  DROP TABLE "pages_blocks_chiffres_cles" CASCADE;
  DROP TABLE "pages_blocks_cartes_cartes" CASCADE;
  DROP TABLE "pages_blocks_cartes" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_temoignages" CASCADE;
  DROP TABLE "pages_blocks_logos" CASCADE;
  DROP TABLE "pages_blocks_appel_action_boutons" CASCADE;
  DROP TABLE "pages_blocks_appel_action" CASCADE;
  DROP TABLE "pages_blocks_antennes_antennes" CASCADE;
  DROP TABLE "pages_blocks_antennes" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_entete_boutons" CASCADE;
  DROP TABLE "_pages_v_blocks_entete" CASCADE;
  DROP TABLE "_pages_v_blocks_texte" CASCADE;
  DROP TABLE "_pages_v_blocks_image" CASCADE;
  DROP TABLE "_pages_v_blocks_chiffres_cles" CASCADE;
  DROP TABLE "_pages_v_blocks_cartes_cartes" CASCADE;
  DROP TABLE "_pages_v_blocks_cartes" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_temoignages" CASCADE;
  DROP TABLE "_pages_v_blocks_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_appel_action_boutons" CASCADE;
  DROP TABLE "_pages_v_blocks_appel_action" CASCADE;
  DROP TABLE "_pages_v_blocks_antennes_antennes" CASCADE;
  DROP TABLE "_pages_v_blocks_antennes" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "news_blocks_texte" CASCADE;
  DROP TABLE "news_blocks_image" CASCADE;
  DROP TABLE "news_blocks_chiffres_cles" CASCADE;
  DROP TABLE "news_blocks_cartes_cartes" CASCADE;
  DROP TABLE "news_blocks_cartes" CASCADE;
  DROP TABLE "news_blocks_faq" CASCADE;
  DROP TABLE "news_blocks_appel_action_boutons" CASCADE;
  DROP TABLE "news_blocks_appel_action" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_texts" CASCADE;
  DROP TABLE "news_rels" CASCADE;
  DROP TABLE "_news_v_blocks_texte" CASCADE;
  DROP TABLE "_news_v_blocks_image" CASCADE;
  DROP TABLE "_news_v_blocks_chiffres_cles" CASCADE;
  DROP TABLE "_news_v_blocks_cartes_cartes" CASCADE;
  DROP TABLE "_news_v_blocks_cartes" CASCADE;
  DROP TABLE "_news_v_blocks_faq" CASCADE;
  DROP TABLE "_news_v_blocks_appel_action_boutons" CASCADE;
  DROP TABLE "_news_v_blocks_appel_action" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "_news_v_texts" CASCADE;
  DROP TABLE "_news_v_rels" CASCADE;
  DROP TABLE "documents_historique" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "people_rels" CASCADE;
  DROP TABLE "commissions" CASCADE;
  DROP TABLE "commissions_rels" CASCADE;
  DROP TABLE "partners" CASCADE;
  DROP TABLE "faq_emplacements" CASCADE;
  DROP TABLE "faq" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "sectors" CASCADE;
  DROP TABLE "localities" CASCADE;
  DROP TABLE "event_types" CASCADE;
  DROP TABLE "expertise_tags" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "settings_reseaux_sociaux" CASCADE;
  DROP TABLE "settings_chiffres_cles" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TABLE "navigation_principal_sous_menu" CASCADE;
  DROP TABLE "navigation_principal" CASCADE;
  DROP TABLE "navigation_pied_de_page_liens" CASCADE;
  DROP TABLE "navigation_pied_de_page" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_news_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_documents_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_people_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_commissions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_partners_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_faq_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_testimonials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sectors_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_localities_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_types_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_expertise_tags_fk";
  
  DROP INDEX "media_sizes_vignette_sizes_vignette_filename_idx";
  DROP INDEX "media_sizes_carte_sizes_carte_filename_idx";
  DROP INDEX "media_sizes_grande_sizes_grande_filename_idx";
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_news_id_idx";
  DROP INDEX "payload_locked_documents_rels_documents_id_idx";
  DROP INDEX "payload_locked_documents_rels_people_id_idx";
  DROP INDEX "payload_locked_documents_rels_commissions_id_idx";
  DROP INDEX "payload_locked_documents_rels_partners_id_idx";
  DROP INDEX "payload_locked_documents_rels_faq_id_idx";
  DROP INDEX "payload_locked_documents_rels_testimonials_id_idx";
  DROP INDEX "payload_locked_documents_rels_sectors_id_idx";
  DROP INDEX "payload_locked_documents_rels_localities_id_idx";
  DROP INDEX "payload_locked_documents_rels_event_types_id_idx";
  DROP INDEX "payload_locked_documents_rels_expertise_tags_id_idx";
  ALTER TABLE "media" DROP COLUMN "credits";
  ALTER TABLE "media" DROP COLUMN "illustration";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_url";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_width";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_height";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_vignette_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_url";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_width";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_height";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_carte_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_url";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_width";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_height";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_grande_filename";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "news_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "documents_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "people_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "commissions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "partners_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "faq_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sectors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "localities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_types_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "expertise_tags_id";
  DROP TYPE "public"."enum_pages_blocks_cartes_style";
  DROP TYPE "public"."enum_pages_blocks_faq_emplacement";
  DROP TYPE "public"."enum_pages_blocks_antennes_antennes_statut";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_cartes_style";
  DROP TYPE "public"."enum__pages_v_blocks_faq_emplacement";
  DROP TYPE "public"."enum__pages_v_blocks_antennes_antennes_statut";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_news_blocks_cartes_style";
  DROP TYPE "public"."enum_news_blocks_faq_emplacement";
  DROP TYPE "public"."enum_news_type";
  DROP TYPE "public"."enum_news_etat";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum__news_v_blocks_cartes_style";
  DROP TYPE "public"."enum__news_v_blocks_faq_emplacement";
  DROP TYPE "public"."enum__news_v_version_type";
  DROP TYPE "public"."enum__news_v_version_etat";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum_documents_rubrique";
  DROP TYPE "public"."enum_documents_visibilite";
  DROP TYPE "public"."enum_people_role";
  DROP TYPE "public"."enum_people_pole";
  DROP TYPE "public"."enum_commissions_ouverture";
  DROP TYPE "public"."enum_faq_emplacements";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_settings_reseaux_sociaux_reseau";
  DROP TYPE "public"."enum_settings_chiffres_cles_mode";
  DROP TYPE "public"."enum_settings_alertes_alertes_aussi";`)
}
