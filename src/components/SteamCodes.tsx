import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Shield, Copy, Clock, CheckCircle, Search, Filter, Download, Trash2, Eye, Archive, RefreshCw } from 'lucide-react'
import { steamCodesService, utils } from '../lib/supabase'
import toast from 'react-hot-toast'

interface SteamCode {
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

interface SteamCodesProps {
  user: User
}

export default function SteamCodes({ user }: SteamCodesProps) {
  const [codes, setCodes] = useState<SteamCode[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCopied, setFilterCopied] = useState<'all' | 'copied' | 'not-copied'>('all')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'account' | 'code'>('date')
  const [loading, setLoading] = useState(true)
  const [selectedCodes, setSelectedCodes] = useState<number[]>([])

  useEffect(() => {
    loadCodes()
  }, [user])

  const loadCodes = async () => {
    try {
      const data = await steamCodesService.getAll()
      setCodes(data)
    } catch (error: any) {
      toast.error('Erreur lors du chargement des codes')
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code)
      
      // Marquer comme copié dans la base de données
      await steamCodesService.markAsCopied(id)

      // Mettre à jour l'état local
      setCodes(prev => prev.map(c =>
        c.id === id ? { ...c, copied: true } : c
      ))
      
      toast.success(`Code ${code} copié dans le presse-papier !`, {
        icon: '📋',
      })
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
      toast.error('Erreur lors de la copie du code')
    }
  }

