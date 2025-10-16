import { toast } from 'sonner'

export function useToast() {
  return {
    toast,
    success: (message: string, description?: string) =>
      toast.success(message, description ? { description } : undefined),
    error: (message: string, description?: string) =>
      toast.error(message, description ? { description } : undefined),
    info: (message: string, description?: string) =>
      toast(message, description ? { description } : undefined),
  }
}
