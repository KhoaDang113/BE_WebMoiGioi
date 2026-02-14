/*
  Warnings:

  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('MEMBER', 'AGENT', 'AGENCY', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'BANNED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('FACEBOOK', 'GOOGLE', 'ZALO', 'APPLE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'CONSTRUCTION', 'HANDOVER');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('VND', 'USD', 'GOLD_TAEL');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('EAST', 'WEST', 'SOUTH', 'NORTH', 'SE', 'SW', 'NE', 'NW');

-- CreateEnum
CREATE TYPE "JuridicalStatus" AS ENUM ('RED_BOOK', 'PINK_BOOK', 'CONTRACT', 'WAITING');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'SOLD', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH', 'CENTRAL', 'SOUTH');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'YOUTUBE', 'VR_360');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'BUY_SERVICE', 'REFUND', 'PROMOTION');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('ORDER', 'MOMO_TXN', 'VNPAY_TXN', 'SYSTEM_ADJUST');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotifyChannel" AS ENUM ('EMAIL', 'PUSH', 'ZALO_ZNS');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'LOCATION', 'LISTING_CARD');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_PRICE', 'SOLD', 'WRONG_IMAGE', 'SCAM', 'OTHER');

-- DropTable
DROP TABLE "Test";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" TEXT,
    "security_stamp" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" BIGINT NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "cover_url" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "tax_code" VARCHAR(20),
    "identity_card_number" VARCHAR(50),
    "broker_license_number" VARCHAR(50),
    "website_url" TEXT,
    "social_links" JSONB,
    "zalo_contact_phone" VARCHAR(20),

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "social_identities" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "social_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" JSONB,
    "location_guess" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "investor_name" TEXT,
    "province_code" VARCHAR(10),
    "province_name" TEXT,
    "district_code" VARCHAR(10),
    "district_name" TEXT,
    "ward_code" VARCHAR(10),
    "ward_name" TEXT,
    "address_text" TEXT,
    "coordinates" geography(Point, 4326),
    "total_area" DECIMAL(10,2),
    "status" "ProjectStatus",
    "description" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "property_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(300) NOT NULL,
    "listing_type" "ListingType" NOT NULL,
    "property_type_id" INTEGER NOT NULL,
    "province_code" VARCHAR(10) NOT NULL,
    "province_name" TEXT NOT NULL,
    "province_slug" TEXT,
    "district_code" VARCHAR(10) NOT NULL,
    "district_name" TEXT NOT NULL,
    "district_slug" TEXT,
    "ward_code" VARCHAR(10) NOT NULL,
    "ward_name" TEXT NOT NULL,
    "ward_slug" TEXT,
    "region" "Region",
    "project_id" BIGINT,
    "address_display" TEXT,
    "coordinates" geography(Point, 4326),
    "price" DECIMAL(19,4),
    "price_unit" "PriceUnit" NOT NULL,
    "price_per_m2" DECIMAL(19,4),
    "area_gross" DECIMAL(10,2) NOT NULL,
    "area_net" DECIMAL(10,2),
    "direction" "Direction",
    "juridical_status" "JuridicalStatus",
    "vip_level_id" INTEGER,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ,
    "expired_at" TIMESTAMPTZ,
    "search_vector" tsvector,
    "attributes" JSONB NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_media" (
    "id" BIGSERIAL NOT NULL,
    "listing_id" BIGINT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "original_url" TEXT NOT NULL,
    "watermarked_url" TEXT,
    "thumbnail_url" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "phash" VARCHAR(64),

    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_fingerprints" (
    "id" BIGSERIAL NOT NULL,
    "hash_signature" TEXT NOT NULL,

    CONSTRAINT "listing_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "hold_balance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "previous_balance" DECIMAL(19,4) NOT NULL,
    "new_balance" DECIMAL(19,4) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "reference_type" "ReferenceType" NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vip_packages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price_daily" DECIMAL(19,2) NOT NULL,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vip_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_services" (
    "id" BIGSERIAL NOT NULL,
    "listing_id" BIGINT NOT NULL,
    "package_id" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "status" "ServiceStatus" NOT NULL,

    CONSTRAINT "listing_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "notify_channel" "NotifyChannel" NOT NULL,
    "frequency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "listing_id" BIGINT NOT NULL,
    "buyer_id" BIGINT NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "last_message_content" TEXT,
    "last_message_at" TIMESTAMPTZ,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" BIGSERIAL NOT NULL,
    "listing_id" BIGINT NOT NULL,
    "reporter_id" BIGINT NOT NULL,
    "reason_code" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" BIGINT,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "social_identities_provider_provider_user_id_key" ON "social_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_province_code_idx" ON "projects"("province_code");

-- CreateIndex
CREATE INDEX "projects_district_code_idx" ON "projects"("district_code");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_province_code_district_code_price_area_gross_idx" ON "listings"("province_code", "district_code", "price", "area_gross");

-- CreateIndex
CREATE INDEX "listings_expired_at_idx" ON "listings"("expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "listing_fingerprints_hash_signature_key" ON "listing_fingerprints"("hash_signature");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_identities" ADD CONSTRAINT "social_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_property_type_id_fkey" FOREIGN KEY ("property_type_id") REFERENCES "property_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_services" ADD CONSTRAINT "listing_services_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_services" ADD CONSTRAINT "listing_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "vip_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
