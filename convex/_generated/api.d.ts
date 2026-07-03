/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as episodeInfo from "../episodeInfo.js";
import type * as favorites from "../favorites.js";
import type * as lib_nextEpisodeCompute from "../lib/nextEpisodeCompute.js";
import type * as lib_tmdbClient from "../lib/tmdbClient.js";
import type * as library from "../library.js";
import type * as media from "../media.js";
import type * as movieInfo from "../movieInfo.js";
import type * as nextEpisode from "../nextEpisode.js";
import type * as requireUser from "../requireUser.js";
import type * as showInfo from "../showInfo.js";
import type * as stats from "../stats.js";
import type * as stopped from "../stopped.js";
import type * as tmdb from "../tmdb.js";
import type * as tmdbAccount from "../tmdbAccount.js";
import type * as tmdbAuth from "../tmdbAuth.js";
import type * as tmdbCache from "../tmdbCache.js";
import type * as upcoming from "../upcoming.js";
import type * as watch from "../watch.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  episodeInfo: typeof episodeInfo;
  favorites: typeof favorites;
  "lib/nextEpisodeCompute": typeof lib_nextEpisodeCompute;
  "lib/tmdbClient": typeof lib_tmdbClient;
  library: typeof library;
  media: typeof media;
  movieInfo: typeof movieInfo;
  nextEpisode: typeof nextEpisode;
  requireUser: typeof requireUser;
  showInfo: typeof showInfo;
  stats: typeof stats;
  stopped: typeof stopped;
  tmdb: typeof tmdb;
  tmdbAccount: typeof tmdbAccount;
  tmdbAuth: typeof tmdbAuth;
  tmdbCache: typeof tmdbCache;
  upcoming: typeof upcoming;
  watch: typeof watch;
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
