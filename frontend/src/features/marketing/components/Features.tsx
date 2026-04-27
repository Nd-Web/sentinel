import {
  MessageSquareWarning,
  Mic,
  Activity,
  LayoutDashboard,
  Database,
  Plug,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  description: string
  badge?: string
  badgeColor?: string
}

const features: Feature[] = [
  {
    icon: MessageSquareWarning,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    title: 'Scam Message Detection',
    description:
      'AI-powered analysis of SMS, WhatsApp, and call transcripts to identify phishing, impersonation, and malicious link patterns before they reach end users.',
    badge: 'Core',
    badgeColor: 'bg-red-500/10 text-red-400',
  },
  {
    icon: Mic,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    title: 'Deepfake Voice Detection',
    description:
      'Identifies AI-generated and manipulated voice calls with high confidence scoring. Essential for protecting call centres and preventing voice-based fraud.',
    badge: 'Core',
    badgeColor: 'bg-purple-500/10 text-purple-400',
  },
  {
    icon: Activity,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    title: 'Real-Time Risk Scoring',
    description:
      'Every communication is scored 0–100 based on fraud likelihood using multi-signal analysis, triggering automated actions: block, flag, or allow.',
    badge: 'Core',
    badgeColor: 'bg-blue-500/10 text-blue-400',
  },
  {
    icon: LayoutDashboard,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    title: 'Admin Dashboard',
    description:
      'Centralised interface for monitoring live threats, viewing fraud trend analytics, managing rules, and drilling into individual communication incidents.',
  },
  {
    icon: Database,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    title: 'Audit & Compliance Layer',
    description:
      'Secure storage, immutable logging, and full audit trails for every decision made by the platform — built for regulatory compliance and traceability.',
  },
  {
    icon: Plug,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    title: 'API-First Integration',
    description:
      'Connect Sentinel to any SMS gateway, call system, or communication pipeline in minutes. REST API with SDKs, webhooks, and real-time decision responses.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium mb-4">
            Platform Capabilities
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              fight fraud at scale
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A full-stack fraud intelligence platform that adapts to evolving threats using
            large language models and AI signal analysis.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors duration-300"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${f.iconBg}`}>
                    <f.icon className={`size-5 ${f.iconColor}`} />
                  </div>
                  {f.badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide ${f.badgeColor}`}>
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-semibold mb-2 text-[15px]">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
