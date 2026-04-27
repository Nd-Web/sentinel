import { Radio, Building2, ShieldAlert, Headphones } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface UseCase {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  borderAccent: string
  audience: string
  title: string
  description: string
  points: string[]
}

const useCases: UseCase[] = [
  {
    icon: Radio,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    borderAccent: 'hover:border-blue-500/40',
    audience: 'Telecom Providers',
    title: 'Protect your network and subscribers',
    description: 'Monitor every SMS and voice call traversing your network to identify and block fraud before it reaches customers.',
    points: ['Real-time SMS filtering', 'Bulk scam campaign detection', 'Subscriber risk alerting'],
  },
  {
    icon: Building2,
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    borderAccent: 'hover:border-cyan-500/40',
    audience: 'Banks & Financial Institutions',
    title: 'Stop impersonation and phishing attacks',
    description: 'Intercept fraud attempts targeting your customers via SMS OTP abuse, WhatsApp impersonation, and voice phishing.',
    points: ['OTP fraud prevention', 'Brand impersonation detection', 'Transaction-linked fraud scoring'],
  },
  {
    icon: ShieldAlert,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    borderAccent: 'hover:border-purple-500/40',
    audience: 'Fraud & Risk Teams',
    title: 'Centralised intelligence for your analysts',
    description: 'Give fraud investigators a full-picture dashboard with trend analytics, threat timelines, and actionable risk scores.',
    points: ['Fraud trend analytics', 'Incident drill-down views', 'Rule management & overrides'],
  },
  {
    icon: Headphones,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    borderAccent: 'hover:border-emerald-500/40',
    audience: 'Call Centre Operations',
    title: 'Detect deepfake callers in real time',
    description: "Flag AI-generated or manipulated voice calls before agents engage, protecting your teams and customers from social engineering.",
    points: ['Live deepfake voice scoring', 'Agent risk alerts', 'Post-call audit logging'],
  },
]

export default function UseCases() {
  return (
    <section id="use-cases" className="py-24 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium mb-4">
            Who It's For
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Built for the teams that{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              carry the risk
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Whether you run a telecom network, a bank, or a fraud operations team, Sentinel
            adapts to your threat landscape.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {useCases.map((uc) => (
            <div
              key={uc.audience}
              className={`group bg-slate-900 border border-slate-800 rounded-2xl p-7 transition-colors duration-300 ${uc.borderAccent}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${uc.iconBg} shrink-0`}>
                  <uc.icon className={`size-5 ${uc.iconColor}`} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {uc.audience}
                  </div>
                  <h3 className="text-white font-semibold text-[15px] mb-2">{uc.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">{uc.description}</p>
                  <ul className="space-y-1.5">
                    {uc.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`size-1 rounded-full ${uc.iconColor} bg-current`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
