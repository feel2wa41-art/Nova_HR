import * as crypto from 'crypto'
import { app } from 'electron'
import Store from 'electron-store'
import { ApiService } from './ApiService'

export interface StoredCredentials {
  email: string
  hashedPassword: string
  apiToken: string
  refreshToken?: string
  savedAt: string
  expiresAt?: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

export class SecureCredentialService {
  private readonly SERVICE_NAME = 'Nova-HR-Desktop-Agent'
  private readonly ACCOUNT_NAME = 'user_credentials'
  private readonly ENCRYPTION_KEY_NAME = 'encryption_key'
  
  private store: Store
  private apiService: ApiService
  private encryptionKey: string

  constructor(store: Store, apiService: ApiService) {
    this.store = store
    this.apiService = apiService
    this.encryptionKey = this.getOrCreateEncryptionKey()
  }

  // Generate or retrieve encryption key
  private getOrCreateEncryptionKey(): string {
    try {
      // Try to get existing key from store
      const existingKey = this.store.get(this.ENCRYPTION_KEY_NAME) as string
      
      if (existingKey) {
        return existingKey
      }

      // Generate new key
      const newKey = crypto.randomBytes(32).toString('hex')
      this.store.set(this.ENCRYPTION_KEY_NAME, newKey)
      
      console.log('New encryption key generated and stored')
      return newKey
    } catch (error) {
      console.error('Failed to manage encryption key:', error)
      // Fallback to a deterministic key (less secure but functional)
      return crypto.createHash('sha256').update(app.getName() + app.getVersion()).digest('hex')
    }
  }

