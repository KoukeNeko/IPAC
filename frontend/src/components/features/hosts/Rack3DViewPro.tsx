import { useState, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import type { Host, Rack } from '@/types'
import { cn } from '@/lib/utils'

interface Rack3DViewProProps {
  hosts: Host[]
  racks: Rack[]
  onHostClick?: (host: Host) => void
}

export function Rack3DViewPro({ hosts, racks, onHostClick }: Rack3DViewProProps) {
  const [selectedRackId, setSelectedRackId] = useState<string>(racks[0]?.id ?? '')
  const [pulledOutServerId, setPulledOutServerId] = useState<string | null>(null)
  const [shouldOpenDialog, setShouldOpenDialog] = useState(false)
  const controlsRef = useRef<any>(null)

  const selectedRack = useMemo(() => {
    return racks.find((r) => r.id === selectedRackId) ?? racks[0]
  }, [racks, selectedRackId])

  const serversInRack = useMemo(() => {
    if (!selectedRack) return []
    return hosts
      .filter((h) => h.hostType === 'physical' && h.rackId === selectedRack.id)
      .sort((a, b) => (a.rackPosition ?? 0) - (b.rackPosition ?? 0))
  }, [hosts, selectedRack])

  const handleServerClick = (serverId: string) => {
    setPulledOutServerId((prev) => (prev === serverId ? null : serverId))
    // 不要立即觸發 dialog，等待雙擊
    setShouldOpenDialog(false)
  }

  const handleServerDoubleClick = (serverId: string) => {
    const server = serversInRack.find((s) => s.id === serverId)
    if (server) {
      onHostClick?.(server)
    }
  }

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

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
              onClick={() => {
                setSelectedRackId(rack.id)
                setPulledOutServerId(null)
              }}
            >
              <CardContent className="p-3">
                <div className="font-semibold">{rack.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{rack.location}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 控制面板 */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm font-semibold">控制</div>
            <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              重置視角
            </Button>
            <div className="pt-2 text-xs text-muted-foreground">
              • 滑鼠左鍵拖曳旋轉
              <br />
              • 滾輪縮放
              <br />
              • 右鍵拖曳平移
              <br />
              • 點擊伺服器滑出
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Canvas */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-800 to-slate-700">
        <CardContent className="p-0">
          <div style={{ width: '100%', height: '800px' }}>
            <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
              {/* 相機 */}
              <PerspectiveCamera makeDefault position={[12, 8, 12]} fov={50} />

              {/* 軌道控制 */}
              <OrbitControls
                ref={controlsRef}
                enableDamping
                dampingFactor={0.05}
                minDistance={8}
                maxDistance={30}
                maxPolarAngle={Math.PI / 2}
              />

              {/* 光源 - 非常明亮的設定 */}
              <ambientLight intensity={1.2} />
              <directionalLight
                position={[15, 20, 10]}
                intensity={2.0}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
              />
              <directionalLight
                position={[-10, 15, -5]}
                intensity={1.2}
              />
              <pointLight position={[-10, 12, -10]} intensity={1.5} color="#ffffff" />
              <pointLight position={[10, 12, 10]} intensity={1.5} color="#ffffff" />
              <pointLight position={[0, 15, 0]} intensity={1.0} color="#e0f2fe" />

              {/* 地板 */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#3a3a4e" />
              </mesh>

              {/* 機櫃 3D 模型 */}
              <RackModel
                rack={selectedRack}
                servers={serversInRack}
                pulledOutServerId={pulledOutServerId}
                onServerClick={handleServerClick}
                onServerDoubleClick={handleServerDoubleClick}
              />
            </Canvas>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 機櫃 3D 模型
function RackModel({
  rack,
  servers,
  pulledOutServerId,
  onServerClick,
  onServerDoubleClick,
}: {
  rack: Rack
  servers: Host[]
  pulledOutServerId: string | null
  onServerClick: (serverId: string) => void
  onServerDoubleClick: (serverId: string) => void
}) {
  // 放大機櫃尺寸 - 4 倍
  const rackHeight = (rack.totalUnits * 0.0445) * 4 // 每 U 約 44.5mm，放大 4 倍
  const rackWidth = 0.6 * 4 // 標準 19 吋機櫃寬度，放大 4 倍
  const rackDepth = 1.0 * 4 // 深度也放大 4 倍

  return (
    <group position={[0, rackHeight / 2, 0]}>
      {/* 左側立柱 */}
      <mesh position={[-rackWidth / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.08, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#3d4758" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 右側立柱 */}
      <mesh position={[rackWidth / 2, 0, 0]} castShadow>
        <boxGeometry args={[0.08, rackHeight, rackDepth]} />
        <meshStandardMaterial color="#3d4758" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 背板 */}
      <mesh position={[0, 0, -rackDepth / 2]} castShadow>
        <boxGeometry args={[rackWidth, rackHeight, 0.03]} />
        <meshStandardMaterial color="#2a3342" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* 頂部 */}
      <mesh position={[0, rackHeight / 2, 0]} castShadow>
        <boxGeometry args={[rackWidth + 0.15, 0.05, rackDepth + 0.15]} />
        <meshStandardMaterial color="#3d4758" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* U 位刻度標記 */}
      {Array.from({ length: Math.min(rack.totalUnits, 42) }).map((_, index) => {
        if (index % 5 === 0) {
          const yPos = (index * 0.0445 * 4) - (rackHeight / 2) + 0.03
          return (
            <Text
              key={`u-${index}`}
              position={[-rackWidth / 2 - 0.15, yPos, 0]}
              rotation={[0, Math.PI / 2, 0]}
              fontSize={0.08}
              color="#94a3b8"
              anchorX="center"
              anchorY="middle"
            >
              {rack.totalUnits - index}
            </Text>
          )
        }
        return null
      })}

      {/* 伺服器 */}
      {servers.map((server) => (
        <ServerModel
          key={server.id}
          server={server}
          rackHeight={rackHeight}
          rackWidth={rackWidth}
          rackDepth={rackDepth}
          totalUnits={rack.totalUnits}
          isPulledOut={pulledOutServerId === server.id}
          onClick={() => onServerClick(server.id)}
          onDoubleClick={() => onServerDoubleClick(server.id)}
        />
      ))}
    </group>
  )
}

// 伺服器 3D 模型
function ServerModel({
  server,
  rackHeight,
  rackWidth,
  rackDepth,
  totalUnits,
  isPulledOut,
  onClick,
  onDoubleClick,
}: {
  server: Host
  rackHeight: number
  rackWidth: number
  rackDepth: number
  totalUnits: number
  isPulledOut: boolean
  onClick: () => void
  onDoubleClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const rackUnits = server.rackUnits ?? 1
  const rackPosition = server.rackPosition ?? 1
  const serverHeight = rackUnits * 0.0445 * 4 // 配合機櫃放大 4 倍
  const serverWidth = rackWidth - 0.4 // 配合機櫃放大
  const serverDepth = 0.7 * 4 // 配合機櫃放大 4 倍

  // 計算 Y 位置（從機櫃底部算起）
  const yPos = (rackPosition * 0.0445 * 4) - (rackHeight / 2) + (serverHeight / 2)

  // 滑出的目標 Z 位置 - 控制在滑軌範圍內（約機櫃深度的 60%）
  const targetZ = isPulledOut ? rackDepth * 0.35 : 0

  // 動畫
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += (targetZ - meshRef.current.position.z) * 0.1
    }
  })

  const isOnline = server.status === 'online'
  const baseColor = isOnline ? '#4a5568' : '#2d3748'
  const emissiveColor = isOnline ? '#10b981' : '#64748b'

  return (
    <group position={[0, yPos, 0]}>
      {/* 伺服器本體（包含所有會移動的元件）*/}
      <group ref={meshRef as any}>
        <mesh
          castShadow
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onDoubleClick()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <boxGeometry args={[serverWidth, serverHeight, serverDepth]} />
          <meshStandardMaterial
            color={hovered ? '#64748b' : baseColor}
            metalness={0.7}
            roughness={0.3}
            emissive={emissiveColor}
            emissiveIntensity={hovered ? 0.4 : 0.15}
          />
        </mesh>

        {/* 前面板細節 */}
        <mesh position={[0, 0, serverDepth / 2 + 0.001]}>
          <boxGeometry args={[serverWidth - 0.05, serverHeight - 0.02, 0.005]} />
          <meshStandardMaterial color="#1a202c" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* 電源指示燈 */}
        <mesh position={[-serverWidth / 2 + 0.1, 0, serverDepth / 2 + 0.01]}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial
            color={isOnline ? '#10b981' : '#64748b'}
            emissive={isOnline ? '#10b981' : '#000000'}
            emissiveIntensity={isOnline ? 1 : 0}
          />
        </mesh>

        {/* 主機名稱標籤 */}
        <Text
          position={[0, 0, serverDepth / 2 + 0.015]}
          fontSize={0.1}
          color="#f1f5f9"
          anchorX="center"
          anchorY="middle"
        >
          {server.hostname}
        </Text>
      </group>

      {/* 滑軌（當滑出時顯示）- 長度配合滑動距離 */}
      {isPulledOut && (
        <>
          <mesh position={[-serverWidth / 2 + 0.08, 0, rackDepth * 0.175 - serverDepth / 2]}>
            <boxGeometry args={[0.05, serverHeight * 0.8, rackDepth * 0.35]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[serverWidth / 2 - 0.08, 0, rackDepth * 0.175 - serverDepth / 2]}>
            <boxGeometry args={[0.05, serverHeight * 0.8, rackDepth * 0.35]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}
    </group>
  )
}
