import type { Buffer } from 'node:buffer'

export function startHeapProfiler(options?: {
  samplingInterval?: number
  stackDepth?: number
}): Promise<{
  encodedProfile(): Promise<Buffer>
  stop(): Promise<void>
}>
