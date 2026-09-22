/**
 * Inline SVG nodes for the content-script password strength pill. Paths match
 * `lockwright-lib-ui-react-native-components` `dist/icons/components` (no React / innerHTML).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function createInlineIcon({ viewBox, width, height, color, paths, dataIcon }) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('data-pearpass-icon', dataIcon)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('aria-hidden', 'true')
  svg.style.color = color
  svg.style.display = 'block'
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('fill', 'currentColor')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }
  return svg
}

const PEARPASS_LOGO_PATHS = [
  'M13.227 14.04H6.984v.598h6.243z',
  'M13.23 14.277H3V15h10.23zM13.227 12.953H6.984v.6h6.243z',
  'M13.23 13.191H3v.722h10.23zM13.227 11.867H6.984v.6h6.243z',
  'M13.23 12.106H3v.72h10.23zM13.227 10.781H6.984v.6h6.243z',
  'M13.23 11.02H3v.72h10.23zM13.227 9.695H6.984v.6h6.243z',
  'M13.23 9.934H3v.721h10.23zM13.227 8.605H6.984v.6h6.243z',
  'M13.23 8.844H3v.721h10.23zM13.227 7.52H6.984v.599h6.243z',
  'M13.23 7.758H3v.721h10.23zM5.926 6.672H3.672v.721h2.254zM12.418 6.434h-1.41v.599h1.41z',
  'M5.926 6.434h-1.41v.599h1.41zM12.418 6.672h-2.254v.721h2.254zM5.926 5.586H3.672v.721h2.254zM12.418 5.348h-1.41v.599h1.41z',
  'M5.926 5.348h-1.41v.599h1.41zM12.418 5.586h-2.254v.721h2.254zM5.926 4.5H3.672v.721h2.254zM12.418 4.262h-1.41v.599h1.41z',
  'M5.926 4.262h-1.41v.599h1.41zM12.418 4.5h-2.254v.721h2.254zM6.379 3.414H4.125v.721h2.254zM12.02 3.172h-1.41v.599h1.41z',
  'M6.37 3.172H4.96v.599h1.41zM12.02 3.414H9.765v.721h2.253zM11.181 2.086H6.93v.599h4.251z',
  'M11.18 2.324H4.96v.722h6.22zM10.279 1H7.164v.599h3.115z',
  'M10.275 1.238H5.688v.722h4.587z'
]

/** @param {string} color */
export function pearpassLogoSvg(color) {
  return createInlineIcon({
    viewBox: '0 0 16 16',
    width: 14,
    height: 14,
    color,
    paths: PEARPASS_LOGO_PATHS,
    dataIcon: 'pearpass-logo'
  })
}

/** @param {string} color */
export function verifiedUserSvg(color) {
  return createInlineIcon({
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    color,
    paths: [
      'm6 .5-4.5 2v3c0 2.775 1.92 5.37 4.5 6 2.58-.63 4.5-3.225 4.5-6v-3zm3.5 5c0 2.26-1.49 4.345-3.5 4.965C3.99 9.845 2.5 7.76 2.5 5.5V3.15L6 1.595 9.5 3.15zm-5.795.295L3 6.5l2 2 4-4-.705-.71L5 7.085z'
    ],
    dataIcon: 'verified-user'
  })
}

/** @param {string} color */
export function gppMaybeSvg(color) {
  return createInlineIcon({
    viewBox: '1 0.5 10 11',
    width: 12,
    height: 12,
    color,
    paths: [
      'M6 1 2 2.5v3.045C2 8.07 3.705 10.425 6 11c2.295-.575 4-2.93 4-5.455V2.5zm3 4.545c0 2-1.275 3.85-3 4.415-1.725-.565-3-2.41-3-4.415v-2.35L6 2.07l3 1.125z',
      'M6.5 7h-1v1h1zM6.5 3.5h-1V6h1z'
    ],
    dataIcon: 'gpp-maybe'
  })
}

/** @param {string} color */
export function gppBadSvg(color) {
  return createInlineIcon({
    viewBox: '0 0 12 12',
    width: 12,
    height: 12,
    color,
    paths: [
      'M6 1 2 2.5v3.045C2 8.07 3.705 10.425 6 11c2.295-.575 4-2.93 4-5.455V2.5zm3 4.545c0 2-1.275 3.85-3 4.415-1.725-.565-3-2.41-3-4.415v-2.35L6 2.07l3 1.125zM4.955 4.25l-.705.705L5.295 6 4.25 7.045l.705.705L6 6.71l1.045 1.04.705-.705L6.71 6l1.04-1.045-.705-.705L6 5.295z'
    ],
    dataIcon: 'gpp-bad'
  })
}
