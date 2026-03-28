// Locale switcher refs:
// - Paraglide docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
// - Router example: https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#switching-locale
import { m } from '#/locale/messages'
import { getLocale, locales, setLocale } from '#/locale/runtime'

export default function LocaleSwitcher() {
  const currentLocale = getLocale()

  return (
    <div className="flex items-center gap-2" aria-label={m.language_label()}>
      <div className="flex gap-2">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => setLocale(locale)}
            aria-pressed={locale === currentLocale}
            style={{
              cursor: 'pointer',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid #d1d5db',
              background: locale === currentLocale ? '#0f172a' : 'transparent',
              color: locale === currentLocale ? '#f8fafc' : 'inherit',
              fontWeight: locale === currentLocale ? 700 : 500,
              letterSpacing: '0.01em',
            }}
          >
            {locale.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
