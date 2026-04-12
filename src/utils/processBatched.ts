/**
 * Generic function to process items in batches to respect rate limits
 *
 * @param items - Array of items to process
 * @param processFn - Function that processes each item and returns a Promise
 * @param batchSize - Number of items to process in each batch (default: 10)
 * @param batchDelayMs - Delay between batches in milliseconds (default: 300ms)
 * @returns Array of all results from processing each item
 */
export const processBatched = async <T, TReturn>(
  items: T[],
  processFn: (item: T) => Promise<TReturn>,
  batchSize: number = 10,
  batchDelayMs: number = 300,
): Promise<TReturn[]> => {
  if (items.length === 0) return []

  const allResults: TReturn[] = []
  const batches = []

  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize))

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    const batchPromises = batch.map(processFn)
    const batchResults = await Promise.all(batchPromises)
    allResults.push(...batchResults)

    if (batchIndex < batches.length - 1) await new Promise(resolve => setTimeout(resolve, batchDelayMs))
  }

  return allResults
}
