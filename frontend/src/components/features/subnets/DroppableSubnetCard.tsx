import { useDroppable } from '@dnd-kit/core'
import type { SubnetWithHosts } from '@/types'
import { SubnetCard, type SubnetCardProps } from './SubnetCard'

interface DroppableSubnetCardProps extends Omit<SubnetCardProps, 'isDroppableOver'> {
  droppableId?: string
  subnet: SubnetWithHosts
}

export function DroppableSubnetCard({ droppableId, subnet, ...rest }: DroppableSubnetCardProps) {
  const { isOver, setNodeRef } = useDroppable({ id: droppableId ?? subnet.id, data: { subnetId: subnet.id } })

  return (
    <div ref={setNodeRef} className="h-full">
      <SubnetCard subnet={subnet} isDroppableOver={isOver} {...rest} />
    </div>
  )
}