  const deleteCode = async (id: number) => {
    const code = codes.find(c => c.id === id)
    if (!code) return

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code "${code.code}" ?`)) return

    try {
      await steamCodesService.delete(id)
      setCodes(prev => prev.filter(c => c.id !== id))
      toast.success('Code supprimé avec succès', { icon: '🗑️' })
    } catch (error: any) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const deleteSelectedCodes = async () => {
    if (selectedCodes.length === 0) return

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCodes.length} code(s) sélectionné(s) ?`)) return

    try {
      await Promise.all(selectedCodes.map(id => steamCodesService.delete(id)))
      setCodes(prev => prev.filter(c => !selectedCodes.includes(c.id)))
      setSelectedCodes([])
      toast.success(`${selectedCodes.length} code(s) supprimé(s) avec succès`, { icon: '🗑️' })
    } catch (error: any) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const exportCodes = () => {
    const csvContent = [
      ['Code', 'Compte Steam', 'Email', 'Date de détection', 'Copié', 'Sujet'].join(','),
      ...filteredCodes.map(code => [
        code.code,
        code.steam_account,
        code.email,
        new Date(code.detected_at).toLocaleString('fr-FR'),
        code.copied ? 'Oui' : 'Non',
        code.subject || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slockly-codes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Export réalisé avec succès !', { icon: '📁' })
  }

  const toggleCodeSelection = (id: number) => {
    setSelectedCodes(prev => 
      prev.includes(id) 
        ? prev.filter(codeId => codeId !== id)
        : [...prev, id]
    )
  }

  const selectAllCodes = () => {
    if (selectedCodes.length === filteredCodes.length) {
      setSelectedCodes([])
    } else {
      setSelectedCodes(filteredCodes.map(code => code.id))
    }
  }

  const uniqueAccounts = [...new Set(codes.map(code => code.steam_account))]

  const filteredCodes = codes
    .filter(code => {
      const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           code.steam_account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           code.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (code.subject && code.subject.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesFilter = filterCopied === 'all' ||
                           (filterCopied === 'copied' && code.copied) ||
                           (filterCopied === 'not-copied' && !code.copied)
      
      const matchesAccount = filterAccount === 'all' || code.steam_account === filterAccount
      
      return matchesSearch && matchesFilter && matchesAccount
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      } else if (sortBy === 'account') {
        return a.steam_account.localeCompare(b.steam_account)
      } else {
        return a.code.localeCompare(b.code)
      }
    })

  const isCodeExpired = (code: SteamCode) => {
    if (!code.expires_at) return false
    return new Date(code.expires_at) < new Date()
  }

  if (loading) {
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Codes Steam Guard</h1>
            <p className="text-slate-600">
              {codes.length} code{codes.length > 1 ? 's' : ''} détecté{codes.length > 1 ? 's' : ''} au total
              {selectedCodes.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {selectedCodes.length} sélectionné{selectedCodes.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex space-x-3 mt-4 lg:mt-0">
            <button
              onClick={loadCodes}
              className="btn-secondary flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </button>
            {codes.length > 0 && (
              <button
                onClick={exportCodes}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </button>
            )}
            {selectedCodes.length > 0 && (
              <button
                onClick={deleteSelectedCodes}
                className="btn-danger flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedCodes.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {codes.length > 0 && (
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par code, compte, email ou sujet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field w-full pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={filterCopied}
                onChange={(e) => setFilterCopied(e.target.value as any)}
                className="input-field"
              >
                <option value="all">Tous les codes</option>
                <option value="copied">Copiés</option>
                <option value="not-copied">Non copiés</option>
              </select>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="input-field"
              >
                <option value="all">Tous les comptes</option>
                {uniqueAccounts.map(account => (
                  <option key={account} value={account}>{account}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input-field"
              >
                <option value="date">Trier par date</option>
                <option value="account">Trier par compte</option>
                <option value="code">Trier par code</option>
              </select>
            </div>
          </div>
          
          {filteredCodes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200/60">
              <button
                onClick={selectAllCodes}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedCodes.length === filteredCodes.length ? 'Désélectionner tout' : 'Sélectionner tout'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Codes List */}
      <div className="space-y-4">
        {filteredCodes.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 floating-animation">
              <Shield className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 text-lg mb-2 font-medium">
              {codes.length === 0 ? 'Aucun code Steam Guard détecté' : 'Aucun résultat trouvé'}
            </p>
            <p className="text-slate-500">
              {codes.length === 0 
                ? 'Les codes apparaîtront ici automatiquement lors de la surveillance'
                : 'Essayez de modifier vos critères de recherche'
              }
            </p>
          </div>
        ) : (
          filteredCodes.map((code) => (
            <div key={code.id} className={`code-card ${isCodeExpired(code) ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedCodes.includes(code.id)}
                    onChange={() => toggleCodeSelection(code.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-slate-500 text-sm font-medium mb-1">Code Steam Guard</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-2xl font-mono font-bold text-blue-600">{code.code}</p>
                        {code.copied && (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        )}
                        {isCodeExpired(code) && (
                          <Archive className="w-4 h-4 text-amber-500\" title="Code expiré" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm font-medium mb-1">Compte Steam</p>
                      <p className="font-semibold text-slate-800">{code.steam_account}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm font-medium mb-1">Email</p>
                      <p className="font-semibold text-slate-800 text-sm">{code.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm font-medium mb-1">Sujet</p>
                      <p className="font-semibold text-slate-800 text-sm truncate" title={code.subject}>
                        {code.subject || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm font-medium mb-1">Détecté</p>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <p className="font-semibold text-slate-800 text-sm">
                          {utils.formatRelativeTime(code.detected_at)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {utils.formatDate(code.detected_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => copyToClipboard(code.code, code.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      code.copied
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    title="Copier le code"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm font-medium">{code.copied ? 'Copié' : 'Copier'}</span>
                  </button>
                  <button
                    onClick={() => deleteCode(code.id)}
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

      {/* Statistics */}
      {codes.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistiques</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200/50">
              <p className="text-2xl font-bold text-blue-600">{codes.length}</p>
              <p className="text-sm text-slate-600">Total des codes</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200/50">
              <p className="text-2xl font-bold text-emerald-600">
                {codes.filter(c => c.copied).length}
              </p>
              <p className="text-sm text-slate-600">Codes copiés</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200/50">
              <p className="text-2xl font-bold text-amber-600">
                {codes.filter(c => !c.copied).length}
              </p>
              <p className="text-sm text-slate-600">En attente</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200/50">
              <p className="text-2xl font-bold text-purple-600">
                {uniqueAccounts.length}
              </p>
              <p className="text-sm text-slate-600">Comptes uniques</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200/50">
              <p className="text-2xl font-bold text-red-600">
                {codes.filter(c => isCodeExpired(c)).length}
              </p>
              <p className="text-sm text-slate-600">Codes expirés</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {codes.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Activité récente</h3>
          <div className="space-y-3">
            {codes.slice(0, 5).map((code) => (
              <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Code {code.code} détecté</p>
                    <p className="text-sm text-slate-500">
                      {code.steam_account} • {utils.formatRelativeTime(code.detected_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {code.copied && (
                    <span className="badge badge-green">Copié</span>
                  )}
                  <button
                    onClick={() => copyToClipboard(code.code, code.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}