import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CircleAlert, GitGraph, Home, ListChecks, Network, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { useMemo } from 'react'

import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type AppLayoutProps = {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { to: '/dashboard', label: '儀表板', icon: Home },
  { to: '/subnets', label: '網段管理', icon: Network },
  { to: '/hosts', label: '主機管理', icon: ListChecks },
  { to: '/reports', label: '報表總覽', icon: GitGraph },
]

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTitle = useMemo(() => {
    const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))
    switch (current?.to) {
      case '/dashboard':
        return 'IP 管理總覽'
      case '/subnets':
        return '網段管理'
      case '/hosts':
        return '主機管理'
      case '/reports':
        return '報表與分析'
      default:
        return 'IPAC'
    }
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card/50 p-6 lg:flex">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>IP Access Control</span>
        </div>
        <Separator className="my-6" />
        <nav className="flex flex-1 flex-col space-y-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          <div className="mt-auto rounded-lg border border-dashed border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <CircleAlert className="h-4 w-4 text-amber-500" />
              快速操作
            </p>
            <p className="mt-2 text-xs leading-relaxed">
              即時處理 IP 衝突、批次標籤與 Ping 主機，提高維運效率。
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full border border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => navigate('/hosts')}
            >
              前往主機列表
            </Button>
          </div>
        </nav>
        <div className="mt-6 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span>版本</span>
          <span>v1.0.0</span>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-xs uppercase text-muted-foreground">IPAC Console</span>
            <h1 className="text-lg font-semibold">{activeTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
              <GitGraph className="mr-2 h-4 w-4" />
              報表
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
