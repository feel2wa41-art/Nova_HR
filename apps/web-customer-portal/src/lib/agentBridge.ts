/**
 * Desktop Agent Bridge for web portal
 * Handles communication between web portal and desktop agent
 */

interface DesktopAgentAPI {
  // Check if desktop agent is running
  isAgentRunning(): Promise<boolean>;
  
  // Send authentication token to agent
  sendAuthToken(token: string, user: any): Promise<{ success: boolean; message?: string }>;
  
  // Check agent status
  getAgentStatus(): Promise<{
    isRunning: boolean;
    isAuthenticated: boolean;
    version?: string;
    status?: string;
  }>;
  
  // Start monitoring session remotely
  startMonitoring(): Promise<{ success: boolean; message?: string }>;
  
  // Stop monitoring session remotely
  stopMonitoring(): Promise<{ success: boolean; message?: string }>;
  
  // Check system permissions
  getPermissions(): Promise<{
    hasScreenRecording: boolean;
    hasAccessibility: boolean;
    isElevated: boolean;
    platform: string;
    statusMessage: string;
    hasAllPermissions: boolean;
    recommendations: string[];
  }>;
  
  // Shutdown desktop agent remotely
  shutdownAgent(): Promise<{ success: boolean; message?: string }>;
}

class AgentBridge implements DesktopAgentAPI {
  private agentPort = 45123; // Default port for agent communication
  private agentUrl = `http://localhost:${this.agentPort}`;
  private fallbackPorts = [45124, 45125, 45126]; // Try multiple ports

  /**
   * Find active agent port and update agentUrl
   */
  private async findActivePort(): Promise<boolean> {
    // Try default port first
    try {
      const response = await fetch(`http://localhost:${this.agentPort}/ping`, {
        method: 'GET',
        timeout: 2000
      } as RequestInit);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Continue to fallback ports
    }

    // Try fallback ports
    for (const port of this.fallbackPorts) {
      try {
        const response = await fetch(`http://localhost:${port}/ping`, {
          method: 'GET',
          timeout: 2000
        } as RequestInit);
        if (response.ok) {
          console.log(`Found agent on port ${port}`);
          this.agentPort = port;
          this.agentUrl = `http://localhost:${port}`;
          return true;
        }
      } catch (error) {
        // Continue trying other ports
      }
    }

    return false;
  }

  /**
   * Check if desktop agent is running by attempting to connect
   */
  async isAgentRunning(): Promise<boolean> {
    try {
      return await this.findActivePort();
    } catch (error) {
      console.log('Desktop agent is not running or not responding');
      return false;
    }
  }

