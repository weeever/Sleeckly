/*
  # User Preferences Table

  1. New Tables
    - `user_preferences`
      - `user_id` (uuid, primary key, references auth.users)
      - `theme` (text, default 'light')
      - `language` (text, default 'fr')
      - `notifications` (boolean, default true)
      - `sound` (boolean, default true)
      - `auto_copy` (boolean, default true)
      - `check_interval` (integer, default 10)
      - `auto_delete` (boolean, default false)
      - `delete_after_days` (integer, default 30)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_preferences` table
    - Add policy for users to manage their own preferences
*/

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  notifications BOOLEAN NOT NULL DEFAULT true,
  sound BOOLEAN NOT NULL DEFAULT true,
  auto_copy BOOLEAN NOT NULL DEFAULT true,
  check_interval INTEGER NOT NULL DEFAULT 10 CHECK (check_interval >= 5 AND check_interval <= 60),
  auto_delete BOOLEAN NOT NULL DEFAULT false,
  delete_after_days INTEGER NOT NULL DEFAULT 30 CHECK (delete_after_days >= 1 AND delete_after_days <= 365),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);