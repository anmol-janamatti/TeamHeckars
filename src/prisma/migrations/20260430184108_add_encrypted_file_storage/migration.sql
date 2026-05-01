-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "encryptedFile" BYTEA,
ADD COLUMN     "fileAuthTag" TEXT,
ADD COLUMN     "fileIv" TEXT,
ADD COLUMN     "fileMimeType" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER;
