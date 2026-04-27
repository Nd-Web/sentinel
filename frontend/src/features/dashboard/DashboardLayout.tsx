import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  ScanFace,
  Users,
  Settings,
  User,
  Key,
  ChevronDown,
  LogOut,
  Menu,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { DASHBOARD_ROUTES } from './constants'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: DASHBOARD_ROUTES.ROOT, end: true },
  { label: 'Threats', icon: ShieldAlert, to: DASHBOARD_ROUTES.THREATS },
  { label: 'Deepfake Detection', icon: ScanFace, to: DASHBOARD_ROUTES.DEEPFAKE },
  { label: 'User Management', icon: Users, to: DASHBOARD_ROUTES.USER_MANAGEMENT },
]

const settingsItems = [
  { label: 'Profile', icon: User, to: DASHBOARD_ROUTES.SETTINGS_PROFILE },
  { label: 'API Keys', icon: Key, to: DASHBOARD_ROUTES.SETTINGS_API_KEYS },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
  }`

const subLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive
      ? 'text-blue-400 bg-blue-500/10'
      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
  }`

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const isSettingsActive = location.pathname.startsWith('/dashboard/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  function handleLogout() {
    clearAuth()
    navigate('/sign-in')
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User'

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <Shield className="size-4 text-blue-400" />
          </div>
          <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <Menu className="size-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass} onClick={onClose}>
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}

        {/* Settings accordion */}
        <div>
          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isSettingsActive
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="size-4 shrink-0" />
            <span className="flex-1 text-left">Settings</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {settingsOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
              {settingsItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={subLinkClass} onClick={onClose}>
                  <item.icon className="size-3.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40">
          <div className="size-7 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-300 truncate">{fullName}</div>
            <div className="text-[11px] text-slate-600 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-600 hover:text-red-400 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-60 fixed inset-y-0 z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-60 z-50 flex flex-col lg:hidden">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-blue-500/15 border border-blue-500/25">
              <Shield className="size-3.5 text-blue-400" />
            </div>
            <span className="font-bold text-white tracking-widest text-xs">SENTINEL</span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
