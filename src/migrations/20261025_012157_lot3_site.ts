import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_documents_type_presse" AS ENUM('communique', 'kit');
  ALTER TYPE "public"."enum_pages_blocks_cartes_style" ADD VALUE 'legal';
  ALTER TYPE "public"."enum__pages_v_blocks_cartes_style" ADD VALUE 'legal';
  ALTER TYPE "public"."enum_news_blocks_cartes_style" ADD VALUE 'legal';
  ALTER TYPE "public"."enum__news_v_blocks_cartes_style" ADD VALUE 'legal';
  CREATE TABLE "pages_blocks_section_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "pages_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"surtitre" varchar,
  	"titre" varchar,
  	"texte" varchar,
  	"image_id" integer,
  	"note" varchar,
  	"a_valider" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cartes_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_section_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ancre" varchar,
  	"surtitre" varchar,
  	"titre" varchar,
  	"texte" varchar,
  	"image_id" integer,
  	"note" varchar,
  	"a_valider" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cartes_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "news_blocks_cartes_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar
  );
  
  CREATE TABLE "_news_v_blocks_cartes_boutons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"libelle" varchar,
  	"lien" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "search" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"priority" numeric,
  	"type" varchar,
  	"lien" varchar,
  	"extrait" varchar,
  	"contenu" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"news_id" integer
  );
  
  ALTER TABLE "pages_blocks_entete" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_texte" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_image" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_chiffres_cles" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_cartes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_cartes" ADD COLUMN "note" varchar;
  ALTER TABLE "pages_blocks_cartes" ADD COLUMN "a_valider" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_faq" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_temoignages" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_logos" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_appel_action" ADD COLUMN "ancre" varchar;
  ALTER TABLE "pages_blocks_antennes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_entete" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_texte" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_image" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_chiffres_cles" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_cartes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_cartes" ADD COLUMN "note" varchar;
  ALTER TABLE "_pages_v_blocks_cartes" ADD COLUMN "a_valider" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_faq" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_temoignages" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_logos" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_appel_action" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_pages_v_blocks_antennes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_texte" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_image" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_chiffres_cles" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_cartes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_cartes" ADD COLUMN "note" varchar;
  ALTER TABLE "news_blocks_cartes" ADD COLUMN "a_valider" boolean DEFAULT false;
  ALTER TABLE "news_blocks_faq" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news_blocks_appel_action" ADD COLUMN "ancre" varchar;
  ALTER TABLE "news" ADD COLUMN "a_la_une" boolean DEFAULT false;
  ALTER TABLE "news" ADD COLUMN "signature" varchar;
  ALTER TABLE "news_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "news_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "_news_v_blocks_texte" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v_blocks_image" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v_blocks_chiffres_cles" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v_blocks_cartes" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v_blocks_cartes" ADD COLUMN "note" varchar;
  ALTER TABLE "_news_v_blocks_cartes" ADD COLUMN "a_valider" boolean DEFAULT false;
  ALTER TABLE "_news_v_blocks_faq" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v_blocks_appel_action" ADD COLUMN "ancre" varchar;
  ALTER TABLE "_news_v" ADD COLUMN "version_a_la_une" boolean DEFAULT false;
  ALTER TABLE "_news_v" ADD COLUMN "version_signature" varchar;
  ALTER TABLE "_news_v_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "_news_v_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "documents" ADD COLUMN "type_presse" "enum_documents_type_presse";
  ALTER TABLE "commissions" ADD COLUMN "image_id" integer;
  ALTER TABLE "expertise_tags" ADD COLUMN "filtre_site" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "search_id" integer;
  ALTER TABLE "pages_blocks_section_boutons" ADD CONSTRAINT "pages_blocks_section_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_section" ADD CONSTRAINT "pages_blocks_section_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_section" ADD CONSTRAINT "pages_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cartes_boutons" ADD CONSTRAINT "pages_blocks_cartes_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_section_boutons" ADD CONSTRAINT "_pages_v_blocks_section_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_section" ADD CONSTRAINT "_pages_v_blocks_section_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_section" ADD CONSTRAINT "_pages_v_blocks_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cartes_boutons" ADD CONSTRAINT "_pages_v_blocks_cartes_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_cartes_boutons" ADD CONSTRAINT "news_blocks_cartes_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_cartes_boutons" ADD CONSTRAINT "_news_v_blocks_cartes_boutons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v_blocks_cartes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_section_boutons_order_idx" ON "pages_blocks_section_boutons" USING btree ("_order");
  CREATE INDEX "pages_blocks_section_boutons_parent_id_idx" ON "pages_blocks_section_boutons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_section_order_idx" ON "pages_blocks_section" USING btree ("_order");
  CREATE INDEX "pages_blocks_section_parent_id_idx" ON "pages_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_section_path_idx" ON "pages_blocks_section" USING btree ("_path");
  CREATE INDEX "pages_blocks_section_image_idx" ON "pages_blocks_section" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cartes_boutons_order_idx" ON "pages_blocks_cartes_boutons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cartes_boutons_parent_id_idx" ON "pages_blocks_cartes_boutons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_section_boutons_order_idx" ON "_pages_v_blocks_section_boutons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_section_boutons_parent_id_idx" ON "_pages_v_blocks_section_boutons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_section_order_idx" ON "_pages_v_blocks_section" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_section_parent_id_idx" ON "_pages_v_blocks_section" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_section_path_idx" ON "_pages_v_blocks_section" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_section_image_idx" ON "_pages_v_blocks_section" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_cartes_boutons_order_idx" ON "_pages_v_blocks_cartes_boutons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cartes_boutons_parent_id_idx" ON "_pages_v_blocks_cartes_boutons" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_cartes_boutons_order_idx" ON "news_blocks_cartes_boutons" USING btree ("_order");
  CREATE INDEX "news_blocks_cartes_boutons_parent_id_idx" ON "news_blocks_cartes_boutons" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_cartes_boutons_order_idx" ON "_news_v_blocks_cartes_boutons" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_cartes_boutons_parent_id_idx" ON "_news_v_blocks_cartes_boutons" USING btree ("_parent_id");
  CREATE INDEX "search_type_idx" ON "search" USING btree ("type");
  CREATE INDEX "search_updated_at_idx" ON "search" USING btree ("updated_at");
  CREATE INDEX "search_created_at_idx" ON "search" USING btree ("created_at");
  CREATE INDEX "search_rels_order_idx" ON "search_rels" USING btree ("order");
  CREATE INDEX "search_rels_parent_idx" ON "search_rels" USING btree ("parent_id");
  CREATE INDEX "search_rels_path_idx" ON "search_rels" USING btree ("path");
  CREATE INDEX "search_rels_pages_id_idx" ON "search_rels" USING btree ("pages_id");
  CREATE INDEX "search_rels_news_id_idx" ON "search_rels" USING btree ("news_id");
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "news_rels_news_id_idx" ON "news_rels" USING btree ("news_id");
  CREATE INDEX "news_rels_pages_id_idx" ON "news_rels" USING btree ("pages_id");
  CREATE INDEX "_news_v_rels_news_id_idx" ON "_news_v_rels" USING btree ("news_id");
  CREATE INDEX "_news_v_rels_pages_id_idx" ON "_news_v_rels" USING btree ("pages_id");
  CREATE INDEX "commissions_image_idx" ON "commissions" USING btree ("image_id");
  CREATE INDEX "payload_locked_documents_rels_search_id_idx" ON "payload_locked_documents_rels" USING btree ("search_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_section_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_section" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_cartes_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_section_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_section" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_cartes_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_cartes_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_cartes_boutons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "search" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "search_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_section_boutons" CASCADE;
  DROP TABLE "pages_blocks_section" CASCADE;
  DROP TABLE "pages_blocks_cartes_boutons" CASCADE;
  DROP TABLE "_pages_v_blocks_section_boutons" CASCADE;
  DROP TABLE "_pages_v_blocks_section" CASCADE;
  DROP TABLE "_pages_v_blocks_cartes_boutons" CASCADE;
  DROP TABLE "news_blocks_cartes_boutons" CASCADE;
  DROP TABLE "_news_v_blocks_cartes_boutons" CASCADE;
  DROP TABLE "search" CASCADE;
  DROP TABLE "search_rels" CASCADE;
  ALTER TABLE "news_rels" DROP CONSTRAINT "news_rels_news_fk";
  
  ALTER TABLE "news_rels" DROP CONSTRAINT "news_rels_pages_fk";
  
  ALTER TABLE "_news_v_rels" DROP CONSTRAINT "_news_v_rels_news_fk";
  
  ALTER TABLE "_news_v_rels" DROP CONSTRAINT "_news_v_rels_pages_fk";
  
  ALTER TABLE "commissions" DROP CONSTRAINT "commissions_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_search_fk";
  
  ALTER TABLE "pages_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::text;
  DROP TYPE "public"."enum_pages_blocks_cartes_style";
  CREATE TYPE "public"."enum_pages_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  ALTER TABLE "pages_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::"public"."enum_pages_blocks_cartes_style";
  ALTER TABLE "pages_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE "public"."enum_pages_blocks_cartes_style" USING "style"::"public"."enum_pages_blocks_cartes_style";
  ALTER TABLE "_pages_v_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::text;
  DROP TYPE "public"."enum__pages_v_blocks_cartes_style";
  CREATE TYPE "public"."enum__pages_v_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  ALTER TABLE "_pages_v_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::"public"."enum__pages_v_blocks_cartes_style";
  ALTER TABLE "_pages_v_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE "public"."enum__pages_v_blocks_cartes_style" USING "style"::"public"."enum__pages_v_blocks_cartes_style";
  ALTER TABLE "news_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "news_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::text;
  DROP TYPE "public"."enum_news_blocks_cartes_style";
  CREATE TYPE "public"."enum_news_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  ALTER TABLE "news_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::"public"."enum_news_blocks_cartes_style";
  ALTER TABLE "news_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE "public"."enum_news_blocks_cartes_style" USING "style"::"public"."enum_news_blocks_cartes_style";
  ALTER TABLE "_news_v_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE text;
  ALTER TABLE "_news_v_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::text;
  DROP TYPE "public"."enum__news_v_blocks_cartes_style";
  CREATE TYPE "public"."enum__news_v_blocks_cartes_style" AS ENUM('cartes', 'numerotees', 'liste', 'pastilles');
  ALTER TABLE "_news_v_blocks_cartes" ALTER COLUMN "style" SET DEFAULT 'cartes'::"public"."enum__news_v_blocks_cartes_style";
  ALTER TABLE "_news_v_blocks_cartes" ALTER COLUMN "style" SET DATA TYPE "public"."enum__news_v_blocks_cartes_style" USING "style"::"public"."enum__news_v_blocks_cartes_style";
  DROP INDEX "news_rels_news_id_idx";
  DROP INDEX "news_rels_pages_id_idx";
  DROP INDEX "_news_v_rels_news_id_idx";
  DROP INDEX "_news_v_rels_pages_id_idx";
  DROP INDEX "commissions_image_idx";
  DROP INDEX "payload_locked_documents_rels_search_id_idx";
  ALTER TABLE "pages_blocks_entete" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_texte" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_image" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_chiffres_cles" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_cartes" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_cartes" DROP COLUMN "note";
  ALTER TABLE "pages_blocks_cartes" DROP COLUMN "a_valider";
  ALTER TABLE "pages_blocks_faq" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_temoignages" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_logos" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_appel_action" DROP COLUMN "ancre";
  ALTER TABLE "pages_blocks_antennes" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_entete" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_texte" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_image" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_chiffres_cles" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_cartes" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_cartes" DROP COLUMN "note";
  ALTER TABLE "_pages_v_blocks_cartes" DROP COLUMN "a_valider";
  ALTER TABLE "_pages_v_blocks_faq" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_temoignages" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_logos" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_appel_action" DROP COLUMN "ancre";
  ALTER TABLE "_pages_v_blocks_antennes" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_texte" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_image" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_chiffres_cles" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_cartes" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_cartes" DROP COLUMN "note";
  ALTER TABLE "news_blocks_cartes" DROP COLUMN "a_valider";
  ALTER TABLE "news_blocks_faq" DROP COLUMN "ancre";
  ALTER TABLE "news_blocks_appel_action" DROP COLUMN "ancre";
  ALTER TABLE "news" DROP COLUMN "a_la_une";
  ALTER TABLE "news" DROP COLUMN "signature";
  ALTER TABLE "news_rels" DROP COLUMN "news_id";
  ALTER TABLE "news_rels" DROP COLUMN "pages_id";
  ALTER TABLE "_news_v_blocks_texte" DROP COLUMN "ancre";
  ALTER TABLE "_news_v_blocks_image" DROP COLUMN "ancre";
  ALTER TABLE "_news_v_blocks_chiffres_cles" DROP COLUMN "ancre";
  ALTER TABLE "_news_v_blocks_cartes" DROP COLUMN "ancre";
  ALTER TABLE "_news_v_blocks_cartes" DROP COLUMN "note";
  ALTER TABLE "_news_v_blocks_cartes" DROP COLUMN "a_valider";
  ALTER TABLE "_news_v_blocks_faq" DROP COLUMN "ancre";
  ALTER TABLE "_news_v_blocks_appel_action" DROP COLUMN "ancre";
  ALTER TABLE "_news_v" DROP COLUMN "version_a_la_une";
  ALTER TABLE "_news_v" DROP COLUMN "version_signature";
  ALTER TABLE "_news_v_rels" DROP COLUMN "news_id";
  ALTER TABLE "_news_v_rels" DROP COLUMN "pages_id";
  ALTER TABLE "documents" DROP COLUMN "type_presse";
  ALTER TABLE "commissions" DROP COLUMN "image_id";
  ALTER TABLE "expertise_tags" DROP COLUMN "filtre_site";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "search_id";
  DROP TYPE "public"."enum_documents_type_presse";`)
}
