import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ArrowDownUp, Edit3, Eye, RadioTower, Tags, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { CheckedState } from '@radix-ui/react-checkbox'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Host } from '@/types'

export type HostSortKey = 'hostname' | 'ipAddress' | 'serviceType' | 'status' | 'lastSeenAt'

interface HostTableProps {
  hosts: Host[]
  isLoading?: boolean
  onSort?: (sortBy: HostSortKey, direction: 'asc' | 'desc') => void
  sortBy?: HostSortKey
  sortDirection?: 'asc' | 'desc'
  onEditHost?: (host: Host) => void
  onDeleteHost?: (host: Host) => void
  onPingHost?: (host: Host) => Promise<void> | void
  onShowDetail?: (host: Host) => void
  onDragReorder?: (hosts: Host[]) => void
  selectedHostIds?: string[]
  onSelectHost?: (hostId: string, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
}

export function HostTable({
  hosts,
  onSort,
  sortBy,
  sortDirection = 'asc',
  onEditHost,
  onDeleteHost,
  onPingHost,
  onShowDetail,
  onDragReorder,
  selectedHostIds = [],
  onSelectHost,
  onSelectAll,
}: HostTableProps) {
  const [rows, setRows] = useState(hosts)
  const { info } = useToast()

  useEffect(() => {
    setRows(hosts)
  }, [hosts])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((host) => host.id === active.id)
    const newIndex = rows.findIndex((host) => host.id === over.id)
    const reordered = arrayMove(rows, oldIndex, newIndex)
    setRows(reordered)
    onDragReorder?.(reordered)
  }

  const columns: { key: HostSortKey; label: string; sortable?: boolean; className?: string }[] = [
    { key: 'hostname', label: '主機名稱', sortable: true, className: 'min-w-[180px]' },
    { key: 'ipAddress', label: 'IP 位址', sortable: true, className: 'min-w-[150px]' },
    { key: 'serviceType', label: '服務類型', sortable: true },
    { key: 'status', label: '狀態', sortable: true },
    { key: 'lastSeenAt', label: '最後連線', sortable: true, className: 'min-w-[160px]' },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-sm font-medium text-muted-foreground">拖拉行列可重新排序或跨網段分配</div>
        <Badge variant="outline">共 {rows.length} 台主機</Badge>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[52px]">
                <Checkbox
                  checked={
                    rows.length > 0 && selectedHostIds.length === rows.length
                      ? true
                      : selectedHostIds.length > 0
                      ? 'indeterminate'
                      : false
                  }
                  onCheckedChange={(checked: CheckedState) => onSelectAll?.(checked === true)}
                  aria-label="選擇全部"
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column.key} className={cn('cursor-pointer select-none', column.className)}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    onClick={() =>
                      column.sortable && onSort?.(
                        column.key,
                        sortBy === column.key && sortDirection === 'asc' ? 'desc' : 'asc'
                      )
                    }
                  >
                    {column.label}
                    {column.sortable ? (
                      <ArrowDownUp
                        className={cn(
                          'h-3.5 w-3.5 transition-opacity',
                          sortBy === column.key ? 'text-primary opacity-100' : 'opacity-40'
                        )}
                      />
                    ) : null}
                  </button>
                </TableHead>
              ))}
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <SortableContext items={rows.map((host) => host.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {rows.map((host) => (
                <HostTableRow
                  key={host.id}
                  host={host}
                  onEditHost={onEditHost}
                  onDeleteHost={onDeleteHost}
                  onPingHost={onPingHost}
                  onShowDetail={onShowDetail}
                  onDragStart={() => info('拖拉中', `${host.hostname} 將被重新排序`)}
                  selected={selectedHostIds.includes(host.id)}
                  onSelectHost={onSelectHost}
                />
              ))}
            </TableBody>
          </SortableContext>
        </Table>
      </DndContext>
    </div>
  )
}

interface HostTableRowProps {
  host: Host
  onEditHost?: (host: Host) => void
  onDeleteHost?: (host: Host) => void
  onPingHost?: (host: Host) => Promise<void> | void
  onShowDetail?: (host: Host) => void
  onDragStart?: () => void
  selected?: boolean
  onSelectHost?: (hostId: string, selected: boolean) => void
}

function HostTableRow({
  host,
  onEditHost,
  onDeleteHost,
  onPingHost,
  onShowDetail,
  onDragStart,
  selected,
  onSelectHost,
}: HostTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: host.id, data: { host } })

  async function handlePing() {
    await onPingHost?.(host)
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition }}
      data-state={isDragging ? 'dragging' : undefined}
      className={cn(isDragging && 'border border-primary/60 bg-primary/5 shadow-lg')}
      onPointerDown={onDragStart}
    >
      <TableCell className="w-[52px]">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked: CheckedState) => onSelectHost?.(host.id, checked === true)}
            aria-label={`選擇 ${host.hostname}`}
          />
          <Button variant="ghost" size="icon" className="cursor-grab" {...attributes} {...listeners}>
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{host.hostname}</div>
          <div className="text-xs text-muted-foreground">{host.subnetName}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{host.ipAddress}</span>
          <span className="text-xs text-muted-foreground">{host.macAddress}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{host.serviceType}</Badge>
      </TableCell>
      <TableCell>
        <span className={cn('inline-flex items-center gap-2 text-sm font-medium', statusColor(host.status))}>
          <span className={cn('h-2.5 w-2.5 rounded-full', statusDot(host.status))} />
          {statusText(host.status)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{new Date(host.lastSeenAt).toLocaleString()}</span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handlePing}>
            <RadioTower className="mr-1.5 h-4 w-4" />
            Ping
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onShowDetail?.(host)}>
            <Eye className="h-4 w-4" />
            <span className="sr-only">檢視主機</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEditHost?.(host)}>
            <Edit3 className="h-4 w-4" />
            <span className="sr-only">編輯主機</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDeleteHost?.(host)}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">刪除主機</span>
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {host.tags.map((tag) => (
            <Badge key={tag.id} variant="ghost" className="text-xs">
              <Tags className="mr-1 h-3 w-3" />
              {tag.label}
            </Badge>
          ))}
        </div>
      </TableCell>
    </TableRow>
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

function statusColor(status: Host['status']) {
  switch (status) {
    case 'online':
      return 'text-emerald-600'
    case 'offline':
      return 'text-rose-500'
    default:
      return 'text-amber-500'
  }
}

function statusDot(status: Host['status']) {
  switch (status) {
    case 'online':
      return 'bg-emerald-500'
    case 'offline':
      return 'bg-rose-500'
    default:
      return 'bg-amber-500'
  }
}
