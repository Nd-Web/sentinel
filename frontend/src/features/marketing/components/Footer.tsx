import { Shield } from 'lucide-react'

const links = {
  Product: ['Features', 'How It Works', 'Use Cases', 'Pricing', 'Changelog'],
  Developers: ['API Reference', 'SDKs', 'Webhooks', 'Status', 'Postman Collection'],
  Company: ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance'],
}

export default function Footer() {
  return (
    <footer className="bg-slate-900/60 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
                <Shield className="size-4 text-blue-400" />
              </div>
              <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
            </a>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              Enterprise-grade AI fraud intelligence for telecom operators and financial
              institutions.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </div>
          </div>

          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-500 text-sm hover:text-slate-300 transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Sentinel AI. All rights reserved.
          </p>
          <p className="text-slate-700 text-xs">
            Built for the Hackathon · Trust, Safety & Fraud Intelligence in Telecom Networks
          </p>
        </div>
      </div>
    </footer>
  )
}
