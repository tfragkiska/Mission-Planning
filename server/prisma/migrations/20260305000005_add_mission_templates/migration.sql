-- AlterTable
ALTER TABLE "missions" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "missions" ADD COLUMN "template_name" TEXT;
ALTER TABLE "missions" ADD COLUMN "template_description" TEXT;
