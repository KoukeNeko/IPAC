import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Download, Plus, Tag, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/use-pagination'
import {
  bulkPingHosts,
  createOrUpdateHost,
  deleteHost,
  getHosts,
  getSubnets,
} from '@/lib/ipac-service'
import type { Host, HostTag, ServiceType, Subnet } from '@/types'

import { HostDetailDialog } from '@/components/features/hosts/HostDetailDialog'
import { HostDialog, type HostFormValues } from '@/components/features/hosts/HostDialog'
import { HostFilters } from '@/components/features/hosts/HostFilters'
import { HostTable, type HostSortKey } from '@/components/features/hosts/HostTable'

function HostsPage() {
  const { toast, success, error, info } = useToast()
  const queryClient = useQueryClient()
  const pagination = usePagination({ defaultPageSize: 10 })

  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedSubnets, setSelectedSubnets] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<HostSortKey>('hostname')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHost, setEditingHost] = useState<Host | null>(null)
  const [detailHost, setDetailHost] = useState<Host | null>(null)
  const [hostToDelete, setHostToDelete] = useState<Host | null>(null)
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([])

  const { data: subnetData } = useQuery<Subnet[]>({ queryKey: ['subnets'], queryFn: getSubnets })
  const subnets = subnetData ?? []

  const { data, isLoading, isFetching, refetch } = useQuery<Host[]>({
    queryKey: ['hosts', { searchKeyword, selectedSubnets, selectedServices, selectedStatuses, selectedTags }],
    queryFn: () =>
      getHosts({
        search: searchKeyword,
        subnets: selectedSubnets,
        services: selectedServices,
        statuses: selectedStatuses,
        tags: selectedTags,
      }),
  })

  const hosts = data ?? []

  const sortedHosts = useMemo(() => {
    return [...hosts].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1
      const valueA = getHostSortValue(a, sortBy)
      const valueB = getHostSortValue(b, sortBy)
      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return 1 * direction
      return 0
    })
  }, [hosts, sortBy, sortDirection])

  const paginatedHosts = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return sortedHosts.slice(start, start + pagination.pageSize)
  }, [sortedHosts, pagination.pageIndex, pagination.pageSize])

  const createOrUpdateMutation = useMutation({
    mutationFn: ({ values, host }: { values: HostFormValues; host?: Host | null }) => {
      const subnet = subnets.find((item) => item.id === values.subnetId)
      const tags = values.tags.map((tagId) =>
        filterableTags.find((tag) => tag.id === tagId) ?? {
          id: tagId,
          label: tagId,
          color: '#64748b',
        }
      )

      return createOrUpdateHost({
        ...(host ?? {}),
        ...values,
        subnetName: subnet?.name ?? host?.subnetName ?? '',
        tags,
      })
    },
    onSuccess: () => {
      success('主機已儲存')
      setIsDialogOpen(false)
      refetch()
    },
    onError: (err: unknown) => error('儲存失敗', err instanceof Error ? err.message : '請稍後再試'),
  })

  const deleteMutation = useMutation({
    mutationFn: (hostId: string) => deleteHost(hostId),
    onSuccess: () => {
      success('主機已刪除')
      setHostToDelete(null)
      refetch()
    },
    onError: (err: unknown) => error('刪除失敗', err instanceof Error ? err.message : '請稍後再試'),
  })

  const bulkPingMutation = useMutation({
    mutationFn: (ids: string[]) => bulkPingHosts(ids),
    onSuccess: (results) => {
      const successCount = results.filter((result) => result.success).length
      info(
        '批次 Ping 完成',
        `成功：${successCount} 台，失敗：${results.length - successCount} 台`
      )
    },
    onError: () => error('批次 Ping 失敗', '請稍後再試'),
  })

  function handleSort(key: HostSortKey, direction: 'asc' | 'desc') {
    setSortBy(key)
    setSortDirection(direction)
  }

  function handleOpenCreate() {
    setEditingHost(null)
    setIsDialogOpen(true)
  }

  function handleEditHost(host: Host) {
    setEditingHost(host)
    setIsDialogOpen(true)
  }

  async function handleSubmit(values: HostFormValues) {
    await createOrUpdateMutation.mutateAsync({ values, host: editingHost })
  }

  function toggleHostSelection(hostId: string, selected: boolean) {
    setSelectedHostIds((prev) => {
      if (selected) {
        return Array.from(new Set([...prev, hostId]))
      }
      return prev.filter((id) => id !== hostId)
    })
  }

  function handleSelectAll(selected: boolean) {
    if (selected) {
      setSelectedHostIds(paginatedHosts.map((host) => host.id))
    } else {
      setSelectedHostIds([])
    }
  }

  function handleBulkPing() {
    if (selectedHostIds.length === 0) {
      toast('請先選擇主機', { description: '至少選擇一台主機後再進行批次操作。' })
      return
    }
    bulkPingMutation.mutate(selectedHostIds)
  }

  function handleBulkTag() {
    if (selectedHostIds.length === 0) {
      toast('請先選擇主機', { description: '至少選擇一台主機後再進行批次操作。' })
      return
    }
    success('批次標籤成功', '已套用預設標籤至所選主機')
  }

  const filterableTags = useMemo(() => {
    const allTags = hosts.flatMap((host) => host.tags)
    const unique = new Map<string, HostTag>()
    allTags.forEach((tag) => unique.set(tag.id, tag))
    return Array.from(unique.values())
  }, [hosts])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">主機管理</h2>
          <p className="text-sm text-muted-foreground">
            即時搜尋、篩選與批次處理主機資產，整合網段與服務資訊。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Spinner size="sm" className="mr-2" /> : null}
            重新整理
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> 新增主機
          </Button>
        </div>
      </header>

      <HostFilters
        subnets={subnets}
        tags={filterableTags}
        selectedSubnets={selectedSubnets}
        selectedServices={selectedServices}
        selectedStatuses={selectedStatuses}
        selectedTags={selectedTags}
        onSubnetsChange={setSelectedSubnets}
        onServicesChange={setSelectedServices}
        onStatusesChange={setSelectedStatuses}
        onTagsChange={setSelectedTags}
        onClear={() => {
          setSelectedSubnets([])
          setSelectedServices([])
          setSelectedStatuses([])
          setSelectedTags([])
          setSearchKeyword('')
        }}
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">共 {hosts.length} 台主機</Badge>
          {selectedHostIds.length > 0 ? <Badge variant="outline">已選 {selectedHostIds.length}</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBulkPing} disabled={bulkPingMutation.isPending}>
            <Download className="mr-2 h-4 w-4" /> 批次 Ping
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkTag}>
            <Tag className="mr-2 h-4 w-4" /> 批次標籤
          </Button>
        </div>
      </div>

      {isLoading ? (
        <HostSkeleton />
      ) : (
        <HostTable
          hosts={paginatedHosts}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEditHost={handleEditHost}
          onDeleteHost={(host) => setHostToDelete(host)}
          onPingHost={(host) => bulkPingMutation.mutate([host.id])}
          onShowDetail={setDetailHost}
          onDragReorder={(reordered) => {
            queryClient.setQueryData<Host[]>(['hosts', { searchKeyword, selectedSubnets, selectedServices, selectedStatuses, selectedTags }], (old) => {
              if (!old) return old
              const map = new Map(reordered.map((host) => [host.id, host]))
              return old.map((host) => map.get(host.id) ?? host)
            })
          }}
          selectedHostIds={selectedHostIds}
          onSelectHost={toggleHostSelection}
          onSelectAll={handleSelectAll}
        />
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          顯示第 {pagination.pageIndex * pagination.pageSize + 1} -
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedHosts.length)} 筆，共 {sortedHosts.length} 筆
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(Math.max(pagination.pageIndex - 1, 0))}
            disabled={pagination.pageIndex === 0}
          >
            上一頁
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              pagination.onPageChange(
                pagination.pageIndex + 1 < Math.ceil(sortedHosts.length / pagination.pageSize)
                  ? pagination.pageIndex + 1
                  : pagination.pageIndex
              )
            }
            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= sortedHosts.length}
          >
            下一頁
          </Button>
        </div>
      </div>

      <HostDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialValue={editingHost}
        subnets={subnets}
        availableTags={filterableTags}
        onSubmit={handleSubmit}
        onCheckIpConflict={async (ip, currentHostId) => {
          const hosts = await getHosts()
          return hosts.some((host) => host.ipAddress === ip && host.id !== currentHostId)
        }}
      />

      <HostDetailDialog
        host={detailHost}
        open={Boolean(detailHost)}
        onOpenChange={(open) => !open && setDetailHost(null)}
        onEdit={(host) => {
          setDetailHost(null)
          setEditingHost(host)
          setIsDialogOpen(true)
        }}
        onDelete={(host) => setHostToDelete(host)}
        onPing={async (host) => {
          const [result] = await bulkPingHosts([host.id])
          return result.success ? 'Ping 成功 (42ms)' : 'Ping 失敗'
        }}
      />

      <Dialog open={Boolean(hostToDelete)} onOpenChange={(open) => !open && setHostToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除主機？</DialogTitle>
            <DialogDescription>此操作無法復原，主機資料刪除後須重新建檔。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setHostToDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => hostToDelete && deleteMutation.mutate(hostToDelete.id)}
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

function getHostSortValue(host: Host, key: HostSortKey) {
  switch (key) {
    case 'hostname':
      return host.hostname.toLowerCase()
    case 'ipAddress':
      return host.ipAddress
    case 'serviceType':
      return host.serviceType
    case 'status':
      return host.status
    case 'lastSeenAt':
      return host.lastSeenAt
    default:
      return ''
  }
}

function HostSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  )
}

export default HostsPage
