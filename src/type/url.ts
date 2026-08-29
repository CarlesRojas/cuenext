import { CATEGORY_SLUGS } from '#/type/category'
import z from 'zod'

export const UrlParamsSchema = z.object({
  query: z.string().optional(),
  media: z.enum(['movie', 'tv']).optional(),
  category: z.enum(CATEGORY_SLUGS).optional().catch(undefined),
})

export type UrlParams = z.infer<typeof UrlParamsSchema>
