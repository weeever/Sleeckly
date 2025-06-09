/*
  # Fix user_stats RLS policy for INSERT operations

  1. Security Changes
    - Drop the existing broad policy on user_stats table
    - Create specific policies for SELECT, INSERT, UPDATE, and DELETE operations
    - Ensure INSERT policy allows authenticated users to create their own stats
    - Maintain security by ensuring users can only access their own data

  2. Policy Details
    - SELECT: Users can read their own stats
    - INSERT: Users can create stats for themselves
    - UPDATE: Users can update their own stats  
    - DELETE: Users can delete their own stats

  This fixes the RLS violation error that occurs during user registration.
*/

-- Drop the existing broad policy
DROP POLICY IF EXISTS "Users can manage own stats" ON user_stats;

-- Create specific policies for each operation
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats"
  ON user_stats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);