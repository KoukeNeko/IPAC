import { ShieldCheck } from 'lucide-react'
import type { PropsWithChildren } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/60 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-end">
        <div className="max-w-xl space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-sm text-primary">
            <ShieldCheck className="h-4 w-4" />
            IP Network Intelligence
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            IP 管理系統，打造安全可視化的網路環境
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            統一管理網段、主機與存取紀錄，搭配即時監控與報表分析，協助您主動防護與優化資源運用。
          </p>
          <dl className="grid grid-cols-1 gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-foreground">AI 偵測</dt>
              <dd>即時識別 IP 衝突與異常流量</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">資產整合</dt>
              <dd>跨網段視覺化管理所有主機</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">報表洞察</dt>
              <dd>多維度分析服務與使用率</dd>
            </div>
          </dl>
        </div>
        <Card className="w-full max-w-sm border border-border bg-background/90 backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold">登入 IPAC Console</CardTitle>
            <CardDescription>請使用授權帳號登入以繼續</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
