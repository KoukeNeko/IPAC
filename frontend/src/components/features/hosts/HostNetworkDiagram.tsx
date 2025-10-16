import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Server, HardDrive, Wifi, WifiOff, Network, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Host } from '@/types'
import { cn } from '@/lib/utils'

interface Position {
  x: number
  y: number
}

interface HostPosition extends Position {
  hostId: string
}

interface HostNetworkDiagramProps {
  hosts: Host[]
  onHostClick?: (host: Host) => void
}

export function HostNetworkDiagram({ hosts, onHostClick }: HostNetworkDiagramProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [positions, setPositions] = useState<Map<string, Position>>(new Map())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })

  // 初始化位置
  useEffect(() => {
    const newPositions = new Map<string, Position>()
    const physicalHosts = hosts.filter((h) => h.hostType === 'physical')
    const spacing = 300

    physicalHosts.forEach((physical, index) => {
      const row = Math.floor(index / 3)
      const col = index % 3
      newPositions.set(physical.id, {
        x: 100 + col * spacing,
        y: 100 + row * spacing,
      })

      const vms = hosts.filter((h) => h.hostType === 'vm' && h.parentHostId === physical.id)
      vms.forEach((vm, vmIndex) => {
        newPositions.set(vm.id, {
          x: 100 + col * spacing + 100 + (vmIndex % 2) * 80,
          y: 100 + row * spacing + 100 + Math.floor(vmIndex / 2) * 60,
        })
      })
    })

    // 獨立 VM
    const orphanVMs = hosts.filter((h) => h.hostType === 'vm' && !h.parentHostId)
    orphanVMs.forEach((vm, index) => {
      newPositions.set(vm.id, {
        x: 600,
        y: 100 + index * 80,
      })
    })

    // 無類型主機
    const untypedHosts = hosts.filter((h) => !h.hostType)
    untypedHosts.forEach((host, index) => {
      newPositions.set(host.id, {
        x: 100 + (index % 4) * 200,
        y: 500 + Math.floor(index / 4) * 150,
      })
    })

    setPositions(newPositions)
  }, [hosts])

  const connections = useMemo(() => {
    const result: Array<{ from: Position; to: Position; fromHost: Host; toHost: Host }> = []
    hosts.forEach((host) => {
      if (host.hostType === 'vm' && host.parentHostId) {
        const parent = hosts.find((h) => h.id === host.parentHostId)
        const fromPos = positions.get(host.parentHostId)
        const toPos = positions.get(host.id)
        if (fromPos && toPos && parent) {
          result.push({ from: fromPos, to: toPos, fromHost: parent, toHost: host })
        }
      }
    })
    return result
  }, [hosts, positions])

  const handleMouseDown = (e: React.MouseEvent, hostId: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const pos = positions.get(hostId)
    if (!pos) return
    setDraggingId(hostId)
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y,
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (draggingId) {
        const newX = (e.clientX - pan.x) / zoom - dragOffset.x
        const newY = (e.clientY - pan.y) / zoom - dragOffset.y
        setPositions((prev) => new Map(prev).set(draggingId, { x: newX, y: newY }))
      } else if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        })
      }
    },
    [draggingId, dragOffset, zoom, pan, isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
    setIsPanning(false)
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === canvasRef.current) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      })
    }
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="relative h-[calc(100vh-20rem)] overflow-hidden rounded-xl border border-border bg-muted/20">
      {/* 工具列 */}
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleResetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Badge variant="secondary" className="px-3">
          縮放: {(zoom * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* 圖例 */}
      <div className="absolute right-4 top-4 z-10 rounded-lg border border-border bg-background/95 p-3 text-xs backdrop-blur">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <span>實體機</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>虛擬機</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-primary" />
            <span>虛擬化連線</span>
          </div>
        </div>
      </div>

      {/* 畫布 */}
      <div
        ref={canvasRef}
        className="h-full w-full cursor-move"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* SVG 連線層 */}
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
              className="fill-primary"
            >
              <polygon points="0 0, 10 3, 0 6" />
            </marker>
          </defs>
          {connections.map((conn, index) => {
            const dx = conn.to.x - conn.from.x
            const dy = conn.to.y - conn.from.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const offsetX = (dx / distance) * 60
            const offsetY = (dy / distance) * 60
            const startX = conn.from.x + 60 + offsetX
            const startY = conn.from.y + 30 + offsetY
            const endX = conn.to.x + 60 - offsetX
            const endY = conn.to.y + 30 - offsetY

            return (
              <g key={index}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.5"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )
          })}
        </svg>

        {/* 主機節點層 */}
        <div
          className="relative"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {hosts.map((host) => {
            const pos = positions.get(host.id)
            if (!pos) return null

            return (
              <HostNode
                key={host.id}
                host={host}
                position={pos}
                isDragging={draggingId === host.id}
                onMouseDown={(e) => handleMouseDown(e, host.id)}
                onClick={() => onHostClick?.(host)}
              />
            )
          })}
        </div>
      </div>

      {/* 提示 */}
      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
        拖曳主機移動位置 • 拖曳背景平移畫布 • 使用工具列縮放
      </div>
    </div>
  )
}

interface HostNodeProps {
  host: Host
  position: Position
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: () => void
}

function HostNode({ host, position, isDragging, onMouseDown, onClick }: HostNodeProps) {
  const isPhysical = host.hostType === 'physical'
  const isOnline = host.status === 'online'

  return (
    <Card
      className={cn(
        'absolute w-[240px] cursor-move transition-shadow',
        isDragging && 'shadow-2xl ring-2 ring-primary',
        isPhysical ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-transparent' : 'border-border bg-card'
      )}
      style={{ left: position.x, top: position.y }}
      onMouseDown={onMouseDown}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 標題列 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div
                className={cn(
                  'rounded-lg p-2',
                  isPhysical ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                {isPhysical ? (
                  <Server className="h-5 w-5 text-primary" />
                ) : (
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-sm leading-tight">{host.hostname}</div>
                <div className="text-xs text-muted-foreground">{host.ipAddress}</div>
              </div>
            </div>
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* 資訊 */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">系統</span>
              <span className="font-medium">{host.os}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">服務</span>
              <Badge variant="outline" className="h-5 text-xs">
                {host.serviceType}
              </Badge>
            </div>
            {isPhysical && host.vmCount !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VM 數</span>
                <Badge variant="secondary" className="h-5 text-xs">
                  {host.vmCount}
                </Badge>
              </div>
            )}
          </div>

          {/* 標籤 */}
          {host.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {host.tags.slice(0, 2).map((tag) => (
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

          {/* 操作按鈕 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <Network className="mr-1 h-3 w-3" />
            查看詳情
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
