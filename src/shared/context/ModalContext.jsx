import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

import { BASE_TRANSITION_DURATION } from '../constants/transitions'
import { Overlay } from '../containers/Overlay'

const ModalContext = createContext()
// The id of the modal entry a component is rendered in.
const ModalIdContext = createContext(undefined)

const getDefaultModalParams = () => ({
  hasOverlay: false,
  overlayType: 'default',
  closeable: true,
  fullScreen: false
})

const createModalConfig = (content, params = {}) => ({
  content,
  id: crypto.randomUUID(),
  isOpen: true,
  params: { ...getDefaultModalParams(), ...params }
})

const getTopModal = (modalStack) => modalStack[modalStack.length - 1]

export const ModalProvider = ({ children }) => {
  const [modalStack, setModalStack] = useState([])

  const isOpen = !!modalStack.length

  const setModal = useCallback((content, params) => {
    const modal = createModalConfig(content, params)
    setModalStack((prev) => [...prev, modal])
    return modal.id
  }, [])

  // With a string id, closes that entry only (no-op once it is gone).
  // Otherwise closes the top modal; event arguments from onClick land here.
  const closeModal = useCallback(
    (id) =>
      new Promise((resolve) => {
        const byId = typeof id === 'string'
        setModalStack((prev) => {
          const newStack = [...prev]
          const modal = byId
            ? newStack.find((entry) => entry.id === id)
            : getTopModal(newStack)
          if (modal?.isOpen) {
            modal.isOpen = false
          }
          return newStack
        })

        setTimeout(() => {
          setModalStack((prev) =>
            byId ? prev.filter((entry) => entry.id !== id) : prev.slice(0, -1)
          )
          resolve()
        }, BASE_TRANSITION_DURATION)
      }),
    []
  )

  const closeAllModals = useCallback(() => setModalStack([]), [])

  // Lets a modal block Escape and overlay clicks on its own entry while it
  // is busy. No-op once the entry is gone.
  const setCloseable = useCallback((id, closeable) => {
    setModalStack((prev) =>
      prev.map((entry) =>
        entry.id === id && entry.params.closeable !== closeable
          ? { ...entry, params: { ...entry.params, closeable } }
          : entry
      )
    )
  }, [])

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        const topModal = getTopModal(modalStack)
        if (topModal?.params?.closeable !== false) {
          void closeModal()
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [isOpen, modalStack])

  return (
    <ModalContext.Provider
      value={{ isOpen, setModal, closeModal, closeAllModals, setCloseable }}
    >
      {children}

      {modalStack?.map(({ content, id, isOpen, params }) => (
        <div
          key={id}
          className={`fixed top-0 left-0 z-[999] flex h-full w-screen items-center justify-center`}
        >
          {params.hasOverlay && (
            <Overlay
              onClick={params.closeable !== false ? closeModal : undefined}
              type={params.overlayType}
              isOpen={isOpen}
            />
          )}

          {isOpen && (
            <div
              className={`relative z-[10000] ${params.fullScreen ? 'h-full w-full' : ''}`}
            >
              <ModalIdContext.Provider value={id}>
                {content}
              </ModalIdContext.Provider>
            </div>
          )}
        </div>
      ))}
    </ModalContext.Provider>
  )
}

/**
 * @returns {{
 *   isOpen: boolean,
 *   setModal: (
 *     content: import('react').ReactNode,
 *     params?: {
 *       hasOverlay?: boolean,
 *       overlayType?: string,
 *       closeable?: boolean,
 *       fullScreen?: boolean,
 *     }
 *   ) => string,
 *   closeModal: (id?: string) => Promise<void>,
 *   closeAllModals: () => void,
 *   setCloseable: (id: string, closeable: boolean) => void
 * }}
 */
export const useModal = () => useContext(ModalContext)

/**
 * @returns {string | undefined} id of the modal entry this component is in
 */
export const useModalId = () => useContext(ModalIdContext)
