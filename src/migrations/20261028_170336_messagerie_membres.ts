import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_email_templates_modeles_cle" ADD VALUE 'messageMembre' BEFORE 'reponseAnnonce';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE text;
  DROP TYPE "public"."enum_email_templates_modeles_cle";
  CREATE TYPE "public"."enum_email_templates_modeles_cle" AS ENUM('candidatureConfirmation', 'candidatureAlerte', 'candidatureComplement', 'bienvenueActivation', 'refusMotive', 'inscriptionConfirmation', 'inscriptionListeAttente', 'placeLiberee', 'rappelVeille', 'evenementAnnuleReporte', 'echeanceCotisation', 'relanceCotisation', 'recuPaiement', 'constatPerte', 'demandeExpert', 'relanceExpert', 'miseEnRelationRecue', 'miseEnRelationReponse', 'reponseAnnonce', 'decisionModeration', 'demandeModificationTraitee', 'disciplineGriefs', 'disciplineDecision', 'reinitialisationMotDePasse', 'nouvelAppareil', 'invitationAdmin', 'accuseReceptionFormulaire', 'alerteMessage', 'remboursementATraiter', 'nouveauDocument', 'opportuniteSecteur', 'lienConnexion');
  ALTER TABLE "email_templates_modeles" ALTER COLUMN "cle" SET DATA TYPE "public"."enum_email_templates_modeles_cle" USING "cle"::"public"."enum_email_templates_modeles_cle";`)
}
