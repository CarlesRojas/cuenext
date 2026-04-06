import z from 'zod'

export const UrlParamsSchema = z.object({
  query: z.string().optional(),
  media: z.enum(['movie', 'tv']).optional(),
})

export type UrlParams = z.infer<typeof UrlParamsSchema>
