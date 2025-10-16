import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { ShieldCheck, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.string().email({ message: '請輸入有效的 Email' }),
  password: z.string().min(8, { message: '密碼至少需 8 碼' }),
  rememberMe: z.boolean(),
})

const rememberKey = 'ipac-remember-me'

type LoginValues = z.infer<typeof loginSchema>

function LoginPage() {
  const { login, isAuthenticating } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  useEffect(() => {
    const storedEmail = window.localStorage.getItem(rememberKey)
    if (storedEmail) {
      form.setValue('email', storedEmail)
    }
  }, [form])

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  async function handleSubmit(values: LoginValues) {
    try {
      await login({ email: values.email, token: crypto.randomUUID() })
      if (values.rememberMe) {
        window.localStorage.setItem(rememberKey, values.email)
      } else {
        window.localStorage.removeItem(rememberKey)
      }
      success('登入成功', '歡迎回來，祝您管理順利！')
      navigate(from, { replace: true })
    } catch (err) {
      error('登入失敗', err instanceof Error ? err.message : '請稍後再試')
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">歡迎登入 IP 管理平台</h2>
          <p className="text-sm text-muted-foreground">
            統一控管網段資源、掌握主機狀態，即時偵測異常事件。
          </p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>電子郵件</FormLabel>
                <FormControl>
                  <Input placeholder="admin@example.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>密碼</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="請輸入密碼" autoComplete="current-password" {...field} />
                </FormControl>
                <FormDescription>密碼需包含大小寫字母與數字，以提升安全性。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between text-sm">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl className="flex items-center">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} aria-label="記住帳號" />
                  </FormControl>
                  <FormLabel className="font-normal">記住我</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => form.setValue('password', '')}
            >
              忘記密碼？
            </button>
          </div>

          <Button className="w-full" type="submit" disabled={isAuthenticating}>
            {isAuthenticating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
                驗證中...
              </span>
            ) : (
              '登入'
            )}
          </Button>
        </form>
      </Form>

      <div className="rounded-lg border border-dashed border-border/80 bg-muted/40 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          智慧提示
        </div>
        <p className="mt-2 leading-relaxed">
          登入後即可快速檢視 IP 使用率、偵測衝突事件，並批次操作主機資產。
        </p>
      </div>
    </div>
  )
}

export default LoginPage
