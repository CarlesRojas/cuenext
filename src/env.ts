import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    CONVEX_DEPLOYMENT: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    TMDB_API_KEY: z.string().min(1),
    TMDB_READ_ACCESS_TOKEN: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
  },

  client: {
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_CONVEX_URL: z.url(),
  },

  runtimeEnvStrict: {
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_READ_ACCESS_TOKEN: process.env.TMDB_READ_ACCESS_TOKEN,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,

    VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  },

  emptyStringAsUndefined: true,
  clientPrefix: 'VITE_',
})
