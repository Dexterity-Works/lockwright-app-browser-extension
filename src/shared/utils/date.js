const toDate = (input) => {
  const date = new Date(input)
  if (isNaN(date.getTime())) throw new Error('Invalid date input')
  return date
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * @param {string|number|Date} dateInput
 * @param {string} format dash-separated components: yyyy, yy, mm, mmm, dd, ddd, hh, mi, ss
 * @param {string} separator
 * @returns {string}
 */
export const formatDate = (
  dateInput,
  format = 'yyyy-mm-dd',
  separator = '-'
) => {
  const date = toDate(dateInput)
  const parts = {
    yyyy: date.getFullYear(),
    yy: String(date.getFullYear()).slice(-2),
    mm: pad(date.getMonth() + 1),
    mmm: date.toLocaleString('en-US', { month: 'short' }),
    dd: pad(date.getDate()),
    ddd: date.toLocaleString('en-US', { weekday: 'short' }),
    hh: pad(date.getHours()),
    mi: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  }
  return format
    .toLowerCase()
    .split('-')
    .map((component) => parts[component] ?? component)
    .join(separator)
}

/**
 * @param {string|number|Date} date1
 * @param {string|number|Date} date2
 * @returns {boolean}
 */
export const isBefore = (date1, date2) => toDate(date1) < toDate(date2)

/**
 * @param {number} amount
 * @param {'day'|'month'|'year'} unit
 * @param {string|number|Date} [fromDate]
 * @returns {Date}
 */
export const subtractDateUnits = (amount, unit, fromDate = new Date()) => {
  const date = toDate(fromDate)
  if (unit === 'day') {
    date.setDate(date.getDate() - amount)
    return date
  }
  const months = unit === 'year' ? amount * 12 : amount
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() - months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date
}
