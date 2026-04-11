export function categorizeDate(date: Date, currentDate?: Date): string {
  const now = currentDate || new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (itemDate.getTime() === today.getTime()) return 'today'

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (itemDate.getTime() === tomorrow.getTime()) return 'tomorrow'

  const sevenDaysFromNow = new Date(today)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  if (itemDate < sevenDaysFromNow) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return dayNames[itemDate.getDay()]
  }

  if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) return 'this-month'

  if (date.getFullYear() === now.getFullYear()) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    return monthNames[date.getMonth()]
  }

  return 'later'
}

export function getGroupDisplayName(groupKey: string): string {
  switch (groupKey) {
    case 'today':
      return 'Today'
    case 'tomorrow':
      return 'Tomorrow'
    case 'monday':
      return 'Monday'
    case 'tuesday':
      return 'Tuesday'
    case 'wednesday':
      return 'Wednesday'
    case 'thursday':
      return 'Thursday'
    case 'friday':
      return 'Friday'
    case 'saturday':
      return 'Saturday'
    case 'sunday':
      return 'Sunday'
    case 'this-month':
      return 'This Month'
    case 'later':
      return 'Later'
    default:
      return groupKey
  }
}

export function getGroupOrder(groupKey: string, currentDate?: Date): number {
  switch (groupKey) {
    case 'today':
      return 0
    case 'tomorrow':
      return 1
    case 'monday':
    case 'tuesday':
    case 'wednesday':
    case 'thursday':
    case 'friday':
    case 'saturday':
    case 'sunday': {
      const today = currentDate || new Date()
      const currentDayIndex = today.getDay()

      const dayNameToIndex: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      }

      const targetDayIndex = dayNameToIndex[groupKey]

      const tomorrowIndex = (currentDayIndex + 1) % 7
      let daysFromTomorrow = (targetDayIndex - tomorrowIndex + 7) % 7

      if (daysFromTomorrow === 0) daysFromTomorrow = 7

      return 1 + daysFromTomorrow
    }
    case 'this-month':
      return 9
    case 'January':
      return 10
    case 'February':
      return 11
    case 'March':
      return 12
    case 'April':
      return 13
    case 'May':
      return 14
    case 'June':
      return 15
    case 'July':
      return 16
    case 'August':
      return 17
    case 'September':
      return 18
    case 'October':
      return 19
    case 'November':
      return 20
    case 'December':
      return 21
    case 'later':
    default:
      return 999
  }
}
