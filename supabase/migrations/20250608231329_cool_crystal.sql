/*
  # Schéma complet Slockly - Surveillance Steam Guard

  1. Tables principales
    - `steam_accounts` - Comptes Steam des utilisateurs
    - `steam_codes` - Codes Steam Guard détectés
    - `imap_configs` - Configuration email IMAP
    - `user_stats` - Statistiques utilisateur
    - `codes_promo` - Codes promotionnels (future)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques strictes par utilisateur
    - Contraintes d'intégrité
    - Validation des données

  3. Fonctionnalités
    - Triggers automatiques pour les statistiques
    - Index optimisés pour les performances
    - Fonctions de nettoyage automatique
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction pour chiffrer les mots de passe (simple obfuscation)
CREATE OR REPLACE FUNCTION encrypt_password(password_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(password_text || 'slockly_salt_2024', 'sha256'), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Table des comptes Steam
CREATE TABLE IF NOT EXISTS steam_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  email TEXT NOT NULL,
  steam_id TEXT,
  email_password TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT steam_accounts_username_check CHECK (length(username) >= 3 AND length(username) <= 50),
  CONSTRAINT steam_accounts_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT steam_accounts_unique_per_user UNIQUE (user_id, username),
  CONSTRAINT steam_accounts_unique_email_per_user UNIQUE (user_id, email)
);

-- Table des codes Steam Guard détectés
CREATE TABLE IF NOT EXISTS steam_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  steam_account TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  copied BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  -- Contraintes
  CONSTRAINT steam_codes_code_check CHECK (length(code) >= 5 AND length(code) <= 10),
  CONSTRAINT steam_codes_unique_code UNIQUE (user_id, code, detected_at)
);

-- Table des configurations IMAP
CREATE TABLE IF NOT EXISTS imap_configs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  host TEXT NOT NULL DEFAULT 'imap.hostinger.com',
  port INTEGER NOT NULL DEFAULT 993,
  secure BOOLEAN DEFAULT true,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT imap_configs_port_check CHECK (port > 0 AND port <= 65535),
  CONSTRAINT imap_configs_username_check CHECK (username ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Table des statistiques utilisateur
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  codes_detected_total INTEGER DEFAULT 0,
  codes_detected_today INTEGER DEFAULT 0,
  codes_copied_total INTEGER DEFAULT 0,
  last_detection_date DATE,
  last_login TIMESTAMPTZ DEFAULT now(),
  monitoring_active BOOLEAN DEFAULT false,
  total_monitoring_time INTEGER DEFAULT 0, -- en minutes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT user_stats_positive_counts CHECK (
    codes_detected_total >= 0 AND 
    codes_detected_today >= 0 AND 
    codes_copied_total >= 0 AND
    total_monitoring_time >= 0
  )
);

-- Table des codes promotionnels (future feature)
CREATE TABLE IF NOT EXISTS codes_promo (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  date_reception TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'email',
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'expiré', 'utilisé')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT codes_promo_unique_per_user UNIQUE (user_id, code)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_steam_accounts_user_id ON steam_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_steam_accounts_username ON steam_accounts(user_id, username);
CREATE INDEX IF NOT EXISTS idx_steam_codes_user_id ON steam_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_steam_codes_detected_at ON steam_codes(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_steam_codes_steam_account ON steam_codes(user_id, steam_account);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_detection ON user_stats(last_detection_date);

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants s'ils existent et les recréer
DROP TRIGGER IF EXISTS update_steam_accounts_updated_at ON steam_accounts;
DROP TRIGGER IF EXISTS update_imap_configs_updated_at ON imap_configs;
DROP TRIGGER IF EXISTS update_user_stats_updated_at ON user_stats;
DROP TRIGGER IF EXISTS update_codes_promo_updated_at ON codes_promo;

-- Créer les triggers pour updated_at
CREATE TRIGGER update_steam_accounts_updated_at
  BEFORE UPDATE ON steam_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_imap_configs_updated_at
  BEFORE UPDATE ON imap_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_codes_promo_updated_at
  BEFORE UPDATE ON codes_promo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_user_stats_on_code_detection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, codes_detected_total, codes_detected_today, last_detection_date)
  VALUES (NEW.user_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    codes_detected_total = user_stats.codes_detected_total + 1,
    codes_detected_today = CASE 
      WHEN user_stats.last_detection_date = CURRENT_DATE 
      THEN user_stats.codes_detected_today + 1 
      ELSE 1 
    END,
    last_detection_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour les statistiques de copie
CREATE OR REPLACE FUNCTION update_user_stats_on_code_copy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.copied = true AND OLD.copied = false THEN
    UPDATE user_stats 
    SET codes_copied_total = codes_copied_total + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer les triggers de statistiques existants s'ils existent
DROP TRIGGER IF EXISTS trigger_update_stats_on_code_detection ON steam_codes;
DROP TRIGGER IF EXISTS trigger_update_stats_on_code_copy ON steam_codes;

-- Créer les triggers pour les statistiques
CREATE TRIGGER trigger_update_stats_on_code_detection
  AFTER INSERT ON steam_codes
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_code_detection();

CREATE TRIGGER trigger_update_stats_on_code_copy
  AFTER UPDATE ON steam_codes
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_code_copy();

-- Activer RLS sur toutes les tables
ALTER TABLE steam_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE steam_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE imap_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes_promo ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can manage own steam accounts" ON steam_accounts;
DROP POLICY IF EXISTS "Users can manage own steam codes" ON steam_codes;
DROP POLICY IF EXISTS "Users can manage own imap config" ON imap_configs;
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can manage own promo codes" ON codes_promo;

-- Politiques RLS pour steam_accounts
CREATE POLICY "Users can manage own steam accounts"
  ON steam_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour steam_codes
CREATE POLICY "Users can manage own steam codes"
  ON steam_codes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour imap_configs
CREATE POLICY "Users can manage own imap config"
  ON imap_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour user_stats
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

-- Politiques RLS pour codes_promo
CREATE POLICY "Users can manage own promo codes"
  ON codes_promo
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour nettoyer les anciens codes (plus de 30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM steam_codes 
  WHERE detected_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour réinitialiser les compteurs quotidiens
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE user_stats 
  SET codes_detected_today = 0
  WHERE last_detection_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;