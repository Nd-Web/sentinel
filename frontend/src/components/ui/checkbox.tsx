import { type ComponentProps, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => (
    <label
      htmlFor={id}
      className="flex items-center gap-2 cursor-pointer group select-none"
    >
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          'size-4 rounded border border-slate-600 bg-slate-800 checked:bg-blue-600 checked:border-blue-600 accent-blue-600 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
          className,
        )}
        {...props}
      />
      {label && (
        <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
          {label}
        </span>
      )}
    </label>
  ),
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
