import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Cpu, Save, Tags } from 'lucide-react'

import type { CheckedState } from '@radix-ui/react-checkbox'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Host, HostTag, HostStatus, ServiceType, Subnet } from '@/types'
import { cn } from '@/lib/utils'

const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/
const macRegex = /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

const hostSchema = z.object({
  hostname: z.string().min(2, '主機名稱至少二個字元'),
  ipAddress: z.string().regex(ipRegex, '請輸入正確的 IPv4 位址'),
  macAddress: z.string().regex(macRegex, '請輸入正確的 MAC 位址 (AA:BB:CC:DD:EE:FF)'),
  subnetId: z.string().min(1, '請選擇網段'),
  serviceType: z.custom<ServiceType>(),
  status: z.custom<HostStatus>(),
  os: z.string().min(2, '請輸入作業系統資訊'),
  description: z.string().optional(),
  tags: z.array(z.string()),
})

type HostFormValues = z.infer<typeof hostSchema>

interface HostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: Host | null
  subnets: Subnet[]
  availableTags: HostTag[]
  onSubmit: (values: HostFormValues) => Promise<void>
  onCheckIpConflict?: (ip: string, hostId?: string) => Promise<boolean>
}

export function HostDialog({
  open,
  onOpenChange,
  initialValue,
  subnets,
  availableTags,
  onSubmit,
  onCheckIpConflict,
}: HostDialogProps) {
  const form = useForm<HostFormValues>({
    resolver: zodResolver(hostSchema),
    defaultValues: {
      hostname: '',
      ipAddress: '',
      macAddress: '',
      subnetId: '',
      serviceType: 'Web',
      status: 'online',
      os: '',
      description: '',
      tags: [],
    },
  })
  const [ipConflict, setIpConflict] = useState(false)
  const [checkingIp, setCheckingIp] = useState(false)

  useEffect(() => {
    if (initialValue) {
      form.reset({
        hostname: initialValue.hostname,
        ipAddress: initialValue.ipAddress,
        macAddress: initialValue.macAddress,
        subnetId: initialValue.subnetId,
        serviceType: initialValue.serviceType,
        status: initialValue.status,
        os: initialValue.os,
        description: initialValue.description ?? '',
        tags: initialValue.tags.map((tag) => tag.id),
      })
    } else {
      form.reset({
        hostname: '',
        ipAddress: '',
        macAddress: '',
        subnetId: subnets[0]?.id ?? '',
        serviceType: 'Web',
        status: 'online',
        os: '',
        description: '',
        tags: [],
      })
    }
    setIpConflict(false)
  }, [initialValue, form, subnets])

  const ipValue = form.watch('ipAddress')

  useEffect(() => {
    if (!onCheckIpConflict || !ipValue || !ipRegex.test(ipValue)) {
      setIpConflict(false)
      return
    }

    let cancelled = false
    setCheckingIp(true)
    const timer = setTimeout(async () => {
      try {
        const conflict = await onCheckIpConflict(ipValue, initialValue?.id)
        if (!cancelled) {
          setIpConflict(conflict)
        }
      } finally {
        if (!cancelled) {
          setCheckingIp(false)
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [ipValue, onCheckIpConflict, initialValue?.id])

  async function handleSubmit(values: HostFormValues) {
    if (ipConflict) return
    await onSubmit(values)
    onOpenChange(false)
  }

  const isSubmitting = form.formState.isSubmitting

  const subnetOptions = useMemo(
    () =>
      subnets.map((subnet) => ({
        label: `${subnet.name} (${subnet.cidr})`,
        value: subnet.id,
      })),
    [subnets]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialValue ? '編輯主機' : '新增主機'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="hostname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>主機名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="web-server-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>IP 位址</FormLabel>
                  <FormControl>
                    <Input placeholder="10.10.0.12" {...field} />
                  </FormControl>
                  <FormDescription>
                    系統將即時檢查 IP 衝突。{checkingIp ? '檢查中...' : ipConflict ? '發現重複 IP，請重新輸入。' : ''}
                  </FormDescription>
                  {ipConflict ? <p className="text-xs font-semibold text-destructive">此 IP 已存在於其它主機，請確認。</p> : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="macAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>MAC 位址</FormLabel>
                  <FormControl>
                    <Input placeholder="AA:BB:CC:DD:EE:FF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subnetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>所屬網段</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇網段" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subnetOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>服務類型</FormLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value as HostFormValues['serviceType'])}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇服務" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>狀態</FormLabel>
                  <Select value={field.value} onValueChange={(value) => field.onChange(value as HostFormValues['status'])}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇狀態" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="online">線上</SelectItem>
                      <SelectItem value="offline">離線</SelectItem>
                      <SelectItem value="idle">閒置</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="os"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>作業系統</FormLabel>
                  <FormControl>
                    <Input placeholder="Ubuntu 22.04" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>標籤</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">尚無可用標籤</p>
                    ) : (
                      availableTags.map((tag) => {
                        const checked = field.value?.includes(tag.id)
                        return (
                          <label
                            key={tag.id}
                            className={cn(
                              'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-sm transition-colors',
                              checked ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(checkedState: CheckedState) => {
                                const next = checkedState === true
                                if (next) {
                                  field.onChange([...(field.value ?? []), tag.id])
                                } else {
                                  field.onChange(field.value?.filter((id) => id !== tag.id) ?? [])
                                }
                              }}
                            />
                            <span className="inline-flex items-center gap-1">
                              <Tags className="h-3.5 w-3.5" style={{ color: tag.color }} />
                              {tag.label}
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                  <FormDescription>可用於分群、權限設定與報表篩選。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>備註</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="輸入任何補充說明" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <Cpu className="h-4 w-4" />
              <span>填寫完整主機資訊，可提升資產盤點與異常偵測準確度。</span>
            </div>

            <DialogFooter className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting || ipConflict}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? '儲存中...' : '儲存主機'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const serviceOptions: { label: string; value: ServiceType }[] = [
  { label: 'Web 服務', value: 'Web' },
  { label: '資料庫', value: 'Database' },
  { label: '應用系統', value: 'Application' },
  { label: '檔案服務', value: 'File' },
  { label: '監控', value: 'Monitoring' },
  { label: '資安', value: 'Security' },
  { label: '其他', value: 'Other' },
]

export type { HostFormValues }
