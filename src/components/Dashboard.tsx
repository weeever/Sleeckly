import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { 
  Monitor, 
  Users, 
  Key, 
  Settings,
  Activity,
  Mail,
  Clock,
  Zap,
  TrendingUp,
  Calendar,
  BarChart3,
  Target,
  Bell,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Shield
} from 'lucide-react'
import EmailMonitor from './EmailMonitor'
import SteamAccounts from './SteamAccounts'
import SteamCodes from './SteamCodes'
import SettingsPanel from './SettingsPanel'
import { userStatsService, steamAccountsService, steamCodesService, imapConfigService } from '../lib/supabase'
import { useEnhancedMonitoring } from '../hooks/useEnhancedMonitoring'

interface DashboardProps {
  user: User
}

type TabType = 'overview' | 'monitor' | 'accounts' | 'codes' | 'settings'

export default function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Activity, description: 'Tableau de bord principal' },
    { id: 'monitor', label: 'Surveillance', icon: Monitor, description: 'Détection intelligente' },
    { id: 'accounts', label: 'Comptes Steam', icon: Users, description: 'Gestion des comptes' },
    { id: 'codes', label: 'Codes détectés', icon: Key, description: 'Historique des codes' },
    { id: 'settings', label: 'Paramètres', icon: Settings, description: 'Configuration' },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab user={user} onTabChange={setActiveTab} />
      case 'monitor':
        return <EmailMonitor user={user} />
      case 'accounts':
        return <SteamAccounts user={user} />
      case 'codes':
        return <SteamCodes user={user} />
      case 'settings':
        return <SettingsPanel user={user} />
      default:
        return <OverviewTab user={user} onTabChange={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sidebar rounded-2xl p-6 shadow-lg">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-5 flex items-center justify-center">
                    <img 
                      src="/Calque 1.png" 
                      alt="Slockly" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tableau de bord</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">Surveillance intelligente Steam Guard avec protection anti-phishing</p>
              </div>
              
              <nav className="space-y-2">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`nav-item group ${
                        activeTab === tab.id ? 'nav-item-active' : 'nav-item-inactive'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs opacity-70">{tab.description}</div>
                      </div>
                      {activeTab === tab.id && (
                        <div className="absolute right-3 w-2 h-2 bg-blue-500 rounded-full pulse-glow"></div>
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* User info */}
              <div className="mt-8 pt-6 border-t border-slate-200/60">
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {user.user_metadata?.username || user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 fade-in">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

interface OverviewTabProps {
  user: User
  onTabChange: (tab: TabType) => void
}

function OverviewTab({ user, onTabChange }: OverviewTabProps) {
  const [stats, setStats] = useState<any>(null)
  const [accountsCount, setAccountsCount] = useState(0)
  const [codesCount, setCodesCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<string>('')
  const [recentCodes, setRecentCodes] = useState<any[]>([])
  
  const { isMonitoring, codesDetected, suspiciousEmails } = useEnhancedMonitoring()

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Charger les statistiques
      const userStats = await userStatsService.get()
      if (userStats) {
        setStats(userStats)
      }

      // Charger le nombre de comptes
      const accounts = await steamAccountsService.getAll()
      setAccountsCount(accounts.length)

      // Charger le nombre de codes
      const codes = await steamCodesService.getAll()
      setCodesCount(codes.length)

      // Charger les codes récents
      const recentCodesData = await steamCodesService.getRecentCodes(5)
      setRecentCodes(recentCodesData)

      // Charger la configuration IMAP
      const imapConfig = await imapConfigService.get()
      if (imapConfig && imapConfig.last_check) {
        setLastCheck(new Date(imapConfig.last_check).toLocaleTimeString('fr-FR'))
      }

      // Mettre à jour la dernière connexion
      await userStatsService.updateLastLogin()
    } catch (error) {
      console.log('Erreur lors du chargement des données:', error)
    }
  }

  const currentDate = new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const userName = user.user_metadata?.username || user.email?.split('@')[0] || 'Utilisateur'

  const getMonitoringStatus = () => {
    if (isMonitoring) return { text: 'Active', color: 'text-emerald-600', icon: CheckCircle }
    return { text: 'Arrêtée', color: 'text-red-600', icon: AlertCircle }
  }

  const monitoringStatus = getMonitoringStatus()
  const StatusIcon = monitoringStatus.icon

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="slide-in">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {currentDate}
            </p>
            <h1 className="text-4xl font-bold text-slate-800 mb-3">
              Bonjour, <span className="gradient-text">{userName}</span>
            </h1>
            <p className="text-slate-600 text-lg">
              Surveillance intelligente Steam Guard avec protection anti-phishing
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
            <button 
              onClick={() => onTabChange('monitor')}
              className="btn-primary flex items-center"
            >
              <Zap className="w-4 h-4 mr-2" />
              Surveillance intelligente
            </button>
            <button 
              onClick={() => onTabChange('settings')}
              className="btn-secondary flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { 
            label: 'Codes détectés', 
            value: codesDetected.toString(), 
            icon: Key, 
            color: 'from-blue-500 to-blue-600', 
            change: stats ? `+${stats.codes_detected_today} aujourd'hui` : '+0 aujourd\'hui',
            delay: '0s',
            onClick: () => onTabChange('codes')
          },
          { 
            label: 'Comptes Steam', 
            value: accountsCount.toString(), 
            icon: Users, 
            color: 'from-purple-500 to-purple-600', 
            change: accountsCount > 0 ? `${accountsCount} configuré${accountsCount > 1 ? 's' : ''}` : 'Aucun configuré',
            delay: '0.1s',
            onClick: () => onTabChange('accounts')
          },
          { 
            label: 'Surveillance', 
            value: monitoringStatus.text, 
            icon: Monitor, 
            color: isMonitoring ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600', 
            change: isMonitoring ? 'Intelligente' : 'Inactive',
            delay: '0.2s',
            onClick: () => onTabChange('monitor')
          },
          { 
            label: 'Emails suspects', 
            value: suspiciousEmails.toString(), 
            icon: AlertTriangle, 
            color: suspiciousEmails > 0 ? 'from-amber-500 to-amber-600' : 'from-slate-400 to-slate-500', 
            change: suspiciousEmails > 0 ? 'Détectés' : 'Aucun',
            delay: '0.3s',
            onClick: () => onTabChange('monitor')
          },
          { 
            label: 'Dernière vérification', 
            value: lastCheck || 'Jamais', 
            icon: Clock, 
            color: 'from-indigo-500 to-indigo-600', 
            change: lastCheck ? 'Récente' : 'Non configuré',
            delay: '0.4s',
            onClick: () => onTabChange('monitor')
          },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <button
              key={index}
              onClick={stat.onClick}
              className="stat-card floating-animation hover-lift text-left w-full" 
              style={{ animationDelay: stat.delay }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Enhanced Security Alert */}
      {suspiciousEmails > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-red-50 border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Alertes de sécurité</h3>
              <p className="text-amber-700 mb-3">
                {suspiciousEmails} email{suspiciousEmails > 1 ? 's' : ''} suspect{suspiciousEmails > 1 ? 's' : ''} détecté{suspiciousEmails > 1 ? 's' : ''} récemment. 
                Ces emails peuvent être des tentatives de phishing.
              </p>
              <button
                onClick={() => onTabChange('monitor')}
                className="btn-secondary text-sm"
              >
                Voir les détails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Quick Actions */}
          <div className="card slide-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Actions rapides</h3>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => onTabChange('monitor')}
                className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50 hover-lift text-left transition-all duration-300 hover:shadow-lg group"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Surveillance Intelligente</h4>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Activez la surveillance avancée avec détection anti-phishing et validation de sécurité automatique.
                </p>
                <div className="flex items-center text-blue-600 font-medium text-sm">
                  <span>Configurer maintenant</span>
                  <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </button>
              
              <button
                onClick={() => onTabChange('accounts')}
                className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50 hover-lift text-left transition-all duration-300 hover:shadow-lg group"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Comptes Steam</h4>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                  Gérez vos comptes Steam avec import en masse et stockage sécurisé dans le cloud.
                </p>
                <div className="flex items-center text-emerald-600 font-medium text-sm">
                  <span>Ajouter des comptes</span>
                  <svg className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Recent Activity */}
          <div className="card slide-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Activité récente</h3>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            {recentCodes.length > 0 ? (
              <div className="space-y-3">
                {recentCodes.map((code) => (
                  <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">Code {code.code} détecté</p>
                        <p className="text-sm text-slate-500">
                          {code.steam_account} • {new Date(code.detected_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {code.copied && (
                        <span className="badge badge-green">Copié</span>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onTabChange('codes')}
                  className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-sm py-2"
                >
                  Voir tous les codes →
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 floating-animation">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 text-lg mb-2 font-medium">Aucune activité récente</p>
                <p className="text-slate-500 mb-4">Configurez votre surveillance pour voir l'activité ici</p>
                <button
                  onClick={() => onTabChange('monitor')}
                  className="btn-primary"
                >
                  Commencer la surveillance
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Enhanced Status Widget */}
          <div className="card slide-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Statut système</h3>
              <div className={`w-3 h-3 rounded-full pulse-glow ${isMonitoring ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Surveillance intelligente</span>
                <span className={`status-indicator ${isMonitoring ? 'status-online' : 'status-offline'}`}>
                  {monitoringStatus.text}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Protection anti-phishing</span>
                <span className={`status-indicator ${isMonitoring ? 'status-online' : 'status-pending'}`}>
                  {isMonitoring ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Comptes Steam</span>
                <span className={`status-indicator ${accountsCount > 0 ? 'status-online' : 'status-pending'}`}>
                  {accountsCount} configuré{accountsCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Codes détectés</span>
                <span className={`status-indicator ${codesDetected > 0 ? 'status-online' : 'status-pending'}`}>
                  {codesDetected} total
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Performance Stats */}
          {stats && (
            <div className="card slide-in" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Performance</h3>
                <TrendingUp className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Codes copiés</span>
                    <span className="text-sm text-slate-500">
                      {stats.codes_detected_total > 0 ? Math.round((stats.codes_copied_total / stats.codes_detected_total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${stats.codes_detected_total > 0 ? (stats.codes_copied_total / stats.codes_detected_total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.codes_copied_total} sur {stats.codes_detected_total} codes
                  </p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Temps de surveillance</span>
                    <span className="text-sm text-slate-500">
                      {Math.floor(stats.total_monitoring_time / 60)}h
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.min((stats.total_monitoring_time / (24 * 60)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.total_monitoring_time} minutes au total
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Security Info */}
          <div className="card slide-in" style={{ animationDelay: '0.9s' }}>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-5 h-2.5">
                <img 
                  src="/Calque 0.png" 
                  alt="Slockly" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Sécurité avancée</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Détection anti-phishing intelligente</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Validation des domaines Steam officiels</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Chiffrement des données sensibles</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Synchronisation cloud sécurisée</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Alertes de sécurité en temps réel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}