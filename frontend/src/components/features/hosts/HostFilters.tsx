import { useMemo } from 'react'
import { Filter, Search, Trash } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { HostTag, ServiceType, Subnet } from '@/types'

interface HostFiltersProps {
  subnets: Subnet[]
  tags: HostTag[]
  selectedSubnets: string[]
  selectedServices: ServiceType[]
  selectedStatuses: string[]
  selectedTags: string[]
  onSubnetsChange: (ids: string[]) => void
  onServicesChange: (types: ServiceType[]) => void
  onStatusesChange: (statuses: string[]) => void
  onTagsChange: (tagIds: string[]) => void
  onClear: () => void
  searchKeyword: string
  onSearchChange: (keyword: string) => void
}

export function HostFilters({
  subnets,
  tags,
  selectedSubnets,
  selectedServices,
  selectedStatuses,
  onSubnetsChange,
  onServicesChange,
  onStatusesChange,
  onTagsChange,
  onClear,
  searchKeyword,
  onSearchChange,
  selectedTags,
}: HostFiltersProps) {
  const hasFilter = useMemo(
    () =>
      selectedSubnets.length > 0 ||
      selectedServices.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedTags.length > 0 ||
      searchKeyword.length > 0,
    [selectedSubnets, selectedServices, selectedStatuses, selectedTags, searchKeyword]
  )

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/90 p-4 shadow-sm lg:flex-row lg:items-center lg:gap-4">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={searchKeyword}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜尋主機或 IP..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      <Separator orientation="vertical" className="hidden h-9 lg:block" />

      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="網段"
          items={subnets.map((item) => ({ id: item.id, label: `${item.name} (${item.cidr})` }))}
          selected={selectedSubnets}
          onChange={onSubnetsChange}
        />
        <FilterDropdown
          label="服務"
          items={serviceOptions}
          selected={selectedServices}
          onChange={(values) => onServicesChange(values as ServiceType[])}
        />
        <FilterDropdown
          label="狀態"
          items={statusOptions}
          selected={selectedStatuses}
          onChange={onStatusesChange}
        />

        <FilterDropdown
          label="標籤"
          items={tags.map((tag) => ({ id: tag.id, label: tag.label, color: tag.color }))}
          selected={selectedTags}
          onChange={onTagsChange}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {hasFilter ? <Badge variant="secondary">已套用篩選</Badge> : null}
        <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive">
          <Trash className="mr-1.5 h-4 w-4" /> 清除
        </Button>
      </div>
    </div>
  )
}

interface FilterDropdownProps {
  label: string
  items: { id: string; label: string; color?: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}

function FilterDropdown({ label, items, selected, onChange }: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          <span>{label}</span>
          {selected.length > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">尚無可用選項</p>
        ) : (
          items.map((item) => (
            <DropdownMenuCheckboxItem
              key={item.id}
              checked={selected.includes(item.id)}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                if (isChecked) {
                  onChange([...selected, item.id])
                } else {
                  onChange(selected.filter((id) => id !== item.id))
                }
              }}
            >
              <span className="flex items-center gap-2">
                {item.color ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                ) : null}
                {item.label}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const serviceOptions = [
  { id: 'Web', label: 'Web 服務' },
  { id: 'Database', label: '資料庫' },
  { id: 'Application', label: '應用系統' },
  { id: 'File', label: '檔案服務' },
  { id: 'Monitoring', label: '監控' },
  { id: 'Security', label: '資安' },
  { id: 'Other', label: '其他' },
]

const statusOptions = [
  { id: 'online', label: '線上' },
  { id: 'offline', label: '離線' },
  { id: 'idle', label: '閒置' },
]
