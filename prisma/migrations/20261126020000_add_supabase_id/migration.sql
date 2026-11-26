-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "User"("supabaseId");