  // Encrypt sensitive data
  private encrypt(text: string): string {
    try {
      const algorithm = 'aes-256-cbc'
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
      const iv = crypto.randomBytes(16)
      
      const cipher = crypto.createCipheriv(algorithm, key, iv)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      return iv.toString('hex') + ':' + encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  // Decrypt sensitive data
  private decrypt(encryptedText: string): string {
    try {
      const algorithm = 'aes-256-cbc'
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
      
      const parts = encryptedText.split(':')
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  // Save login credentials securely
  async saveCredentials(credentials: LoginCredentials & { apiToken: string; refreshToken?: string }): Promise<boolean> {
    try {
      if (!credentials.rememberMe) {
        console.log('Remember me not enabled, credentials will not be saved')
        return true
      }

      // Hash password for storage (using crypto instead of bcrypt)
      const hashedPassword = crypto.createHash('sha256').update(credentials.password + this.encryptionKey).digest('hex')
      
      // Create credentials object
      const credentialsToStore: StoredCredentials = {
        email: credentials.email,
        hashedPassword: hashedPassword,
        apiToken: credentials.apiToken,
        refreshToken: credentials.refreshToken,
        savedAt: new Date().toISOString(),
        expiresAt: credentials.refreshToken ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days
          undefined
      }

      // Store encrypted credentials in app storage
      try {
        const encryptedCredentials = this.encrypt(JSON.stringify(credentialsToStore))
        this.store.set('auth_credentials', encryptedCredentials)
        console.log('Encrypted credentials saved')
      } catch (encryptError) {
        console.warn('Failed to save encrypted credentials:', encryptError)
      }

      // Store basic info (non-sensitive) for quick access
      this.store.set('last_login', {
        email: credentials.email,
        hasRememberedCredentials: true,
        lastLoginAt: new Date().toISOString()
      })

      return true
    } catch (error) {
      console.error('Failed to save credentials:', error)
      return false
    }
  }

  // Retrieve stored credentials
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      // Get encrypted credentials from store
      let credentialsJson: string | null = null
      
      try {
        const encryptedCredentials = this.store.get('auth_credentials') as string
        if (encryptedCredentials) {
          credentialsJson = this.decrypt(encryptedCredentials)
          console.log('Credentials retrieved from encrypted storage')
        }
      } catch (decryptError) {
        console.warn('Failed to decrypt credentials:', decryptError)
      }

      if (!credentialsJson) {
        return null
      }

      const credentials: StoredCredentials = JSON.parse(credentialsJson)
      
      // Check expiration
      if (credentials.expiresAt && new Date(credentials.expiresAt) < new Date()) {
        console.log('Stored credentials have expired')
        await this.clearStoredCredentials()
        return null
      }

      return credentials
    } catch (error) {
      console.error('Failed to retrieve stored credentials:', error)
      return null
    }
  }

  // Attempt automatic login with stored credentials
  async attemptAutoLogin(): Promise<{
    success: boolean
    user?: any
    needsReauth?: boolean
    error?: string
  }> {
    try {
      const storedCredentials = await this.getStoredCredentials()
      
      if (!storedCredentials) {
        return { 
          success: false, 
          error: 'No stored credentials found' 
        }
      }

      console.log('Attempting auto-login for:', storedCredentials.email)

      // First try to use the stored API token
      if (storedCredentials.apiToken) {
        try {
          // Validate the stored token
          const response = await this.apiService.get('/auth/profile')
          
          if (response.success) {
            console.log('Auto-login successful with stored token')
            return {
              success: true,
              user: response.data
            }
          }
        } catch (tokenError) {
          console.log('Stored token is invalid, attempting refresh')
        }
      }

      // Try to refresh token if available
      if (storedCredentials.refreshToken) {
        try {
          const refreshResponse = await this.apiService.post('/auth/refresh', {
            refreshToken: storedCredentials.refreshToken
          })

          if (refreshResponse.success) {
            console.log('Token refresh successful')
            
            // Update stored credentials with new tokens
            await this.updateStoredTokens(
              refreshResponse.data.accessToken,
              refreshResponse.data.refreshToken
            )

            return {
              success: true,
              user: refreshResponse.data.user
            }
          }
        } catch (refreshError) {
          console.log('Token refresh failed:', refreshError)
        }
      }

      // If tokens don't work, we need reauthentication
      return {
        success: false,
        needsReauth: true,
        error: 'Stored credentials need reauthentication'
      }

    } catch (error: any) {
      console.error('Auto-login failed:', error)
      return {
        success: false,
        error: error.message || 'Auto-login failed'
      }
    }
  }

  // Validate stored password against provided password
  async validateStoredPassword(providedPassword: string): Promise<boolean> {
    try {
      const storedCredentials = await this.getStoredCredentials()
      
      if (!storedCredentials) {
        return false
      }

      // Compare password using crypto hash
      const providedHash = crypto.createHash('sha256').update(providedPassword + this.encryptionKey).digest('hex')
      return providedHash === storedCredentials.hashedPassword
    } catch (error) {
      console.error('Password validation failed:', error)
      return false
    }
  }

  // Update stored tokens without changing password
  async updateStoredTokens(apiToken: string, refreshToken?: string): Promise<boolean> {
    try {
      const storedCredentials = await this.getStoredCredentials()
      
      if (!storedCredentials) {
        console.warn('No stored credentials to update')
        return false
      }

      const updatedCredentials: StoredCredentials = {
        ...storedCredentials,
        apiToken,
        refreshToken: refreshToken || storedCredentials.refreshToken,
        savedAt: new Date().toISOString()
      }

      // Update encrypted credentials
      try {
        const encryptedCredentials = this.encrypt(JSON.stringify(updatedCredentials))
        this.store.set('auth_credentials', encryptedCredentials)
      } catch (encryptError) {
        console.warn('Failed to update encrypted credentials:', encryptError)
      }

      console.log('Stored tokens updated successfully')
      return true
    } catch (error) {
      console.error('Failed to update stored tokens:', error)
      return false
    }
  }

  // Clear stored credentials
  async clearStoredCredentials(): Promise<boolean> {
    try {
      // Remove encrypted credentials
      this.store.delete('auth_credentials')

      // Clear last login info
      this.store.delete('last_login')

      console.log('All stored credentials cleared')
      return true
    } catch (error) {
      console.error('Failed to clear credentials:', error)
      return false
    }
  }

  // Get basic login info (non-sensitive)
  getLastLoginInfo(): {
    email?: string
    hasRememberedCredentials: boolean
    lastLoginAt?: string
  } {
    return this.store.get('last_login', {
      hasRememberedCredentials: false
    }) as {
      email?: string
      hasRememberedCredentials: boolean
      lastLoginAt?: string
    }
  }

  // Check if credentials are stored
  async hasStoredCredentials(): Promise<boolean> {
    try {
      const credentials = await this.getStoredCredentials()
      return credentials !== null
    } catch (error) {
      return false
    }
  }

  // Store credentials (simple method for login)
  async storeCredentials(email: string, _password: string): Promise<boolean> {
    try {
      // For simplicity, just store email in last_login
      this.store.set('last_login', {
        email: email,
        hasRememberedCredentials: true,
        lastLoginAt: new Date().toISOString()
      })
      
      console.log('Credentials stored for:', email)
      return true
    } catch (error) {
      console.error('Failed to store credentials:', error)
      return false
    }
  }

  // Get saved credentials for auto-fill
  async getSavedCredentials(): Promise<{ email?: string; password?: string } | null> {
    try {
      const lastLogin = this.store.get('last_login') as any
      if (lastLogin && lastLogin.email) {
        return {
          email: lastLogin.email,
          password: '' // Don't pre-fill password for security
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get saved credentials:', error)
      return null
    }
  }

  // Test credential storage system
  async testCredentialSystem(): Promise<{
    encryptionWorking: boolean
    canSaveRetrieve: boolean
    error?: string
  }> {
    try {
      // Test encryption
      let encryptionWorking = false
      try {
        const testData = 'test-encryption-data'
        const encrypted = this.encrypt(testData)
        const decrypted = this.decrypt(encrypted)
        encryptionWorking = decrypted === testData
      } catch (error) {
        console.warn('Encryption test failed:', error)
      }

      // Test full save/retrieve cycle
      let canSaveRetrieve = false
      try {
        const testCredentials: StoredCredentials = {
          email: 'test@example.com',
          hashedPassword: crypto.createHash('sha256').update('testpassword' + this.encryptionKey).digest('hex'),
          apiToken: 'test-token',
          savedAt: new Date().toISOString()
        }

        // Test with encrypted storage
        const encrypted = this.encrypt(JSON.stringify(testCredentials))
        this.store.set('test_credentials', encrypted)
        const retrieved = this.store.get('test_credentials') as string
        const decrypted = this.decrypt(retrieved)
        const parsed = JSON.parse(decrypted)
        canSaveRetrieve = parsed.email === testCredentials.email
        this.store.delete('test_credentials')
      } catch (error) {
        console.warn('Save/retrieve test failed:', error)
      }

      return {
        encryptionWorking,
        canSaveRetrieve
      }
    } catch (error: any) {
      return {
        encryptionWorking: false,
        canSaveRetrieve: false,
        error: error.message
      }
    }
  }

  // Get credential storage info
  getStorageInfo(): {
    serviceName: string
    accountName: string
    hasEncryptionKey: boolean
    storageLocation: string
  } {
    return {
      serviceName: this.SERVICE_NAME,
      accountName: this.ACCOUNT_NAME,
      hasEncryptionKey: !!this.encryptionKey,
      storageLocation: this.store.path
    }
  }
}