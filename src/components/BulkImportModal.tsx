import React, { useState, useRef } from 'react'
import { X, Upload, Download, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { bulkImportService, ImportResult } from '../services/bulkImportService'
import toast from 'react-hot-toast'

interface BulkImportModalProps {
  onClose: () => void
  onImportComplete: () => void
}

export default function BulkImportModal({ onClose, onImportComplete }: BulkImportModalProps) {
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      toast.error('Veuillez sélectionner un fichier .txt')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setImportText(text)
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error('Veuillez entrer ou charger des données à importer')
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const importResult = await bulkImportService.importFromText(importText)
      setResult(importResult)
      
      if (importResult.success > 0) {
        toast.success(`${importResult.success} compte(s) importé(s) avec succès !`)
        onImportComplete()
      }
      
      if (importResult.failed > 0) {
        toast.error(`${importResult.failed} compte(s) ont échoué`)
      }
    } catch (error: any) {
      toast.error('Erreur lors de l\'import: ' + error.message)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = bulkImportService.generateTemplate()
    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'slockly-import-template.txt'
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Modèle téléchargé !', { icon: '📁' })
  }

  const clearData = () => {
    setImportText('')
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content slide-in max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Import en masse</h2>
              <p className="text-sm text-slate-500">Importez plusieurs comptes Steam depuis un fichier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200 hover:rotate-90 transform p-2 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Instructions */}
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-start space-x-3">
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Format d'import</h3>
              <div className="text-sm text-blue-700 space-y-2">
                <p><strong>Format requis:</strong> <code className="bg-blue-100 px-2 py-1 rounded">username/password/email/steamID(optionnel)</code></p>
                <p><strong>Exemple:</strong> <code className="bg-blue-100 px-2 py-1 rounded">fqgqi83240/Okami16052004./atomicheart@weeever.shop/76561199701775709</code></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Une ligne par compte</li>
                  <li>Séparez les champs par des barres obliques (/)</li>
                  <li>Le Steam ID est optionnel (17 chiffres)</li>
                  <li>Les lignes commençant par # sont ignorées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">Charger un fichier .txt</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="input-field w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={downloadTemplate}
              className="btn-secondary flex items-center w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le modèle
            </button>
          </div>
        </div>

        {/* Text Input */}
        <div className="mb-6">
          <label className="form-label">Ou saisissez les données directement</label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="input-field w-full h-40 font-mono text-sm"
            placeholder="username1/password1/email1@example.com/steamID1
username2/password2/email2@example.com
# Commentaire - cette ligne sera ignorée
username3/password3/email3@example.com/steamID3"
          />
          <p className="text-xs text-slate-500 mt-1">
            {importText.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).length} ligne(s) de données
          </p>
        </div>

        {/* Import Result */}
        {result && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Résultat de l'import</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
                <p className="text-sm text-emerald-700">Réussis</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-sm text-red-700">Échoués</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{result.success + result.failed}</p>
                <p className="text-sm text-blue-700">Total</p>
              </div>
            </div>
            
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Erreurs détectées
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700 mb-1">• {error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            disabled={importing || !importText.trim()}
            className="btn-primary flex items-center"
          >
            {importing ? (
              <div className="spinner mr-2"></div>
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {importing ? 'Import en cours...' : 'Importer les comptes'}
          </button>
          <button
            onClick={clearData}
            className="btn-secondary"
          >
            Effacer
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}