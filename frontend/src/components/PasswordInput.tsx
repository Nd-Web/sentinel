import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className={cn(
          'bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/20 h-10 pr-10',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
