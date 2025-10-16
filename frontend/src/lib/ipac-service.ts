import { apiClient } from './api-client'
import { mockDashboard, mockHosts, mockSubnets } from '@/data/mock'
import type { DashboardOverview, Host, ReportFilter, SubnetWithHosts } from '@/types'

export async function getDashboardOverview(): Promise<DashboardOverview> {
  try {
    const { data } = await apiClient.get<DashboardOverview>('/dashboard/overview')
    return data
  } catch (error) {
    console.warn('[dashboard overview] fallback to mock data', error)
    return mockDashboard
  }
}

export async function getSubnets(): Promise<SubnetWithHosts[]> {
  try {
    const { data } = await apiClient.get<SubnetWithHosts[]>('/subnets')
    return data
  } catch (error) {
    console.warn('[subnets] fallback to mock data', error)
    return mockSubnets
  }
}

export async function createOrUpdateSubnet(payload: Partial<SubnetWithHosts>) {
  if (payload.id) {
    await apiClient.put(`/subnets/${payload.id}`, payload)
  } else {
    await apiClient.post('/subnets', payload)
  }
}

export async function deleteSubnet(id: string) {
  await apiClient.delete(`/subnets/${id}`)
}

export async function getHosts(params?: Record<string, string | string[] | undefined>): Promise<Host[]> {
  try {
    const { data } = await apiClient.get<Host[]>('/hosts', { params })
    return data
  } catch (error) {
    console.warn('[hosts] fallback to mock data', error)
    return mockHosts
  }
}

export async function createOrUpdateHost(payload: Partial<Host>) {
  if (payload.id) {
    await apiClient.put(`/hosts/${payload.id}`, payload)
  } else {
    await apiClient.post('/hosts', payload)
  }
}

export async function deleteHost(id: string) {
  await apiClient.delete(`/hosts/${id}`)
}

export async function bulkPingHosts(ids: string[]): Promise<{ id: string; success: boolean }[]> {
  try {
    const { data } = await apiClient.post<{ id: string; success: boolean }[]>('/hosts/bulk/ping', { ids })
    return data
  } catch (error) {
    console.warn('[bulk ping] fallback mock', error)
    return ids.map((id) => ({ id, success: Math.random() > 0.3 }))
  }
}

export async function exportReport(filter: ReportFilter, format: 'csv' | 'xlsx') {
  return apiClient.post(`/reports/export`, { filter, format }, { responseType: 'blob' })
}
