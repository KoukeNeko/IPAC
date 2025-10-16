export type HostStatus = 'online' | 'offline' | 'idle'

export type HostType = 'physical' | 'vm'

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
  hostType?: HostType
  parentHostId?: string // 如果是 VM，指向實體機的 ID
  vmCount?: number // 如果是實體機，記錄上面的 VM 數量
  rackId?: string // 所屬機櫃 ID
  rackPosition?: number // 在機櫃中的 U 位（1-42）
  rackUnits?: number // 佔用的 U 數（通常 1U, 2U, 4U）
}

export interface Rack {
  id: string
  name: string
  location: string
  totalUnits: number // 總 U 數，通常是 42U
  usedUnits: number
  powerCapacity: number // 電力容量（瓦）
  description?: string
  color?: string
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
