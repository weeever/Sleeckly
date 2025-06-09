import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import Dashboard from './components/Dashboard'
import type { User } from '@supabase/supabase-js'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    // Vérifier la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">

          <p className="text-slate-600 text-lg font-medium">Chargement en cours...</p>
          <div className="mt-4">
            <div className="spinner mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header 
        user={user} 
        onAuthClick={() => setShowAuthModal(true)}
        onLogout={() => supabase.auth.signOut()}
      />
      
      {user ? (
        <Dashboard user={user} />
      ) : (
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-20 fade-in">
              <div className="mb-12">
                <div className="w-96 h-48 mx-auto mb-8 floating-animation">
                  <img 
                    src="/Calque 0.png" 
                    alt="Slockly" 
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="max-w-5xl mx-auto">
                  <p className="text-3xl text-slate-700 mb-8 leading-relaxed font-medium">
                    La solution ultime pour la surveillance intelligente et automatique 
                    de vos codes Steam Guard
                  </p>
                  <p className="text-xl text-slate-600 mb-12 leading-relaxed">
                    Interface moderne, sécurité maximale, synchronisation cloud instantanée
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary text-2xl px-16 py-6 group inline-flex items-center shadow-2xl hover:shadow-blue-500/30 transform hover:scale-110 transition-all duration-300"
                >
                  <span>Commencer maintenant</span>
                  <svg className="w-8 h-8 ml-4 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center justify-center space-x-3 text-lg text-slate-600">
                <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Gratuit • Sécurisé • Sans engagement</span>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {[
                {
                  icon: (
                    <svg className="w-10 h-10 text-white\" fill="none\" stroke="currentColor\" viewBox="0 0 24 24">
                      <path strokeLinecap="round\" strokeLinejoin="round\" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Surveillance Intelligente',
                  description: 'Connexion IMAP sécurisée avec détection automatique et instantanée des codes Steam Guard directement depuis votre boîte email',
                  color: 'from-blue-500 to-blue-600',
                  delay: '0s'
                },
                {
                  icon: (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Sécurité Maximale',
                  description: 'Stockage cloud chiffré avec Supabase, authentification sécurisée, protection des données et accès personnel uniquement',
                  color: 'from-emerald-500 to-emerald-600',
                  delay: '0.2s'
                },
                {
                  icon: (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: 'Temps Réel',
                  description: 'Notifications instantanées, copie automatique dans le presse-papier et synchronisation cloud en temps réel',
                  color: 'from-purple-500 to-purple-600',
                  delay: '0.4s'
                }
              ].map((feature, index) => (
                <div key={index} className="card text-center floating-animation hover-lift group" style={{ animationDelay: feature.delay }}>
                  <div className={`w-24 h-24 bg-gradient-to-br ${feature.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl pulse-glow group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-slate-800">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 text-white text-center mb-20 shadow-2xl">
              <div className="w-32 h-16 mx-auto mb-8">
                <img 
                  src="/Calque 0.png" 
                  alt="Slockly" 
                  className="w-full h-full object-contain brightness-0 invert"
                />
              </div>
              <h2 className="text-4xl font-bold mb-8">Pourquoi nous choisir ?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <div className="text-5xl font-bold">100%</div>
                  <div className="text-xl opacity-90">Sécurisé</div>
                  <div className="text-sm opacity-75">Chiffrement bout en bout</div>
                </div>
                <div className="space-y-2">
                  <div className="text-5xl font-bold">24/7</div>
                  <div className="text-xl opacity-90">Surveillance</div>
                  <div className="text-sm opacity-75">Monitoring continu</div>
                </div>
                <div className="space-y-2">
                  <div className="text-5xl font-bold">∞</div>
                  <div className="text-xl opacity-90">Comptes</div>
                  <div className="text-sm opacity-75">Illimité et gratuit</div>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold text-slate-800 mb-12">Comment ça fonctionne ?</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  {
                    step: "1",
                    title: "Inscription",
                    description: "Créez votre compte en quelques secondes",
                    icon: "👤"
                  },
                  {
                    step: "2", 
                    title: "Configuration",
                    description: "Ajoutez vos comptes Steam et configurez votre email",
                    icon: "⚙️"
                  },
                  {
                    step: "3",
                    title: "Surveillance",
                    description: "Surveillance automatique de vos emails",
                    icon: "👁️"
                  },
                  {
                    step: "4",
                    title: "Codes reçus",
                    description: "Recevez et copiez instantanément vos codes Steam Guard",
                    icon: "🔑"
                  }
                ].map((step, index) => (
                  <div key={index} className="relative">
                    <div className="card text-center hover-lift group">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                        {step.step}
                      </div>
                      <div className="text-4xl mb-4">{step.icon}</div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">{step.title}</h3>
                      <p className="text-slate-600">{step.description}</p>
                    </div>
                    {index < 3 && (
                      <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                        <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Final */}
            <div className="text-center bg-gradient-to-r from-slate-50 to-blue-50 rounded-3xl p-16 border border-blue-200/50">
              <div className="w-32 h-16 mx-auto mb-6">
                <img 
                  src="/Calque 0.png" 
                  alt="Slockly" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-5xl font-bold text-slate-800 mb-6">Prêt à commencer ?</h2>
              <p className="text-2xl text-slate-600 mb-10 max-w-3xl mx-auto">
                Rejoignez-nous dès maintenant et simplifiez la gestion de vos codes Steam Guard
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary text-2xl px-16 py-6 group inline-flex items-center shadow-2xl hover:shadow-blue-500/30 transform hover:scale-110 transition-all duration-300"
              >
                <span>Créer mon compte gratuit</span>
                <svg className="w-8 h-8 ml-4 transition-transform duration-300 group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#334155',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </div>
  )
}

export default App