import React from 'react'

import { render } from '@testing-library/react'

import { PopupCard } from './index'
import '@testing-library/jest-dom'

describe('PopupCard Component', () => {
  it('renders children correctly', () => {
    const { getByText, container } = render(
      <PopupCard>
        <span>Test Child</span>
      </PopupCard>
    )

    expect(getByText('Test Child')).toBeInTheDocument()

    expect(container).toMatchSnapshot()
  })

  it('applies the provided className', () => {
    const { container } = render(
      <PopupCard className="custom-class">
        <span>Test Child</span>
      </PopupCard>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('forwards the ref correctly', () => {
    const ref = React.createRef()
    render(
      <PopupCard ref={ref}>
        <span>Test Child</span>
      </PopupCard>
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current.tagName).toBe('DIV')
  })
})
