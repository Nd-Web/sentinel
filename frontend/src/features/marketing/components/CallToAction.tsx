import { ArrowRight, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CallToAction() {
  return (
    <section className="py-24 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
          <div className="relative bg-slate-900 border border-slate-700/50 rounded-3xl px-8 py-16 overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Shield className="size-8 text-blue-400" />
              </div>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight">
              Start protecting your{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                network today
              </span>
            </h2>

            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Join telecom operators and banks using Sentinel to stop fraud in real time. Get
              your API key and integrate in under 5 minutes.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-xl shadow-blue-500/25 h-12 px-8 text-sm font-semibold">
                Request a Demo
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 px-8 text-sm"
              >
                Read Documentation
              </Button>
            </div>

            <p className="mt-8 text-xs text-slate-600">
              No credit card required · Enterprise SLAs available · Azure cloud-deployed
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
