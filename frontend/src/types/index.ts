export type HostStatus = 'online' | 'offline' | 'idle'

export type ServiceType =
  | 'Web'
  | 'Database'
  | 'Application'
  | 'File'
  | 'Monitoring'
  | 'Security'
  | 'Other'

export interface HostTag {
  id: string
  label: string
  color: string
}

export interface Host {
  id: string
  hostname: string
  ipAddress: string
  macAddress: string
  subnetId: string
  subnetName: string
  status: HostStatus
  serviceType: ServiceType
  os: string
  lastSeenAt: string
  description?: string
  tags: HostTag[]
}

export interface Subnet {
  id: string
  name: string
  cidr: string
  description?: string
  totalHosts: number
  usedHosts: number
  color: string
  tags?: string[]
}

export interface SubnetWithHosts extends Subnet {
  hosts: Host[]
}

export interface DashboardOverview {
  totalIps: number
  onlineHosts: number
  offlineHosts: number
  conflictCount: number
  utilizationBySubnet: Array<{
    subnetId: string
    subnetName: string
    usage: number
  }>
  recentHosts: {
    online: Host[]
    offline: Host[]
  }
  serviceDistribution: Array<{
    type: ServiceType
    count: number
  }>
}

export interface ReportFilter {
  dateRange: {
    from: string
    to: string
  }
  type: 'usage' | 'security' | 'inventory'
  includeDetails: boolean
}
