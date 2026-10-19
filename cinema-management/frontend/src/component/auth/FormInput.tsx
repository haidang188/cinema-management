import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  error?: string
}

function FormInput({ label, id, icon, error, type = 'text', ...props }: FormInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const isPassword = type === 'password'
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`au-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="au-input">
        {icon && <span className="au-input-icon" aria-hidden="true">{icon}</span>}
        <input
          id={id}
          type={isPassword && isVisible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="au-input-toggle"
            onClick={() => setIsVisible((value) => !value)}
            aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <small className="au-error" id={errorId}>{error}</small>}
    </div>
  )
}

export default FormInput
