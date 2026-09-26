import { formatDate, isBefore, subtractDateUnits } from './date'

// Expected values were captured from lockwright-utils-date before it was replaced.
describe('formatDate', () => {
  const date = new Date(2025, 4, 6, 14, 7, 9)

  it('formats the component patterns used in the app', () => {
    expect(formatDate(date, 'dd-mm-yy', '/')).toBe('06/05/25')
    expect(formatDate(date, 'hh-mi', ':')).toBe('14:07')
    expect(formatDate(date, 'dd-mmm-yyyy', ' ')).toBe('06 May 2025')
    expect(formatDate(date, 'dd-mm-yyyy', '/')).toBe('06/05/2025')
    expect(formatDate('2025-05-06', 'dd-mm-yyyy', '/')).toBe('06/05/2025')
    expect(
      formatDate(new Date(2025, 0, 3, 4, 5, 6), 'ddd-yyyy-mm-dd-hh-mi-ss', '-')
    ).toBe('Fri-2025-01-03-04-05-06')
  })

  it('throws on an invalid date', () => {
    expect(() => formatDate('nope', 'dd-mm-yy', '/')).toThrow(
      'Invalid date input'
    )
  })
})

describe('isBefore', () => {
  it('compares two dates', () => {
    expect(isBefore('2025-01-01', '2025-01-02')).toBe(true)
    expect(isBefore(new Date(2025, 0, 2), '2025-01-01')).toBe(false)
  })
})

describe('subtractDateUnits', () => {
  const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()]

  it('clamps to the last day of the target month', () => {
    expect(ymd(subtractDateUnits(6, 'month', new Date(2025, 7, 31)))).toEqual([
      2025, 2, 28
    ])
    expect(ymd(subtractDateUnits(1, 'year', new Date(2024, 1, 29)))).toEqual([
      2023, 2, 28
    ])
    expect(ymd(subtractDateUnits(3, 'day', new Date(2025, 2, 1)))).toEqual([
      2025, 2, 26
    ])
  })

  it('defaults to now', () => {
    const result = subtractDateUnits(6, 'month')
    expect(isBefore(result, new Date())).toBe(true)
  })
})
