import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecurityUtils } from '../utils/security';
import { message } from 'antd';

export const useSecurity = () => {
  const navigate = useNavigate();
  const [isSecureSession, setIsSecureSession] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Initialize security measures
  useEffect(() => {
    initializeSecurity();
    
    return () => {
      SecurityUtils.SessionSecurity.destroySession();
    };
  }, []);

  const initializeSecurity = useCallback(() => {
    // Generate CSRF token
    SecurityUtils.CSRFProtection.generateToken();

    // Initialize session security
    SecurityUtils.SessionSecurity.initializeSessionSecurity(
      () => {
        setSessionWarning(true);
        message.warning({
          content: 'Your session will expire soon. Please continue your activity to maintain your session.',
          duration: 10,
          key: 'session-warning',
        });
      },
      () => {
        setIsSecureSession(false);
        message.error({
          content: 'Your session has expired for security reasons. Please log in again.',
          duration: 5,
          key: 'session-expired',
        });
        handleSessionTimeout();
      }
    );

    // Listen for CSP violations
    document.addEventListener('securitypolicyviolation', (event) => {
      SecurityUtils.CSPHelper.reportViolation({
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
      });
    });

  }, []);

  const handleSessionTimeout = useCallback(() => {
    // Clear all sensitive data
    SecurityUtils.SessionSecurity.destroySession();
    
    // Redirect to login
    navigate('/login', { 
      replace: true,
      state: { reason: 'session_timeout' }
    });
  }, [navigate]);

  const extendSession = useCallback(() => {
    setSessionWarning(false);
    message.destroy('session-warning');
    
    // Re-initialize session timers
    initializeSecurity();
  }, [initializeSecurity]);

  // Secure API call wrapper
  const secureApiCall = useCallback(async (
    apiCall: () => Promise<any>,
    options: { requireCSRF?: boolean; validateResponse?: boolean } = {}
  ) => {
    try {
      const { requireCSRF = true, validateResponse = true } = options;
      
      // Add CSRF token if required
      if (requireCSRF) {
        const csrfToken = SecurityUtils.CSRFProtection.getToken();
        if (!csrfToken) {
          throw new Error('CSRF token missing');
        }
      }

      const response = await apiCall();

      // Validate security headers if it's a Response object
      if (validateResponse && response instanceof Response) {
        SecurityUtils.SecurityHeadersValidator.validateResponse(response);
      }

      return response;
    } catch (error) {
      console.error('Secure API call failed:', error);
      throw error;
    }
  }, []);

  // Secure form submission
  const secureFormSubmit = useCallback(async (
    formData: any,
    submitFunction: (data: any) => Promise<any>
  ) => {
    try {
      // Validate and sanitize form data
      const sanitizedData = { ...formData };
      
      Object.keys(sanitizedData).forEach(key => {
        if (typeof sanitizedData[key] === 'string') {
          // XSS protection
          sanitizedData[key] = SecurityUtils.XSSProtection.sanitizeHtml(sanitizedData[key]);
          
          // Input validation
          if (!SecurityUtils.XSSProtection.validateInput(sanitizedData[key])) {
            throw new Error(`Invalid input detected in field: ${key}`);
          }
        }
      });

      // Add CSRF token
      sanitizedData._csrf = SecurityUtils.CSRFProtection.getToken();

      return await submitFunction(sanitizedData);
    } catch (error) {
      message.error('Form submission failed due to security validation');
      throw error;
    }
  }, []);

  // Secure file upload
  const secureFileUpload = useCallback((
    file: File,
    allowedTypes: string[],
    maxSize: number = 5 * 1024 * 1024 // 5MB default
  ) => {
    const validation = SecurityUtils.InputValidator.validateFileUpload(
      file,
      allowedTypes,
      maxSize
    );

    if (!validation.isValid) {
      message.error(validation.error);
      return false;
    }

    // Additional security checks
    const sanitizedName = SecurityUtils.InputValidator.sanitizeFileName(file.name);
    if (sanitizedName !== file.name) {
      message.warning('File name was sanitized for security reasons');
    }

    return true;
  }, []);

  // Password strength checker
  const checkPasswordStrength = useCallback((password: string) => {
    return SecurityUtils.InputValidator.validatePassword(password);
  }, []);

  // Secure data storage
  const storeSecureData = useCallback(async (key: string, data: any) => {
    try {
      const serializedData = JSON.stringify(data);
      await SecurityUtils.SecureStorage.setSecureItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Secure storage failed:', error);
      message.error('Failed to store sensitive data securely');
      return false;
    }
  }, []);

  const getSecureData = useCallback(async (key: string) => {
    try {
      const data = await SecurityUtils.SecureStorage.getSecureItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Secure data retrieval failed:', error);
      return null;
    }
  }, []);

  // Security event handlers
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Page is hidden - pause sensitive operations
      console.log('Page hidden - pausing sensitive operations');
    } else {
      // Page is visible - resume operations
      console.log('Page visible - resuming operations');
      // Refresh CSRF token when page becomes visible
      SecurityUtils.CSRFProtection.generateToken();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    // State
    isSecureSession,
    sessionWarning,
    
    // Methods
    extendSession,
    secureApiCall,
    secureFormSubmit,
    secureFileUpload,
    checkPasswordStrength,
    storeSecureData,
    getSecureData,
    
    // Utilities
    sanitizeInput: SecurityUtils.XSSProtection.sanitizeHtml,
    escapeHtml: SecurityUtils.XSSProtection.escapeHtml,
    validateEmail: SecurityUtils.InputValidator.validateEmail,
    validatePhone: SecurityUtils.InputValidator.validatePhone,
  };
};

// Hook for CSRF token management
export const useCSRFToken = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get or generate CSRF token
    let csrfToken = SecurityUtils.CSRFProtection.getToken();
    if (!csrfToken) {
      csrfToken = SecurityUtils.CSRFProtection.generateToken();
    }
    setToken(csrfToken);
  }, []);

  const refreshToken = useCallback(() => {
    const newToken = SecurityUtils.CSRFProtection.generateToken();
    setToken(newToken);
    return newToken;
  }, []);

  return { token, refreshToken };
};