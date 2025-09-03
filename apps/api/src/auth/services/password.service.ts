import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;
  private readonly pepperSecret: string;

  constructor(private configService: ConfigService) {
    this.pepperSecret = this.configService.get('DATA_ENCRYPTION_KEY', '');
  }

  async hashPassword(password: string): Promise<string> {
    // Add pepper for additional security
    const pepperedPassword = this.addPepper(password);
    
    // Hash with bcrypt
    const hash = await bcrypt.hash(pepperedPassword, this.saltRounds);
    
    return hash;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const pepperedPassword = this.addPepper(password);
      return await bcrypt.compare(pepperedPassword, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    // Character type checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common password checks
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a stronger password');
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters (e.g., 123, abc)');
    }

    // Repeated characters check
    if (this.hasRepeatedChars(password)) {
      errors.push('Password should not contain too many repeated characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashResetToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private addPepper(password: string): string {
    if (!this.pepperSecret) {
      return password;
    }
    
    return crypto
      .createHmac('sha256', this.pepperSecret)
      .update(password)
      .digest('hex') + password;
  }

  private getRandomChar(chars: string): string {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  private isCommonPassword(password: string): boolean {
    // List of common passwords (this should be much more comprehensive in production)
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome',
      'monkey', 'dragon', 'master', 'hello', 'login',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  private hasSequentialChars(password: string): boolean {
    const sequences = [
      '0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop',
      'asdfghjkl', 'zxcvbnm', '9876543210', 'zyxwvutsrqponmlkjihgfedcba'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq)) {
          return true;
        }
      }
    }

    return false;
  }

  private hasRepeatedChars(password: string): boolean {
    // Check for more than 2 consecutive repeated characters
    return /(.)\1{2,}/.test(password);
  }

  // Password history check (implement with database)
  async isPasswordInHistory(userId: string, newPassword: string, historyLimit: number = 5): Promise<boolean> {
    // TODO: Implement password history check with database
    // This should check the last N passwords for the user
    return false; // Placeholder
  }

  // Calculate password strength score
  calculatePasswordStrength(password: string): { score: number; level: string; feedback: string[] } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character diversity
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;

    // Additional complexity
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 10;

    // Penalties
    if (this.isCommonPassword(password)) score -= 20;
    if (this.hasSequentialChars(password)) score -= 10;
    if (this.hasRepeatedChars(password)) score -= 10;

    // Determine level
    let level: string;
    if (score < 30) {
      level = 'Very Weak';
      feedback.push('Consider using a longer password with mixed characters');
    } else if (score < 50) {
      level = 'Weak';
      feedback.push('Add more character types and avoid common patterns');
    } else if (score < 70) {
      level = 'Fair';
      feedback.push('Good start, consider adding more complexity');
    } else if (score < 85) {
      level = 'Strong';
      feedback.push('Good password strength');
    } else {
      level = 'Very Strong';
      feedback.push('Excellent password strength');
    }

    return { score: Math.max(0, Math.min(100, score)), level, feedback };
  }
}