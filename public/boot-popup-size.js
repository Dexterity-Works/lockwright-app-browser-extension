// Zen/Firefox sizes a toolbar panel from the first layout. The viewport
// often starts near 0×0, so a size applied after React mounts stays a pixel.
;(function () {
  const page = (location.hash.match(/^#\/([^?]+)/) || [])[1] || ''
  const passkey =
    page === 'getPasskey' ||
    page === 'createPasskey' ||
    page === 'passkeyLoginCreate'
  const width = passkey ? 375 : 650
  const height = passkey ? 400 : 500
  let style = document.querySelector('style[data-lockwright-popup-size="boot"]')
  if (!style) {
    style = document.createElement('style')
    style.setAttribute('data-lockwright-popup-size', 'boot')
    document.head.appendChild(style)
  }
  style.textContent =
    'html,body{width:' +
    width +
    'px;height:' +
    height +
    'px;min-width:' +
    width +
    'px;min-height:' +
    height +
    'px}'
})()
