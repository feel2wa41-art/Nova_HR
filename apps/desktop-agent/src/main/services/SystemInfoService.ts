import * as si from 'systeminformation'
import { ApiService, ApiResponse } from './ApiService'

export interface ProcessInfo {
  name: string
  pid: number
  cpu: number
  memory: number // in MB
  started: string
  command?: string
  priority?: number
}

export interface NetworkInfo {
  current: {
    ssid?: string
    bssid?: string
    signalLevel?: number
    security?: string[]
    channel?: number
    timestamp: string
  }
  interface: {
    ip4?: string
    ip6?: string
    mac?: string
    internal?: boolean
    operstate?: string
  }
  stats?: {
    rxSpeed?: number
    txSpeed?: number
    rx_bytes?: number
    tx_bytes?: number
  }
}

export interface SystemStats {
  cpu: {
    manufacturer: string
    brand: string
    speed: number
    cores: number
    load: number
  }
  memory: {
    total: number
    used: number
    available: number
    usage: number
  }
  osInfo: {
    platform: string
    distro: string
    release: string
    arch: string
    hostname: string
  }
}

export class SystemInfoService {
  private apiService: ApiService
  private processCollectionInterval: NodeJS.Timeout | null = null
  private networkCollectionInterval: NodeJS.Timeout | null = null
  
  constructor(apiService: ApiService) {
    this.apiService = apiService
  }

