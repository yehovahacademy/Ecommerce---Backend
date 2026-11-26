-- DropIndex
DROP INDEX IF EXISTS "User_keycloakId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "keycloakId";
