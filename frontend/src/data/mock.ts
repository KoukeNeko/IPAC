import { subDays } from 'date-fns'
import type { DashboardOverview, Host, SubnetWithHosts } from '@/types'

const now = new Date()

export const mockHosts: Host[] = [
  {
    id: 'host-001',
    hostname: 'web-gateway-01',
    ipAddress: '10.10.0.12',
    macAddress: '00:1A:2B:3C:4D:5E',
    subnetId: 'subnet-a',
    subnetName: '辦公室內網 A',
    status: 'online',
    serviceType: 'Web',
    os: 'Ubuntu 22.04',
    lastSeenAt: subDays(now, 0).toISOString(),
    description: '核心 Web API 服務',
    tags: [
      { id: 'prod', label: 'Production', color: '#2563EB' },
      { id: 'critical', label: 'Critical', color: '#DC2626' },
    ],
  },
  {
    id: 'host-002',
    hostname: 'db-primary',
    ipAddress: '10.10.0.50',
    macAddress: '00:1A:2B:3C:4D:5F',
    subnetId: 'subnet-a',
    subnetName: '辦公室內網 A',
    status: 'online',
    serviceType: 'Database',
    os: 'Rocky Linux 9',
    lastSeenAt: subDays(now, 0.3).toISOString(),
    description: 'PostgreSQL Cluster 節點',
    tags: [
      { id: 'db', label: 'Database', color: '#7C3AED' },
    ],
  },
  {
    id: 'host-003',
    hostname: 'nas-backup-01',
    ipAddress: '10.20.10.10',
    macAddress: '00:1A:2B:3C:4D:60',
    subnetId: 'subnet-b',
    subnetName: '資料中心 B',
    status: 'offline',
    serviceType: 'File',
    os: 'TrueNAS 13',
    lastSeenAt: subDays(now, 1.6).toISOString(),
    description: '夜間備份 NAS',
    tags: [
      { id: 'backup', label: 'Backup', color: '#0EA5E9' },
    ],
  },
  {
    id: 'host-004',
    hostname: 'monitor-core',
    ipAddress: '10.10.0.99',
    macAddress: '00:1A:2B:3C:4D:61',
    subnetId: 'subnet-a',
    subnetName: '辦公室內網 A',
    status: 'online',
    serviceType: 'Monitoring',
    os: 'Debian 12',
    lastSeenAt: subDays(now, 0.1).toISOString(),
    tags: [{ id: 'observability', label: 'Observability', color: '#16A34A' }],
  },
  {
    id: 'host-005',
    hostname: 'iot-gateway',
    ipAddress: '172.16.0.30',
    macAddress: '00:1A:2B:3C:4D:62',
    subnetId: 'subnet-c',
    subnetName: 'IoT 管理網段',
    status: 'offline',
    serviceType: 'Application',
    os: 'Ubuntu Core',
    lastSeenAt: subDays(now, 0.8).toISOString(),
    description: 'IoT 裝置管理閘道器',
    tags: [{ id: 'iot', label: 'IoT', color: '#F97316' }],
  },
  {
    id: 'host-006',
    hostname: 'security-hub',
    ipAddress: '172.16.0.40',
    macAddress: '00:1A:2B:3C:4D:63',
    subnetId: 'subnet-c',
    subnetName: 'IoT 管理網段',
    status: 'online',
    serviceType: 'Security',
    os: 'AlmaLinux 9',
    lastSeenAt: subDays(now, 0.05).toISOString(),
    tags: [{ id: 'security', label: 'Security', color: '#F43F5E' }],
  },
]

export const mockSubnets: SubnetWithHosts[] = [
  {
    id: 'subnet-a',
    name: '辦公室內網 A',
    cidr: '10.10.0.0/24',
    description: '主要辦公室核心網段',
    totalHosts: 254,
    usedHosts: 180,
    color: '#2563EB',
    hosts: mockHosts.filter((host) => host.subnetId === 'subnet-a'),
  },
  {
    id: 'subnet-b',
    name: '資料中心 B',
    cidr: '10.20.10.0/24',
    description: '備援資料中心與備份設備',
    totalHosts: 254,
    usedHosts: 150,
    color: '#7C3AED',
    hosts: mockHosts.filter((host) => host.subnetId === 'subnet-b'),
  },
  {
    id: 'subnet-c',
    name: 'IoT 管理網段',
    cidr: '172.16.0.0/24',
    description: 'IoT 與 OT 裝置專用網段',
    totalHosts: 254,
    usedHosts: 120,
    color: '#F97316',
    hosts: mockHosts.filter((host) => host.subnetId === 'subnet-c'),
  },
]

export const mockDashboard: DashboardOverview = {
  totalIps: mockSubnets.reduce((sum, subnet) => sum + subnet.totalHosts, 0),
  onlineHosts: mockHosts.filter((host) => host.status === 'online').length,
  offlineHosts: mockHosts.filter((host) => host.status !== 'online').length,
  conflictCount: 2,
  utilizationBySubnet: mockSubnets.map((subnet) => ({
    subnetId: subnet.id,
    subnetName: subnet.name,
    usage: Math.round((subnet.usedHosts / subnet.totalHosts) * 100),
  })),
  recentHosts: {
    online: mockHosts.filter((host) => host.status === 'online').slice(0, 5),
    offline: mockHosts.filter((host) => host.status !== 'online').slice(0, 5),
  },
  serviceDistribution: [
    { type: 'Web', count: 12 },
    { type: 'Database', count: 7 },
    { type: 'Monitoring', count: 5 },
    { type: 'File', count: 3 },
    { type: 'Security', count: 4 },
    { type: 'Application', count: 6 },
  ],
}

export const mockReports = [
  {
    id: 'report-1',
    type: 'usage',
    generatedAt: subDays(now, 1).toISOString(),
    summary: '網段使用率整體穩定，IoT 管理網段使用率成長 12%。',
  },
  {
    id: 'report-2',
    type: 'security',
    generatedAt: subDays(now, 3).toISOString(),
    summary: '偵測到 2 個潛在 IP 衝突與 4 次未授權存取。',
  },
  {
    id: 'report-3',
    type: 'inventory',
    generatedAt: subDays(now, 7).toISOString(),
    summary: '新增 8 台主機，移除 4 台離線超過 30 天的設備。',
  },
]

export function createMockReportExport(type: string) {
  return `Report Type: ${type}\nGenerated At: ${new Date().toISOString()}\nSummary: This is a mock export.`
}
