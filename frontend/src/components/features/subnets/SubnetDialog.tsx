import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Palette, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { SubnetWithHosts } from '@/types'

const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/

const subnetSchema = z.object({
  name: z.string().min(2, '名稱至少二個字元'),
  cidr: z.string().regex(cidrRegex, '請輸入正確的 CIDR 格式，如 192.168.0.0/24'),
  description: z.string().optional(),
  color: z.string().min(4).max(9),
})

type SubnetFormValues = z.infer<typeof subnetSchema>

export interface SubnetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: SubnetWithHosts | null
  onSubmit: (values: SubnetFormValues) => Promise<void>
  title?: string
}

export function SubnetDialog({ open, onOpenChange, initialValue, onSubmit, title = '新增網段' }: SubnetDialogProps) {
  const form = useForm<SubnetFormValues>({
    resolver: zodResolver(subnetSchema),
    defaultValues: {
      name: '',
      cidr: '',
      description: '',
      color: '#2563eb',
    },
  })

  const isSubmitting = form.formState.isSubmitting

  useEffect(() => {
    if (initialValue) {
      form.reset({
        name: initialValue.name,
        cidr: initialValue.cidr,
        description: initialValue.description ?? '',
        color: initialValue.color ?? '#2563eb',
      })
    } else {
      form.reset({ name: '', cidr: '', description: '', color: '#2563eb' })
    }
  }, [initialValue, form])

  async function handleSubmit(values: SubnetFormValues) {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>網段名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：辦公室內網" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cidr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>CIDR</FormLabel>
                  <FormControl>
                    <Input placeholder="10.0.0.0/24" {...field} />
                  </FormControl>
                  <FormDescription>系統將根據 CIDR 計算可用 IP 數量。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="描述此網段用途" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>顏色識別</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input type="color" className="h-10 w-16 cursor-pointer border" {...field} />
                    </FormControl>
                    <div className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                      <Palette className="h-4 w-4 text-primary" />
                      選擇網段標示色
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? '儲存中...' : '儲存變更'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export type { SubnetFormValues }
