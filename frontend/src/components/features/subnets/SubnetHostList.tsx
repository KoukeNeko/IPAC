import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { GripVertical, Server } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Host } from '@/types'

import { DraggableHostRow } from '../hosts/DraggableHostRow'

interface SubnetHostListProps {
  hosts: Host[]
  onHostClick?: (host: Host) => void
  emptyMessage?: string
}

export function SubnetHostList({ hosts, onHostClick, emptyMessage = '此網段尚無主機' }: SubnetHostListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">主機列表</CardTitle>
        <Badge variant="secondary">共 {hosts.length} 台</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          {hosts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Server className="h-10 w-10 text-muted-foreground/60" />
              <span>{emptyMessage}</span>
            </div>
          ) : (
            <SortableContext items={hosts.map((host) => host.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2 p-4">
                {hosts.map((host) => (
                  <DraggableHostRow
                    key={host.id}
                    host={host}
                    id={host.id}
                    containerId={host.subnetId}
                    mode="sortable"
                    className={cn('rounded-lg border border-transparent bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/80')}
                    handle={<GripVertical className="mr-3 h-4 w-4 text-muted-foreground/70" />}
                    onClick={() => onHostClick?.(host)}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
