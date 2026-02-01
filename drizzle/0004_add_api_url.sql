-- Add api_url column to user_accounts for nzbdav support
ALTER TABLE "user_accounts" ADD COLUMN IF NOT EXISTS "api_url" text;
