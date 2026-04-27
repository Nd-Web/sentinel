import { KeyRound, ScanSearch, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Step {
  number: string
  icon: LucideIcon
  iconColor: string
  title: string
  description: string
  detail: string
}

const steps: Step[] = [
  {
    number: '01',
    icon: KeyRound,
    iconColor: 'text-blue-400',
    title: 'Connect Your Pipeline',
    description: 'Generate an API key and point your SMS gateway, call platform, or WhatsApp business account at the Sentinel endpoint.',
    detail: 'Integrates in under 5 minutes',
  },
  {
    number: '02',
    icon: ScanSearch,
    iconColor: 'text-cyan-400',
    title: 'AI Analyses in Real Time',
    description: 'Every message and call is scored by our LLM-powered pipeline — checking for scam patterns, deepfake signals, and social engineering tactics.',
    detail: '<50ms average response time',
  },
  {
    number: '03',
    icon: ShieldCheck,
    iconColor: 'text-emerald-400',
    title: 'Block, Flag, or Allow',
    description: 'Sentinel returns a risk score and recommended action instantly. Threats are blocked automatically; your team monitors the full picture via dashboard.',
    detail: '99.2% detection accuracy',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium mb-4">
            How It Works
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            From integration to protection{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              in minutes
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Sentinel slots directly into your existing infrastructure. No rip-and-replace, no
            long setup cycles.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 relative">
          <div className="hidden lg:block absolute top-14 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 h-full hover:border-slate-700 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold tracking-widest ${
                      i === 0
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : i === 1
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className={`p-2 rounded-lg bg-slate-800`}>
                    <step.icon className={`size-4 ${step.iconColor}`} />
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{step.description}</p>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/60 rounded-lg px-3 py-2 w-fit">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
