import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Settings {
  screenshotInterval: number
  activityTracking: boolean
  startMinimized: boolean
  autoStart: boolean
  uploadQuality: number
  screenshotEnabled: boolean
  notificationsEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'ko' | 'en'
  autoCheckIn: boolean
  idleThreshold: number
}

interface SettingsContextType {
  settings: Settings
  loading: boolean
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>
  resetSettings: () => Promise<void>
}

const defaultSettings: Settings = {
  screenshotInterval: 300000, // 5 minutes
  activityTracking: true,
  startMinimized: false,
  autoStart: false,
  uploadQuality: 80,
  screenshotEnabled: true,
  notificationsEnabled: true,
  theme: 'system',
  language: 'ko',
  autoCheckIn: false,
  idleThreshold: 300000 // 5 minutes
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.electronAPI.settings.get()
        if (savedSettings) {
          setSettings({ ...defaultSettings, ...savedSettings })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    try {
      await window.electronAPI.settings.set(newSettings)
    } catch (error) {
      console.error('Failed to save setting:', error)
      // Revert on error
      setSettings(settings)
    }
  }

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    
    try {
      await window.electronAPI.settings.set(updatedSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
      // Revert on error
      setSettings(settings)
    }
  }

  const resetSettings = async () => {
    setSettings(defaultSettings)
    
    try {
      await window.electronAPI.settings.set(defaultSettings)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  const value: SettingsContextType = {
    settings,
    loading,
    updateSetting,
    updateSettings,
    resetSettings
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}