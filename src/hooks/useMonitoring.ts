import { useState, useEffect } from 'react'
import { globalMonitoringService } from '../services/monitoringService'
import toast from 'react-hot-toast'

export const useMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [codesDetected, setCodesDetected] = useState(0)

  useEffect(() => {
    // Get initial status
    const status = globalMonitoringService.getStatus()
    setIsMonitoring(status.isRunning)
    setLastCheck(status.lastCheck)
    setCodesDetected(status.codesDetected)

    // Subscribe to monitoring events
    const unsubscribe = globalMonitoringService.subscribe((data) => {
      switch (data.type) {
        case 'monitoring_started':
          setIsMonitoring(true)
          toast.success('Surveillance démarrée !', { icon: '🚀' })
          break
        
        case 'monitoring_stopped':
          setIsMonitoring(false)
          toast.success('Surveillance arrêtée', { icon: '⏹️' })
          break
        
        case 'status_update':
          setLastCheck(data.lastCheck)
          setCodesDetected(data.codesDetected)
          break
        
        case 'code_detected':
          setCodesDetected(data.total)
          toast.success(`Nouveau code Steam Guard détecté : ${data.code}`, {
            icon: '🔑',
            duration: 6000
          })
          break
        
        case 'code_copied':
          toast.success('Code copié automatiquement !', { icon: '📋' })
          break
        
        case 'error':
          toast.error(`Erreur de surveillance: ${data.error}`)
          break
      }
    })

    return unsubscribe
  }, [])

  const startMonitoring = async () => {
    try {
      await globalMonitoringService.startMonitoring(10)
    } catch (error) {
      toast.error('Erreur lors du démarrage de la surveillance')
    }
  }

  const stopMonitoring = async () => {
    try {
      await globalMonitoringService.stopMonitoring()
    } catch (error) {
      toast.error('Erreur lors de l\'arrêt de la surveillance')
    }
  }

  return {
    isMonitoring,
    lastCheck,
    codesDetected,
    startMonitoring,
    stopMonitoring
  }
}