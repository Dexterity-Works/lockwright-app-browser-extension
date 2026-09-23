import { useEffect, useRef } from 'react'

import { AUTHENTICATOR_ENABLED } from 'lockwright-lib-constants'
import { rawTokens, useTheme } from 'lockwright-lib-ui-react-native-components'

import { useRedirect } from './hooks/useRedirect'
import { useWindowResize } from './hooks/useWindowResize'
import { Loading } from './Loading'
import { Routes } from './Routes'
import { DYNAMIC_WINDOW_MAX_HEIGHT } from '../../shared/constants/windowSizes'
import { LayoutWithSidebar } from '../../shared/containers/LayoutWithSidebar'
import { useBlockingStateContext } from '../../shared/context/BlockingStateContext'
import { useGlobalLoading } from '../../shared/context/LoadingContext'
import { useRouter } from '../../shared/context/RouterContext'
import { useVaultAccessRevoked } from '../../shared/hooks/useVaultAccessRevoked'
import { applyActionPopupDocumentSize } from '../../shared/utils/actionPopupSize'
import { isFirefox } from '../../shared/utils/isFirefox'
import { AppHeaderContainer } from '../containers/AppHeaderContainer'

const RESIZE_HANDLE_SIZE = 14

export const App = () => {
  const { isChecking: isBlockingStateChecking } = useBlockingStateContext()
  const { isLoading: isRedirectLoading } = useRedirect()
  const { currentPage } = useRouter()
  const { theme } = useTheme()
  const windowSize = useWindowResize()
  const containerRef = useRef(null)
  const observerRef = useRef(null)
  const dragRef = useRef(null)

  const isLoading = isBlockingStateChecking || isRedirectLoading
  const isResizable = windowSize.isResizable === true

  useGlobalLoading({ isLoading })

  useVaultAccessRevoked()

  const containerClassName = 'bg-background flex flex-col'

  const heightStyle =
    windowSize.height !== null && windowSize.height !== undefined
      ? { height: `${windowSize.height}px` }
      : windowSize.minHeight !== null && windowSize.minHeight !== undefined
        ? { minHeight: `${windowSize.minHeight}px` }
        : {}

  // Keep documentElement/body in sync so Firefox toolbar panels follow content size.
  // Drop the first-layout size on passkey/dynamic so those flows stay content-sized.
  useEffect(() => {
    if (!isResizable) {
      if (typeof document === 'undefined') return
      document
        .querySelectorAll('style[data-lockwright-popup-size="boot"]')
        .forEach((node) => node.remove())
      for (const el of [document.documentElement, document.body]) {
        if (!el?.style) continue
        el.style.width = ''
        el.style.height = ''
        el.style.minWidth = ''
        el.style.minHeight = ''
      }
      return
    }
    if (windowSize.width === null || windowSize.width === undefined) return
    if (windowSize.height === null || windowSize.height === undefined) return
    applyActionPopupDocumentSize({
      width: windowSize.width,
      height: windowSize.height
    })
  }, [isResizable, windowSize.width, windowSize.height])

  // For dynamic-height pages (v2 passkey flow): measure the rendered content
  // height and keep the Chrome popup window in sync via ResizeObserver.
  // Skip on Firefox/Zen — browser-action panels are not resizable popup windows.
  useEffect(() => {
    if (!windowSize.dynamic || isFirefox()) {
      observerRef.current?.disconnect()
      observerRef.current = null
      return
    }

    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    let cancelled = false

    chrome.windows.getCurrent?.((currentWindow) => {
      if (cancelled) return
      if (chrome.runtime.lastError || currentWindow?.type !== 'popup') return

      observerRef.current?.disconnect()

      const computeClampedHeight = (rawContentHeight) => {
        const contentHeight = Math.ceil(rawContentHeight)
        if (!contentHeight) return null
        const frameHeight = Math.max(0, window.outerHeight - window.innerHeight)
        return Math.min(
          DYNAMIC_WINDOW_MAX_HEIGHT + frameHeight,
          contentHeight + frameHeight
        )
      }

      // Immediate first sync — don't wait for the async ResizeObserver to fire
      // (during which the OS shows the window at its default opening size).
      const initialHeight = computeClampedHeight(
        el.getBoundingClientRect().height
      )
      if (initialHeight) {
        chrome.windows.update?.(currentWindow.id, { height: initialHeight })
      }

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const blockSize =
            entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
          const clampedHeight = computeClampedHeight(blockSize)
          if (clampedHeight === null) continue
          chrome.windows.update?.(currentWindow.id, {
            height: clampedHeight
          })
        }
      })

      observer.observe(el)
      observerRef.current = observer
    })

    return () => {
      cancelled = true
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [windowSize.dynamic])

  const handleResizePointerDown = (event) => {
    if (!isResizable || typeof windowSize.setSize !== 'function') return
    if (
      event.button !== undefined &&
      event.button !== null &&
      event.button !== 0
    )
      return

    event.preventDefault()
    event.stopPropagation()

    const setSize = windowSize.setSize
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = windowSize.width
    const startHeight = windowSize.height
    const pointerId = event.pointerId
    const target = event.currentTarget

    dragRef.current = { pointerId, target }

    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(pointerId)
      } catch {
        // Ignore capture failures (e.g. inactive pointer).
      }
    }

    const onPointerMove = (moveEvent) => {
      if (!dragRef.current) return
      setSize({
        width: startWidth + (moveEvent.clientX - startX),
        height: startHeight + (moveEvent.clientY - startY)
      })
    }

    const onPointerUp = () => {
      const drag = dragRef.current
      dragRef.current = null

      if (
        drag?.target &&
        typeof drag.target.releasePointerCapture === 'function' &&
        drag.pointerId !== undefined &&
        drag.pointerId !== null
      ) {
        try {
          drag.target.releasePointerCapture(drag.pointerId)
        } catch {
          // Pointer may already be released.
        }
      }

      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const containerStyle = {
    ...heightStyle,
    width: `${windowSize.width}px`,
    overflow: 'auto',
    padding: '4px',
    border: `1px solid ${theme.colors.colorBorderTertiary}`,
    borderRadius: `${rawTokens.radius8}px`,
    boxSizing: 'border-box',
    position: 'relative'
  }

  const resizeHandleStyle = {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: `${RESIZE_HANDLE_SIZE}px`,
    height: `${RESIZE_HANDLE_SIZE}px`,
    cursor: 'nwse-resize',
    touchAction: 'none',
    zIndex: 20,
    borderRight: `2px solid ${theme.colors.colorBorderPrimary}`,
    borderBottom: `2px solid ${theme.colors.colorBorderPrimary}`,
    backgroundColor: theme.colors.colorSurfaceSecondary,
    boxSizing: 'border-box',
    opacity: 0.85
  }

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={containerStyle}
    >
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <AppHeaderContainer />
          <div className="flex min-h-0 flex-1 flex-col">
            {currentPage === 'vault' ||
            currentPage === 'generator' ||
            (AUTHENTICATOR_ENABLED && currentPage === 'authenticator') ? (
              <LayoutWithSidebar mainView={<Routes />} />
            ) : (
              <Routes />
            )}
          </div>
        </>
      )}
      {isResizable ? (
        <div
          role="separator"
          aria-label="Resize popup"
          aria-orientation="horizontal"
          data-testid="action-popup-resize-handle"
          style={resizeHandleStyle}
          onPointerDown={handleResizePointerDown}
        />
      ) : null}
    </div>
  )
}
