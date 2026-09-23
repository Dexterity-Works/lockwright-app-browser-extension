import React, { useRef, useState } from 'react'

import { NoticeText } from '../NoticeText'

/**
 * @param {{
 *  value?: string,
 *  onChange?: (e?: string) => void,
 *  icon?: React.FC,
 *  label?: string,
 *  error?: string,
 *  additionalItems?: React.ReactNode,
 *  belowInputContent?: React.ReactNode,
 *  placeholder?: string,
 *  readonly?: boolean,
 *  onClick?: (value: string) => void,
 *  type?: 'text' | 'password' | 'url',
 *  variant?: 'default' | 'outline'
 *  overlay?: React.ReactNode
 *  autoFocus?: boolean
 *  className?: string
 *  name?: string
 *  autoComplete?: string
 *  blockAutofill?: boolean
 * }} props
 */
export const InputField = ({
  value,
  onChange,
  icon: Icon,
  label,
  error,
  additionalItems,
  belowInputContent,
  placeholder,
  readonly,
  onClick,
  type = 'text',
  variant = 'default',
  overlay,
  autoFocus,
  className = '',
  name,
  autoComplete,
  blockAutofill = false
}) => {
  const inputRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [autofillUnlocked, setAutofillUnlocked] = useState(false)
  const autofillLocked = blockAutofill && !autofillUnlocked

  const handleChange = (e) => {
    if (readonly || autofillLocked) {
      return
    }
    onChange?.(e.target.value)
  }

  const unlockAutofill = () => {
    if (!blockAutofill || autofillUnlocked) return
    if (inputRef.current) inputRef.current.readOnly = false
    setAutofillUnlocked(true)
  }

  const handleClick = () => {
    unlockAutofill()
    inputRef.current?.focus()
    onClick?.(value)

    if (!readonly) {
      setIsFocused(true)
    }
  }

  const isOutline = variant === 'outline'

  return (
    <div
      onClick={handleClick}
      className={`relative flex w-full flex-col items-start gap-2.5 ${
        isOutline
          ? `hover:border-primary400-mode1 hover:[&+*]:border-t-primary400-mode1 border-grey100-mode1 bg-grey400-mode1 border border-b-0 px-2.5 py-2 first:rounded-t-lg last:rounded-b-lg last:border-b-1`
          : `border-grey100-mode1 not-first:mt-2.5 not-first:border-t not-first:pt-2.5`
      } ${readonly ? 'cursor-copy' : ''} ${className} `}
    >
      <div className="flex w-full items-start gap-2.5">
        {Icon && (
          <div className="mt-[9px] flex-shrink-0">
            <Icon size="24" />
          </div>
        )}

        <div className="flex flex-1 flex-col">
          {label && (
            <span className="text-white-mode1 font-inter text-xs font-normal">
              {label}
            </span>
          )}

          <div className="relative mt-1 flex items-center overflow-x-auto whitespace-nowrap">
            <input
              ref={inputRef}
              type={type}
              name={name}
              value={value}
              onChange={handleChange}
              onMouseDown={unlockAutofill}
              onFocus={() => {
                setIsFocused(true)
                unlockAutofill()
              }}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              readOnly={readonly || autofillLocked}
              autoComplete={autoComplete ?? (blockAutofill ? 'off' : undefined)}
              autoFocus={autoFocus}
              className={`font-inter w-full text-base font-bold ${overlay && !isFocused ? 'caret-primary400-mode1 text-transparent' : 'text-white-mode1'} placeholder:text-grey100-mode1 focus:outline-none ${readonly ? 'cursor-copy' : ''}`}
            />

            {!isFocused && overlay && (
              <div className="font-inter pointer-events-none absolute inset-0 z-10 flex items-center text-base font-bold whitespace-nowrap">
                {overlay}
              </div>
            )}
          </div>

          {!!error && (
            <div className="mt-0.5">
              <NoticeText text={error} type="error" />
            </div>
          )}
        </div>

        {additionalItems && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center justify-end gap-2.5 self-center"
          >
            {additionalItems}
          </div>
        )}
      </div>
      {!!belowInputContent && belowInputContent}
    </div>
  )
}
