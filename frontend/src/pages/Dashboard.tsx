import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Server, Wifi } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getDashboardOverview } from '@/lib/ipac-service'
import type { DashboardOverview } from '@/types'

const colors = ['#2563eb', '#7c3aed', '#22c55e', '#f97316', '#ef4444', '#0ea5e9']

function DashboardPage() {
  const { error } = useToast()
  const { data, isLoading, isFetching, refetch, isError } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    staleTime: 30_000,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    error('載入儀表板失敗', '請檢查網路或稍後再試')
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-10 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">無法載入儀表板資料</h2>
          <p className="text-sm text-muted-foreground">請重新整理或確認 API 服務狀態。</p>
        </div>
        <Button onClick={() => refetch()}>重新整理</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">網路資源總覽</h2>
          <p className="text-sm text-muted-foreground">
            即時掌握 IP 使用率、主機狀態與服務分布，快速定位潛在風險。
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Spinner size="sm" className="mr-2" /> : null}
          更新資料
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="總 IP 可用量"
          subtitle="跨網段可配置 IP"
          icon={<Server className="h-5 w-5 text-primary" />}
          value={(data.totalIps ?? 0).toLocaleString()}
        />
        <StatCard
          title="線上主機"
          subtitle="目前可連線"
          icon={<Wifi className="h-5 w-5 text-emerald-500" />}
          value={(data.onlineHosts ?? 0).toLocaleString()}
          trend="穩定"
        />
        <StatCard
          title="離線主機"
          subtitle="需關注"
          icon={<Activity className="h-5 w-5 text-amber-500" />}
          value={(data.offlineHosts ?? 0).toLocaleString()}
          trendClassName="text-amber-500"
          trend="待確認"
        />
        <StatCard
          title="IP 衝突預警"
          subtitle="即時偵測"
          icon={<AlertTriangle className="h-5 w-5 text-rose-500" />}
          value={data.conflictCount ?? 0}
          trendClassName="text-rose-500"
          trend="需立即處理"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex items-center justify-between space-y-0">
            <div>
              <CardTitle>網段使用率</CardTitle>
              <CardDescription>顯示各網段已使用 IP 比例，掌握容量規劃</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.utilizationBySubnet}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="subnetName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="usage" radius={[8, 8, 0, 0]}>
                  {data.utilizationBySubnet.map((entry, index) => (
                    <Cell key={entry.subnetId} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>服務類型分布</CardTitle>
            <CardDescription>快速了解各類服務的設備比例</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[320px] flex-col">
            <div className="flex h-full items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip formatter={(value: number) => `${value} 台`} />
                  <Pie data={data.serviceDistribution} dataKey="count" nameKey="type" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {data.serviceDistribution.map((entry, index) => (
                      <Cell key={entry.type} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {data.serviceDistribution.map((item, index) => (
                <div key={item.type} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  <span>{item.type}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between space-y-0">
            <div>
              <CardTitle>最近線上主機</CardTitle>
              <CardDescription>近 24 小時連線活動</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HostList hosts={data.recentHosts.online} emptyText="近期無線上主機" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between space-y-0">
            <div>
              <CardTitle>最近離線主機</CardTitle>
              <CardDescription>建議確認主機狀態</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <HostList hosts={data.recentHosts.offline} emptyText="近期無離線主機" statusVariant="offline" />
          </CardContent>
        </Card>
      </section>

      <ConflictBanner count={data.conflictCount} />
    </div>
  )
}

function StatCard({
  title,
  subtitle,
  value,
  icon,
  trend,
  trendClassName,
}: {
  title: string
  subtitle: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendClassName?: string
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{subtitle}</CardDescription>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {trend ? <p className={cn('mt-2 text-sm text-muted-foreground', trendClassName)}>{trend}</p> : null}
      </CardContent>
    </Card>
  )
}

function HostList({
  hosts,
  emptyText,
  statusVariant = 'online',
}: {
  hosts: DashboardOverview['recentHosts']['online']
  emptyText: string
  statusVariant?: 'online' | 'offline'
}) {
  if (hosts.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ScrollArea className="h-[220px]">
      <div className="space-y-3">
        {hosts.map((host) => (
          <div key={host.id} className="rounded-lg border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{host.hostname}</span>
              <Badge variant={statusVariant === 'online' ? 'success' : 'destructive'}>{statusVariant === 'online' ? '線上' : '離線'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{host.ipAddress} · {host.serviceType}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              最後連線：{new Date(host.lastSeenAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function ConflictBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-100/40 p-6 dark:border-rose-500/40 dark:bg-rose-500/10 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-rose-500" />
        <div>
          <h3 className="text-lg font-semibold">偵測到 {count} 個潛在 IP 衝突</h3>
          <p className="text-sm text-muted-foreground">建議立即檢查發生衝突的網段，確認是否有重複配置。</p>
        </div>
      </div>
      <Button variant="destructive">前往處理</Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-xl xl:col-span-2" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
    </div>
  )
}

export default DashboardPage
