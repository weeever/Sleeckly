interface SteamGuardEmail {
  isValid: boolean
  code?: string
  username?: string
  location?: string
  timestamp: Date
  suspiciousFlags: string[]
  confidence: number
}

interface EmailContent {
  subject: string
  from: string
  body: string
  headers: { [key: string]: string }
}

class EmailDetectionService {
  private readonly STEAM_DOMAINS = [
    'steampowered.com',
    'valvesoftware.com',
    'help.steampowered.com',
    'store.steampowered.com'
  ]

  private readonly STEAM_GUARD_PATTERNS = {
    code: /\b[A-Z0-9]{4,6}\b/g,
    codeInContext: /(?:Steam Guard|verification|access)\s*(?:code|key)[\s:]*([A-Z0-9]{4,6})/i,
    username: /(?:Hello|Hi|Dear)\s+([a-zA-Z0-9_-]+)/i,
    location: /(?:from|in|at)\s+([A-Za-z\s,]+)(?:\s*\([^)]+\))?/i,
    deviceAttempt: /(?:new|different|unrecognized)\s+(?:device|computer|location)/i
  }

  private readonly REQUIRED_ELEMENTS = [
    'Steam Guard',
    'login',
    'device',
    'code',
    'unauthorized',
    'help.steampowered.com'
  ]

  private readonly SUSPICIOUS_INDICATORS = [
    'urgent',
    'immediate',
    'suspended',
    'verify now',
    'click here',
    'limited time',
    'expires soon'
  ]

  detectSteamGuardEmail(email: EmailContent): SteamGuardEmail {
    const result: SteamGuardEmail = {
      isValid: false,
      suspiciousFlags: [],
      confidence: 0,
      timestamp: new Date()
    }

    try {
      // 1. Validate sender domain
      const senderValidation = this.validateSender(email.from)
      if (!senderValidation.isValid) {
        result.suspiciousFlags.push(...senderValidation.flags)
      }

      // 2. Validate subject line
      const subjectValidation = this.validateSubject(email.subject)
      if (!subjectValidation.isValid) {
        result.suspiciousFlags.push(...subjectValidation.flags)
      }

      // 3. Extract and validate Steam Guard code
      const codeExtraction = this.extractSteamGuardCode(email.body)
      if (codeExtraction.code) {
        result.code = codeExtraction.code
        result.confidence += 30
      } else {
        result.suspiciousFlags.push('No valid Steam Guard code found')
      }

      // 4. Extract username
      const usernameMatch = email.body.match(this.STEAM_GUARD_PATTERNS.username)
      if (usernameMatch) {
        result.username = usernameMatch[1]
        result.confidence += 15
      }

      // 5. Extract location information
      const locationMatch = email.body.match(this.STEAM_GUARD_PATTERNS.location)
      if (locationMatch) {
        result.location = locationMatch[1].trim()
        result.confidence += 10
      }

      // 6. Validate email structure and content
      const structureValidation = this.validateEmailStructure(email.body)
      result.confidence += structureValidation.score
      result.suspiciousFlags.push(...structureValidation.flags)

      // 7. Check for required elements
      const requiredElementsCheck = this.checkRequiredElements(email.body)
      result.confidence += requiredElementsCheck.score
      if (requiredElementsCheck.missing.length > 0) {
        result.suspiciousFlags.push(`Missing required elements: ${requiredElementsCheck.missing.join(', ')}`)
      }

      // 8. Validate links and domains
      const linkValidation = this.validateLinks(email.body)
      result.confidence += linkValidation.score
      result.suspiciousFlags.push(...linkValidation.flags)

      // 9. Check for suspicious content
      const suspiciousContent = this.checkSuspiciousContent(email.body)
      result.suspiciousFlags.push(...suspiciousContent.flags)
      result.confidence -= suspiciousContent.penalty

      // 10. Final validation
      result.isValid = result.confidence >= 70 && result.code !== undefined && result.suspiciousFlags.length < 3
      result.confidence = Math.max(0, Math.min(100, result.confidence))

      return result

    } catch (error) {
      console.error('Error detecting Steam Guard email:', error)
      result.suspiciousFlags.push('Email parsing error')
      return result
    }
  }

  private validateSender(from: string): { isValid: boolean; flags: string[] } {
    const flags: string[] = []
    
    // Extract domain from email
    const emailMatch = from.match(/@([^>\s]+)/i)
    if (!emailMatch) {
      flags.push('Invalid sender email format')
      return { isValid: false, flags }
    }

    const domain = emailMatch[1].toLowerCase()
    
    // Check if domain is in allowed Steam domains
    const isValidDomain = this.STEAM_DOMAINS.some(steamDomain => 
      domain === steamDomain || domain.endsWith('.' + steamDomain)
    )

    if (!isValidDomain) {
      flags.push(`Suspicious sender domain: ${domain}`)
    }

    // Check for common spoofing attempts
    const spoofingPatterns = [
      /steam.*\.com/i,
      /valve.*\.com/i,
      /st[e3][a4]m/i,
      /v[a4]lv[e3]/i
    ]

    spoofingPatterns.forEach(pattern => {
      if (pattern.test(domain) && !isValidDomain) {
        flags.push('Potential domain spoofing detected')
      }
    })

    return { isValid: isValidDomain, flags }
  }

  private validateSubject(subject: string): { isValid: boolean; flags: string[] } {
    const flags: string[] = []
    const normalizedSubject = subject.toLowerCase()

    // Valid Steam Guard subject patterns
    const validPatterns = [
      /steam\s*guard/i,
      /steam.*code/i,
      /verification.*code/i,
      /access.*code/i
    ]

    const hasValidPattern = validPatterns.some(pattern => pattern.test(subject))
    
    if (!hasValidPattern) {
      flags.push('Subject does not match Steam Guard pattern')
    }

    // Check for suspicious subject elements
    const suspiciousSubjectPatterns = [
      /urgent/i,
      /immediate/i,
      /suspended/i,
      /locked/i,
      /verify.*now/i
    ]

    suspiciousSubjectPatterns.forEach(pattern => {
      if (pattern.test(subject)) {
        flags.push('Suspicious urgency language in subject')
      }
    })

    return { isValid: hasValidPattern, flags }
  }

  private extractSteamGuardCode(body: string): { code?: string; confidence: number } {
    // Try context-aware extraction first
    const contextMatch = body.match(this.STEAM_GUARD_PATTERNS.codeInContext)
    if (contextMatch) {
      return { code: contextMatch[1], confidence: 90 }
    }

    // Try general pattern matching
    const codeMatches = body.match(this.STEAM_GUARD_PATTERNS.code)
    if (codeMatches) {
      // Filter out common false positives
      const validCodes = codeMatches.filter(code => {
        // Exclude common non-code patterns
        return !['HTTP', 'HTTPS', 'PORT', 'USER', 'PASS', 'MAIL'].includes(code)
      })

      if (validCodes.length === 1) {
        return { code: validCodes[0], confidence: 80 }
      } else if (validCodes.length > 1) {
        // Multiple codes found - suspicious
        return { confidence: 30 }
      }
    }

    return { confidence: 0 }
  }

  private validateEmailStructure(body: string): { score: number; flags: string[] } {
    let score = 0
    const flags: string[] = []

    // Check for standard Steam email elements
    const structureElements = [
      { pattern: /Hello|Hi|Dear/i, points: 5, name: 'greeting' },
      { pattern: /new.*device|different.*computer/i, points: 10, name: 'device notification' },
      { pattern: /Steam Guard|verification/i, points: 15, name: 'Steam Guard mention' },
      { pattern: /unauthorized.*access/i, points: 10, name: 'security warning' },
      { pattern: /help\.steampowered\.com/i, points: 10, name: 'official help link' },
      { pattern: /Steam Support|Valve Corporation/i, points: 10, name: 'official footer' },
      { pattern: /do not share|keep.*secure/i, points: 5, name: 'security advice' }
    ]

    structureElements.forEach(element => {
      if (element.pattern.test(body)) {
        score += element.points
      } else {
        flags.push(`Missing ${element.name}`)
      }
    })

    // Check email formatting
    if (body.includes('\n') || body.includes('<br>')) {
      score += 5 // Proper line breaks
    }

    if (body.length < 200) {
      flags.push('Email content too short for legitimate Steam email')
      score -= 10
    }

    if (body.length > 5000) {
      flags.push('Email content unusually long')
      score -= 5
    }

    return { score, flags }
  }

  private checkRequiredElements(body: string): { score: number; missing: string[] } {
    let score = 0
    const missing: string[] = []

    this.REQUIRED_ELEMENTS.forEach(element => {
      const regex = new RegExp(element.replace(/\./g, '\\.'), 'i')
      if (regex.test(body)) {
        score += 5
      } else {
        missing.push(element)
      }
    })

    return { score, missing }
  }

  private validateLinks(body: string): { score: number; flags: string[] } {
    let score = 0
    const flags: string[] = []

    // Extract all URLs from the email
    const urlPattern = /https?:\/\/[^\s<>"]+/gi
    const urls = body.match(urlPattern) || []

    if (urls.length === 0) {
      flags.push('No links found in email')
      return { score: 0, flags }
    }

    urls.forEach(url => {
      try {
        const urlObj = new URL(url)
        const domain = urlObj.hostname.toLowerCase()

        // Check if domain is legitimate Steam domain
        const isValidSteamDomain = this.STEAM_DOMAINS.some(steamDomain => 
          domain === steamDomain || domain.endsWith('.' + steamDomain)
        )

        if (isValidSteamDomain) {
          score += 10
        } else {
          flags.push(`Suspicious link domain: ${domain}`)
          score -= 15
        }

        // Check for URL shorteners (suspicious)
        const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly']
        if (shorteners.some(shortener => domain.includes(shortener))) {
          flags.push('URL shortener detected')
          score -= 20
        }

        // Check for suspicious URL patterns
        if (url.includes('steam') && !isValidSteamDomain) {
          flags.push('Potential Steam domain spoofing in URL')
          score -= 25
        }

      } catch (error) {
        flags.push('Malformed URL detected')
        score -= 10
      }
    })

    return { score, flags }
  }

  private checkSuspiciousContent(body: string): { flags: string[]; penalty: number } {
    const flags: string[] = []
    let penalty = 0

    // Check for suspicious phrases
    this.SUSPICIOUS_INDICATORS.forEach(indicator => {
      const regex = new RegExp(indicator, 'i')
      if (regex.test(body)) {
        flags.push(`Suspicious phrase detected: ${indicator}`)
        penalty += 10
      }
    })

    // Check for grammar and spelling issues (basic)
    const grammarIssues = [
      /\b(recieve|seperate|occured|priviledge)\b/i, // Common misspellings
      /[.!?]{2,}/g, // Multiple punctuation
      /\s{3,}/g, // Excessive spaces
    ]

    grammarIssues.forEach(pattern => {
      if (pattern.test(body)) {
        flags.push('Grammar or formatting issues detected')
        penalty += 5
      }
    })

    // Check for excessive capitalization
    const capsWords = body.match(/\b[A-Z]{3,}\b/g) || []
    if (capsWords.length > 5) {
      flags.push('Excessive capitalization detected')
      penalty += 10
    }

    // Check for suspicious attachments mentions
    if (/attachment|download|install/i.test(body)) {
      flags.push('Mentions of attachments or downloads')
      penalty += 15
    }

    return { flags, penalty }
  }

  // Method to simulate email detection for testing
  simulateEmailDetection(): SteamGuardEmail {
    const mockEmails = [
      {
        subject: "Steam Guard Code",
        from: "noreply@steampowered.com",
        body: `Hello testuser,

Someone is trying to sign in to your Steam account from a new device or location.

Steam Guard Code: A7B9X2

Location: Paris, France (192.168.1.1)

If this was you, enter the code above to complete the sign-in. If this wasn't you, please change your password immediately.

For help with unauthorized logins, visit: https://help.steampowered.com/unauthorized

Do not share this code with anyone. Steam will never ask for your Steam Guard code.

Steam Support
Valve Corporation

View this email in your browser: https://store.steampowered.com/email/view/123456`
      },
      {
        subject: "Steam Guard Access Code",
        from: "security@steampowered.com", 
        body: `Hi gamer123,

New device login attempt detected from London, UK.

Your Steam Guard verification code is: K4M8P1

If you did not request this code, someone may be trying to access your account. Please secure your account immediately.

Visit help.steampowered.com for assistance with unauthorized access.

Keep your code secure and do not share it with anyone.

Steam Support Team
Valve Corporation`
      }
    ]

    const randomEmail = mockEmails[Math.floor(Math.random() * mockEmails.length)]
    return this.detectSteamGuardEmail(randomEmail)
  }
}

export const emailDetectionService = new EmailDetectionService()