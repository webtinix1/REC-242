import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_modification_requests_champ" ADD VALUE 'quartier';
  ALTER TYPE "public"."enum_documents_rubrique" ADD VALUE 'adhesion';
  ALTER TYPE "public"."enum_documents_visibilite" ADD VALUE 'personnel';
  ALTER TABLE "companies" ADD COLUMN "photo_id" integer;
  ALTER TABLE "events_documents" ADD COLUMN "libelle" varchar;
  ALTER TABLE "events" ADD COLUMN "bandeau_id" integer;
  ALTER TABLE "opportunities" ADD COLUMN "image_id" integer;
  ALTER TABLE "opportunities" ADD COLUMN "rang" numeric;
  ALTER TABLE "pages_blocks_cartes_cartes" ADD COLUMN "image2_id" integer;
  ALTER TABLE "_pages_v_blocks_cartes_cartes" ADD COLUMN "image2_id" integer;
  ALTER TABLE "news_blocks_cartes_cartes" ADD COLUMN "image2_id" integer;
  ALTER TABLE "news" ADD COLUMN "rang" numeric;
  ALTER TABLE "news" ADD COLUMN "a_lire_aussi_titre" varchar;
  ALTER TABLE "_news_v_blocks_cartes_cartes" ADD COLUMN "image2_id" integer;
  ALTER TABLE "_news_v" ADD COLUMN "version_rang" numeric;
  ALTER TABLE "_news_v" ADD COLUMN "version_a_lire_aussi_titre" varchar;
  ALTER TABLE "documents" ADD COLUMN "membre_id" integer;
  ALTER TABLE "documents" ADD COLUMN "description" varchar;
  ALTER TABLE "expertise_tags" ADD COLUMN "domaine_membres" boolean DEFAULT false;
  ALTER TABLE "expertise_tags" ADD COLUMN "ordre_membres" numeric DEFAULT 0;
  ALTER TABLE "companies" ADD CONSTRAINT "companies_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_bandeau_id_media_id_fk" FOREIGN KEY ("bandeau_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cartes_cartes" ADD CONSTRAINT "pages_blocks_cartes_cartes_image2_id_media_id_fk" FOREIGN KEY ("image2_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cartes_cartes" ADD CONSTRAINT "_pages_v_blocks_cartes_cartes_image2_id_media_id_fk" FOREIGN KEY ("image2_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_cartes_cartes" ADD CONSTRAINT "news_blocks_cartes_cartes_image2_id_media_id_fk" FOREIGN KEY ("image2_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_cartes_cartes" ADD CONSTRAINT "_news_v_blocks_cartes_cartes_image2_id_media_id_fk" FOREIGN KEY ("image2_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_membre_id_members_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "companies_photo_idx" ON "companies" USING btree ("photo_id");
  CREATE INDEX "events_bandeau_idx" ON "events" USING btree ("bandeau_id");
  CREATE INDEX "opportunities_image_idx" ON "opportunities" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cartes_cartes_image2_idx" ON "pages_blocks_cartes_cartes" USING btree ("image2_id");
  CREATE INDEX "_pages_v_blocks_cartes_cartes_image2_idx" ON "_pages_v_blocks_cartes_cartes" USING btree ("image2_id");
  CREATE INDEX "news_blocks_cartes_cartes_image2_idx" ON "news_blocks_cartes_cartes" USING btree ("image2_id");
  CREATE INDEX "_news_v_blocks_cartes_cartes_image2_idx" ON "_news_v_blocks_cartes_cartes" USING btree ("image2_id");
  CREATE INDEX "documents_membre_idx" ON "documents" USING btree ("membre_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "companies" DROP CONSTRAINT "companies_photo_id_media_id_fk";
  
  ALTER TABLE "events" DROP CONSTRAINT "events_bandeau_id_media_id_fk";
  
  ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_image_id_media_id_fk";
  
  ALTER TABLE "pages_blocks_cartes_cartes" DROP CONSTRAINT "pages_blocks_cartes_cartes_image2_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_cartes_cartes" DROP CONSTRAINT "_pages_v_blocks_cartes_cartes_image2_id_media_id_fk";
  
  ALTER TABLE "news_blocks_cartes_cartes" DROP CONSTRAINT "news_blocks_cartes_cartes_image2_id_media_id_fk";
  
  ALTER TABLE "_news_v_blocks_cartes_cartes" DROP CONSTRAINT "_news_v_blocks_cartes_cartes_image2_id_media_id_fk";
  
  ALTER TABLE "documents" DROP CONSTRAINT "documents_membre_id_members_id_fk";
  
  ALTER TABLE "modification_requests" ALTER COLUMN "champ" SET DATA TYPE text;
  DROP TYPE "public"."enum_modification_requests_champ";
  CREATE TYPE "public"."enum_modification_requests_champ" AS ENUM('nom', 'raisonSociale', 'secteurs', 'villeQuartier', 'telephone', 'email');
  ALTER TABLE "modification_requests" ALTER COLUMN "champ" SET DATA TYPE "public"."enum_modification_requests_champ" USING "champ"::"public"."enum_modification_requests_champ";
  ALTER TABLE "documents" ALTER COLUMN "rubrique" SET DATA TYPE text;
  DROP TYPE "public"."enum_documents_rubrique";
  CREATE TYPE "public"."enum_documents_rubrique" AS ENUM('textes', 'vie', 'ateliers', 'presse', 'evenements');
  ALTER TABLE "documents" ALTER COLUMN "rubrique" SET DATA TYPE "public"."enum_documents_rubrique" USING "rubrique"::"public"."enum_documents_rubrique";
  ALTER TABLE "documents" ALTER COLUMN "visibilite" SET DATA TYPE text;
  ALTER TABLE "documents" ALTER COLUMN "visibilite" SET DEFAULT 'membres'::text;
  DROP TYPE "public"."enum_documents_visibilite";
  CREATE TYPE "public"."enum_documents_visibilite" AS ENUM('public', 'membres', 'inscrits', 'comite');
  ALTER TABLE "documents" ALTER COLUMN "visibilite" SET DEFAULT 'membres'::"public"."enum_documents_visibilite";
  ALTER TABLE "documents" ALTER COLUMN "visibilite" SET DATA TYPE "public"."enum_documents_visibilite" USING "visibilite"::"public"."enum_documents_visibilite";
  DROP INDEX "companies_photo_idx";
  DROP INDEX "events_bandeau_idx";
  DROP INDEX "opportunities_image_idx";
  DROP INDEX "pages_blocks_cartes_cartes_image2_idx";
  DROP INDEX "_pages_v_blocks_cartes_cartes_image2_idx";
  DROP INDEX "news_blocks_cartes_cartes_image2_idx";
  DROP INDEX "_news_v_blocks_cartes_cartes_image2_idx";
  DROP INDEX "documents_membre_idx";
  ALTER TABLE "companies" DROP COLUMN "photo_id";
  ALTER TABLE "events_documents" DROP COLUMN "libelle";
  ALTER TABLE "events" DROP COLUMN "bandeau_id";
  ALTER TABLE "opportunities" DROP COLUMN "image_id";
  ALTER TABLE "opportunities" DROP COLUMN "rang";
  ALTER TABLE "pages_blocks_cartes_cartes" DROP COLUMN "image2_id";
  ALTER TABLE "_pages_v_blocks_cartes_cartes" DROP COLUMN "image2_id";
  ALTER TABLE "news_blocks_cartes_cartes" DROP COLUMN "image2_id";
  ALTER TABLE "news" DROP COLUMN "rang";
  ALTER TABLE "news" DROP COLUMN "a_lire_aussi_titre";
  ALTER TABLE "_news_v_blocks_cartes_cartes" DROP COLUMN "image2_id";
  ALTER TABLE "_news_v" DROP COLUMN "version_rang";
  ALTER TABLE "_news_v" DROP COLUMN "version_a_lire_aussi_titre";
  ALTER TABLE "documents" DROP COLUMN "membre_id";
  ALTER TABLE "documents" DROP COLUMN "description";
  ALTER TABLE "expertise_tags" DROP COLUMN "domaine_membres";
  ALTER TABLE "expertise_tags" DROP COLUMN "ordre_membres";`)
}
