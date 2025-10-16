import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { createOrUpdateHost, createOrUpdateSubnet, deleteSubnet, getSubnets } from '@/lib/ipac-service'
import type { Host, SubnetWithHosts } from '@/types'

import { DroppableSubnetCard } from '@/components/features/subnets/DroppableSubnetCard'
import { SubnetDialog, type SubnetFormValues } from '@/components/features/subnets/SubnetDialog'
import { SubnetHostList } from '@/components/features/subnets/SubnetHostList'
import { DraggableHostRow } from '@/components/features/hosts/DraggableHostRow'

function SubnetsPage() {
  const { toast, success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedSubnetId, setSelectedSubnetId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubnet, setEditingSubnet] = useState<SubnetWithHosts | null>(null)
  const [subnetToDelete, setSubnetToDelete] = useState<SubnetWithHosts | null>(null)
  const [activeHost, setActiveHost] = useState<Host | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  )

  const { data, isLoading, refetch, isFetching } = useQuery<SubnetWithHosts[]>({
    queryKey: ['subnets'],
    queryFn: getSubnets,
  })

  const subnets = data ?? []
  const selectedSubnet = useMemo(
    () => subnets.find((subnet) => subnet.id === selectedSubnetId) ?? subnets[0] ?? null,
    [subnets, selectedSubnetId]
  )

  const createOrUpdateMutation = useMutation({
    mutationFn: (payload: { values: SubnetFormValues; subnet?: SubnetWithHosts | null }) =>
      createOrUpdateSubnet({ ...(payload.subnet ?? {}), ...payload.values }),
    onSuccess: () => {
      success('網段已更新')
      refetch()
    },
    onError: (err: unknown) => error('操作失敗', err instanceof Error ? err.message : '請稍後再試'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubnet(id),
    onSuccess: () => {
      success('網段已刪除')
      setSubnetToDelete(null)
      refetch()
    },
    onError: (err: unknown) => error('刪除失敗', err instanceof Error ? err.message : '請稍後再試'),
  })

  function handleOpenCreate() {
    setEditingSubnet(null)
    setIsDialogOpen(true)
  }

  function handleEdit(subnet: SubnetWithHosts) {
    setEditingSubnet(subnet)
    setIsDialogOpen(true)
  }

  async function handleSubmit(values: SubnetFormValues) {
    await createOrUpdateMutation.mutateAsync({ values, subnet: editingSubnet })
    setIsDialogOpen(false)
  }

  function handleDelete(subnet: SubnetWithHosts) {
    setSubnetToDelete(subnet)
  }

  function handleSubnetSelect(subnet: SubnetWithHosts) {
    setSelectedSubnetId(subnet.id)
  }

  function updateHostInCache(host: Host, targetSubnetId: string) {
    queryClient.setQueryData<SubnetWithHosts[]>(['subnets'], (old) => {
      if (!old) return old
      const targetSubnetName = old.find((item) => item.id === targetSubnetId)?.name ?? host.subnetName
      return old.map((subnet) => {
        if (subnet.id === host.subnetId) {
          return { ...subnet, hosts: subnet.hosts.filter((item) => item.id !== host.id), usedHosts: Math.max(subnet.usedHosts - 1, 0) }
        }
        if (subnet.id === targetSubnetId) {
          return {
            ...subnet,
            hosts: [...subnet.hosts, { ...host, subnetId: targetSubnetId, subnetName: targetSubnetName }],
            usedHosts: subnet.usedHosts + 1,
          }
        }
        return subnet
      })
    })
  }

  async function handleDragEnd(event: any) {
    const activeData = event.active?.data?.current as { host?: Host; subnetId?: string } | undefined
    const overData = event.over?.data?.current as { host?: Host; subnetId?: string } | undefined
    setActiveHost(null)

    if (!activeData || !event.over) return
    const host = activeData.host

    if (
      activeData.subnetId &&
      overData?.subnetId &&
      activeData.subnetId === overData.subnetId &&
      event.active.id !== event.over.id
    ) {
      const subnet = subnets.find((item) => item.id === activeData.subnetId)
      if (!subnet) return
      const oldIndex = subnet.hosts.findIndex((item) => item.id === event.active.id)
      const newIndex = subnet.hosts.findIndex((item) => item.id === event.over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(subnet.hosts, oldIndex, newIndex)
      queryClient.setQueryData<SubnetWithHosts[]>(['subnets'], (old) => {
        if (!old) return old
        return old.map((item) => (item.id === subnet.id ? { ...item, hosts: reordered } : item))
      })
      return
    }

    const overSubnetId = overData?.subnetId
    if (!host || !overSubnetId || host.subnetId === overSubnetId) return

    try {
      updateHostInCache(host, overSubnetId)
      await createOrUpdateHost({ ...host, subnetId: overSubnetId })
      success('主機已搬移', `${host.hostname} 已移至新網段`)
    } catch (err) {
      error('搬移失敗', err instanceof Error ? err.message : '請稍後再試')
      refetch()
    }
  }

  function handleDragStart(event: any) {
    const host = event.active?.data?.current?.host as Host | undefined
    if (host) {
      setActiveHost(host)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">網段管理</h2>
          <p className="text-sm text-muted-foreground">
            透過視覺化卡片快速掌握網段容量，支援拖拉主機至其他網段。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Spinner size="sm" className="mr-2" /> : null}
            重新整理
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新增網段
          </Button>
        </div>
      </header>

      {isLoading ? (
        <SubnetSkeleton />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subnets.map((subnet) => (
              <DroppableSubnetCard
                key={subnet.id}
                subnet={subnet}
                onSelect={handleSubnetSelect}
                onEdit={handleEdit}
                onDelete={handleDelete}
                highlight={selectedSubnet?.id === subnet.id}
              />
            ))}
          </div>
          <DragOverlay>
            {activeHost ? (
              <DraggableHostRow
                host={activeHost}
                id={activeHost.id}
                className="w-80 rounded-lg border border-primary bg-background p-3 shadow-lg"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selectedSubnet ? (
        <SubnetHostList
          hosts={selectedSubnet.hosts}
          onHostClick={(host) => toast(host.hostname, { description: host.ipAddress })}
        />
      ) : (
        <p className="text-sm text-muted-foreground">請選擇網段以檢視主機。</p>
      )}

      <SubnetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialValue={editingSubnet}
        onSubmit={handleSubmit}
        title={editingSubnet ? '編輯網段' : '新增網段'}
      />

      <Dialog open={Boolean(subnetToDelete)} onOpenChange={(open) => !open && setSubnetToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確定刪除此網段？</DialogTitle>
            <DialogDescription>
              刪除後將無法復原，且相關主機需重新指派網段。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSubnetToDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => subnetToDelete && deleteMutation.mutate(subnetToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteMutation.isPending ? '刪除中...' : '刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubnetSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-60 rounded-xl" />
      ))}
    </div>
  )
}

export default SubnetsPage
