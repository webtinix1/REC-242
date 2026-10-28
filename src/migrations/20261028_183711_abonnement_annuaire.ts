import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payments_objet" ADD VALUE 'abonnement';
  ALTER TABLE "members" ADD COLUMN "abonnement_jusquau" timestamp(3) with time zone;
  ALTER TABLE "payments" ADD COLUMN "abonnement_mois" numeric;
  ALTER TABLE "settings" ADD COLUMN "abonnement_montant" numeric;
  ALTER TABLE "settings" ADD COLUMN "abonnement_duree_mois" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ALTER COLUMN "objet" SET DATA TYPE text;
  DROP TYPE "public"."enum_payments_objet";
  CREATE TYPE "public"."enum_payments_objet" AS ENUM('adhesion', 'adhesion-tranche', 'droit', 'tranche1', 'tranche2', 'cotisation', 'encart');
  ALTER TABLE "payments" ALTER COLUMN "objet" SET DATA TYPE "public"."enum_payments_objet" USING "objet"::"public"."enum_payments_objet";
  ALTER TABLE "members" DROP COLUMN "abonnement_jusquau";
  ALTER TABLE "payments" DROP COLUMN "abonnement_mois";
  ALTER TABLE "settings" DROP COLUMN "abonnement_montant";
  ALTER TABLE "settings" DROP COLUMN "abonnement_duree_mois";`)
}
