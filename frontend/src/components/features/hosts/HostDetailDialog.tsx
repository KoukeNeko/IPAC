import { useState, type ReactNode } from 'react'
import { Calendar, Globe, Monitor, Network, Pencil, RadioTower, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Host } from '@/types'
import { cn } from '@/lib/utils'

interface HostDetailDialogProps {
  host: Host | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPing?: (host: Host) => Promise<string>
  onEdit?: (host: Host) => void
  onDelete?: (host: Host) => void
}

export function HostDetailDialog({ host, open, onOpenChange, onPing, onEdit, onDelete }: HostDetailDialogProps) {
  const [pingResult, setPingResult] = useState<string>('')
  const [isPinging, setIsPinging] = useState(false)

  if (!host) return null
  const currentHost = host

  async function handlePing() {
    if (!onPing) return
    setIsPinging(true)
    try {
      const result = await onPing(currentHost)
      setPingResult(result)
    } finally {
      setIsPinging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 text-lg">
            <span>{host.hostname}</span>
            <Badge variant="outline" className={cn(statusVariant(host.status))}>
              {statusText(host.status)}
            </Badge>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">{host.ipAddress} · {host.macAddress}</div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">基本資訊</TabsTrigger>
            <TabsTrigger value="network">網路設定</TabsTrigger>
            <TabsTrigger value="monitor">監控狀態</TabsTrigger>
            <TabsTrigger value="history">歷史紀錄</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Section title="資產資訊" icon={<Monitor className="h-4 w-4" />}> 
              <DetailRow label="主機名稱" value={host.hostname} />
              <DetailRow label="服務類型" value={host.serviceType} />
              <DetailRow label="作業系統" value={host.os} />
              <DetailRow label="說明" value={host.description ?? '—'} />
            </Section>
            <Section title="標籤" icon={<TagsIcon />}> 
              <div className="flex flex-wrap gap-2">
                {host.tags.length === 0 ? <span className="text-sm text-muted-foreground">無標籤</span> : null}
                {host.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" style={{ borderColor: tag.color, color: tag.color }}>
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Section title="網段資訊" icon={<Network className="h-4 w-4" />}>
              <DetailRow label="所屬網段" value={host.subnetName} />
              <DetailRow label="IP 位址" value={host.ipAddress} />
              <DetailRow label="MAC 位址" value={host.macAddress} />
            </Section>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-4">
            <Section title="連線檢測" icon={<Globe className="h-4 w-4" />}>
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Ping 主機以確認目前連線狀態與延遲。
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handlePing} disabled={isPinging}>
                    <RadioTower className="mr-2 h-4 w-4" />
                    {isPinging ? '檢測中...' : 'Ping 主機'}
                  </Button>
                  {pingResult ? <span className="text-sm text-muted-foreground">{pingResult}</span> : null}
                </div>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Section title="連線紀錄" icon={<Calendar className="h-4 w-4" />}>
              <p className="text-sm text-muted-foreground">
                最後線上時間：{new Date(host.lastSeenAt).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                完整歷史紀錄可整合監控系統或 SIEM 以取得更多事件細節。
              </p>
            </Section>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>主機 ID：{host.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onEdit?.(host)}>
              <Pencil className="mr-1.5 h-4 w-4" /> 編輯
            </Button>
            <Button variant="outline" className="text-destructive" onClick={() => onDelete?.(host)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> 刪除
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function statusText(status: Host['status']) {
  switch (status) {
    case 'online':
      return '線上'
    case 'offline':
      return '離線'
    default:
      return '閒置'
  }
}

function statusVariant(status: Host['status']) {
  switch (status) {
    case 'online':
      return 'border-emerald-500 text-emerald-600'
    case 'offline':
      return 'border-rose-500 text-rose-600'
    default:
      return 'border-amber-500 text-amber-600'
  }
}

function TagsIcon() {
  return <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-primary">#</span>
}
