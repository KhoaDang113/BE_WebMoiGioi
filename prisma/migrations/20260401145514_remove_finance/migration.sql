/*
  Warnings:

  - The values [AGENCY,MODERATOR] on the enum `AccountType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `vip_level_id` on the `listings` table. All the data in the column will be lost.
  - You are about to drop the `listing_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vip_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('REGISTER', 'FORGOT_PASSWORD', 'SET_PASSWORD');

-- AlterEnum
BEGIN;
CREATE TYPE "AccountType_new" AS ENUM ('MEMBER', 'AGENT', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "account_type" TYPE "AccountType_new" USING ("account_type"::text::"AccountType_new");
ALTER TYPE "AccountType" RENAME TO "AccountType_old";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
DROP TYPE "public"."AccountType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "listing_services" DROP CONSTRAINT "listing_services_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "listing_services" DROP CONSTRAINT "listing_services_package_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_wallet_id_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_fkey";

-- AlterTable
ALTER TABLE "listings" DROP COLUMN "vip_level_id";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone_number" DROP NOT NULL;

-- DropTable
DROP TABLE "listing_services";

-- DropTable
DROP TABLE "vip_packages";

-- DropTable
DROP TABLE "wallet_transactions";

-- DropTable
DROP TABLE "wallets";

-- DropEnum
DROP TYPE "ReferenceType";

-- DropEnum
DROP TYPE "ServiceStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "WalletStatus";

-- CreateTable
CREATE TABLE "otps" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(255),
    "code" VARCHAR(6) NOT NULL,
    "type" "OTPType" NOT NULL DEFAULT 'REGISTER',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otps_phone_email_type_is_used_idx" ON "otps"("phone", "email", "type", "is_used");
