import { supabase } from '../lib/supabase'

export interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark' | 'auto'
  language: 'fr' | 'en'
  notifications: boolean
  sound: boolean
  auto_copy: boolean
  check_interval: number
  auto_delete: boolean
  delete_after_days: number
  created_at: string
  updated_at: string
}

class UserPreferencesService {
  private cache: Map<string, UserPreferences> = new Map()

  async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      throw new Error('User not authenticated')
    }
    return user.id
  }

  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const userId = await this.getCurrentUserId()
      
      // Check cache first
      if (this.cache.has(userId)) {
        return this.cache.get(userId)!
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        this.cache.set(userId, data)
        return data
      }

      // Return default preferences if none exist
      return this.getDefaultPreferences()
    } catch (error) {
      console.error('Error getting preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const userId = await this.getCurrentUserId()
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Update cache
      this.cache.set(userId, data)
      
      // Apply theme immediately
      if (preferences.theme) {
        this.applyTheme(preferences.theme)
      }

      return data
    } catch (error) {
      console.error('Error updating preferences:', error)
      throw error
    }
  }

  async createDefaultPreferences(): Promise<UserPreferences> {
    try {
      const userId = await this.getCurrentUserId()
      const defaultPrefs = this.getDefaultPreferences()
      
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...defaultPrefs
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      this.cache.set(userId, data)
      return data
    } catch (error) {
      console.error('Error creating default preferences:', error)
      throw error
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      user_id: '',
      theme: 'light',
      language: 'fr',
      notifications: true,
      sound: true,
      auto_copy: true,
      check_interval: 10,
      auto_delete: false,
      delete_after_days: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  applyTheme(theme: 'light' | 'dark' | 'auto') {
    const root = document.documentElement
    
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme = prefersDark ? 'dark' : 'light'
    }

    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  clearCache() {
    this.cache.clear()
  }
}

export const userPreferencesService = new UserPreferencesService()