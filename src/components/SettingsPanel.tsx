import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Settings as SettingsIcon, Bell, Volume2, Copy, Clock, Save, Palette, Globe, Shield, User as UserIcon, Trash2, Download, RefreshCw, Moon, Sun, Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { userStatsService, steamAccountsService, steamCodesService, imapConfigService } from '../lib/supabase'
import { userPreferencesService, UserPreferences } from '../services/userPreferencesService'
import toast from 'react-hot-toast'

interface SettingsPanelProps {
  user: User
}

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [dataStats, setDataStats] = useState({
    accounts: 0,
    codes: 0,
    totalSize: '0 KB'
  })

  useEffect(() => {
    loadPreferences()
    loadStats()
    loadDataStats()
  }, [user])

  const loadPreferences = async () => {
    try {
      const prefs = await userPreferencesService.getPreferences()
      if (prefs) {
        setPreferences(prefs)
        // Apply theme immediately
        userPreferencesService.applyTheme(prefs.theme)
      } else {
        // Create default preferences
        const defaultPrefs = await userPreferencesService.createDefaultPreferences()
        setPreferences(defaultPrefs)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Erreur lors du chargement des préférences')
    }
  }

  const loadStats = async () => {
    try {
      const userStats = await userStatsService.get()
      setStats(userStats)
    } catch (error) {
      console.log('Aucune statistique trouvée')
    }
  }

  const loadDataStats = async () => {
    try {
      const [accounts, codes] = await Promise.all([
        steamAccountsService.getAll(),
        steamCodesService.getAll()
      ])
      
      // Estimation approximative de la taille des données
      const accountsSize = accounts.length * 200 // ~200 bytes par compte
      const codesSize = codes.length * 150 // ~150 bytes par code
      const totalBytes = accountsSize + codesSize
      
      let sizeString = '0 KB'
      if (totalBytes < 1024) {
        sizeString = `${totalBytes} B`
      } else if (totalBytes < 1024 * 1024) {
        sizeString = `${(totalBytes / 1024).toFixed(1)} KB`
      } else {
        sizeString = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      }

      setDataStats({
        accounts: accounts.length,
        codes: codes.length,
        totalSize: sizeString
      })
    } catch (error) {
      console.log('Erreur lors du chargement des statistiques de données')
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    setLoading(true)
    try {
      await userPreferencesService.updatePreferences(preferences)
      setSaved(true)
      toast.success('Préférences sauvegardées avec succès !', {
        icon: '✅',
      })
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    if (!preferences) return
    
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    
    // Apply theme immediately for better UX
    if (key === 'theme') {
      userPreferencesService.applyTheme(value)
    }
  }

  const resetPreferences = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes les préférences ?')) {
      const defaultPrefs = {
        ...preferences!,
        theme: 'light' as const,
        language: 'fr' as const,
        notifications: true,
        sound: true,
        auto_copy: true,
        check_interval: 10,
        auto_delete: false,
        delete_after_days: 30
      }
      setPreferences(defaultPrefs)
      userPreferencesService.applyTheme('light')
      toast.success('Préférences réinitialisées', { icon: '🔄' })
    }
  }

  const exportData = async () => {
    try {
      const [accounts, codes, imapConfig] = await Promise.all([
        steamAccountsService.getAll(),
        steamCodesService.getAll(),
        imapConfigService.get()
      ])

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        accounts: accounts.map(acc => ({
          ...acc,
          password: '[PROTECTED]' // Ne pas exporter les mots de passe
        })),
        codes,
        preferences,
        stats
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `slockly-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Données exportées avec succès !', { icon: '📁' })
    } catch (error) {
      toast.error('Erreur lors de l\'export des données')
    }
  }

  const cleanupOldCodes = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer les anciens codes ? Cette action est irréversible.')) {
      return
    }

    try {
      const codes = await steamCodesService.getAll()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - (preferences?.delete_after_days || 30))
      
      const oldCodes = codes.filter(code => 
        new Date(code.detected_at) < cutoffDate
      )

      if (oldCodes.length === 0) {
        toast.success('Aucun ancien code à supprimer', { icon: '✨' })
        return
      }

      await Promise.all(oldCodes.map(code => steamCodesService.delete(code.id)))
      
      toast.success(`${oldCodes.length} ancien(s) code(s) supprimé(s)`, { icon: '🧹' })
      loadDataStats()
    } catch (error) {
      toast.error('Erreur lors du nettoyage')
    }
  }

  const deleteAllData = async () => {
    const confirmation = prompt('Pour supprimer toutes vos données, tapez "SUPPRIMER TOUT" :')
    if (confirmation !== 'SUPPRIMER TOUT') return

    try {
      setLoading(true)
      
      // Supprimer toutes les données utilisateur
      const [accounts, codes] = await Promise.all([
        steamAccountsService.getAll(),
        steamCodesService.getAll()
      ])

      await Promise.all([
        ...accounts.map(acc => steamAccountsService.delete(acc.id)),
        ...codes.map(code => steamCodesService.delete(code.id)),
        imapConfigService.delete()
      ])

      // Clear preferences cache
      userPreferencesService.clearCache()
      
      toast.success('Toutes les données ont été supprimées')
      loadDataStats()
    } catch (error: any) {
      toast.error('Erreur lors de la suppression des données')
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    const confirmation = prompt('Pour supprimer votre compte, tapez "SUPPRIMER COMPTE" :')
    if (confirmation !== 'SUPPRIMER COMPTE') return

    try {
      setLoading(true)
      
      // Supprimer toutes les données d'abord
      await deleteAllData()
      
      // Déconnecter l'utilisateur
      await supabase.auth.signOut()
      
      toast.success('Compte supprimé avec succès')
    } catch (error: any) {
      toast.error('Erreur lors de la suppression du compte')
    } finally {
      setLoading(false)
    }
  }

  if (!preferences) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="slide-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Paramètres</h1>
            <p className="text-slate-600">Personnalisez votre expérience Slockly</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={resetPreferences}
              className="btn-secondary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réinitialiser
            </button>
            <button
              onClick={savePreferences}
              disabled={loading}
              className={`btn-primary flex items-center ${
                saved ? 'bg-emerald-500 hover:bg-emerald-600' : ''
              }`}
            >
              {loading ? (
                <div className="spinner mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? 'Sauvegardé !' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
              <p className="text-sm text-slate-500">Gérez vos préférences de notification</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Notifications desktop</p>
                <p className="text-sm text-slate-600">Afficher les notifications lors de la détection de codes</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Sons de notification</p>
                <p className="text-sm text-slate-600">Jouer un son lors de la détection de codes</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.sound}
                  onChange={(e) => handlePreferenceChange('sound', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Automatisation */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Copy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Automatisation</h3>
              <p className="text-sm text-slate-500">Configurez les actions automatiques</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Copie automatique</p>
                <p className="text-sm text-slate-600">Copier automatiquement les codes dans le presse-papier</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.auto_copy}
                  onChange={(e) => handlePreferenceChange('auto_copy', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-slate-800">Intervalle de vérification</p>
                  <p className="text-sm text-slate-600">Fréquence de vérification des emails (en secondes)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">{preferences.check_interval}s</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={preferences.check_interval}
                onChange={(e) => handlePreferenceChange('check_interval', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((preferences.check_interval - 5) / 55) * 100}%, #e2e8f0 ${((preferences.check_interval - 5) / 55) * 100}%, #e2e8f0 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>5s</span>
                <span>30s</span>
                <span>60s</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Suppression automatique</p>
                <p className="text-sm text-slate-600">Supprimer automatiquement les anciens codes</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.auto_delete}
                  onChange={(e) => handlePreferenceChange('auto_delete', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {preferences.auto_delete && (
              <div>
                <label className="form-label">Supprimer après (jours)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={preferences.delete_after_days}
                  onChange={(e) => handlePreferenceChange('delete_after_days', parseInt(e.target.value))}
                  className="input-field w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Interface */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Interface</h3>
              <p className="text-sm text-slate-500">Personnalisez l'apparence de l'application</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="form-label mb-3">Thème</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Clair', icon: Sun },
                  { value: 'dark', label: 'Sombre', icon: Moon },
                  { value: 'auto', label: 'Auto', icon: Monitor }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handlePreferenceChange('theme', value)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      preferences.theme === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Langue</p>
                <p className="text-sm text-slate-600">Langue de l'interface</p>
              </div>
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="input-field"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compte utilisateur */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Compte utilisateur</h3>
              <p className="text-sm text-slate-500">Informations et actions sur votre compte</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {user.user_metadata?.username || user.email?.split('@')[0]}
                  </p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-400">
                    Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">{stats.codes_detected_total}</p>
                  <p className="text-xs text-slate-600">Codes détectés</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600">{stats.codes_copied_total}</p>
                  <p className="text-xs text-slate-600">Codes copiés</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gestion des données */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Gestion des données</h3>
            <p className="text-sm text-slate-500">Exportez, nettoyez ou supprimez vos données</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
            <p className="text-2xl font-bold text-blue-600">{dataStats.accounts}</p>
            <p className="text-sm text-slate-600">Comptes Steam</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50">
            <p className="text-2xl font-bold text-emerald-600">{dataStats.codes}</p>
            <p className="text-sm text-slate-600">Codes détectés</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
            <p className="text-2xl font-bold text-purple-600">{dataStats.totalSize}</p>
            <p className="text-sm text-slate-600">Taille des données</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={exportData}
            className="btn-secondary flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
          <button
            onClick={cleanupOldCodes}
            className="btn-secondary flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Nettoyer
          </button>
          <button
            onClick={deleteAllData}
            className="btn-danger flex items-center justify-center"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vider
          </button>
          <button
            onClick={deleteAccount}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center"
            disabled={loading}
          >
            <UserIcon className="w-4 h-4 mr-2" />
            Supprimer compte
          </button>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Attention :</strong> Les actions de suppression sont irréversibles. 
            Exportez vos données avant de les supprimer.
          </p>
        </div>
      </div>

      {/* Informations sur l'application */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">À propos de Slockly</h3>
            <p className="text-sm text-slate-500">Informations sur l'application</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
            <p className="font-semibold text-slate-800">Slockly</p>
            <p className="text-sm text-slate-600">Version 1.0.0</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50">
            <p className="font-semibold text-slate-800">Surveillance intelligente</p>
            <p className="text-sm text-slate-600">Codes Steam Guard</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
            <p className="font-semibold text-slate-800">Sécurisé par</p>
            <p className="text-sm text-slate-600">Supabase</p>
          </div>
        </div>
      </div>
    </div>
  )
}