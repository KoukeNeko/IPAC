import { useDraggable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Host } from '@/types'

interface DraggableHostRowProps {
  host: Host
  id: string
  className?: string
  handle?: React.ReactNode
  onClick?: () => void
  actions?: React.ReactNode
  mode?: 'draggable' | 'sortable'
  containerId?: string
}

export function DraggableHostRow({ host, id, className, handle, onClick, actions, mode = 'draggable', containerId }: DraggableHostRowProps) {
  const sortable = useSortable({ id, data: { host, subnetId: containerId } })
  const draggable = useDraggable({ id, data: { host, subnetId: containerId } })

  const behavior = mode === 'sortable' ? sortable : draggable
  const { attributes, listeners, setNodeRef, transform } = behavior
  const transition = mode === 'sortable' ? sortable.transition : undefined
  const isDragging = mode === 'sortable' ? sortable.isDragging : draggable.isDragging

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center justify-between rounded-lg border bg-card text-sm shadow-sm ring-offset-background transition-shadow data-[dragging=true]:z-50 data-[dragging=true]:border-primary data-[dragging=true]:shadow-lg',
        isDragging && 'border-primary/70 shadow-lg',
        className
      )}
      data-dragging={isDragging}
      onClick={onClick}
    >
      <div className="flex flex-1 items-center">
        <button
          type="button"
          className="flex h-full cursor-grab items-center justify-center border-r border-border bg-muted/60 px-2 text-muted-foreground transition-colors hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          {handle}
          <span className="sr-only">拖拉以重新排序</span>
        </button>
        <div className="flex flex-1 flex-col gap-1 px-3 py-2 text-left">
          <span className="font-medium text-foreground">{host.hostname}</span>
          <span className="text-xs text-muted-foreground">{host.ipAddress} · {host.serviceType}</span>
        </div>
      </div>
      {actions ? <div className="px-2 py-1">{actions}</div> : null}
    </li>
  )
}
