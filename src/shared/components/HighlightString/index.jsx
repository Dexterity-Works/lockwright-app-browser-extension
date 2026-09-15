import React from 'react'

/**
 * @param {{
 *    text: string
 *    className?: string
 * }} props
 */
export const HighlightString = ({ text, className }) => {
  const highlightText = (text) => {
    const regex = /(\d+|[^a-zA-Z\d\s])/g
    const parts = text.split(regex)

    return parts.map((part, index) => {
      if (/^\d+$/.test(part)) {
        return (
          <span key={index} className="text-primary400-mode1 font-bold">
            {part}
          </span>
        )
      }

      if (/[^a-zA-Z\d\s]/.test(part)) {
        return (
          <span key={index} className="text-categorylogin-mode1 font-bold">
            {part}
          </span>
        )
      }

      return <span key={index}>{part}</span>
    })
  }

  return (
    <span
      className={['text-white-mode1 whitespace-pre-wrap', className]
        .filter(Boolean)
        .join(' ')}
    >
      {highlightText(text)}
    </span>
  )
}
