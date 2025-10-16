import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Server, HardDrive, Network, Router, Wifi, MonitorSmartphone, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Host, Subnet } from '@/types'
import { cn } from '@/lib/utils'

interface Position {
  x: number
  y: number
}

interface NetworkArea {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface NetworkTopologyDiagramProps {
  hosts: Host[]
  subnets: Subnet[]
  onHostClick?: (host: Host) => void
}

type ConnectionType = 'ethernet' | 'virtual' | 'internet' | 'wireless'

interface Connection {
  from: string
  to: string
  type: ConnectionType
}

export function NetworkTopologyDiagram({ hosts, subnets, onHostClick }: NetworkTopologyDiagramProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [positions, setPositions] = useState<Map<string, Position>>(new Map())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState<Position>({ x: 50, y: 50 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })

  // 定義網路區域
  const areas: NetworkArea[] = useMemo(() => {
    const result: NetworkArea[] = []
    subnets.forEach((subnet, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      result.push({
        id: subnet.id,
        name: subnet.name,
        x: 50 + col * 600,
        y: 50 + row * 500,
        width: 550,
        height: 450,
        color: subnet.color ?? '#6366f1',
      })
    })
    return result
  }, [subnets])

  // 初始化設備位置
  useEffect(() => {
    const newPositions = new Map<string, Position>()

    areas.forEach((area) => {
      const areaHosts = hosts.filter((h) => h.subnetId === area.id)
      const physicalHosts = areaHosts.filter((h) => h.hostType === 'physical')
      const otherHosts = areaHosts.filter((h) => h.hostType !== 'physical' && h.hostType !== 'vm')

      // 實體主機排列
      physicalHosts.forEach((host, index) => {
        const row = Math.floor(index / 2)
        const col = index % 2
        newPositions.set(host.id, {
          x: area.x + 80 + col * 200,
          y: area.y + 80 + row * 150,
        })

        // VM 排列在實體機旁邊
        const vms = hosts.filter((h) => h.hostType === 'vm' && h.parentHostId === host.id)
        vms.forEach((vm, vmIndex) => {
          newPositions.set(vm.id, {
            x: area.x + 80 + col * 200 + 120,
            y: area.y + 80 + row * 150 + (vmIndex + 1) * 40,
          })
        })
      })

      // 其他設備（交換機、路由器等）
      otherHosts.forEach((host, index) => {
        newPositions.set(host.id, {
          x: area.x + 250,
          y: area.y + 300 + index * 80,
        })
      })
    })

    setPositions(newPositions)
  }, [hosts, areas])

  // 定義連線
  const connections: Connection[] = useMemo(() => {
    const result: Connection[] = []

    // VM 到實體機的虛擬連線
    hosts.forEach((host) => {
      if (host.hostType === 'vm' && host.parentHostId) {
        result.push({
          from: host.parentHostId,
          to: host.id,
          type: 'virtual',
        })
      }
    })

    // 同網段的實體機之間的乙太網連線
    areas.forEach((area) => {
      const areaPhysicalHosts = hosts.filter(
        (h) => h.subnetId === area.id && h.hostType === 'physical'
      )
      if (areaPhysicalHosts.length >= 2) {
        for (let i = 0; i < areaPhysicalHosts.length - 1; i++) {
          result.push({
            from: areaPhysicalHosts[i].id,
            to: areaPhysicalHosts[i + 1].id,
            type: 'ethernet',
          })
        }
      }
    })

    return result
  }, [hosts, areas])

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const pos = positions.get(nodeId)
    if (!pos) return
    setDraggingId(nodeId)
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
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.3))
  const handleResetView = () => {
    setZoom(0.8)
    setPan({ x: 50, y: 50 })
  }

  const getConnectionStyle = (type: ConnectionType) => {
    switch (type) {
      case 'ethernet':
        return { stroke: '#22c55e', strokeWidth: 3, strokeDasharray: 'none' }
      case 'virtual':
        return { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' }
      case 'internet':
        return { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: 'none' }
      case 'wireless':
        return { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '3,3' }
    }
  }

  return (
    <div className="relative h-[calc(100vh-20rem)] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
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
          {(zoom * 100).toFixed(0)}%
        </Badge>
      </div>

      {/* 圖例 */}
      <div className="absolute right-4 top-4 z-10 rounded-lg border border-border bg-background/95 p-3 text-xs backdrop-blur">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span>乙太網連線</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 rounded border-t-2 border-dashed" style={{ borderColor: '#3b82f6' }} />
            <span>虛擬連線</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-6 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span>網際網路</span>
          </div>
        </div>
      </div>

      {/* 畫布 */}
      <div
        ref={canvasRef}
        className="h-full w-full"
        onMouseDown={handleCanvasMouseDown}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* 區域框和連線層 */}
        <svg
          ref={svgRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <defs>
            <marker
              id="arrowhead-green"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* 區域框 */}
          {areas.map((area) => (
            <g key={area.id}>
              <rect
                x={area.x}
                y={area.y}
                width={area.width}
                height={area.height}
                fill="none"
                stroke={area.color}
                strokeWidth="2"
                strokeDasharray="8,4"
                rx="8"
                opacity="0.5"
              />
              <rect
                x={area.x}
                y={area.y - 30}
                width={150}
                height={28}
                fill={area.color}
                rx="4"
                opacity="0.9"
              />
              <text
                x={area.x + 75}
                y={area.y - 10}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="600"
              >
                {area.name}
              </text>
            </g>
          ))}

          {/* 連線 */}
          {connections.map((conn, index) => {
            const fromPos = positions.get(conn.from)
            const toPos = positions.get(conn.to)
            if (!fromPos || !toPos) return null

            const style = getConnectionStyle(conn.type)
            const fromX = fromPos.x + 50
            const fromY = fromPos.y + 30
            const toX = toPos.x + 50
            const toY = toPos.y + 30

            return (
              <line
                key={index}
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                {...style}
                opacity="0.8"
                markerEnd={conn.type === 'ethernet' ? 'url(#arrowhead-green)' : conn.type === 'virtual' ? 'url(#arrowhead-blue)' : undefined}
              />
            )
          })}
        </svg>

        {/* 設備節點層 */}
        <div
          className="relative"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
        >
          {hosts.map((host) => {
            const pos = positions.get(host.id)
            if (!pos) return null

            return (
              <DeviceNode
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
        拖曳設備移動 • 拖曳背景平移 • 滾輪縮放
      </div>
    </div>
  )
}

interface DeviceNodeProps {
  host: Host
  position: Position
  isDragging: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: () => void
}

function DeviceNode({ host, position, isDragging, onMouseDown, onClick }: DeviceNodeProps) {
  const isPhysical = host.hostType === 'physical'
  const isVM = host.hostType === 'vm'
  const isOnline = host.status === 'online'

  const getDeviceIcon = () => {
    if (isPhysical) {
      return <Server className="h-8 w-8" />
    }
    if (isVM) {
      return <HardDrive className="h-6 w-6" />
    }
    if (host.serviceType === 'Security') {
      return <Router className="h-7 w-7" />
    }
    if (host.serviceType === 'Monitoring') {
      return <Network className="h-7 w-7" />
    }
    return <MonitorSmartphone className="h-7 w-7" />
  }

  const getNodeSize = () => {
    if (isPhysical) return 'w-[120px]'
    if (isVM) return 'w-[100px]'
    return 'w-[110px]'
  }

  return (
    <div
      className={cn(
        'absolute flex cursor-move flex-col items-center',
        isDragging && 'z-50',
        getNodeSize()
      )}
      style={{ left: position.x, top: position.y }}
      onMouseDown={onMouseDown}
    >
      {/* 設備圖示 */}
      <div
        className={cn(
          'relative rounded-lg border-2 bg-background p-3 shadow-lg transition-all hover:shadow-xl',
          isOnline ? 'border-emerald-500' : 'border-slate-400',
          isDragging && 'ring-4 ring-primary/50'
        )}
        onClick={onClick}
      >
        {/* 狀態指示燈 */}
        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background">
          <div
            className={cn(
              'h-full w-full rounded-full',
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            )}
          />
        </div>

        <div className={cn(isOnline ? 'text-emerald-600' : 'text-slate-400')}>
          {getDeviceIcon()}
        </div>
      </div>

      {/* 設備名稱 */}
      <div className="mt-2 rounded bg-background/90 px-2 py-1 text-center text-xs font-medium shadow-sm">
        <div className="truncate">{host.hostname}</div>
        {isPhysical && host.vmCount && host.vmCount > 0 && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {host.vmCount} VM
          </div>
        )}
      </div>

      {/* IP 地址 */}
      <div className="mt-1 text-xs text-muted-foreground">
        {host.ipAddress}
      </div>
    </div>
  )
}
