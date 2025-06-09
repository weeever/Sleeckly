import React, { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

interface AuthModalProps {
  onClose: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!isLogin) {
      // Validation pour l'inscription
      if (!formData.username.trim()) {
        newErrors.username = 'Le pseudo est requis'
      } else if (formData.username.length < 3) {
        newErrors.username = 'Le pseudo doit contenir au moins 3 caractères'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        newErrors.username = 'Le pseudo ne peut contenir que des lettres, chiffres, tirets et underscores'
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide'
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Effacer l'erreur du champ modifié
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
      if (isLogin) {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error
        
        toast.success('Connexion réussie ! Bienvenue sur Slockly', {
          icon: '🎉',
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#059669',
            border: '1px solid #10b981',
          },
        })
      } else {
        // Inscription
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: undefined,
            data: {
              username: formData.username,
              display_name: formData.username
            }
          }
        })
        
        if (error) throw error
        
        if (data.user) {
          // Créer les statistiques utilisateur initiales
          try {
            await supabase
              .from('user_stats')
              .insert({
                user_id: data.user.id,
                codes_detected_total: 0,
                codes_detected_today: 0,
                last_detection_date: new Date().toISOString().split('T')[0]
              })
          } catch (statsError) {
            console.log('Erreur lors de la création des stats:', statsError)
            // Ne pas bloquer l'inscription si les stats échouent
          }
        }
        
        toast.success(`Compte créé avec succès ! Bienvenue ${formData.username} sur Slockly`, {
          icon: '✨',
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#059669',
            border: '1px solid #10b981',
          },
        })
      }
      onClose()
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue'
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou mot de passe incorrect'
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Un compte existe déjà avec cet email'
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Le mot de passe doit contenir au moins 6 caractères'
      } else if (error.message.includes('Unable to validate email address')) {
        errorMessage = 'Format d\'email invalide'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, {
        icon: '❌',
        style: {
          background: 'rgba(255, 255, 255, 0.9)',
          color: '#dc2626',
          border: '1px solid #ef4444',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setErrors({})
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    resetForm()
  }

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content slide-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {isLogin ? 'Connexion' : 'Inscription'}
              </h2>
              <p className="text-sm text-slate-500">
                {isLogin ? 'Accédez à votre tableau de bord Slockly' : 'Créez votre compte Slockly'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200 hover:rotate-90 transform p-2 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">
                Pseudo *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`input-field w-full ${errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                placeholder="MonPseudo123"
                required={!isLogin}
                maxLength={20}
              />
              {errors.username && (
                <p className="form-error">{errors.username}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                3-20 caractères, lettres, chiffres, tirets et underscores uniquement
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Adresse email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`input-field w-full ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              placeholder="votre@email.com"
              required
            />
            {errors.email && (
              <p className="form-error">{errors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Mot de passe *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`input-field w-full ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              placeholder="••••••••"
              required
              minLength={6}
            />
            {errors.password && (
              <p className="form-error">{errors.password}</p>
            )}
            {!isLogin && (
              <p className="text-xs text-slate-500 mt-1">
                Minimum 6 caractères
              </p>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">
                Confirmer le mot de passe *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`input-field w-full ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                placeholder="••••••••"
                required={!isLogin}
                minLength={6}
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-4"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span>{isLogin ? 'Se connecter' : 'Créer mon compte'}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-blue-500 hover:text-blue-600 text-sm transition-colors duration-200 hover:underline font-medium"
          >
            {isLogin 
              ? "Pas encore de compte ? Créer un compte" 
              : "Déjà un compte ? Se connecter"
            }
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Données sécurisées et chiffrées avec Supabase</span>
          </div>
        </div>
      </div>
    </div>
  )
}