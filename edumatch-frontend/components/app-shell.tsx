
'use client'

import { getCurrentUser, logoutUser } from '@/lib/api'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Bookmark,
  ChevronDown,
  Compass,
  LayoutDashboard,
  Menu,
  Sparkles,
  Target,
  X,
  UserRound,
  MessageCircle,
  LogOut,
} from 'lucide-react'

import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useLearnTwin } from '@/lib/learn-twin'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/resources', label: 'Resources', icon: Compass },
  { href: '/saved-resources', label: 'Saved Resources', icon: Bookmark },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/twin-health', label: 'Learning Twin', icon: Sparkles },
]

export function AppShell({
  children,
  contentClassName,
  userLevel,
}: {
  children: React.ReactNode
  contentClassName?: string
  userLevel?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resetTwin } = useLearnTwin()

  const [open, setOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [identity, setIdentity] = useState<{ name: string } | null>(null)
  const [identityStatus, setIdentityStatus] = useState<
    'loading' | 'ready' | 'unavailable'
  >('loading')

  const profileMenuRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch logged-in user's information
  useEffect(() => {
    let active = true

    getCurrentUser()
      .then((user) => {
        if (active) {
          setIdentity({
            name: `${user.first_name} ${user.last_name}`.trim(),
          })
          setIdentityStatus('ready')
        }
      })
      .catch(() => {
        if (active) {
          setIdentity(null)
          setIdentityStatus('unavailable')
        }
      })

    return () => {
      active = false
    }
  }, [])

  // Close profile dropdown on outside click or Escape
  useEffect(() => {
    if (!profileMenuOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
        profileButtonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileMenuOpen])

  // Generate initials
  const initials =
    identity?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  // Sign out
  const handleSignOut = async () => {
    if (signingOut) return

    setSigningOut(true)

    try {
      await logoutUser()

      resetTwin()

      setProfileMenuOpen(false)
      setOpen(false)
      setIdentity(null)
      setIdentityStatus('unavailable')

      router.replace('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out failed:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Unable to sign out. Please try again.'
      )

      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo and desktop navigation */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-indigo-400/15 text-indigo-500 ring-1 ring-inset ring-indigo-400/20">
                <Brain className="size-5" aria-hidden="true" />
              </span>

              <span className="text-lg font-bold tracking-tight">
                Learn<span className="text-indigo-500">Twin</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                      active
                        ? 'bg-indigo-400/15 text-indigo-600 dark:text-indigo-200'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Theme
              </span>

              <ThemeToggle />
            </div>

            {/* Profile dropdown */}
            <div ref={profileMenuRef} className="relative">
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:gap-3 sm:px-2.5"
              >
                {identityStatus === 'loading' ? (
                  <span className="size-9 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-400/15 text-sm font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-400/20 dark:text-indigo-200">
                    {identityStatus === 'ready' ? initials : '?'}
                  </span>
                )}

                <span className="hidden min-w-0 text-left leading-tight sm:block">
                  <span className="block max-w-36 truncate text-xs font-semibold text-foreground">
                    {identityStatus === 'loading'
                      ? 'Loading account…'
                      : identityStatus === 'ready'
                        ? identity?.name || 'Account'
                        : 'Account unavailable'}
                  </span>

                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {identityStatus === 'ready'
                      ? userLevel || 'Learning account'
                      : ''}
                  </span>
                </span>

                <ChevronDown
                  className={cn(
                    'hidden size-4 text-muted-foreground transition-transform sm:block',
                    profileMenuOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Profile dropdown content */}
              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl shadow-black/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">
                      {identityStatus === 'ready' ? initials : '?'}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {identity?.name || 'Student Account'}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {userLevel || 'Learning account'}
                      </p>
                    </div>
                  </div>

                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                  {/* Switch learning topic */}
                  <Link
                    href="/onboarding"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Target className="size-4 text-slate-500 dark:text-slate-400" />
                    Switch Learning Topic
                  </Link>

                  {/* Account information */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      router.push('/profile')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <UserRound className="size-4 text-slate-500 dark:text-slate-400" />
                    Account Information
                  </button>

                  {/* Help and feedback */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false)
                      router.push('/feedback')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <MessageCircle className="size-4 text-slate-500 dark:text-slate-400" />
                    Help & Feedback
                  </button>

                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                  {/* Sign out */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="size-4" />
                    {signingOut ? 'Signing out…' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile navigation button */}
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl md:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label="Toggle navigation menu"
              aria-expanded={open}
            >
              {open ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        {open && (
          <nav className="border-t border-border bg-background px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-indigo-400/15 text-indigo-600 dark:text-indigo-200'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main page content */}
      <main
        className={cn(
          'mx-auto max-w-6xl px-4 py-8 sm:px-6',
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  )
}




