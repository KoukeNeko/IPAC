import { useMutation, useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { Download, FileSpreadsheet, LineChart, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createMockReportExport, mockDashboard, mockReports } from '@/data/mock'
import { exportReport, getDashboardOverview } from '@/lib/ipac-service'
import type { ReportFilter } from '@/types'

const typeOptions = [
  { value: 'usage', label: '使用率統計' },
  { value: 'security', label: '安全事件' },
  { value: 'inventory', label: '資產盤點' },
] as const

type ReportType = (typeof typeOptions)[number]['value']

function ReportsPage() {
  const { success, toast } = useToast()
  const [filter, setFilter] = useState<ReportFilter>({
    dateRange: {
      from: format(addDays(new Date(), -7), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    },
    type: 'usage',
    includeDetails: true,
  })

  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview', filter],
    queryFn: getDashboardOverview,
    staleTime: 60_000,
  })

  const { mutateAsync: handleExport, isPending: isExporting } = useMutation({
    mutationFn: async (formatType: 'csv' | 'xlsx') => {
      try {
        const response = await exportReport(filter, formatType)
        const blob = response.data ?? new Blob([createMockReportExport(filter.type)], {
          type: formatType === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ip-report-${filter.type}-${filter.dateRange.from}-${formatType}.${formatType}`
        link.click()
        window.URL.revokeObjectURL(url)
        success('報表已匯出', `格式：${formatType.toUpperCase()}`)
      } catch (err) {
        console.warn(err)
        const mockBlob = new Blob([createMockReportExport(filter.type)], { type: 'text/plain' })
        const url = window.URL.createObjectURL(mockBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ip-report-${filter.type}-${filter.dateRange.from}-mock.${formatType}`
        link.click()
        window.URL.revokeObjectURL(url)
        toast('暫用模擬資料', { description: 'API 匯出失敗，已提供示例報表。' })
      }
    },
  })

  const chartData = useMemo(() => {
    const source = overview ?? mockDashboard
    return source.utilizationBySubnet.map((item, index) => ({
      name: item.subnetName,
      utilization: item.usage,
      securityEvents: Math.round(Math.random() * 5 + index),
    }))
  }, [overview])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">報表與匯出</h2>
          <p className="text-sm text-muted-foreground">
            設定日期範圍與類型，匯出 CSV 或 Excel 報表，快速彙整分享。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" /> 匯出 CSV
          </Button>
          <Button onClick={() => handleExport('xlsx')} disabled={isExporting}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> 匯出 Excel
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
          <CardDescription>報表將依照設定範圍與類型產出，支援詳細資訊。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="from">起始日期</Label>
            <Input
              id="from"
              type="date"
              value={filter.dateRange.from}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, dateRange: { ...prev.dateRange, from: event.target.value } }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">結束日期</Label>
            <Input
              id="to"
              type="date"
              value={filter.dateRange.to}
              onChange={(event) =>
                setFilter((prev) => ({ ...prev, dateRange: { ...prev.dateRange, to: event.target.value } }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">報表類型</Label>
            <Select
              value={filter.type}
              onValueChange={(value) => setFilter((prev) => ({ ...prev, type: value as ReportType }))}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="選擇報表類型" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>詳細資訊</Label>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
              <Switch
                checked={filter.includeDetails}
                onCheckedChange={(checked: boolean) =>
                  setFilter((prev) => ({ ...prev, includeDetails: checked }))
                }
              />
              <span>{filter.includeDetails ? '包含明細' : '僅輸出摘要'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between space-y-0">
          <div>
            <CardTitle>統計圖表</CardTitle>
            <CardDescription>搭配使用率與安全事件，追蹤網段趨勢</CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" /> 報表類型：{typeOptions.find((option) => option.value === filter.type)?.label}
          </Badge>
        </CardHeader>
        <CardContent className="h-[360px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number, name: string) => [`${value}${name === 'utilization' ? '%' : ''}`, name === 'utilization' ? '使用率' : '安全事件']} />
                <Legend />
                <Area type="monotone" dataKey="utilization" stroke="#2563eb" fill="url(#colorUsage)" name="使用率 %" />
                <Area type="monotone" dataKey="securityEvents" stroke="#f97316" fill="url(#colorSecurity)" name="安全事件" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>近期報表記錄</CardTitle>
          <CardDescription>快速下載常用報表，掌握最新資料。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockReports.map((report) => (
            <div key={report.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">報表：{typeOptions.find((item) => item.value === report.type)?.label}</p>
                <p className="text-xs text-muted-foreground">產出時間：{new Date(report.generatedAt).toLocaleString()}</p>
                <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <RefreshCw className="mr-2 h-4 w-4" /> 重新產出
                </Button>
                <Button size="sm" onClick={() => handleExport('xlsx')}>
                  <Download className="mr-2 h-4 w-4" /> 下載
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReportsPage
