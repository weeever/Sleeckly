import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour la base de données
export interface SteamAccount {
  id: number
  user_id: string
  username: string
  password: string
  email: string
  steam_id?: string
  email_password?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SteamCode {
  id: number
  user_id: string
  code: string
  steam_account: string
  email: string
  subject: string
  detected_at: string
  copied: boolean
  expires_at?: string
}

export interface ImapConfig {
  user_id: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  is_active: boolean
  last_check?: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  user_id: string
  codes_detected_total: number
  codes_detected_today: number
  codes_copied_total: number
  last_detection_date?: string
  last_login: string
  monitoring_active: boolean
  total_monitoring_time: number
  created_at: string
  updated_at: string
}

export interface CodesPromo {
  id: number
  user_id: string
  code: string
  date_reception: string
  source: string
  statut: 'actif' | 'expiré' | 'utilisé'
  expires_at?: string
  created_at: string
  updated_at: string
}

// Helper function to get current user ID with better error handling
const getCurrentUserId = async (): Promise<string> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Auth error:', error)
      throw new Error('Erreur d\'authentification: ' + error.message)
    }
    if (!user) {
      throw new Error('Utilisateur non connecté')
    }
    return user.id
  } catch (error) {
    console.error('getCurrentUserId error:', error)
    throw error
  }
}

