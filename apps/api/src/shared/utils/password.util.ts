export class PasswordUtil {
  /**
   * 임시 비밀번호 생성
   * 8자리: 대문자(2) + 소문자(2) + 숫자(2) + 특수문자(2)
   */
  static generateTempPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*';

    let password = '';

    // 각 카테고리에서 필수 문자 선택
    for (let i = 0; i < 2; i++) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += specialChars[Math.floor(Math.random() * specialChars.length)];
    }

    // 문자열 섞기
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * 비밀번호 강도 검증
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('대문자를 최소 1개 포함해야 합니다.');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('소문자를 최소 1개 포함해야 합니다.');
    }

    if (!/\d/.test(password)) {
      errors.push('숫자를 최소 1개 포함해야 합니다.');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('특수문자를 최소 1개 포함해야 합니다.');
    }

    // 연속된 문자나 반복 문자 체크
    if (this.hasSequentialChars(password)) {
      errors.push('연속된 문자는 사용할 수 없습니다.');
    }

    if (this.hasRepeatingChars(password)) {
      errors.push('동일한 문자가 3번 이상 반복될 수 없습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 연속된 문자 체크 (abc, 123 등)
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const sequential = sequence.substr(i, 3);
        if (password.includes(sequential)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 반복 문자 체크 (aaa, 111 등)
   */
  private static hasRepeatingChars(password: string): boolean {
    for (let i = 0; i <= password.length - 3; i++) {
      const char = password[i];
      if (password[i + 1] === char && password[i + 2] === char) {
        return true;
      }
    }

    return false;
  }

  /**
   * 일반적인 취약한 비밀번호 체크
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '123456', '123456789', '12345678',
      'qwerty', 'abc123', 'admin', 'admin123', 'welcome', 'welcome123',
      '1234567890', 'password1', 'qwerty123', 'letmein', 'monkey',
      '111111', '123123', '1234', '12345'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 비밀번호 만료일 계산 (90일 후)
   */
  static getPasswordExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    return expiryDate;
  }
}