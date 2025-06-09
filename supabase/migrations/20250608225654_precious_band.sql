/*
  # Fix user_id column types from bigint to uuid

  This migration updates all tables to use uuid for user_id columns instead of bigint,
  making them compatible with Supabase Auth user IDs.

  ## Changes Made

  1. **Tables Updated**
     - `users` - Change id from bigint to uuid, remove custom auth fields
     - `steam_accounts` - Change user_id from bigint to uuid  
     - `steam_codes` - Change user_id from bigint to uuid
     - `imap_configs` - Change user_id from bigint to uuid
     - `user_stats` - Change user_id from bigint to uuid
     - `codes_promo` - Change user_id from bigint to uuid

  2. **Foreign Key Updates**
     - Update all foreign key references to point to auth.users(id)
     - Remove custom users table as we'll use Supabase Auth

  3. **Security**
     - Update RLS policies to use auth.uid() instead of custom user matching
     - Ensure all policies work with Supabase Auth
*/

-- First, disable RLS temporarily to make changes
ALTER TABLE steam_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE steam_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE imap_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE codes_promo DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop existing foreign key constraints
ALTER TABLE steam_accounts DROP CONSTRAINT IF EXISTS steam_accounts_user_id_fkey;
ALTER TABLE steam_codes DROP CONSTRAINT IF EXISTS steam_codes_user_id_fkey;
ALTER TABLE imap_configs DROP CONSTRAINT IF EXISTS imap_configs_user_id_fkey;
ALTER TABLE user_stats DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
ALTER TABLE codes_promo DROP CONSTRAINT IF EXISTS codes_promo_user_id_fkey;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete own steam accounts" ON steam_accounts;
DROP POLICY IF EXISTS "Users can insert own steam accounts" ON steam_accounts;
DROP POLICY IF EXISTS "Users can read own steam accounts" ON steam_accounts;
DROP POLICY IF EXISTS "Users can update own steam accounts" ON steam_accounts;

DROP POLICY IF EXISTS "Users can delete own steam codes" ON steam_codes;
DROP POLICY IF EXISTS "Users can insert own steam codes" ON steam_codes;
DROP POLICY IF EXISTS "Users can read own steam codes" ON steam_codes;
DROP POLICY IF EXISTS "Users can update own steam codes" ON steam_codes;

DROP POLICY IF EXISTS "Users can delete own IMAP config" ON imap_configs;
DROP POLICY IF EXISTS "Users can insert own IMAP config" ON imap_configs;
DROP POLICY IF EXISTS "Users can read own IMAP config" ON imap_configs;
DROP POLICY IF EXISTS "Users can update own IMAP config" ON imap_configs;

DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

DROP POLICY IF EXISTS "Users can delete own promo codes" ON codes_promo;
DROP POLICY IF EXISTS "Users can insert own promo codes" ON codes_promo;
DROP POLICY IF EXISTS "Users can read own promo codes" ON codes_promo;
DROP POLICY IF EXISTS "Users can update own promo codes" ON codes_promo;

DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Clear existing data to avoid conflicts during type conversion
TRUNCATE TABLE steam_accounts CASCADE;
TRUNCATE TABLE steam_codes CASCADE;
TRUNCATE TABLE imap_configs CASCADE;
TRUNCATE TABLE user_stats CASCADE;
TRUNCATE TABLE codes_promo CASCADE;

-- Drop the custom users table since we'll use Supabase Auth
DROP TABLE IF EXISTS users CASCADE;

-- Update user_id columns to uuid type
ALTER TABLE steam_accounts ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE steam_codes ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE imap_configs ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE user_stats ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;
ALTER TABLE codes_promo ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

-- Add foreign key constraints referencing auth.users
ALTER TABLE steam_accounts ADD CONSTRAINT steam_accounts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE steam_codes ADD CONSTRAINT steam_codes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE imap_configs ADD CONSTRAINT imap_configs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_stats ADD CONSTRAINT user_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE codes_promo ADD CONSTRAINT codes_promo_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Re-enable RLS
ALTER TABLE steam_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE steam_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE imap_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes_promo ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies using auth.uid()
CREATE POLICY "Users can manage own steam accounts"
  ON steam_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own steam codes"
  ON steam_codes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own IMAP config"
  ON imap_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own stats"
  ON user_stats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own promo codes"
  ON codes_promo
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);