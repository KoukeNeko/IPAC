import { useMemo } from 'react'
import { Server, HardDrive, Cpu, Activity, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Host } from '@/types'
import { cn } from '@/lib/utils'

interface HostTopologyViewProps {
  hosts: Host[]
  onHostClick?: (host: Host) => void
}

export function HostTopologyView({ hosts, onHostClick }: HostTopologyViewProps) {
  const topology = useMemo(() => {
    const physicalHosts = hosts.filter((h) => h.hostType === 'physical')
    return physicalHosts.map((physical) => ({
      physical,
      vms: hosts.filter((h) => h.hostType === 'vm' && h.parentHostId === physical.id),
    }))
  }, [hosts])

  const orphanVMs = useMemo(() => {
    return hosts.filter((h) => h.hostType === 'vm' && !h.parentHostId)
  }, [hosts])

  if (topology.length === 0 && orphanVMs.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
        <div className="space-y-2">
          <Server className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">無拓樸資料</h3>
          <p className="text-sm text-muted-foreground">請先設定主機類型與關聯關係</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-24rem)]">
      <div className="space-y-6">
        {topology.map(({ physical, vms }) => (
          <PhysicalHostCard
            key={physical.id}
            physical={physical}
            vms={vms}
            onHostClick={onHostClick}
          />
        ))}

        {orphanVMs.length > 0 && (
          <Card className="border-dashed border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <HardDrive className="h-5 w-5" />
                獨立 VM（未關聯實體機）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {orphanVMs.map((vm) => (
                  <VMCard key={vm.id} vm={vm} onClick={() => onHostClick?.(vm)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}

function PhysicalHostCard({
  physical,
  vms,
  onHostClick,
}: {
  physical: Host
  vms: Host[]
  onHostClick?: (host: Host) => void
}) {
  const cpuUsage = Math.floor(Math.random() * 40 + 30) // Mock CPU usage
  const memoryUsage = Math.floor(Math.random() * 50 + 30) // Mock memory usage

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={() => onHostClick?.(physical)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {physical.hostname}
                <Badge variant={physical.status === 'online' ? 'success' : 'destructive'}>
                  {physical.status === 'online' ? '線上' : '離線'}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {physical.ipAddress}
                </span>
                <span>•</span>
                <span>{physical.os}</span>
                <span>•</span>
                <span>{physical.serviceType}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Cpu className="h-3 w-3" />
                CPU
              </div>
              <div className="mt-1 font-semibold">{cpuUsage}%</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                記憶體
              </div>
              <div className="mt-1 font-semibold">{memoryUsage}%</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">VM 數量</div>
              <div className="mt-1 font-semibold text-primary">{vms.length}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      {vms.length > 0 && (
        <CardContent className="pt-0">
          <div className="relative">
            <div className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary/50 to-transparent" />
            <div className="space-y-3 pl-2">
              <div className="text-xs font-medium text-muted-foreground">虛擬機器：</div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {vms.map((vm) => (
                  <VMCard key={vm.id} vm={vm} onClick={() => onHostClick?.(vm)} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function VMCard({ vm, onClick }: { vm: Host; onClick?: () => void }) {
  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-primary/50 hover:shadow-md',
        vm.status === 'online' ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'bg-muted/40'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'rounded bg-muted p-1.5',
            vm.status === 'online' && 'bg-emerald-100 dark:bg-emerald-900/50'
          )}
        >
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{vm.hostname}</span>
            <Badge
              variant={vm.status === 'online' ? 'success' : 'secondary'}
              className="h-5 text-xs"
            >
              {vm.status === 'online' ? '運行中' : '停止'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{vm.ipAddress}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {vm.os}
          </div>
          {vm.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {vm.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
