import z from 'zod'

export const UrlParams = z.object({
  query: z.string().optional(),
  media: z.enum(['movie', 'tv']).optional(),
})
