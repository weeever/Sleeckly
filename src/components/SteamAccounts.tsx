import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { User as UserIcon, Plus, Edit, Trash2, Eye, EyeOff, Save, X, Shield, AlertTriangle, Upload } from 'lucide-react'
import { steamAccountsService, utils } from '../lib/supabase'
import BulkImportModal from './BulkImportModal'
import toast from 'react-hot-toast'

interface SteamAccount {
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

interface SteamAccountsProps {
  user: User
}

export default function SteamAccounts({ user }: SteamAccountsProps) {
  const [accounts, setAccounts] = useState<SteamAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SteamAccount | null>(null)
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({})
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    steam_id: '',
    email_password: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    loadAccounts()
  }, [user])

  const loadAccounts = async () => {
    try {
      const data = await steamAccountsService.getAll()
      setAccounts(data)
    } catch (error: any) {
      toast.error('Erreur lors du chargement des comptes')
      console.error('Erreur:', error)
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.username.trim()) {
      newErrors.username = 'Le nom d\'utilisateur est requis'
    } else if (!utils.validateSteamUsername(formData.username)) {
      newErrors.username = 'Nom d\'utilisateur invalide (3-50 caractères, lettres, chiffres, tirets et underscores)'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis'
    } else if (!utils.validateEmail(formData.email)) {
      newErrors.email = 'Format d\'email invalide'
    }

    if (formData.steam_id && !/^\d{17}$/.test(formData.steam_id)) {
      newErrors.steam_id = 'Steam ID invalide (doit contenir 17 chiffres)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: utils.sanitizeInput(value) }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      if (editingAccount) {
        // Modifier un compte existant
        await steamAccountsService.update(editingAccount.id, {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          steam_id: formData.steam_id || undefined,
          email_password: formData.email_password || undefined
        })
        toast.success('Compte modifié avec succès !', { icon: '✅' })
      } else {
        // Ajouter un nouveau compte
        await steamAccountsService.create({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          steam_id: formData.steam_id || undefined,
          email_password: formData.email_password || undefined
        })
        toast.success('Compte ajouté avec succès !', { icon: '🎉' })
      }

      resetForm()
      loadAccounts()
    } catch (error: any) {
      if (error.message.includes('existe déjà')) {
        toast.error('Un compte avec ce nom d\'utilisateur ou cet email existe déjà')
      } else {
        toast.error('Erreur : ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      steam_id: '',
      email_password: ''
    })
    setErrors({})
    setShowAddForm(false)
    setEditingAccount(null)
  }

  const handleEdit = (account: SteamAccount) => {
    setFormData({
      username: account.username,
      password: account.password,
      email: account.email,
      steam_id: account.steam_id || '',
      email_password: account.email_password || ''
    })
    setEditingAccount(account)
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    const account = accounts.find(a => a.id === id)
    if (!account) return

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte "${account.username}" ?`)) return

    try {
      await steamAccountsService.delete(id)
      toast.success('Compte supprimé avec succès', { icon: '🗑️' })
      loadAccounts()
    } catch (error: any) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const duplicateAccount = async (account: SteamAccount) => {
    setFormData({
      username: account.username + '_copy',
      password: account.password,
      email: account.email,
      steam_id: account.steam_id || '',
      email_password: account.email_password || ''
    })
    setEditingAccount(null)
    setShowAddForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="slide-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Comptes Steam</h1>
            <p className="text-slate-600">Gérez vos comptes Steam pour la surveillance des codes d'authentification</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="btn-secondary flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import en masse
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un compte
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="card bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Sécurité de vos données</h3>
            <div className="text-sm text-amber-700 space-y-1">
              <p>• Vos mots de passe sont chiffrés et stockés de manière sécurisée</p>
              <p>• Seul vous avez accès à vos comptes Steam</p>
              <p>• Les données sont synchronisées dans le cloud Supabase</p>
              <p>• Utilisez des mots de passe d'application si vous avez activé la 2FA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card slide-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {editingAccount ? 'Modifier le compte' : 'Ajouter un nouveau compte'}
                </h3>
                <p className="text-sm text-slate-500">
                  {editingAccount ? 'Modifiez les informations du compte' : 'Ajoutez un compte Steam à surveiller'}
                </p>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">
                  Nom d'utilisateur Steam *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`input-field w-full ${errors.username ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="username_steam"
                  required
                  maxLength={50}
                />
                {errors.username && <p className="form-error">{errors.username}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  3-50 caractères, lettres, chiffres, tirets et underscores uniquement
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Mot de passe Steam *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`input-field w-full ${errors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                {errors.password && <p className="form-error">{errors.password}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  Minimum 6 caractères
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Email associé *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`input-field w-full ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="email@example.com"
                  required
                />
                {errors.email && <p className="form-error">{errors.email}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  L'email où vous recevez les codes Steam Guard
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Steam ID (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.steam_id}
                  onChange={(e) => handleInputChange('steam_id', e.target.value)}
                  className={`input-field w-full ${errors.steam_id ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="76561198..."
                  pattern="\d{17}"
                  maxLength={17}
                />
                {errors.steam_id && <p className="form-error">{errors.steam_id}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  17 chiffres, trouvable sur votre profil Steam
                </p>
              </div>
              
              <div className="form-group md:col-span-2">
                <label className="form-label">
                  Mot de passe email (optionnel)
                </label>
                <input
                  type="password"
                  value={formData.email_password}
                  onChange={(e) => handleInputChange('email_password', e.target.value)}
                  className="input-field w-full"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Uniquement si différent du mot de passe Steam
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <div className="spinner mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingAccount ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 floating-animation">
              <UserIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 text-xl mb-2 font-medium">Aucun compte Steam ajouté</p>
            <p className="text-slate-500 mb-6">Ajoutez votre premier compte Steam pour commencer la surveillance</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter mon premier compte
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className="btn-secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import en masse
              </button>
            </div>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="code-card">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Nom d'utilisateur</p>
                    <p className="font-semibold text-slate-800">{account.username}</p>
                    {account.steam_id && (
                      <p className="text-xs text-slate-500 mt-1">ID: {account.steam_id}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Mot de passe</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-slate-800">
                        {showPasswords[account.id] ? account.password : '••••••••'}
                      </p>
                      <button
                        onClick={() => togglePasswordVisibility(account.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
                      >
                        {showPasswords[account.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Email</p>
                    <p className="font-semibold text-slate-800 text-sm">{account.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Ajouté le</p>
                    <p className="font-semibold text-slate-800 text-sm">
                      {utils.formatDate(account.created_at)}
                    </p>
                    {account.is_active ? (
                      <span className="badge badge-green mt-1">Actif</span>
                    ) : (
                      <span className="badge badge-red mt-1">Inactif</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => duplicateAccount(account)}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    title="Dupliquer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {accounts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistiques</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
              <p className="text-2xl font-bold text-blue-600">{accounts.length}</p>
              <p className="text-sm text-slate-600">Comptes configurés</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50">
              <p className="text-2xl font-bold text-emerald-600">
                {accounts.filter(a => a.is_active).length}
              </p>
              <p className="text-sm text-slate-600">Comptes actifs</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
              <p className="text-2xl font-bold text-purple-600">
                {accounts.filter(a => a.steam_id).length}
              </p>
              <p className="text-sm text-slate-600">Steam IDs renseignés</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200/50">
              <p className="text-2xl font-bold text-amber-600">
                {new Set(accounts.map(a => a.email)).size}
              </p>
              <p className="text-sm text-slate-600">Emails uniques</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImportComplete={loadAccounts}
        />
      )}
    </div>
  )
}