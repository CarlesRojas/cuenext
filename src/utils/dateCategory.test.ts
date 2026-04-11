import { describe, expect, it } from 'vitest'
import { categorizeDate, getGroupDisplayName, getGroupOrder } from './dateCategory'

describe('categorizeDate', () => {
  describe('today and tomorrow categorization', () => {
    it('should return "today" when date is today', () => {
      const currentDate = new Date('2024-04-10')
      const today = new Date('2024-04-10')
      expect(categorizeDate(today, currentDate)).toBe('today')
    })

    it('should return "tomorrow" when date is tomorrow', () => {
      const currentDate = new Date('2024-04-10')
      const tomorrow = new Date('2024-04-11')
      expect(categorizeDate(tomorrow, currentDate)).toBe('tomorrow')
    })
  })

  describe('next 7 days categorization', () => {
    it('should return correct day name for dates within next 7 days', () => {
      const currentDate = new Date('2024-04-10') // Wednesday

      // Day after tomorrow (Friday)
      const friday = new Date('2024-04-12')
      expect(categorizeDate(friday, currentDate)).toBe('friday')

      // Saturday
      const saturday = new Date('2024-04-13')
      expect(categorizeDate(saturday, currentDate)).toBe('saturday')

      // Sunday
      const sunday = new Date('2024-04-14')
      expect(categorizeDate(sunday, currentDate)).toBe('sunday')

      // Monday (next week)
      const monday = new Date('2024-04-15')
      expect(categorizeDate(monday, currentDate)).toBe('monday')

      // Tuesday (next week)
      const tuesday = new Date('2024-04-16')
      expect(categorizeDate(tuesday, currentDate)).toBe('tuesday')

      // Wednesday (next week)
      const wednesday = new Date('2024-04-17')
      expect(categorizeDate(wednesday, currentDate)).toBe('this-month')
    })

    it('should handle edge case when today is Sunday', () => {
      const currentDate = new Date('2024-04-14') // Sunday

      // Monday (tomorrow)
      const monday = new Date('2024-04-15')
      expect(categorizeDate(monday, currentDate)).toBe('tomorrow')

      // Tuesday
      const tuesday = new Date('2024-04-16')
      expect(categorizeDate(tuesday, currentDate)).toBe('tuesday')

      // Saturday (6 days from now)
      const saturday = new Date('2024-04-20')
      expect(categorizeDate(saturday, currentDate)).toBe('saturday')

      // Saturday (7 days from now)
      const thisMonth = new Date('2024-04-21')
      expect(categorizeDate(thisMonth, currentDate)).toBe('this-month')
    })

    it('should handle edge case when today is Saturday', () => {
      const currentDate = new Date('2024-04-13') // Saturday

      // Sunday (tomorrow)
      const sunday = new Date('2024-04-14')
      expect(categorizeDate(sunday, currentDate)).toBe('tomorrow')

      // Monday
      const monday = new Date('2024-04-15')
      expect(categorizeDate(monday, currentDate)).toBe('monday')

      // Friday (6 days from now)
      const friday = new Date('2024-04-19')
      expect(categorizeDate(friday, currentDate)).toBe('friday')

      // Saturday (7 days from now)
      const thisMonth = new Date('2024-04-20')
      expect(categorizeDate(thisMonth, currentDate)).toBe('this-month')
    })
  })

  describe('this month categorization', () => {
    it('should return "this-month" for dates beyond 7 days but in same month', () => {
      const currentDate = new Date('2024-04-05') // April 5th

      // April 20th (more than 7 days from now)
      const laterInMonth = new Date('2024-04-20')
      expect(categorizeDate(laterInMonth, currentDate)).toBe('this-month')
    })

    it('should return "this-month" for end of month dates', () => {
      const currentDate = new Date('2024-04-01') // April 1st

      // April 30th
      const endOfMonth = new Date('2024-04-30')
      expect(categorizeDate(endOfMonth, currentDate)).toBe('this-month')
    })
  })

  describe('monthly categorization for same year', () => {
    it('should return correct month name for dates in different months of same year', () => {
      const currentDate = new Date('2024-04-15') // April 15th

      expect(categorizeDate(new Date('2024-05-20'), currentDate)).toBe('May')
      expect(categorizeDate(new Date('2024-06-20'), currentDate)).toBe('June')
      expect(categorizeDate(new Date('2024-12-20'), currentDate)).toBe('December')
      expect(categorizeDate(new Date('2025-01-20'), currentDate)).toBe('later')
    })

    it('should handle all 12 months correctly', () => {
      const currentDate = new Date('2024-06-15') // June 15th (middle of year)

      const monthTests = [
        // Only test future months from June 15th
        { month: 6, expected: 'July' },
        { month: 7, expected: 'August' },
        { month: 8, expected: 'September' },
        { month: 9, expected: 'October' },
        { month: 10, expected: 'November' },
        { month: 11, expected: 'December' },
      ]

      monthTests.forEach(({ month, expected }) => {
        const testDate = new Date(2024, month, 20)
        expect(categorizeDate(testDate, currentDate)).toBe(expected)
      })

      // Test past months in next year (they become "later")
      expect(categorizeDate(new Date(2025, 0, 20), currentDate)).toBe('later') // January 2025
      expect(categorizeDate(new Date(2025, 1, 20), currentDate)).toBe('later') // February 2025
    })
  })

  describe('later categorization', () => {
    it('should return "later" for dates in different years', () => {
      const currentDate = new Date('2024-04-15')

      expect(categorizeDate(new Date('2025-06-15'), currentDate)).toBe('later')
      expect(categorizeDate(new Date('2026-06-15'), currentDate)).toBe('later')
      expect(categorizeDate(new Date('2030-12-31'), currentDate)).toBe('later')
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('should handle dates with different time zones correctly', () => {
      const currentDate = new Date('2024-04-15T12:00:00Z')

      // Same date but different time should still be "today"
      const sameDay = new Date('2024-04-15T18:00:00Z') // Same day, just different hour
      expect(categorizeDate(sameDay, currentDate)).toBe('today')
    })

    it('should handle leap year correctly', () => {
      const currentDate = new Date('2024-02-28') // 2024 is a leap year

      const leapDay = new Date('2024-02-29')
      expect(categorizeDate(leapDay, currentDate)).toBe('tomorrow')
    })

    it('should handle month boundaries correctly', () => {
      const currentDate = new Date('2024-01-30') // End of January

      const nextMonth = new Date('2024-02-05') // Early February (within 7 days)
      const dayOfWeek = nextMonth.getDay()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      expect(categorizeDate(nextMonth, currentDate)).toBe(dayNames[dayOfWeek])
    })

    it('should handle year boundaries correctly', () => {
      const currentDate = new Date('2024-12-30') // End of year

      const newYear = new Date('2025-01-02') // New year (within 7 days)
      const dayOfWeek = newYear.getDay()
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      expect(categorizeDate(newYear, currentDate)).toBe(dayNames[dayOfWeek])
    })
  })
})

describe('getGroupDisplayName', () => {
  it('should return correct display names for all predefined categories', () => {
    expect(getGroupDisplayName('today')).toBe('Today')
    expect(getGroupDisplayName('tomorrow')).toBe('Tomorrow')
    expect(getGroupDisplayName('monday')).toBe('Monday')
    expect(getGroupDisplayName('tuesday')).toBe('Tuesday')
    expect(getGroupDisplayName('wednesday')).toBe('Wednesday')
    expect(getGroupDisplayName('thursday')).toBe('Thursday')
    expect(getGroupDisplayName('friday')).toBe('Friday')
    expect(getGroupDisplayName('saturday')).toBe('Saturday')
    expect(getGroupDisplayName('sunday')).toBe('Sunday')
    expect(getGroupDisplayName('this-month')).toBe('This Month')
    expect(getGroupDisplayName('later')).toBe('Later')
  })

  it('should return the original key for unknown categories', () => {
    expect(getGroupDisplayName('custom-category')).toBe('custom-category')
    expect(getGroupDisplayName('January')).toBe('January')
    expect(getGroupDisplayName('')).toBe('')
  })
})

describe('getGroupOrder', () => {
  describe('fixed order categories', () => {
    it('should return correct order for today and tomorrow', () => {
      expect(getGroupOrder('today')).toBe(0)
      expect(getGroupOrder('tomorrow')).toBe(1)
    })

    it('should return correct order for this-month and later', () => {
      expect(getGroupOrder('this-month')).toBe(9)
      expect(getGroupOrder('later')).toBe(999)
    })

    it('should return correct order for month names', () => {
      expect(getGroupOrder('January')).toBe(10)
      expect(getGroupOrder('February')).toBe(11)
      expect(getGroupOrder('March')).toBe(12)
      expect(getGroupOrder('April')).toBe(13)
      expect(getGroupOrder('May')).toBe(14)
      expect(getGroupOrder('June')).toBe(15)
      expect(getGroupOrder('July')).toBe(16)
      expect(getGroupOrder('August')).toBe(17)
      expect(getGroupOrder('September')).toBe(18)
      expect(getGroupOrder('October')).toBe(19)
      expect(getGroupOrder('November')).toBe(20)
      expect(getGroupOrder('December')).toBe(21)
    })
  })

  describe('dynamic weekday ordering', () => {
    it('should order weekdays correctly when today is Wednesday', () => {
      const currentDate = new Date('2024-04-10') // Wednesday

      // Expected order: today(0), tomorrow(1), friday(2), saturday(3), sunday(4), monday(5), tuesday(6), wednesday(7)
      expect(getGroupOrder('today', currentDate)).toBe(0)
      expect(getGroupOrder('tomorrow', currentDate)).toBe(1)
      expect(getGroupOrder('friday', currentDate)).toBe(2) // Day after tomorrow
      expect(getGroupOrder('saturday', currentDate)).toBe(3)
      expect(getGroupOrder('sunday', currentDate)).toBe(4)
      expect(getGroupOrder('monday', currentDate)).toBe(5)
      expect(getGroupOrder('tuesday', currentDate)).toBe(6)
      expect(getGroupOrder('wednesday', currentDate)).toBe(7) // Next Wednesday (6 days from tomorrow)
    })

    it('should order weekdays correctly when today is Friday', () => {
      const currentDate = new Date('2024-04-12') // Friday

      expect(getGroupOrder('today', currentDate)).toBe(0)
      expect(getGroupOrder('tomorrow', currentDate)).toBe(1)
      expect(getGroupOrder('sunday', currentDate)).toBe(2) // Day after tomorrow
      expect(getGroupOrder('monday', currentDate)).toBe(3)
      expect(getGroupOrder('tuesday', currentDate)).toBe(4)
      expect(getGroupOrder('wednesday', currentDate)).toBe(5)
      expect(getGroupOrder('thursday', currentDate)).toBe(6)
      expect(getGroupOrder('friday', currentDate)).toBe(7) // Next Friday
      expect(getGroupOrder('saturday', currentDate)).toBe(8) // Next Saturday (7 days from tomorrow)
    })

    it('should order weekdays correctly when today is Sunday', () => {
      const currentDate = new Date('2024-04-14') // Sunday

      expect(getGroupOrder('today', currentDate)).toBe(0)
      expect(getGroupOrder('tomorrow', currentDate)).toBe(1)
      expect(getGroupOrder('tuesday', currentDate)).toBe(2) // Day after tomorrow
      expect(getGroupOrder('wednesday', currentDate)).toBe(3)
      expect(getGroupOrder('thursday', currentDate)).toBe(4)
      expect(getGroupOrder('friday', currentDate)).toBe(5)
      expect(getGroupOrder('saturday', currentDate)).toBe(6)
      expect(getGroupOrder('sunday', currentDate)).toBe(7) // Next Sunday
      expect(getGroupOrder('monday', currentDate)).toBe(8) // Next Monday (7 days from tomorrow)
    })

    it('should handle all days of the week correctly', () => {
      // Test each day of the week as "today"
      const days = [
        { date: '2024-04-14', day: 'Sunday' }, // Sunday
        { date: '2024-04-15', day: 'Monday' }, // Monday
        { date: '2024-04-16', day: 'Tuesday' }, // Tuesday
        { date: '2024-04-17', day: 'Wednesday' }, // Wednesday
        { date: '2024-04-18', day: 'Thursday' }, // Thursday
        { date: '2024-04-19', day: 'Friday' }, // Friday
        { date: '2024-04-20', day: 'Saturday' }, // Saturday
      ]

      days.forEach(({ date, day }) => {
        const currentDate = new Date(date)

        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const orders = weekdays.map(weekday => getGroupOrder(weekday, currentDate))

        // Ensure all weekday orders are between 2 and 8 (after today=0 and tomorrow=1)
        orders.forEach(order => {
          expect(order).toBeGreaterThanOrEqual(2)
          expect(order).toBeLessThanOrEqual(8)
        })

        // Ensure orders are unique (no two weekdays should have the same order)
        const uniqueOrders = [...new Set(orders)]
        expect(uniqueOrders).toHaveLength(orders.length)
      })
    })
  })

  describe('unknown categories', () => {
    it('should return 999 for unknown categories', () => {
      expect(getGroupOrder('unknown')).toBe(999)
      expect(getGroupOrder('custom-category')).toBe(999)
      expect(getGroupOrder('')).toBe(999)
    })
  })
})

describe('integration tests', () => {
  it('should work together to provide consistent ordering', () => {
    const currentDate = new Date('2024-04-10') // Wednesday

    const testDates = [
      new Date('2024-04-10'), // Today (Wed)
      new Date('2024-04-11'), // Tomorrow (Thu)
      new Date('2024-04-12'), // Friday
      new Date('2024-04-13'), // Saturday
      new Date('2024-04-14'), // Sunday
      new Date('2024-04-15'), // Monday
      new Date('2024-04-16'), // Tuesday
      new Date('2024-04-25'), // Later in April
      new Date('2024-05-15'), // May
      new Date('2025-04-10'), // Next year
    ]

    const categorizedDates = testDates.map(date => ({
      date,
      category: categorizeDate(date, currentDate),
      displayName: getGroupDisplayName(categorizeDate(date, currentDate)),
      order: getGroupOrder(categorizeDate(date, currentDate), currentDate),
    }))

    // Verify ordering is correct
    for (let i = 0; i < categorizedDates.length - 1; i++) {
      expect(categorizedDates[i].order).toBeLessThanOrEqual(categorizedDates[i + 1].order)
    }

    // Verify specific expectations
    expect(categorizedDates[0]).toMatchObject({ category: 'today', order: 0 })
    expect(categorizedDates[1]).toMatchObject({ category: 'tomorrow', order: 1 })
    expect(categorizedDates[2]).toMatchObject({ category: 'friday', order: 2 })
    expect(categorizedDates[7]).toMatchObject({ category: 'this-month', order: 9 })
    expect(categorizedDates[8]).toMatchObject({ category: 'May', order: 14 })
    expect(categorizedDates[9]).toMatchObject({ category: 'later', order: 999 })
  })
})
