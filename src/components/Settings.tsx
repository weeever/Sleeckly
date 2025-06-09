import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Volume2, Copy, Clock, Save } from 'lucide-react';

interface AppSettings {
  notifications: boolean;
  sound: boolean;
  autoCopy: boolean;
  checkInterval: number;
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  startMinimized: boolean;
  closeToTray: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    sound: true,
    autoCopy: true,
    checkInterval: 10,
    theme: 'light',
    language: 'fr',
    startMinimized: false,
    closeToTray: true
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Paramètres</h2>
          </div>
          <button
            onClick={saveSettings}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saved ? 'Sauvegardé !' : 'Sauvegarder'}</span>
          </button>
        </div>

        <div className="space-y-8">
          {/* Notifications */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <span>Notifications</span>
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifications desktop</p>
                  <p className="text-sm text-gray-600">Afficher les notifications lors de la détection de codes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sons de notification</p>
                  <p className="text-sm text-gray-600">Jouer un son lors de la détection de codes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sound}
                    onChange={(e) => handleSettingChange('sound', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Automatisation */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <Copy className="w-5 h-5 text-blue-600" />
              <span>Automatisation</span>
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Copie automatique</p>
                  <p className="text-sm text-gray-600">Copier automatiquement les codes dans le presse-papier</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoCopy}
                    onChange={(e) => handleSettingChange('autoCopy', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">Intervalle de vérification</p>
                    <p className="text-sm text-gray-600">Fréquence de vérification des emails (en secondes)</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">{settings.checkInterval}s</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.checkInterval}
                  onChange={(e) => handleSettingChange('checkInterval', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5s</span>
                  <span>30s</span>
                  <span>60s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interface */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              <span>Interface</span>
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Thème</p>
                  <p className="text-sm text-gray-600">Apparence de l'application</p>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                  <option value="auto">Automatique</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Langue</p>
                  <p className="text-sm text-gray-600">Langue de l'interface</p>
                </div>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Comportement de l'application */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              <span>Comportement</span>
            </h3>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Démarrer réduit</p>
                  <p className="text-sm text-gray-600">Démarrer l'application en mode réduit</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.startMinimized}
                    onChange={(e) => handleSettingChange('startMinimized', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Réduire dans la barre système</p>
                  <p className="text-sm text-gray-600">Réduire dans la barre système au lieu de fermer</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.closeToTray}
                    onChange={(e) => handleSettingChange('closeToTray', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Informations sur l'application */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-lg font-medium mb-4">À propos</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Steam Monitor</p>
                <p className="text-gray-600">Version 1.0.0</p>
              </div>
              <div>
                <p className="font-medium">Surveillance automatique</p>
                <p className="text-gray-600">Codes Steam Guard par email</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;