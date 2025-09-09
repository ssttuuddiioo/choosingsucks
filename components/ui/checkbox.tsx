import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center space-x-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only peer"
            ref={ref}
            {...props}
          />
          <div
            className={cn(
              'h-5 w-5 rounded border-2 border-gray-300 bg-white transition-colors',
              'peer-checked:border-blue-500 peer-checked:bg-blue-500',
              'peer-focus:ring-2 peer-focus:ring-blue-200',
              className
            )}
          >
            {props.checked && (
              <Check className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
            )}
          </div>
        </div>
        {label && (
          <span className="text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }


