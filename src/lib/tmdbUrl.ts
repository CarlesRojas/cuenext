// Query strings for TMDB requests.
//
// `URLSearchParams` percent-encodes `/` and `,`, which breaks `append_to_response`:
// `season/1,season/2` arrives as `season%2F1%2Cseason%2F2`, and TMDB silently ignores
// appended sections it does not recognise. The response comes back as an ordinary show with
// no `season/N` keys and no error, so the failure surfaces only as a show page with no
// seasons on it. Both characters are legal in a query component (RFC 3986 §3.4), so they
// are left alone.

export type TmdbParamValue = string | number | boolean | undefined

export function encodeTmdbParam(value: string): string {
  return encodeURIComponent(value).replace(/%2F/g, '/').replace(/%2C/g, ',')
}

// Sorted, so the same request always produces the same string - the cache is keyed on it.
export function tmdbQueryString(params: Record<string, TmdbParamValue>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeTmdbParam(String(value))}`)
    .join('&')
}
