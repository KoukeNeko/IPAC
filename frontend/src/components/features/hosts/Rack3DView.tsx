import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Host, Rack } from '@/types'
import { cn } from '@/lib/utils'

interface Rack3DViewProps {
  hosts: Host[]
  racks: Rack[]
  onHostClick?: (host: Host) => void
}

export function Rack3DView({ hosts, racks, onHostClick }: Rack3DViewProps) {
  const [selectedRackId, setSelectedRackId] = useState<string>(racks[0]?.id ?? '')
  const [pulledOutServerId, setPulledOutServerId] = useState<string | null>(null)
  const [rotationY, setRotationY] = useState(15) // 3D 旋轉角度
  const [zoom, setZoom] = useState(1)

  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === selectedRackId) ?? racks[0]
  }, [racks, selectedRackId])

  const serversInRack = useMemo(() => {
    if (!selectedRack) return []
    return hosts
      .filter((h) => h.hostType === 'physical' && h.rackId === selectedRack.id)
      .sort((a, b) => (b.rackPosition ?? 0) - (a.rackPosition ?? 0)) // 從上到下排序
  }, [hosts, selectedRack])

  const handleServerClick = (serverId: string) => {
    setPulledOutServerId((prev) => (prev === serverId ? null : serverId))
  }

  const handleRotateLeft = () => setRotationY((prev) => Math.max(prev - 15, -45))
  const handleRotateRight = () => setRotationY((prev) => Math.min(prev + 15, 45))
  const handleResetRotation = () => {
    setRotationY(15)
    setZoom(1)
  }
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 1.5))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.7))

  if (!selectedRack) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <p className="text-muted-foreground">無可用機櫃</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* 機櫃選擇器 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">選擇機櫃</h3>
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
              <CardContent className="p-3">
                <div className="font-semibold">{rack.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{rack.location}</div>
                <div className="mt-2 text-xs">
                  <Badge variant="secondary">
                    {serversInRack.length} 台伺服器
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 控制面板 */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm font-semibold">視角控制</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRotateLeft}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetRotation}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotateRight}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="flex-1 justify-center">
                {(zoom * 100).toFixed(0)}%
              </Badge>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              點擊伺服器滑出/收回
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D 機櫃視圖 */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        <CardContent className="p-8">
          <ScrollArea className="h-[800px]">
            <div
              className="flex justify-center"
              style={{
                perspective: '2000px',
                transform: `scale(${zoom})`,
                transition: 'transform 0.3s ease',
              }}
            >
              {/* 機櫃 3D 容器 */}
              <div
                className="relative"
                style={{
                  transform: `rotateY(${rotationY}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s ease',
                }}
              >
                {/* 機櫃外框 */}
                <Rack3DFrame rack={selectedRack} />

                {/* 伺服器層 */}
                <div className="relative">
                  {serversInRack.map((server) => (
                    <Server3DSlot
                      key={server.id}
                      server={server}
                      isPulledOut={pulledOutServerId === server.id}
                      onClick={() => handleServerClick(server.id)}
                      onDetailsClick={() => onHostClick?.(server)}
                      vms={hosts.filter((h) => h.hostType === 'vm' && h.parentHostId === server.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// 機櫃外框組件
function Rack3DFrame({ rack }: { rack: Rack }) {
  const totalHeight = rack.totalUnits * 20 // 每 U 20px

  return (
    <div className="relative" style={{ width: '600px', height: `${totalHeight}px` }}>
      {/* 左側立柱 */}
      <div
        className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-slate-700 to-slate-600"
        style={{
          transform: 'translateZ(10px)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* U 位刻度 */}
        {Array.from({ length: rack.totalUnits }).map((_, index) => (
          <div
            key={index}
            className="border-b border-slate-500/30 text-center text-xs font-mono text-slate-400"
            style={{ height: '20px', lineHeight: '20px' }}
          >
            {rack.totalUnits - index}
          </div>
        ))}
      </div>

      {/* 右側立柱 */}
      <div
        className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-slate-700 to-slate-600"
        style={{
          transform: 'translateZ(10px)',
          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.3)',
        }}
      >
        {Array.from({ length: rack.totalUnits }).map((_, index) => (
          <div
            key={index}
            className="border-b border-slate-500/30 text-center text-xs font-mono text-slate-400"
            style={{ height: '20px', lineHeight: '20px' }}
          >
            {rack.totalUnits - index}
          </div>
        ))}
      </div>

      {/* 背板 */}
      <div
        className="absolute left-12 top-0 h-full bg-slate-800"
        style={{
          width: 'calc(100% - 96px)',
          transform: 'translateZ(-50px)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}

// 伺服器插槽組件（步驟 1 基礎版）
function Server3DSlot({
  server,
  isPulledOut,
  onClick,
  onDetailsClick,
  vms,
}: {
  server: Host
  isPulledOut: boolean
  onClick: () => void
  onDetailsClick: () => void
  vms: Host[]
}) {
  const rackUnits = server.rackUnits ?? 1
  const rackPosition = server.rackPosition ?? 1
  const height = rackUnits * 20
  const topPosition = (42 - rackPosition - rackUnits + 1) * 20

  const isOnline = server.status === 'online'

  return (
    <div
      className="absolute left-12 cursor-pointer"
      style={{
        top: `${topPosition}px`,
        width: 'calc(100% - 96px)',
        height: `${height}px`,
        transform: isPulledOut ? 'translateZ(150px)' : 'translateZ(0px)',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={onClick}
    >
      {/* 伺服器前面板 */}
      <div
        className={cn(
          'relative h-full w-full rounded border-2 bg-gradient-to-b shadow-lg transition-all',
          isOnline
            ? 'border-emerald-500/50 from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500'
            : 'border-slate-600 from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600'
        )}
        style={{
          boxShadow: isPulledOut
            ? '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.1)'
            : '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.1)',
        }}
      >
        {/* 伺服器資訊 */}
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* 電源指示燈 */}
            <div className="flex flex-col gap-1">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-slate-600'
                )}
              />
              {rackUnits > 1 && (
                <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
              )}
            </div>

            {/* 主機名稱 */}
            <div>
              <div className="font-mono text-sm font-semibold text-slate-200">
                {server.hostname}
              </div>
              {isPulledOut && (
                <div className="mt-1 text-xs text-slate-400">
                  {server.ipAddress} • {server.os}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* VM 指示 */}
            {vms.length > 0 && (
              <Badge variant="secondary" className="bg-slate-800 text-xs">
                {vms.length} VM
              </Badge>
            )}

            {/* 拉出指示 */}
            {!isPulledOut && (
              <div className="text-xs text-slate-500">點擊滑出 →</div>
            )}
          </div>
        </div>

        {/* 滑軌視覺效果 */}
        {isPulledOut && (
          <>
            <div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-gradient-to-r from-slate-600 to-transparent"
              style={{
                width: '150px',
                transform: 'translateZ(-75px) translateY(-50%)',
              }}
            />
            <div
              className="absolute right-0 top-1/2 h-1 -translate-y-1/2 bg-gradient-to-l from-slate-600 to-transparent"
              style={{
                width: '150px',
                transform: 'translateZ(-75px) translateY(-50%)',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
