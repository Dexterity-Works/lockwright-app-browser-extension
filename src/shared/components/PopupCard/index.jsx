import React, { forwardRef } from 'react'

/**
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {function} [props.onClick]
 * @param {React.Ref<HTMLDivElement>} ref
 *
 */
export const PopupCard = forwardRef(({ children, className, onClick }, ref) => (
  <div
    ref={ref}
    className={[
      'border-grey100-mode1 bg-grey500-mode1 overflow-hidden rounded-xl border border-solid p-5',
      className
    ]
      .filter(Boolean)
      .join(' ')}
    onClick={onClick}
  >
    {children}
  </div>
))
