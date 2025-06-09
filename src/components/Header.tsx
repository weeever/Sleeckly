import React from 'react'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  user: User | null
  onAuthClick: () => void
  onLogout: () => void
}

export default function Header({ user, onAuthClick, onLogout }: HeaderProps) {
  return (
    <header className="header-glass sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-12 flex items-center justify-center">
              <img 
                src="/Calque 1.png" 
                alt="Slockly" 
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Surveillance intelligente Steam Guard</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200/60 shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{user.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-slate-500 hover:text-slate-700 transition-all duration-200 hover:scale-105 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200/60 hover:border-red-200/80 shadow-sm hover:shadow-md"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Déconnexion</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="btn-primary"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}