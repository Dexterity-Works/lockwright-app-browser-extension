import React from 'react'

import { render, fireEvent, screen } from '@testing-library/react'

import { ModalProvider, useModal, useModalId } from './ModalContext'
import { BASE_TRANSITION_DURATION } from '../constants/transitions'
import '@testing-library/jest-dom'

jest.mock('../containers/Overlay', () => ({
  Overlay: ({ children, onClick }) => (
    <div role="dialog" aria-label="overlay" onClick={onClick}>
      {children}
    </div>
  )
}))
jest.mock('./LoadingContext', () => ({
  useLoadingContext: jest.fn(() => ({
    setIsLoading: jest.fn()
  }))
}))

jest.useFakeTimers()

const TestComponent = () => {
  const { setModal, closeModal } = useModal()

  return (
    <div>
      <button onClick={() => setModal(<div>Modal Content</div>, {})}>
        Open Modal
      </button>
      <button onClick={closeModal}>Close Modal</button>
    </div>
  )
}

describe('ModalContext', () => {
  const renderWithProvider = (ui) => render(<ModalProvider>{ui}</ModalProvider>)

  it('should open a modal when setModal is called', () => {
    renderWithProvider(<TestComponent />)

    fireEvent.click(screen.getByText('Open Modal'))

    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('should close the modal when closeModal is called', () => {
    renderWithProvider(<TestComponent />)

    fireEvent.click(screen.getByText('Open Modal'))
    fireEvent.click(screen.getByText('Close Modal'))

    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument()
  })

  // Stands in for the revoke dialog: blocks closing, and a second modal can
  // land on top before its work finishes.
  const Busy = () => {
    const { setModal, closeModal, setCloseable } = useModal()
    const id = useModalId()
    return (
      <div>
        <button onClick={() => setCloseable(id, false)}>Start work</button>
        <button onClick={() => setModal(<div>Top modal</div>)}>Push top</button>
        <button onClick={() => setCloseable(id, true)}>Allow close</button>
        <button onClick={() => closeModal(id)}>Finish work</button>
      </div>
    )
  }
  const Opener = () => {
    const { setModal } = useModal()
    return <button onClick={() => setModal(<Busy />)}>Open Busy</button>
  }

  it('closes only its own entry when another modal was pushed on top', () => {
    renderWithProvider(<Opener />)

    fireEvent.click(screen.getByText('Open Busy'))
    fireEvent.click(screen.getByText('Push top'))
    fireEvent.click(screen.getByText('Finish work'))
    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)

    expect(screen.queryByText('Start work')).not.toBeInTheDocument()
    expect(screen.getByText('Top modal')).toBeInTheDocument()
  })

  it('sets closeable on its own entry, not the modal on top', () => {
    renderWithProvider(<Opener />)

    fireEvent.click(screen.getByText('Open Busy'))
    fireEvent.click(screen.getByText('Start work'))
    fireEvent.click(screen.getByText('Push top'))
    fireEvent.click(screen.getByText('Allow close'))

    fireEvent.keyDown(window, { key: 'Escape' })
    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)
    expect(screen.queryByText('Top modal')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)
    expect(screen.queryByText('Start work')).not.toBeInTheDocument()
  })

  it('ignores Escape while the open modal marks itself not closeable', () => {
    renderWithProvider(<Opener />)

    fireEvent.click(screen.getByText('Open Busy'))
    fireEvent.click(screen.getByText('Start work'))
    fireEvent.keyDown(window, { key: 'Escape' })
    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)

    expect(screen.getByText('Start work')).toBeInTheDocument()
  })

  it('should close the modal when Escape key is pressed', () => {
    renderWithProvider(<TestComponent />)

    fireEvent.click(screen.getByText('Open Modal'))
    fireEvent.keyDown(window, { key: 'Escape' })

    jest.advanceTimersByTime(BASE_TRANSITION_DURATION)

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Modal is open')).not.toBeInTheDocument()
  })

  it('should render an overlay if hasOverlay is true', () => {
    const TestComponentWithOverlay = () => {
      const { setModal } = useModal()
      return (
        <button
          onClick={() =>
            setModal(<div>Modal Content</div>, { hasOverlay: true })
          }
        >
          Open Modal With Overlay
        </button>
      )
    }
    renderWithProvider(<TestComponentWithOverlay />)

    fireEvent.click(screen.getByText('Open Modal With Overlay'))

    expect(screen.getByRole('dialog', { name: /overlay/i })).toBeInTheDocument()
  })

  it('should not render an overlay if hasOverlay is false', () => {
    const TestComponentWithoutOverlay = () => {
      const { setModal } = useModal()

      return (
        <button
          onClick={() =>
            setModal(<div>Modal Content</div>, { hasOverlay: false })
          }
        >
          Open Modal Without Overlay
        </button>
      )
    }

    renderWithProvider(<TestComponentWithoutOverlay />)

    fireEvent.click(screen.getByText('Open Modal Without Overlay'))

    expect(
      screen.queryByRole('dialog', { name: /overlay/i })
    ).not.toBeInTheDocument()
  })

  it('should not render an overlay by default', () => {
    renderWithProvider(<TestComponent />)

    fireEvent.click(screen.getByText('Open Modal'))

    expect(
      screen.queryByRole('dialog', { name: /overlay/i })
    ).not.toBeInTheDocument()
  })
})
