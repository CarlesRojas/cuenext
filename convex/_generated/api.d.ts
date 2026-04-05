/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_tmdbClient from "../lib/tmdbClient.js";
import type * as library from "../library.js";
import type * as nextEpisode from "../nextEpisode.js";
import type * as progress from "../progress.js";
import type * as requireUser from "../requireUser.js";
import type * as stats from "../stats.js";
import type * as tmdb from "../tmdb.js";
import type * as upcoming from "../upcoming.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/tmdbClient": typeof lib_tmdbClient;
  library: typeof library;
  nextEpisode: typeof nextEpisode;
  progress: typeof progress;
  requireUser: typeof requireUser;
  stats: typeof stats;
  tmdb: typeof tmdb;
  upcoming: typeof upcoming;
  watchlist: typeof watchlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
