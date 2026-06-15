export async function batchProcess({ items, operation, onProgress, signal }) {
  const results = []
  const total = items.length

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break
    onProgress?.(i + 1, total)
    const result = await operation(items[i], i)
    results.push(result)
  }

  return { results, cancelled: signal?.aborted || false }
}