  // Process information collection
  async getRunningProcesses(): Promise<ProcessInfo[]> {
    try {
      const processes = await si.processes()
      
      return processes.list
        .filter(proc => proc.name && proc.name !== 'System Idle Process' && proc.cpu !== undefined)
        .map(proc => ({
          name: proc.name,
          pid: proc.pid,
          cpu: parseFloat((proc.cpu || 0).toFixed(1)),
          memory: parseFloat(((proc.mem_rss || 0) / 1024 / 1024).toFixed(1)),
          started: proc.started ? new Date(proc.started).toLocaleString('ko-KR') : '',
          command: proc.command || undefined,
          priority: proc.priority || undefined
        }))
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 50) // Top 50 processes by CPU usage
    } catch (error) {
      console.error('Error getting processes:', error)
      return []
    }
  }

  // Network information collection  
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [wifiConnections, networkInterfaces, networkStats] = await Promise.all([
        si.wifiConnections().catch(() => []),
        si.networkInterfaces().catch(() => []),
        si.networkStats().catch(() => [])
      ])

      const primaryInterface = networkInterfaces.find(iface => 
        !iface.internal && (iface.ip4 || iface.ip6)
      ) || networkInterfaces[0]

      const currentWifi = wifiConnections[0]
      const primaryStats = networkStats[0]

      return {
        current: {
          ssid: currentWifi?.ssid,
          bssid: currentWifi?.bssid,
          signalLevel: currentWifi?.signalLevel,
          security: currentWifi?.security,
          channel: currentWifi?.channel,
          timestamp: new Date().toISOString()
        },
        interface: {
          ip4: primaryInterface?.ip4,
          ip6: primaryInterface?.ip6,
          mac: primaryInterface?.mac,
          internal: primaryInterface?.internal,
          operstate: primaryInterface?.operstate
        },
        stats: primaryStats ? {
          rxSpeed: primaryStats.rx_sec,
          txSpeed: primaryStats.tx_sec,
          rx_bytes: primaryStats.rx_bytes,
          tx_bytes: primaryStats.tx_bytes
        } : undefined
      }
    } catch (error) {
      console.error('Error getting network info:', error)
      return {
        current: {
          timestamp: new Date().toISOString()
        },
        interface: {}
      }
    }
  }

  // System statistics
  async getSystemStats(): Promise<SystemStats> {
    try {
      const [cpu, mem, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo()
      ])

      const currentLoad = await si.currentLoad()

      return {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          speed: cpu.speed,
          cores: cpu.cores,
          load: parseFloat((currentLoad.currentload || 0).toFixed(1))
        },
        memory: {
          total: Math.round(mem.total / 1024 / 1024), // MB
          used: Math.round(mem.used / 1024 / 1024),
          available: Math.round(mem.available / 1024 / 1024),
          usage: parseFloat(((mem.used / mem.total) * 100).toFixed(1))
        },
        osInfo: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          hostname: osInfo.hostname
        }
      }
    } catch (error) {
      console.error('Error getting system stats:', error)
      return {
        cpu: {
          manufacturer: 'Unknown',
          brand: 'Unknown',
          speed: 0,
          cores: 0,
          load: 0
        },
        memory: {
          total: 0,
          used: 0,
          available: 0,
          usage: 0
        },
        osInfo: {
          platform: process.platform,
          distro: 'Unknown',
          release: process.version,
          arch: process.arch,
          hostname: 'Unknown'
        }
      }
    }
  }

  // Send process data to server
  async submitProcessData(processes: ProcessInfo[]): Promise<ApiResponse> {
    try {
      const systemStats = await this.getSystemStats()
      
      const processData = {
        processes: processes,
        systemStats: systemStats,
        collectedAt: new Date().toISOString(),
        collectionType: 'automatic' // or 'manual', 'idle-triggered'
      }

      return await this.apiService.post('/attitude/processes', processData)
    } catch (error: any) {
      console.error('Error submitting process data:', error)
      return {
        success: false,
        error: error.message || 'Failed to submit process data'
      }
    }
  }

  // Send network data to server
  async submitNetworkData(networkInfo: NetworkInfo): Promise<ApiResponse> {
    try {
      const networkData = {
        networkInfo: networkInfo,
        location: this.determineLocation(networkInfo.current.ssid),
        collectedAt: new Date().toISOString()
      }

      return await this.apiService.post('/attitude/network', networkData)
    } catch (error: any) {
      console.error('Error submitting network data:', error)
      return {
        success: false,
        error: error.message || 'Failed to submit network data'
      }
    }
  }

  // Determine work location based on WiFi SSID
  private determineLocation(ssid?: string): 'OFFICE' | 'REMOTE' | 'UNKNOWN' {
    if (!ssid) return 'UNKNOWN'
    
    // Common office WiFi patterns (can be configured per company)
    const officeNetworks = [
      'Office_WiFi', 'Company_5G', 'Office_LAN', 'Corporate_WiFi',
      'OFFICE', 'CORP', 'WORK', '회사', '사무실'
    ]
    
    const ssidUpper = ssid.toUpperCase()
    const isOffice = officeNetworks.some(pattern => 
      ssidUpper.includes(pattern.toUpperCase())
    )
    
    return isOffice ? 'OFFICE' : 'REMOTE'
  }

  // Start automatic process collection
  startProcessCollection(intervalMinutes: number = 10): void {
    if (this.processCollectionInterval) {
      clearInterval(this.processCollectionInterval)
    }

    console.log(`Starting process collection every ${intervalMinutes} minutes`)
    
    // Immediate collection
    this.collectAndSubmitProcesses()
    
    // Set up interval
    this.processCollectionInterval = setInterval(() => {
      this.collectAndSubmitProcesses()
    }, intervalMinutes * 60 * 1000)
  }

  // Start automatic network monitoring  
  startNetworkMonitoring(intervalMinutes: number = 5): void {
    if (this.networkCollectionInterval) {
      clearInterval(this.networkCollectionInterval)
    }

    console.log(`Starting network monitoring every ${intervalMinutes} minutes`)
    
    // Immediate collection
    this.collectAndSubmitNetworkInfo()
    
    // Set up interval
    this.networkCollectionInterval = setInterval(() => {
      this.collectAndSubmitNetworkInfo()
    }, intervalMinutes * 60 * 1000)
  }

  // Stop all collections
  stopAllCollections(): void {
    if (this.processCollectionInterval) {
      clearInterval(this.processCollectionInterval)
      this.processCollectionInterval = null
      console.log('Stopped process collection')
    }
    
    if (this.networkCollectionInterval) {
      clearInterval(this.networkCollectionInterval)
      this.networkCollectionInterval = null
      console.log('Stopped network monitoring')
    }
  }

  // Manual process collection trigger
  async collectAndSubmitProcesses(): Promise<ApiResponse> {
    try {
      console.log('Collecting process information...')
      const processes = await this.getRunningProcesses()
      
      if (processes.length > 0) {
        const result = await this.submitProcessData(processes)
        console.log(`Process data submitted: ${processes.length} processes`)
        return result
      } else {
        console.log('No processes found to submit')
        return { success: true, data: { message: 'No processes found' } }
      }
    } catch (error: any) {
      console.error('Error in collectAndSubmitProcesses:', error)
      return {
        success: false,
        error: error.message || 'Process collection failed'
      }
    }
  }

  // Manual network info collection trigger
  async collectAndSubmitNetworkInfo(): Promise<ApiResponse> {
    try {
      console.log('Collecting network information...')
      const networkInfo = await this.getNetworkInfo()
      
      const result = await this.submitNetworkData(networkInfo)
      console.log(`Network data submitted: ${networkInfo.current.ssid || 'Unknown network'}`)
      return result
    } catch (error: any) {
      console.error('Error in collectAndSubmitNetworkInfo:', error)
      return {
        success: false,
        error: error.message || 'Network collection failed'
      }
    }
  }

  // Get current system health for UI display
  async getSystemHealthSummary(): Promise<{
    processes: number
    cpuUsage: number
    memoryUsage: number
    networkStatus: string
    lastUpdate: string
  }> {
    try {
      const [processes, systemStats, networkInfo] = await Promise.all([
        this.getRunningProcesses(),
        this.getSystemStats(),
        this.getNetworkInfo()
      ])

      return {
        processes: processes.length,
        cpuUsage: systemStats.cpu.load,
        memoryUsage: systemStats.memory.usage,
        networkStatus: networkInfo.current.ssid ? 
          `${networkInfo.current.ssid} (${this.determineLocation(networkInfo.current.ssid)})` : 
          'No network',
        lastUpdate: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting system health summary:', error)
      return {
        processes: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        networkStatus: 'Error',
        lastUpdate: new Date().toISOString()
      }
    }
  }
}