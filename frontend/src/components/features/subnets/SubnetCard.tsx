import { EllipsisVertical, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { SubnetWithHosts } from '@/types'
import { cn } from '@/lib/utils'

export interface SubnetCardProps {
  subnet: SubnetWithHosts
  onEdit: (subnet: SubnetWithHosts) => void
  onDelete: (subnet: SubnetWithHosts) => void
  onSelect: (subnet: SubnetWithHosts) => void
  highlight?: boolean
  isDroppableOver?: boolean
}

export function SubnetCard({ subnet, onEdit, onDelete, onSelect, highlight, isDroppableOver }: SubnetCardProps) {
  const utilization = Math.round((subnet.usedHosts / subnet.totalHosts) * 100)

  return (
    <Card
      className={cn(
        'relative h-full cursor-pointer border border-border/80 transition-colors hover:border-primary/60',
        highlight && 'ring-2 ring-primary/70',
        isDroppableOver && 'border-dashed border-primary bg-primary/5'
      )}
      style={{ borderTopColor: subnet.color, borderTopWidth: 4 }}
      onClick={() => onSelect(subnet)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full" style={{ backgroundColor: subnet.color }} />
            {subnet.name}
          </CardTitle>
          <div className="mt-1 text-sm text-muted-foreground">{subnet.cidr}</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onEdit(subnet) }}>
              <Edit3 className="mr-2 h-4 w-4" /> 編輯網段
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                onDelete(subnet)
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> 刪除網段
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        {subnet.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">{subnet.description}</p>
        ) : null}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>使用率</span>
            <span className={cn(utilization > 80 ? 'text-amber-500' : 'text-muted-foreground')}>
              {subnet.usedHosts}/{subnet.totalHosts} ({utilization}%)
            </span>
          </div>
          <Progress value={utilization} indicatorClassName="bg-gradient-to-r from-primary to-primary/70" />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">主機 {subnet.hosts.length} 台</Badge>
          <Badge variant="ghost">ID: {subnet.id}</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={(event) => { event.stopPropagation(); onSelect(subnet) }}>
          查看主機列表
        </Button>
      </CardFooter>
    </Card>
  )
}
