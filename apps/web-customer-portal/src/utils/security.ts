/**
 * Frontend Security Utilities for Nova HR
 * Implements client-side security best practices
 */

// XSS Protection
export class XSSProtection {
  private static readonly ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
  private static readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
    /onmouseover=/gi,
  ];

  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;

    // Remove dangerous patterns
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Only allow specific HTML tags
    sanitized = sanitized.replace(/<(\/?[^>]+)>/g, (match, tag) => {
      const tagName = tag.toLowerCase().split(' ')[0].replace('/', '');
      if (this.ALLOWED_TAGS.includes(tagName)) {
        return match;
      }
      return '';
    });

    return sanitized.trim();
  }

  static escapeHtml(input: string): string {
    if (!input || typeof input !== 'string') return '';

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  static validateInput(input: string, maxLength: number = 1000): boolean {
    if (!input) return true;
    
    if (input.length > maxLength) return false;
    
    // Check for suspicious patterns
    return !this.DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
  }
}

// CSRF Protection
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'nova_hr_csrf_token';
  
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    sessionStorage.setItem(this.TOKEN_KEY, token);
    return token;
  }

  static getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return storedToken === token && token.length === 64;
  }

  static clearToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }
}

// Secure Storage
export class SecureStorage {
  private static readonly ENCRYPTION_KEY_KEY = 'nova_hr_enc_key';
  
  private static async generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private static async getOrCreateKey(): Promise<CryptoKey> {
    const stored = localStorage.getItem(this.ENCRYPTION_KEY_KEY);
    
    if (stored) {
      try {
        const keyData = JSON.parse(stored);
        return await crypto.subtle.importKey(
          'jwk',
          keyData,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('Failed to load encryption key, generating new one');
      }
    }

    const key = await this.generateEncryptionKey();
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(this.ENCRYPTION_KEY_KEY, JSON.stringify(exportedKey));
    
    return key;
  }

  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const cryptoKey = await this.getOrCreateKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encodedValue = new TextEncoder().encode(value);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedValue
      );

      const encryptedData = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };

      sessionStorage.setItem(`secure_${key}`, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Secure storage encryption failed:', error);
      throw new Error('Failed to store sensitive data securely');
    }
  }

  static async getSecureItem(key: string): Promise<string | null> {
    try {
      const stored = sessionStorage.getItem(`secure_${key}`);
      if (!stored) return null;

      const { iv, data } = JSON.parse(stored);
      const cryptoKey = await this.getOrCreateKey();

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        cryptoKey,
        new Uint8Array(data)
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Secure storage decryption failed:', error);
      return null;
    }
  }

  static removeSecureItem(key: string): void {
    sessionStorage.removeItem(`secure_${key}`);
  }

  static clearSecureStorage(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        sessionStorage.removeItem(key);
      }
    });
    localStorage.removeItem(this.ENCRYPTION_KEY_KEY);
  }
}

// Input Validation
export class InputValidator {
  static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  static readonly PHONE_PATTERN = /^[\+]?[1-9][\d]{0,15}$/;
  static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  static validateEmail(email: string): boolean {
    return this.EMAIL_PATTERN.test(email) && email.length <= 254;
  }

  static validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return this.PHONE_PATTERN.test(cleaned) && cleaned.length >= 10 && cleaned.length <= 15;
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeFileName(fileName: string): string {
    // Remove or replace dangerous characters
    return fileName
      .replace(/[^a-zA-Z0-9.\-_]/g, '')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  static validateFileUpload(file: File, allowedTypes: string[], maxSize: number): { isValid: boolean; error?: string } {
    if (file.size > maxSize) {
      return { isValid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    // Additional security checks
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];
    const fileName = file.name.toLowerCase();
    
    if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
      return { isValid: false, error: 'Potentially dangerous file type' };
    }

    return { isValid: true };
  }
}

// Session Security
export class SessionSecurity {
  private static readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes
  private static inactivityTimer: NodeJS.Timeout | null = null;
  private static warningTimer: NodeJS.Timeout | null = null;

  static initializeSessionSecurity(onWarning: () => void, onTimeout: () => void): void {
    this.resetInactivityTimer(onWarning, onTimeout);

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => this.resetInactivityTimer(onWarning, onTimeout);
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Check for multiple tabs/windows
    this.checkMultipleInstances();
  }

  private static resetInactivityTimer(onWarning: () => void, onTimeout: () => void): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    this.warningTimer = setTimeout(onWarning, this.WARNING_TIMEOUT);
    this.inactivityTimer = setTimeout(onTimeout, this.INACTIVITY_TIMEOUT);
  }

  private static checkMultipleInstances(): void {
    const instanceId = Date.now().toString();
    sessionStorage.setItem('nova_hr_instance', instanceId);

    setInterval(() => {
      const currentInstance = sessionStorage.getItem('nova_hr_instance');
      if (currentInstance !== instanceId) {
        console.warn('Multiple instances detected');
        // Handle multiple instance scenario
      }
    }, 5000);
  }

  static destroySession(): void {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);
    
    SecureStorage.clearSecureStorage();
    CSRFProtection.clearToken();
    sessionStorage.clear();
  }
}

// Content Security Policy Helper
export class CSPHelper {
  static getNonce(): string {
    const meta = document.querySelector('meta[name="csp-nonce"]');
    return meta?.getAttribute('content') || '';
  }

  static reportViolation(violationReport: any): void {
    // Send CSP violation reports to server for monitoring
    fetch('/api/v1/security/csp-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report: violationReport,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(error => {
      console.error('Failed to send CSP violation report:', error);
    });
  }
}

// Security Headers Validation
export class SecurityHeadersValidator {
  static validateResponse(response: Response): void {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    const warnings: string[] = [];

    requiredHeaders.forEach(header => {
      if (!response.headers.get(header)) {
        warnings.push(`Missing security header: ${header}`);
      }
    });

    if (warnings.length > 0) {
      console.warn('Security header warnings:', warnings);
    }
  }
}

// Export all utilities
export const SecurityUtils = {
  XSSProtection,
  CSRFProtection,
  SecureStorage,
  InputValidator,
  SessionSecurity,
  CSPHelper,
  SecurityHeadersValidator,
};