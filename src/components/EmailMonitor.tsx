import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Mail, Settings, Play, Square, CheckCircle, AlertCircle, Clock, Wifi, WifiOff, Save, TestTube, Shield, Activity, AlertTriangle, Bug } from 'lucide-react'
import { imapConfigService, userStatsService, steamCodesService, utils } from '../lib/supabase'
import { useEnhancedMonitoring } from '../hooks/useEnhancedMonitoring'
import toast from 'react-hot-toast'

interface EmailConfig {
  host: string
  port: number
  username: string
  password: string
  secure: boolean
  is_active: boolean
}

interface EmailMonitorProps {
  user: User
}

export default function EmailMonitor({ user }: EmailMonitorProps) {
  const { 
    isMonitoring, 
    lastCheck, 
    codesDetected, 
    suspiciousEmails,
    startMonitoring, 
    stopMonitoring,
    testEmailDetection
  } = useEnhancedMonitoring()
  
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    host: 'imap.hostinger.com',
    port: 993,
    username: '',
    password: '',
    secure: true,
    is_active: false
  })
  const [status, setStatus] = useState('Arrêté')
  const [showConfig, setShowConfig] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testingDetection, setTestingDetection] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    loadImapConfig()
    loadStats()
    checkNetworkConnectivity()
  }, [user])

  useEffect(() => {
    setStatus(isMonitoring ? 'Surveillance active' : 'Arrêté')
  }, [isMonitoring])

  const checkNetworkConnectivity = async () => {
    try {
      const isConnected = await utils.testNetworkConnectivity()
      if (!isConnected) {
        toast.error('Problème de connectivité réseau détecté', {
          icon: '🌐',
        })
      }
    } catch (error) {
      console.error('Network check failed:', error)
    }
  }

  const loadImapConfig = async () => {
    try {
      const config = await imapConfigService.get()
      if (config) {
        setEmailConfig({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          secure: config.secure,
          is_active: config.is_active
        })
        
        validateConfiguration(config)
      }
    } catch (error: any) {
      console.error('Error loading IMAP config:', error)
      toast.error('Erreur lors du chargement de la configuration: ' + error.message)
    }
  }

  const loadStats = async () => {
    try {
      const userStats = await userStatsService.get()
      if (userStats) {
        setStats(userStats)
      }
    } catch (error: any) {
      console.error('Error loading stats:', error)
    }
  }

  const validateConfiguration = (config: any) => {
    const validation = utils.validateImapConfig(config)
    setValidationErrors(validation.errors)
    return validation.isValid
  }

  const saveImapConfig = async () => {
    if (!validateConfiguration(emailConfig)) {
      toast.error('Veuillez corriger les erreurs de configuration')
      return
    }

    setLoading(true)
    try {
      await imapConfigService.upsert({
        host: emailConfig.host,
        port: emailConfig.port,
        username: emailConfig.username,
        password: emailConfig.password,
        secure: emailConfig.secure,
        is_active: emailConfig.is_active
      })

      toast.success('Configuration sauvegardée avec succès !', {
        icon: '✅',
      })
      setShowConfig(false)
      setValidationErrors([])
      loadImapConfig()
    } catch (error: any) {
      console.error('Error saving IMAP config:', error)
      toast.error('Erreur lors de la sauvegarde : ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    if (!validateConfiguration(emailConfig)) {
      toast.error('Veuillez corriger les erreurs de configuration avant de tester')
      return
    }

    setTestingConnection(true)
    setStatus('Test de connexion...')
    setConnectionStatus('unknown')
    
    try {
      const isConnected = await imapConfigService.testConnection(emailConfig)
      
      if (isConnected) {
        setStatus('Connexion réussie')
        setConnectionStatus('success')
        toast.success('Connexion IMAP réussie !', {
          icon: '🎉',
        })
        
        await imapConfigService.updateLastCheck()
      }
    } catch (error: any) {
      console.error('Connection test failed:', error)
      setStatus('Erreur de connexion')
      setConnectionStatus('error')
      toast.error('Erreur lors du test de connexion: ' + error.message, {
        icon: '❌',
      })
    } finally {
      setTimeout(() => {
        setStatus(isMonitoring ? 'Surveillance active' : 'Arrêté')
        setTestingConnection(false)
      }, 2000)
    }
  }

  const testDetection = async () => {
    setTestingDetection(true)
    try {
      await testEmailDetection()
    } catch (error) {
      console.error('Detection test failed:', error)
    } finally {
      setTestingDetection(false)
    }
  }

  const handleStartStop = async () => {
    if (isMonitoring) {
      try {
        await stopMonitoring()
        await imapConfigService.setActive(false)
        await userStatsService.setMonitoringActive(false)
      } catch (error: any) {
        console.error('Error stopping monitoring:', error)
        toast.error('Erreur lors de l\'arrêt de la surveillance: ' + error.message)
      }
    } else {
      if (!emailConfig.username || !emailConfig.password) {
        toast.error('Veuillez configurer votre email d\'abord')
        setShowConfig(true)
        return
      }
      
      if (!validateConfiguration(emailConfig)) {
        toast.error('Configuration invalide. Veuillez corriger les erreurs.')
        setShowConfig(true)
        return
      }
      
      try {
        await imapConfigService.setActive(true)
        await userStatsService.setMonitoringActive(true)
        await startMonitoring()
      } catch (error: any) {
        console.error('Error starting monitoring:', error)
        toast.error('Erreur lors du démarrage de la surveillance: ' + error.message)
      }
    }
  }

  const handleConfigChange = (field: keyof EmailConfig, value: any) => {
    const newConfig = { ...emailConfig, [field]: value }
    setEmailConfig(newConfig)
    validateConfiguration(newConfig)
  }

  const getStatusIcon = () => {
    if (status === 'Surveillance active') return <CheckCircle className="w-5 h-5 text-emerald-500" />
    if (status === 'Test de connexion...') return <Clock className="w-5 h-5 text-amber-500" />
    if (status === 'Connexion réussie') return <CheckCircle className="w-5 h-5 text-emerald-500" />
    if (status === 'Erreur de connexion') return <AlertCircle className="w-5 h-5 text-red-500" />
    return <AlertCircle className="w-5 h-5 text-slate-500" />
  }

  const getConnectionIcon = () => {
    if (isMonitoring) return <Wifi className="w-5 h-5 text-emerald-500" />
    return <WifiOff className="w-5 h-5 text-slate-500" />
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="slide-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Surveillance Email Avancée</h1>
            <p className="text-slate-600">Détection intelligente des emails Steam Guard avec validation de sécurité</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn-secondary flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </button>
            {emailConfig.username && (
              <>
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="btn-secondary flex items-center"
                >
                  {testingConnection ? (
                    <div className="spinner mr-2"></div>
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Test IMAP
                </button>
                <button
                  onClick={testDetection}
                  disabled={testingDetection}
                  className="btn-secondary flex items-center"
                >
                  {testingDetection ? (
                    <div className="spinner mr-2"></div>
                  ) : (
                    <Bug className="w-4 h-4 mr-2" />
                  )}
                  Test Détection
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Security Notice */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Surveillance Intelligente Steam Guard</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• <strong>Détection avancée</strong> avec validation des domaines officiels Steam</p>
              <p>• <strong>Protection anti-phishing</strong> contre les emails frauduleux</p>
              <p>• <strong>Analyse de contenu</strong> pour identifier les tentatives de spoofing</p>
              <p>• <strong>Alertes de sécurité</strong> pour les emails suspects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Erreurs de configuration</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (
        <div className="card slide-in">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800">Configuration IMAP</h3>
              <p className="text-sm text-slate-500">Paramètres de connexion à votre serveur email</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label className="form-label">Serveur IMAP *</label>
              <input
                type="text"
                value={emailConfig.host}
                onChange={(e) => handleConfigChange('host', e.target.value)}
                className="input-field w-full"
                placeholder="imap.hostinger.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Exemples: imap.gmail.com, imap.hostinger.com, outlook.office365.com
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Port *</label>
              <input
                type="number"
                value={emailConfig.port}
                onChange={(e) => handleConfigChange('port', parseInt(e.target.value) || 993)}
                className="input-field w-full"
                placeholder="993"
                min="1"
                max="65535"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Port standard: 993 (SSL) ou 143 (non-SSL)
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                type="email"
                value={emailConfig.username}
                onChange={(e) => handleConfigChange('username', e.target.value)}
                className="input-field w-full"
                placeholder="votre@email.com"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                L'adresse email où vous recevez les codes Steam Guard
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe *</label>
              <input
                type="password"
                value={emailConfig.password}
                onChange={(e) => handleConfigChange('password', e.target.value)}
                className="input-field w-full"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Utilisez un mot de passe d'application si 2FA activé
              </p>
            </div>
          </div>
          
          <div className="flex items-center mb-6">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={emailConfig.secure}
                onChange={(e) => handleConfigChange('secure', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="ml-3 text-sm text-slate-700 font-medium">
              Connexion sécurisée (SSL/TLS) - Recommandé
            </span>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={testConnection}
              disabled={testingConnection || validationErrors.length > 0}
              className="btn-secondary flex items-center"
            >
              {testingConnection ? (
                <div className="spinner mr-2"></div>
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Tester la connexion
            </button>
            <button
              onClick={saveImapConfig}
              disabled={loading || validationErrors.length > 0}
              className="btn-success flex items-center"
            >
              {loading ? (
                <div className="spinner mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Statut</p>
                <p className="font-semibold text-slate-800">{status}</p>
              </div>
            </div>
            {getConnectionIcon()}
          </div>
          {connectionStatus !== 'unknown' && (
            <div className={`text-xs px-2 py-1 rounded-full ${getConnectionStatusColor()}`}>
              {connectionStatus === 'success' ? 'Connexion OK' : 'Connexion échouée'}
            </div>
          )}
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Dernière vérification</p>
                <p className="font-semibold text-slate-800">
                  {lastCheck ? lastCheck.toLocaleTimeString('fr-FR') : 'Jamais'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Codes détectés</p>
                <p className="font-semibold text-slate-800">{codesDetected}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Emails suspects</p>
                <p className="font-semibold text-slate-800">{suspiciousEmails}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Temps surveillance</p>
                <p className="font-semibold text-slate-800">
                  {stats ? Math.floor(stats.total_monitoring_time / 60) : 0}h
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Control Panel */}
      <div className="card text-center">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Contrôle de la surveillance intelligente</h3>
          <p className="text-slate-600">Surveillance avancée avec détection anti-phishing et validation de sécurité</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleStartStop}
            disabled={validationErrors.length > 0}
            className={`${
              isMonitoring
                ? 'btn-danger'
                : 'btn-success'
            } text-lg px-8 py-4 flex items-center ${
              validationErrors.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isMonitoring ? (
              <>
                <Square className="w-6 h-6 mr-3" />
                <span>Arrêter la surveillance</span>
              </>
            ) : (
              <>
                <Play className="w-6 h-6 mr-3" />
                <span>Démarrer la surveillance</span>
              </>
            )}
          </button>

          {emailConfig.username && (
            <button
              onClick={testDetection}
              disabled={testingDetection}
              className="btn-secondary text-lg px-8 py-4 flex items-center"
            >
              {testingDetection ? (
                <div className="spinner mr-3"></div>
              ) : (
                <Bug className="w-6 h-6 mr-3" />
              )}
              <span>Tester la détection</span>
            </button>
          )}
        </div>
        
        {!emailConfig.username && (
          <p className="text-amber-600 text-sm mt-4 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Veuillez configurer votre email avant de démarrer la surveillance
          </p>
        )}
        
        {validationErrors.length > 0 && (
          <p className="text-red-600 text-sm mt-4 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Corrigez les erreurs de configuration pour démarrer la surveillance
          </p>
        )}
      </div>

      {/* Enhanced Security Features */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-emerald-500" />
          <h3 className="text-lg font-semibold text-slate-800">Fonctionnalités de sécurité avancées</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Validation des domaines:</strong> Vérification automatique des domaines Steam officiels</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Détection anti-phishing:</strong> Identification des tentatives de spoofing et emails frauduleux</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Analyse de contenu:</strong> Validation de la structure et du format des emails Steam</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Validation des codes:</strong> Vérification du format et du contexte des codes Steam Guard</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Alertes de sécurité:</strong> Notifications immédiates pour les emails suspects</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p><strong>Chiffrement des données:</strong> Protection maximale de vos identifiants IMAP</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works - Enhanced */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-800">Comment fonctionne la détection intelligente ?</h3>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">1</span>
            </div>
            <p><strong>Connexion sécurisée:</strong> Établissement d'une connexion IMAP chiffrée avec votre serveur email</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">2</span>
            </div>
            <p><strong>Surveillance intelligente:</strong> Analyse en temps réel des nouveaux emails avec filtrage avancé</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">3</span>
            </div>
            <p><strong>Validation de sécurité:</strong> Vérification des domaines, liens et structure des emails Steam</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">4</span>
            </div>
            <p><strong>Extraction sécurisée:</strong> Identification et extraction des codes Steam Guard authentiques</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-semibold text-xs">5</span>
            </div>
            <p><strong>Notification et copie:</strong> Alerte instantanée avec copie automatique sécurisée dans le presse-papier</p>
          </div>
        </div>
      </div>
    </div>
  )
}