  /**
   * Send authentication token to desktop agent
   */
  async sendAuthToken(token: string, user: any): Promise<{ success: boolean; message?: string }> {
    try {
      if (!await this.isAgentRunning()) {
        return { success: false, message: 'Desktop agent is not running' };
      }

      const response = await fetch(`${this.agentUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          user,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: result.message || 'Authentication successful' };
      } else {
        return { success: false, message: 'Failed to authenticate with agent' };
      }
    } catch (error) {
      console.error('Failed to send auth token to agent:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current agent status
   */
  async getAgentStatus(): Promise<{
    isRunning: boolean;
    isAuthenticated: boolean;
    version?: string;
    status?: string;
  }> {
    try {
      const isRunning = await this.isAgentRunning();
      if (!isRunning) {
        return { isRunning: false, isAuthenticated: false };
      }

      const response = await fetch(`${this.agentUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const status = await response.json();
        return {
          isRunning: true,
          isAuthenticated: status.isAuthenticated || false,
          version: status.version,
          status: status.status
        };
      } else {
        return { isRunning: true, isAuthenticated: false };
      }
    } catch (error) {
      console.error('Failed to get agent status:', error);
      return { isRunning: false, isAuthenticated: false };
    }
  }

  /**
   * Start monitoring session on agent
   */
  async startMonitoring(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!await this.isAgentRunning()) {
        return { success: false, message: 'Desktop agent is not running' };
      }

      const response = await fetch(`${this.agentUrl}/monitoring/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: result.message || 'Monitoring started' };
      } else {
        const error = await response.text();
        return { success: false, message: error || 'Failed to start monitoring' };
      }
    } catch (error) {
      console.error('Failed to start monitoring on agent:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Stop monitoring session on agent
   */
  async stopMonitoring(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!await this.isAgentRunning()) {
        return { success: false, message: 'Desktop agent is not running' };
      }

      const response = await fetch(`${this.agentUrl}/monitoring/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: result.message || 'Monitoring stopped' };
      } else {
        const error = await response.text();
        return { success: false, message: error || 'Failed to stop monitoring' };
      }
    } catch (error) {
      console.error('Failed to stop monitoring on agent:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Alternative method: Try to launch desktop agent
   * This would open the agent if it's installed
   */
  async launchAgent(): Promise<{ success: boolean; message?: string }> {
    try {
      // Try to open the agent using protocol handler or file system
      // This is a fallback method if direct communication fails
      
      // For development, we can try to detect if the agent executable exists
      // and provide instructions for manual launch
      
      return {
        success: false,
        message: 'Please start the Nova HR Desktop Agent manually from your Start Menu or Desktop shortcut'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Could not launch desktop agent automatically'
      };
    }
  }

  /**
   * Get system permissions status
   */
  async getPermissions(): Promise<{
    hasScreenRecording: boolean;
    hasAccessibility: boolean;
    isElevated: boolean;
    platform: string;
    statusMessage: string;
    hasAllPermissions: boolean;
    recommendations: string[];
  }> {
    try {
      if (!await this.isAgentRunning()) {
        return {
          hasScreenRecording: false,
          hasAccessibility: false,
          isElevated: false,
          platform: 'unknown',
          statusMessage: 'Desktop agent is not running',
          hasAllPermissions: false,
          recommendations: ['Please start the Nova HR Desktop Agent first']
        };
      }

      const response = await fetch(`${this.agentUrl}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const permissions = await response.json();
        return permissions;
      } else {
        throw new Error('Failed to get permissions from agent');
      }
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return {
        hasScreenRecording: false,
        hasAccessibility: false,
        isElevated: false,
        platform: 'unknown',
        statusMessage: 'Failed to check permissions',
        hasAllPermissions: false,
        recommendations: ['Could not communicate with desktop agent']
      };
    }
  }

  /**
   * Shutdown desktop agent remotely
   */
  async shutdownAgent(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!await this.isAgentRunning()) {
        return { success: false, message: 'Desktop agent is not running' };
      }

      const response = await fetch(`${this.agentUrl}/shutdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: result.message || 'Agent shutdown successfully' };
      } else {
        const error = await response.text();
        return { success: false, message: error || 'Failed to shutdown agent' };
      }
    } catch (error) {
      console.error('Failed to shutdown agent:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Create singleton instance
export const agentBridge = new AgentBridge();

// Export types
export type { DesktopAgentAPI };

// Utility functions
export const AgentUtils = {
  /**
   * Auto-authenticate agent when user logs in to web portal
   */
  async autoAuthenticateAgent(token: string, user: any): Promise<boolean> {
    console.log('Attempting to auto-authenticate desktop agent...');
    
    const result = await agentBridge.sendAuthToken(token, user);
    if (result.success) {
      console.log('✅ Desktop agent authenticated successfully');
      return true;
    } else {
      console.warn('⚠️ Could not authenticate desktop agent:', result.message);
      return false;
    }
  },

  /**
   * Check if agent is properly set up and authenticated
   */
  async verifyAgentSetup(): Promise<{
    isInstalled: boolean;
    isRunning: boolean;
    isAuthenticated: boolean;
    message: string;
  }> {
    const status = await agentBridge.getAgentStatus();
    
    if (!status.isRunning) {
      return {
        isInstalled: false, // We assume it's not installed if not running
        isRunning: false,
        isAuthenticated: false,
        message: 'Desktop agent is not running. Please start the Nova HR Desktop Agent.'
      };
    }

    if (!status.isAuthenticated) {
      return {
        isInstalled: true,
        isRunning: true,
        isAuthenticated: false,
        message: 'Desktop agent is running but not authenticated. Please log in through the agent.'
      };
    }

    return {
      isInstalled: true,
      isRunning: true,
      isAuthenticated: true,
      message: 'Desktop agent is properly configured and ready for monitoring.'
    };
  }
};