// Global monitoring service that persists across page navigation
class GlobalMonitoringService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning: boolean = false
  private callbacks: Set<(data: any) => void> = new Set()
  private lastCheck: Date | null = null
  private codesDetected: number = 0

  constructor() {
    // Restore monitoring state from localStorage on initialization
    this.restoreState()
    
    // Listen for page visibility changes to maintain monitoring
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    
    // Listen for beforeunload to save state
    window.addEventListener('beforeunload', this.saveState.bind(this))
  }

  private restoreState() {
    try {
      const savedState = localStorage.getItem('slockly_monitoring_state')
      if (savedState) {
        const state = JSON.parse(savedState)
        if (state.isRunning && state.timestamp && (Date.now() - state.timestamp < 30000)) {
          // Resume monitoring if it was active less than 30 seconds ago
          this.startMonitoring(state.interval || 10)
        }
      }
    } catch (error) {
      console.error('Error restoring monitoring state:', error)
    }
  }

  private saveState() {
    try {
      const state = {
        isRunning: this.isRunning,
        timestamp: Date.now(),
        interval: 10,
        codesDetected: this.codesDetected
      }
      localStorage.setItem('slockly_monitoring_state', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving monitoring state:', error)
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, save state
      this.saveState()
    } else {
      // Page is visible, restore monitoring if needed
      this.restoreState()
    }
  }

  async startMonitoring(intervalSeconds: number = 10) {
    if (this.isRunning) {
      console.log('Monitoring already running')
      return
    }

    this.isRunning = true
    console.log('Starting global email monitoring...')

    this.intervalId = setInterval(async () => {
      try {
        await this.checkForNewCodes()
        this.lastCheck = new Date()
        this.notifyCallbacks({ 
          type: 'status_update', 
          lastCheck: this.lastCheck,
          isRunning: this.isRunning,
          codesDetected: this.codesDetected
        })
      } catch (error) {
        console.error('Error during monitoring check:', error)
        this.notifyCallbacks({ 
          type: 'error', 
          error: error.message 
        })
      }
    }, intervalSeconds * 1000)

    this.saveState()
    this.notifyCallbacks({ 
      type: 'monitoring_started', 
      interval: intervalSeconds 
    })
  }

  async stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Global email monitoring stopped')

    this.saveState()
    this.notifyCallbacks({ 
      type: 'monitoring_stopped' 
    })
  }

  private async checkForNewCodes() {
    // Simulate code detection (5% chance)
    if (Math.random() < 0.05) {
      const mockCode = Math.random().toString(36).substring(2, 7).toUpperCase()
      this.codesDetected++
      
      this.notifyCallbacks({
        type: 'code_detected',
        code: mockCode,
        timestamp: new Date().toISOString(),
        total: this.codesDetected
      })

      // Auto-copy to clipboard
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(mockCode)
          this.notifyCallbacks({
            type: 'code_copied',
            code: mockCode
          })
        } catch (error) {
          console.error('Failed to copy to clipboard:', error)
        }
      }

      return mockCode
    }
    return null
  }

  subscribe(callback: (data: any) => void) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  private notifyCallbacks(data: any) {
    this.callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in monitoring callback:', error)
      }
    })
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      codesDetected: this.codesDetected
    }
  }

  isMonitoringActive() {
    return this.isRunning
  }
}

// Create global instance
export const globalMonitoringService = new GlobalMonitoringService()