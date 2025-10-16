import { useMemo, useState } from 'react'
import { Server, HardDrive, Zap, MapPin, ChevronRight, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Host, Rack } from '@/types'
import { cn } from '@/lib/utils'

interface RackViewProps {
  hosts: Host[]
  racks: Rack[]
  onHostClick?: (host: Host) => void
}

export function RackView({ hosts, racks, onHostClick }: RackViewProps) {
  const [selectedRackId, setSelectedRackId] = useState<string | null>(racks[0]?.id ?? null)
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())

  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === selectedRackId) ?? racks[0] ?? null
  }, [racks, selectedRackId])

  const physicalHostsInRack = useMemo(() => {
    if (!selectedRack) return []
    return hosts
      .filter((h) => h.hostType === 'physical' && h.rackId === selectedRack.id)
      .sort((a, b) => (a.rackPosition ?? 0) - (b.rackPosition ?? 0))
  }, [hosts, selectedRack])

  const toggleServerExpansion = (serverId: string) => {
    setExpandedServers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(serverId)) {
        newSet.delete(serverId)
      } else {
        newSet.add(serverId)
      }
      return newSet
    })
  }

  if (racks.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed p-10">
        <div className="space-y-2 text-center">
          <Server className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">無機櫃資料</h3>
          <p className="text-sm text-muted-foreground">請先建立機櫃並分配伺服器</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* 機櫃列表 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">機櫃列表</h3>
        <div className="space-y-2">
          {racks.map((rack) => (
            <Card
              key={rack.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                selectedRackId === rack.id && 'border-primary bg-primary/5'
              )}
              onClick={() => setSelectedRackId(rack.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{rack.name}</div>
                    <Badge variant="secondary">{rack.totalUnits}U</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {rack.location}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">使用率</span>
                      <span className="font-medium">
                        {rack.usedUnits}/{rack.totalUnits}U
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(rack.usedUnits / rack.totalUnits) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {rack.powerCapacity}W
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 機櫃詳細視圖 */}
      {selectedRack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                {selectedRack.name}
              </div>
              <Badge variant="outline">
                {physicalHostsInRack.length} 台伺服器
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-28rem)]">
              <div className="space-y-3">
                {physicalHostsInRack.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    此機櫃尚無伺服器
                  </div>
                ) : (
                  physicalHostsInRack.map((server) => (
                    <ServerRackItem
                      key={server.id}
                      server={server}
                      vms={hosts.filter((h) => h.hostType === 'vm' && h.parentHostId === server.id)}
                      isExpanded={expandedServers.has(server.id)}
                      onToggle={() => toggleServerExpansion(server.id)}
                      onHostClick={onHostClick}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface ServerRackItemProps {
  server: Host
  vms: Host[]
  isExpanded: boolean
  onToggle: () => void
  onHostClick?: (host: Host) => void
}

function ServerRackItem({ server, vms, isExpanded, onToggle, onHostClick }: ServerRackItemProps) {
  const rackUnits = server.rackUnits ?? 1
  const rackPosition = server.rackPosition ?? 0

  return (
    <div className="space-y-2">
      {/* 實體伺服器 */}
      <div
        className={cn(
          'group relative rounded-lg border transition-all',
          server.status === 'online'
            ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-950/20'
            : 'border-border bg-muted/30'
        )}
        style={{ minHeight: `${rackUnits * 60}px` }}
      >
        {/* U 位標記 */}
        <div className="absolute -left-12 top-0 flex h-full flex-col justify-center text-xs font-mono text-muted-foreground">
          <div className="flex flex-col items-end gap-1">
            <span>U{rackPosition + rackUnits - 1}</span>
            {rackUnits > 1 && (
              <>
                {Array.from({ length: rackUnits - 2 }).map((_, i) => (
                  <span key={i} className="opacity-50">
                    |
                  </span>
                ))}
                <span>U{rackPosition}</span>
              </>
            )}
          </div>
        </div>

        {/* 伺服器內容 */}
        <div
          className="flex h-full cursor-pointer items-center gap-3 p-4"
          onClick={() => onHostClick?.(server)}
        >
          <div className="rounded-lg bg-primary/20 p-2">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className="font-semibold">{server.hostname}</div>
              <Badge variant={server.status === 'online' ? 'success' : 'secondary'} className="h-5 text-xs">
                {server.status === 'online' ? '運行中' : '離線'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{server.ipAddress}</span>
              <span>•</span>
              <span>{server.os}</span>
              <span>•</span>
              <span>{rackUnits}U</span>
            </div>
          </div>
          {vms.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <HardDrive className="h-3 w-3" />
                {vms.length} VM
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="rounded p-1 hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VM 列表 */}
      {isExpanded && vms.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-primary/30 pl-4">
          {vms.map((vm) => (
            <div
              key={vm.id}
              className={cn(
                'cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/50',
                vm.status === 'online' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border bg-muted/30'
              )}
              onClick={() => onHostClick?.(vm)}
            >
              <div className="flex items-start gap-3">
                <div className="rounded bg-muted p-1.5">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{vm.hostname}</span>
                    <Badge
                      variant={vm.status === 'online' ? 'success' : 'secondary'}
                      className="h-4 text-xs"
                    >
                      {vm.status === 'online' ? '運行中' : '停止'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{vm.ipAddress}</span>
                    <span>•</span>
                    <span>{vm.os}</span>
                    <span>•</span>
                    <span>{vm.serviceType}</span>
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
          ))}
        </div>
      )}
    </div>
  )
}
