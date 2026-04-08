import { useQuery } from '@tanstack/react-query'
import isoCountry from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { useLocalStorage } from 'usehooks-ts'

isoCountry.registerLocale(enLocale)

export interface Country {
  code: isoCountry.Alpha2Code
  name: string
}

async function detectCountryFromIP(): Promise<string> {
  const services = [
    'https://api.country.is/',
    'https://ipapi.co/country_code/',
    'https://get.geojs.io/v1/ip/country.json',
  ]

  for (const service of services) {
    try {
      const response = await fetch(service, {
        signal: AbortSignal.timeout(3000),
      })

      if (!response.ok) continue

      if (service.includes('ipapi.co')) {
        const countryCode = (await response.text()).trim().toUpperCase()
        if (countryCode && countryCode.length === 2) return countryCode
      } else {
        const data = await response.json()
        const countryCode = data.country?.toUpperCase()

        if (countryCode && countryCode.length === 2) return countryCode as string
      }
    } catch (error) {
      continue
    }
  }

  throw new Error('All IP detection services failed')
}

function detectUserCountry(): string | undefined {
  const locale = navigator.language || navigator.languages[0] || undefined
  return locale ? locale.split('-')[1] : undefined
}

export function getCountries(codes: string[]): Country[] {
  return codes
    .map(code =>
      isoCountry.getName(code.toUpperCase(), 'en')
        ? {
            code: code.toUpperCase() as isoCountry.Alpha2Code,
            name: isoCountry.getName(code.toUpperCase(), 'en')!,
          }
        : null,
    )
    .filter(Boolean) as Country[]
}

interface Props {
  onDetected?: (country: Country) => void
}

export function useCountryDetection({ onDetected }: Props) {
  const [cachedCountry, setCachedCountry] = useLocalStorage<Country | null>('CUENEXT_COUNTRY', null)

  return useQuery({
    queryKey: ['country-detection'],
    queryFn: async (): Promise<Country> => {
      if (cachedCountry && cachedCountry.name) {
        onDetected?.(cachedCountry)
        return cachedCountry
      }

      let countryCode: string | undefined = undefined

      try {
        countryCode = await detectCountryFromIP()
      } catch (error) {}

      countryCode = countryCode ?? detectUserCountry()

      const countryName = countryCode ? isoCountry.getName(countryCode.toUpperCase(), 'en') : undefined

      if (!countryName) {
        const fallbackCountry = {
          code: 'ES' as isoCountry.Alpha2Code,
          name: 'Spain',
        }
        setCachedCountry(fallbackCountry)
        return fallbackCountry
      }

      const country = {
        code: (countryCode ?? 'ES') as isoCountry.Alpha2Code,
        name: countryName,
      }

      setCachedCountry(country)
      onDetected?.(country)
      return country
    },
    staleTime: 1000 * 60 * 60 * 24 * 7, // 1 week
    gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week
    retry: false,
  })
}
