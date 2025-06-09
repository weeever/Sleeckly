import { useState, useEffect } from 'react'
import { enhancedMonitoringService } from '../services/enhancedMonitoringService'
import toast from 'react-hot-toast'

export const useEnhancedMonitoring = () => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [codesDetected, setCodesDetected] = useState(0)
  const [suspiciousEmails, setSuspiciousEmails] = useState(0)

  useEffect(() => {
    // Get initial status
    const status = enhancedMonitoringService.getStatus()
    setIsMonitoring(status.isRunning)
    setLastCheck(status.lastCheck)
    setCodesDetected(status.codesDetected)
    setSuspiciousEmails(status.suspiciousEmails)

    // Subscribe to monitoring events
    const unsubscribe = enhancedMonitoringService.subscribe((event) => {
      switch (event.type) {
        case 'monitoring_started':
          setIsMonitoring(true)
          toast.success('Enhanced Steam Guard monitoring started!', { 
            icon: '🚀',
            style: {
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#059669'
            }
          })
          break
        
        case 'monitoring_stopped':
          setIsMonitoring(false)
          toast.success('Steam Guard monitoring stopped', { 
            icon: '⏹️',
            style: {
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              color: '#6b7280'
            }
          })
          break
        
        case 'code_detected':
          setCodesDetected(event.data.total || codesDetected + 1)
          setLastCheck(new Date())
          
          // Show detailed notification for code detection
          toast.success(
            <div>
              <div className="font-semibold">Steam Guard Code Detected!</div>
              <div className="text-sm">Code: {event.data.code}</div>
              {event.data.username && <div className="text-sm">User: {event.data.username}</div>}
              {event.data.location && <div className="text-sm">Location: {event.data.location}</div>}
              <div className="text-xs mt-1">Confidence: {event.data.confidence}%</div>
            </div>,
            {
              icon: '🔑',
              duration: 8000,
              style: {
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#059669'
              }
            }
          )
          break
        
        case 'suspicious_email':
          setSuspiciousEmails(prev => prev + 1)
          
          // Show warning for suspicious email
          toast.error(
            <div>
              <div className="font-semibold">Suspicious Email Detected!</div>
              <div className="text-sm">Confidence: {event.data.confidence}%</div>
              <div className="text-xs mt-1">
                Flags: {event.data.flags.slice(0, 2).join(', ')}
                {event.data.flags.length > 2 && ` +${event.data.flags.length - 2} more`}
              </div>
            </div>,
            {
              icon: '⚠️',
              duration: 10000,
              style: {
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626'
              }
            }
          )
          break
        
        case 'error':
          toast.error(`Monitoring error: ${event.data.error}`, {
            icon: '❌',
            duration: 6000
          })
          break
      }
    })

    return unsubscribe
  }, [])

  const startMonitoring = async () => {
    try {
      await enhancedMonitoringService.startMonitoring(10)
    } catch (error) {
      toast.error('Failed to start enhanced monitoring')
    }
  }

  const stopMonitoring = async () => {
    try {
      await enhancedMonitoringService.stopMonitoring()
    } catch (error) {
      toast.error('Failed to stop enhanced monitoring')
    }
  }

  const testEmailDetection = async () => {
    try {
      const result = await enhancedMonitoringService.testEmailDetection()
      
      toast.success(
        <div>
          <div className="font-semibold">Email Detection Test Results</div>
          <div className="text-sm">Valid: {result.isValid ? 'Yes' : 'No'}</div>
          <div className="text-sm">Confidence: {result.confidence}%</div>
          {result.code && <div className="text-sm">Code: {result.code}</div>}
          {result.suspiciousFlags.length > 0 && (
            <div className="text-xs mt-1">
              Flags: {result.suspiciousFlags.slice(0, 2).join(', ')}
            </div>
          )}
        </div>,
        {
          icon: '🧪',
          duration: 8000
        }
      )
      
      return result
    } catch (error) {
      toast.error('Failed to test email detection')
      throw error
    }
  }

  return {
    isMonitoring,
    lastCheck,
    codesDetected,
    suspiciousEmails,
    startMonitoring,
    stopMonitoring,
    testEmailDetection
  }
}