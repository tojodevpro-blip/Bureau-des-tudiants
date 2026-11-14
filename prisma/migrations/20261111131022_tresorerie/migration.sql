-- CreateEnum
CREATE TYPE "TreasuryEntryType" AS ENUM ('RECETTE', 'DEPENSE');

-- CreateEnum
CREATE TYPE "TreasuryPaymentMethod" AS ENUM ('ESPECES', 'MVOLA', 'AIRTEL_MONEY', 'VIREMENT', 'AUTRE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tresorerie_access" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "treasury_entries" (
    "id" TEXT NOT NULL,
    "type" "TreasuryEntryType" NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "moyen_paiement" "TreasuryPaymentMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "event_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treasury_entries_date_idx" ON "treasury_entries"("date");

-- CreateIndex
CREATE INDEX "treasury_entries_type_date_idx" ON "treasury_entries"("type", "date");

-- CreateIndex
CREATE INDEX "treasury_entries_categorie_idx" ON "treasury_entries"("categorie");

-- CreateIndex
CREATE INDEX "treasury_entries_event_id_idx" ON "treasury_entries"("event_id");

-- AddForeignKey
ALTER TABLE "treasury_entries" ADD CONSTRAINT "treasury_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_entries" ADD CONSTRAINT "treasury_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
