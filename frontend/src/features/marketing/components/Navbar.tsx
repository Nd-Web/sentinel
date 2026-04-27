import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Integration', href: '#integration' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <Shield className="size-4 text-blue-400" />
          </div>
          <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-slate-400 hover:text-white transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/sign-in"
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-colors"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle navigation"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 pb-4">
          <div className="space-y-1 pt-2">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
          <div className="pt-3 flex flex-col gap-2">
            <Link
              to="/sign-in"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
