import { steamAccountsService } from '../lib/supabase'
import toast from 'react-hot-toast'

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
  imported: any[]
}

export interface ParsedAccount {
  username: string
  password: string
  email: string
  steam_id?: string
  lineNumber: number
  raw: string
}

class BulkImportService {
  async importFromText(text: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      imported: []
    }

    try {
      const lines = text.split('\n').filter(line => line.trim())
      const parsedAccounts = this.parseAccounts(lines)
      
      if (parsedAccounts.length === 0) {
        throw new Error('Aucun compte valide trouvé dans le fichier')
      }

      // Validate all accounts first
      const validationErrors = this.validateAccounts(parsedAccounts)
      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors)
        result.failed = parsedAccounts.length
        return result
      }

      // Import accounts one by one
      for (const account of parsedAccounts) {
        try {
          const imported = await steamAccountsService.create({
            username: account.username,
            password: account.password,
            email: account.email,
            steam_id: account.steam_id
          })
          
          result.imported.push(imported)
          result.success++
          
          toast.success(`Compte ${account.username} importé avec succès`, {
            icon: '✅'
          })
        } catch (error: any) {
          result.failed++
          const errorMsg = `Ligne ${account.lineNumber}: ${error.message}`
          result.errors.push(errorMsg)
          
          toast.error(`Erreur ligne ${account.lineNumber}: ${error.message}`, {
            icon: '❌'
          })
        }
      }

      return result
    } catch (error: any) {
      result.errors.push(error.message)
      result.failed = 1
      return result
    }
  }

  async importFromFile(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string
          const result = await this.importFromText(text)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'))
      }
      
      reader.readAsText(file, 'utf-8')
    })
  }

  private parseAccounts(lines: string[]): ParsedAccount[] {
    const accounts: ParsedAccount[] = []
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return // Skip empty lines and comments
      
      const parts = trimmed.split('/')
      if (parts.length < 3) return // Need at least username/password/email
      
      const account: ParsedAccount = {
        username: parts[0]?.trim() || '',
        password: parts[1]?.trim() || '',
        email: parts[2]?.trim() || '',
        steam_id: parts[3]?.trim() || undefined,
        lineNumber: index + 1,
        raw: trimmed
      }
      
      accounts.push(account)
    })
    
    return accounts
  }

  private validateAccounts(accounts: ParsedAccount[]): string[] {
    const errors: string[] = []
    const usernameSet = new Set<string>()
    const emailSet = new Set<string>()
    
    accounts.forEach(account => {
      // Validate username
      if (!account.username) {
        errors.push(`Ligne ${account.lineNumber}: Nom d'utilisateur manquant`)
      } else if (account.username.length < 3 || account.username.length > 50) {
        errors.push(`Ligne ${account.lineNumber}: Nom d'utilisateur doit contenir 3-50 caractères`)
      } else if (!/^[a-zA-Z0-9_-]+$/.test(account.username)) {
        errors.push(`Ligne ${account.lineNumber}: Nom d'utilisateur contient des caractères invalides`)
      } else if (usernameSet.has(account.username)) {
        errors.push(`Ligne ${account.lineNumber}: Nom d'utilisateur "${account.username}" en double`)
      } else {
        usernameSet.add(account.username)
      }
      
      // Validate password
      if (!account.password) {
        errors.push(`Ligne ${account.lineNumber}: Mot de passe manquant`)
      } else if (account.password.length < 6) {
        errors.push(`Ligne ${account.lineNumber}: Mot de passe trop court (minimum 6 caractères)`)
      }
      
      // Validate email
      if (!account.email) {
        errors.push(`Ligne ${account.lineNumber}: Email manquant`)
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
        errors.push(`Ligne ${account.lineNumber}: Format d'email invalide`)
      } else if (emailSet.has(account.email)) {
        errors.push(`Ligne ${account.lineNumber}: Email "${account.email}" en double`)
      } else {
        emailSet.add(account.email)
      }
      
      // Validate Steam ID (optional)
      if (account.steam_id && !/^\d{17}$/.test(account.steam_id)) {
        errors.push(`Ligne ${account.lineNumber}: Steam ID invalide (doit contenir 17 chiffres)`)
      }
    })
    
    return errors
  }

  generateTemplate(): string {
    return `# Format d'import des comptes Steam
# Format: username/password/email/steamID(optionnel)
# Exemple:
fqgqi83240/Okami16052004./atomicheart@weeever.shop/76561199701775709
testuser/password123/test@example.com
anotheruser/mypassword/user@domain.com/76561198000000000

# Instructions:
# - Une ligne par compte
# - Séparez les champs par des barres obliques (/)
# - Le Steam ID est optionnel
# - Les lignes commençant par # sont ignorées
# - Les lignes vides sont ignorées`
  }
}

export const bulkImportService = new BulkImportService()