// Service pour les comptes Steam avec validation renforcée
export const steamAccountsService = {
  async getAll() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching steam accounts:', error)
        throw new Error('Erreur lors du chargement des comptes: ' + error.message)
      }
      return data || []
    } catch (error) {
      console.error('steamAccountsService.getAll error:', error)
      throw error
    }
  },

  async create(account: Omit<SteamAccount, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_active'>) {
    try {
      // Validation des données
      if (!account.username || account.username.trim().length < 3) {
        throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      }
      if (!account.password || account.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères')
      }
      if (!account.email || !utils.validateEmail(account.email)) {
        throw new Error('Format d\'email invalide')
      }

      const userId = await getCurrentUserId()
      
      // Vérifier les doublons par nom d'utilisateur
      const { data: existingUsername } = await supabase
        .from('steam_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('username', account.username.trim())
        .eq('is_active', true)
        .single()
      
      if (existingUsername) {
        throw new Error('Un compte avec ce nom d\'utilisateur existe déjà')
      }

      // Vérifier les doublons par email
      const { data: existingEmail } = await supabase
        .from('steam_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('email', account.email.trim())
        .eq('is_active', true)
        .single()
      
      if (existingEmail) {
        throw new Error('Un compte avec cet email existe déjà')
      }

      const { data, error } = await supabase
        .from('steam_accounts')
        .insert({
          user_id: userId,
          username: account.username.trim(),
          password: account.password,
          email: account.email.trim(),
          steam_id: account.steam_id?.trim() || null,
          email_password: account.email_password?.trim() || null,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating steam account:', error)
        throw new Error('Erreur lors de la création du compte: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('steamAccountsService.create error:', error)
      throw error
    }
  },

  async update(id: number, updates: Partial<SteamAccount>) {
    try {
      const userId = await getCurrentUserId()
      
      // Vérifier que l'utilisateur possède ce compte
      const { data: existing } = await supabase
        .from('steam_accounts')
        .select('id, username, email')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      
      if (!existing) {
        throw new Error('Compte non trouvé ou accès non autorisé')
      }

      // Validation des mises à jour
      if (updates.username && updates.username.trim().length < 3) {
        throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      }
      if (updates.password && updates.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères')
      }
      if (updates.email && !utils.validateEmail(updates.email)) {
        throw new Error('Format d\'email invalide')
      }

      // Vérifier les doublons si le nom d'utilisateur change
      if (updates.username && updates.username !== existing.username) {
        const { data: duplicateUsername } = await supabase
          .from('steam_accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('username', updates.username.trim())
          .eq('is_active', true)
          .neq('id', id)
          .single()
        
        if (duplicateUsername) {
          throw new Error('Un autre compte avec ce nom d\'utilisateur existe déjà')
        }
      }

      // Vérifier les doublons si l'email change
      if (updates.email && updates.email !== existing.email) {
        const { data: duplicateEmail } = await supabase
          .from('steam_accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('email', updates.email.trim())
          .eq('is_active', true)
          .neq('id', id)
          .single()
        
        if (duplicateEmail) {
          throw new Error('Un autre compte avec cet email existe déjà')
        }
      }

      const cleanUpdates = {
        ...updates,
        username: updates.username?.trim(),
        email: updates.email?.trim(),
        steam_id: updates.steam_id?.trim() || null,
        email_password: updates.email_password?.trim() || null
      }

      const { data, error } = await supabase
        .from('steam_accounts')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating steam account:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('steamAccountsService.update error:', error)
      throw error
    }
  },

  async delete(id: number) {
    try {
      const userId = await getCurrentUserId()
      
      // Vérifier que l'utilisateur possède ce compte
      const { data: existing } = await supabase
        .from('steam_accounts')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existing) {
        throw new Error('Compte non trouvé ou accès non autorisé')
      }

      // Soft delete - marquer comme inactif
      const { error } = await supabase
        .from('steam_accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error deleting steam account:', error)
        throw new Error('Erreur lors de la suppression: ' + error.message)
      }
    } catch (error) {
      console.error('steamAccountsService.delete error:', error)
      throw error
    }
  },

  async getByUsername(username: string) {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('username', username.trim())
        .eq('is_active', true)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching steam account by username:', error)
        throw new Error('Erreur lors de la recherche: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('steamAccountsService.getByUsername error:', error)
      throw error
    }
  }
}

// Service pour les codes Steam avec validation renforcée
export const steamCodesService = {
  async getAll() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_codes')
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching steam codes:', error)
        throw new Error('Erreur lors du chargement des codes: ' + error.message)
      }
      return data || []
    } catch (error) {
      console.error('steamCodesService.getAll error:', error)
      throw error
    }
  },

  async create(code: Omit<SteamCode, 'id' | 'user_id'>) {
    try {
      // Validation des données
      if (!code.code || code.code.trim().length < 5) {
        throw new Error('Le code doit contenir au moins 5 caractères')
      }
      if (!code.steam_account || !code.email) {
        throw new Error('Compte Steam et email sont requis')
      }

      const userId = await getCurrentUserId()
      
      // Vérifier les doublons récents (même code dans les 5 dernières minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: existing } = await supabase
        .from('steam_codes')
        .select('id')
        .eq('user_id', userId)
        .eq('code', code.code.trim())
        .gte('detected_at', fiveMinutesAgo)
        .single()
      
      if (existing) {
        throw new Error('Ce code a déjà été détecté récemment')
      }

      const { data, error } = await supabase
        .from('steam_codes')
        .insert({
          user_id: userId,
          code: code.code.trim(),
          steam_account: code.steam_account.trim(),
          email: code.email.trim(),
          subject: code.subject?.trim() || null,
          detected_at: code.detected_at || new Date().toISOString(),
          copied: code.copied || false,
          expires_at: code.expires_at || null
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating steam code:', error)
        throw new Error('Erreur lors de la création du code: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('steamCodesService.create error:', error)
      throw error
    }
  },

  async markAsCopied(id: number) {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_codes')
        .update({ copied: true })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Error marking code as copied:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('steamCodesService.markAsCopied error:', error)
      throw error
    }
  },

  async delete(id: number) {
    try {
      const userId = await getCurrentUserId()
      
      // Vérifier que l'utilisateur possède ce code
      const { data: existing } = await supabase
        .from('steam_codes')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existing) {
        throw new Error('Code non trouvé ou accès non autorisé')
      }

      const { error } = await supabase
        .from('steam_codes')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error deleting steam code:', error)
        throw new Error('Erreur lors de la suppression: ' + error.message)
      }
    } catch (error) {
      console.error('steamCodesService.delete error:', error)
      throw error
    }
  },

  async getRecentCodes(limit: number = 10) {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_codes')
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error fetching recent codes:', error)
        throw new Error('Erreur lors du chargement: ' + error.message)
      }
      return data || []
    } catch (error) {
      console.error('steamCodesService.getRecentCodes error:', error)
      throw error
    }
  },

  async getCodesByAccount(steamAccount: string) {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('steam_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('steam_account', steamAccount.trim())
        .order('detected_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching codes by account:', error)
        throw new Error('Erreur lors du chargement: ' + error.message)
      }
      return data || []
    } catch (error) {
      console.error('steamCodesService.getCodesByAccount error:', error)
      throw error
    }
  }
}

