import { emailDetectionService } from './emailDetectionService'
import { steamCodesService } from '../lib/supabase'
import toast from 'react-hot-toast'

interface MonitoringEvent {
  type: 'code_detected' | 'suspicious_email' | 'monitoring_started' | 'monitoring_stopped' | 'error'
  data?: any
  timestamp: Date
}

class EnhancedMonitoringService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private callbacks: Set<(event: MonitoringEvent) => void> = new Set()
  private lastCheck: Date | null = null
  private codesDetected: number = 0
  private suspiciousEmails: number = 0

  constructor() {
    this.restoreState()
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    window.addEventListener('beforeunload', this.saveState.bind(this))
  }

  async startMonitoring(intervalSeconds: number = 10) {
    if (this.isRunning) {
      console.log('Enhanced monitoring already running')
      return
    }

    this.isRunning = true
    console.log('Starting enhanced Steam Guard monitoring...')

    this.intervalId = setInterval(async () => {
      try {
        await this.checkForSteamGuardEmails()
        this.lastCheck = new Date()
        this.saveState()
      } catch (error) {
        console.error('Error during enhanced monitoring check:', error)
        this.notifyCallbacks({
          type: 'error',
          data: { error: error.message },
          timestamp: new Date()
        })
      }
    }, intervalSeconds * 1000)

    this.notifyCallbacks({
      type: 'monitoring_started',
      data: { interval: intervalSeconds },
      timestamp: new Date()
    })

    this.saveState()
  }

  async stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Enhanced Steam Guard monitoring stopped')

    this.notifyCallbacks({
      type: 'monitoring_stopped',
      timestamp: new Date()
    })

    this.saveState()
  }

  private async checkForSteamGuardEmails() {
    try {
      // Simulate email checking with enhanced detection
      const detectionResult = emailDetectionService.simulateEmailDetection()
      
      if (detectionResult.isValid && detectionResult.code) {
        // Valid Steam Guard email detected
        this.codesDetected++
        
        // Store the code in database
        try {
          await steamCodesService.create({
            code: detectionResult.code,
            steam_account: detectionResult.username || 'Unknown',
            email: 'detected@email.com',
            subject: 'Steam Guard Code',
            detected_at: new Date().toISOString(),
            copied: false
          })

          // Auto-copy to clipboard if enabled
          if (navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(detectionResult.code)
              
              toast.success(`Steam Guard code ${detectionResult.code} detected and copied!`, {
                icon: '🔑',
                duration: 6000,
                style: {
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#059669'
                }
              })
            } catch (clipboardError) {
              console.error('Failed to copy to clipboard:', clipboardError)
            }
          }

          this.notifyCallbacks({
            type: 'code_detected',
            data: {
              code: detectionResult.code,
              username: detectionResult.username,
              location: detectionResult.location,
              confidence: detectionResult.confidence,
              timestamp: detectionResult.timestamp
            },
            timestamp: new Date()
          })

        } catch (dbError) {
          console.error('Failed to store Steam Guard code:', dbError)
        }

      } else if (detectionResult.suspiciousFlags.length > 0) {
        // Suspicious email detected
        this.suspiciousEmails++
        
        toast.error(`Suspicious Steam Guard email detected!`, {
          icon: '⚠️',
          duration: 8000,
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#dc2626'
          }
        })

        this.notifyCallbacks({
          type: 'suspicious_email',
          data: {
            flags: detectionResult.suspiciousFlags,
            confidence: detectionResult.confidence,
            timestamp: detectionResult.timestamp
          },
          timestamp: new Date()
        })
      }

    } catch (error) {
      console.error('Error checking for Steam Guard emails:', error)
      throw error
    }
  }

  subscribe(callback: (event: MonitoringEvent) => void) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  private notifyCallbacks(event: MonitoringEvent) {
    this.callbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in monitoring callback:', error)
      }
    })
  }

  private restoreState() {
    try {
      const savedState = localStorage.getItem('slockly_enhanced_monitoring_state')
      if (savedState) {
        const state = JSON.parse(savedState)
        this.codesDetected = state.codesDetected || 0
        this.suspiciousEmails = state.suspiciousEmails || 0
        this.lastCheck = state.lastCheck ? new Date(state.lastCheck) : null
        
        if (state.isRunning && state.timestamp && (Date.now() - state.timestamp < 30000)) {
          this.startMonitoring(state.interval || 10)
        }
      }
    } catch (error) {
      console.error('Error restoring enhanced monitoring state:', error)
    }
  }

  private saveState() {
    try {
      const state = {
        isRunning: this.isRunning,
        timestamp: Date.now(),
        interval: 10,
        codesDetected: this.codesDetected,
        suspiciousEmails: this.suspiciousEmails,
        lastCheck: this.lastCheck?.toISOString()
      }
      localStorage.setItem('slockly_enhanced_monitoring_state', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving enhanced monitoring state:', error)
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.saveState()
    } else {
      this.restoreState()
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      codesDetected: this.codesDetected,
      suspiciousEmails: this.suspiciousEmails
    }
  }

  isMonitoringActive() {
    return this.isRunning
  }

  // Method to manually test email detection
  async testEmailDetection() {
    const result = emailDetectionService.simulateEmailDetection()
    
    toast.success(`Email Detection Test Complete`, {
      icon: '🧪',
      duration: 5000
    })

    return result
  }
}

export const enhancedMonitoringService = new EnhancedMonitoringService()