// Service pour la configuration IMAP avec validation renforcée
export const imapConfigService = {
  async get() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('imap_configs')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching IMAP config:', error)
        throw new Error('Erreur lors du chargement de la configuration: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('imapConfigService.get error:', error)
      throw error
    }
  },

  async upsert(config: Omit<ImapConfig, 'user_id' | 'created_at' | 'updated_at'>) {
    try {
      // Validation complète des données
      if (!config.host || config.host.trim().length < 3) {
        throw new Error('L\'hôte IMAP est requis')
      }
      if (!config.port || config.port < 1 || config.port > 65535) {
        throw new Error('Le port doit être entre 1 et 65535')
      }
      if (!config.username || !utils.validateEmail(config.username)) {
        throw new Error('Format d\'email invalide pour le nom d\'utilisateur')
      }
      if (!config.password || config.password.length < 1) {
        throw new Error('Le mot de passe est requis')
      }

      const userId = await getCurrentUserId()

      const { data, error } = await supabase
        .from('imap_configs')
        .upsert({
          user_id: userId,
          host: config.host.trim(),
          port: config.port,
          secure: config.secure !== false, // Default to true
          username: config.username.trim(),
          password: config.password,
          is_active: config.is_active !== false, // Default to true
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error upserting IMAP config:', error)
        throw new Error('Erreur lors de la sauvegarde: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('imapConfigService.upsert error:', error)
      throw error
    }
  },

  async delete() {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('imap_configs')
        .delete()
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error deleting IMAP config:', error)
        throw new Error('Erreur lors de la suppression: ' + error.message)
      }
    } catch (error) {
      console.error('imapConfigService.delete error:', error)
      throw error
    }
  },

  async updateLastCheck() {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('imap_configs')
        .update({ 
          last_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error updating last check:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
    } catch (error) {
      console.error('imapConfigService.updateLastCheck error:', error)
      throw error
    }
  },

  async setActive(isActive: boolean) {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('imap_configs')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error setting IMAP active status:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
    } catch (error) {
      console.error('imapConfigService.setActive error:', error)
      throw error
    }
  },

  async testConnection(config: Omit<ImapConfig, 'user_id' | 'created_at' | 'updated_at'>) {
    try {
      // Simulation d'un test de connexion IMAP
      // Dans un environnement réel, ceci ferait appel à une edge function
      return new Promise<boolean>((resolve, reject) => {
        setTimeout(() => {
          // Validation basique des paramètres
          if (!config.host || !config.username || !config.password) {
            reject(new Error('Paramètres de connexion incomplets'))
            return
          }
          
          // Simulation d'un test réussi dans 80% des cas
          if (Math.random() > 0.2) {
            resolve(true)
          } else {
            reject(new Error('Impossible de se connecter au serveur IMAP'))
          }
        }, 2000)
      })
    } catch (error) {
      console.error('imapConfigService.testConnection error:', error)
      throw error
    }
  }
}

// Service pour les statistiques utilisateur avec validation renforcée
export const userStatsService = {
  async get() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user stats:', error)
        throw new Error('Erreur lors du chargement des statistiques: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('userStatsService.get error:', error)
      throw error
    }
  },

  async upsert(stats: Partial<Omit<UserStats, 'user_id' | 'updated_at'>>) {
    try {
      const userId = await getCurrentUserId()
      
      // Validation des données
      if (stats.codes_detected_total !== undefined && stats.codes_detected_total < 0) {
        throw new Error('Le nombre de codes détectés ne peut pas être négatif')
      }
      if (stats.codes_copied_total !== undefined && stats.codes_copied_total < 0) {
        throw new Error('Le nombre de codes copiés ne peut pas être négatif')
      }
      if (stats.total_monitoring_time !== undefined && stats.total_monitoring_time < 0) {
        throw new Error('Le temps de surveillance ne peut pas être négatif')
      }

      const { data, error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          ...stats,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error upserting user stats:', error)
        throw new Error('Erreur lors de la sauvegarde des statistiques: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('userStatsService.upsert error:', error)
      throw error
    }
  },

  async createInitial() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          codes_detected_total: 0,
          codes_detected_today: 0,
          codes_copied_total: 0,
          last_detection_date: new Date().toISOString().split('T')[0],
          monitoring_active: false,
          total_monitoring_time: 0
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating initial user stats:', error)
        throw new Error('Erreur lors de la création des statistiques: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('userStatsService.createInitial error:', error)
      throw error
    }
  },

  async updateLastLogin() {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error updating last login:', error)
        // Ne pas lancer d'erreur pour la dernière connexion
      }
    } catch (error) {
      console.error('userStatsService.updateLastLogin error:', error)
      // Ne pas lancer d'erreur pour la dernière connexion
    }
  },

  async setMonitoringActive(isActive: boolean) {
    try {
      const userId = await getCurrentUserId()
      const { error } = await supabase
        .from('user_stats')
        .update({ 
          monitoring_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error setting monitoring active:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
    } catch (error) {
      console.error('userStatsService.setMonitoringActive error:', error)
      throw error
    }
  },

  async incrementMonitoringTime(minutes: number) {
    try {
      if (minutes < 0) {
        throw new Error('Le temps ne peut pas être négatif')
      }

      const userId = await getCurrentUserId()
      const current = await this.get()
      const newTime = (current?.total_monitoring_time || 0) + minutes
      
      const { error } = await supabase
        .from('user_stats')
        .update({ 
          total_monitoring_time: newTime,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error incrementing monitoring time:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
    } catch (error) {
      console.error('userStatsService.incrementMonitoringTime error:', error)
      throw error
    }
  }
}

// Service pour les codes promo (future feature) avec validation renforcée
export const codesPromoService = {
  async getAll() {
    try {
      const userId = await getCurrentUserId()
      const { data, error } = await supabase
        .from('codes_promo')
        .select('*')
        .eq('user_id', userId)
        .order('date_reception', { ascending: false })
      
      if (error) {
        console.error('Error fetching promo codes:', error)
        throw new Error('Erreur lors du chargement des codes promo: ' + error.message)
      }
      return data || []
    } catch (error) {
      console.error('codesPromoService.getAll error:', error)
      throw error
    }
  },

  async create(code: Omit<CodesPromo, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    try {
      // Validation des données
      if (!code.code || code.code.trim().length < 3) {
        throw new Error('Le code promo doit contenir au moins 3 caractères')
      }

      const userId = await getCurrentUserId()
      
      // Vérifier les doublons
      const { data: existing } = await supabase
        .from('codes_promo')
        .select('id')
        .eq('user_id', userId)
        .eq('code', code.code.trim())
        .single()
      
      if (existing) {
        throw new Error('Ce code promo existe déjà')
      }

      const { data, error } = await supabase
        .from('codes_promo')
        .insert({
          user_id: userId,
          code: code.code.trim(),
          date_reception: code.date_reception || new Date().toISOString(),
          source: code.source || 'email',
          statut: code.statut || 'actif',
          expires_at: code.expires_at || null
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating promo code:', error)
        throw new Error('Erreur lors de la création du code promo: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('codesPromoService.create error:', error)
      throw error
    }
  },

  async updateStatus(id: number, statut: 'actif' | 'expiré' | 'utilisé') {
    try {
      const userId = await getCurrentUserId()
      
      // Vérifier que l'utilisateur possède ce code
      const { data: existing } = await supabase
        .from('codes_promo')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existing) {
        throw new Error('Code promo non trouvé ou accès non autorisé')
      }

      const { data, error } = await supabase
        .from('codes_promo')
        .update({ statut })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating promo code status:', error)
        throw new Error('Erreur lors de la mise à jour: ' + error.message)
      }
      return data
    } catch (error) {
      console.error('codesPromoService.updateStatus error:', error)
      throw error
    }
  },

  async delete(id: number) {
    try {
      const userId = await getCurrentUserId()
      
      // Vérifier que l'utilisateur possède ce code
      const { data: existing } = await supabase
        .from('codes_promo')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      
      if (!existing) {
        throw new Error('Code promo non trouvé ou accès non autorisé')
      }

      const { error } = await supabase
        .from('codes_promo')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error deleting promo code:', error)
        throw new Error('Erreur lors de la suppression: ' + error.message)
      }
    } catch (error) {
      console.error('codesPromoService.delete error:', error)
      throw error
    }
  }
}

// Utilitaires avec validation renforcée
export const utils = {
  async checkUserExists() {
    try {
      await getCurrentUserId()
      return true
    } catch {
      return false
    }
  },

  async getUserProfile() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error('Utilisateur non authentifié')
      return user
    } catch (error) {
      console.error('utils.getUserProfile error:', error)
      throw error
    }
  },

  formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('utils.formatDate error:', error)
      return 'Date invalide'
    }
  },

  formatRelativeTime(dateString: string) {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return 'À l\'instant'
      if (diffMins < 60) return `Il y a ${diffMins} min`
      if (diffHours < 24) return `Il y a ${diffHours}h`
      if (diffDays < 7) return `Il y a ${diffDays}j`
      
      return date.toLocaleDateString('fr-FR')
    } catch (error) {
      console.error('utils.formatRelativeTime error:', error)
      return 'Date invalide'
    }
  },

  generateSecureId() {
    try {
      return crypto.randomUUID()
    } catch (error) {
      console.error('utils.generateSecureId error:', error)
      // Fallback pour les navigateurs plus anciens
      return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }
  },

  validateEmail(email: string) {
    if (!email || typeof email !== 'string') return false
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email.trim())
  },

  validateSteamUsername(username: string) {
    if (!username || typeof username !== 'string') return false
    const trimmed = username.trim()
    return trimmed.length >= 3 && trimmed.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(trimmed)
  },

  sanitizeInput(input: string) {
    if (!input || typeof input !== 'string') return ''
    return input.trim().replace(/[<>]/g, '')
  },

  validatePort(port: number) {
    return Number.isInteger(port) && port > 0 && port <= 65535
  },

  validateSteamId(steamId: string) {
    if (!steamId || typeof steamId !== 'string') return false
    return /^\d{17}$/.test(steamId.trim())
  },

  // Fonction pour tester la connectivité réseau
  async testNetworkConnectivity() {
    try {
      const response = await fetch(supabaseUrl + '/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey
        }
      })
      return response.ok
    } catch (error) {
      console.error('Network connectivity test failed:', error)
      return false
    }
  },

  // Fonction pour valider la configuration IMAP
  validateImapConfig(config: Partial<ImapConfig>) {
    const errors: string[] = []
    
    if (!config.host || config.host.trim().length < 3) {
      errors.push('L\'hôte IMAP est requis')
    }
    if (!config.port || !this.validatePort(config.port)) {
      errors.push('Le port doit être entre 1 et 65535')
    }
    if (!config.username || !this.validateEmail(config.username)) {
      errors.push('Format d\'email invalide pour le nom d\'utilisateur')
    }
    if (!config.password || config.password.length < 1) {
      errors.push('Le mot de passe est requis')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Service de monitoring pour la surveillance IMAP
export const monitoringService = {
  private: {
    intervalId: null as NodeJS.Timeout | null,
    isRunning: false
  },

  async startMonitoring(intervalSeconds: number = 10) {
    try {
      if (this.private.isRunning) {
        console.log('Monitoring already running')
        return
      }

      const config = await imapConfigService.get()
      if (!config || !config.is_active) {
        throw new Error('Configuration IMAP non trouvée ou inactive')
      }

      this.private.isRunning = true
      console.log('Starting email monitoring...')

      this.private.intervalId = setInterval(async () => {
        try {
          await this.checkForNewCodes()
        } catch (error) {
          console.error('Error during monitoring check:', error)
        }
      }, intervalSeconds * 1000)

      // Mettre à jour le statut de surveillance
      await userStatsService.setMonitoringActive(true)
      
    } catch (error) {
      console.error('monitoringService.startMonitoring error:', error)
      throw error
    }
  },

  async stopMonitoring() {
    try {
      if (this.private.intervalId) {
        clearInterval(this.private.intervalId)
        this.private.intervalId = null
      }
      this.private.isRunning = false
      console.log('Email monitoring stopped')

      // Mettre à jour le statut de surveillance
      await userStatsService.setMonitoringActive(false)
      
    } catch (error) {
      console.error('monitoringService.stopMonitoring error:', error)
      throw error
    }
  },

  async checkForNewCodes() {
    try {
      // Mettre à jour la dernière vérification
      await imapConfigService.updateLastCheck()

      // Simulation de détection de codes (pour la démo)
      // Dans un environnement réel, ceci ferait appel à une edge function
      if (Math.random() < 0.05) { // 5% de chance de détecter un code
        const mockCode = Math.random().toString(36).substring(2, 7).toUpperCase()
        const accounts = await steamAccountsService.getAll()
        
        if (accounts.length > 0) {
          const randomAccount = accounts[Math.floor(Math.random() * accounts.length)]
          
          await steamCodesService.create({
            code: mockCode,
            steam_account: randomAccount.username,
            email: randomAccount.email,
            subject: 'Steam Guard - Code de sécurité',
            detected_at: new Date().toISOString(),
            copied: false
          })
          
          console.log(`New Steam Guard code detected: ${mockCode}`)
          return mockCode
        }
      }
      
      return null
    } catch (error) {
      console.error('monitoringService.checkForNewCodes error:', error)
      throw error
    }
  },

  isRunning() {
    return this.private.isRunning
  }
}