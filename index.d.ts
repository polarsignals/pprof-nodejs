import type { heap } from "@datadog/pprof"


export type ExportOptions = {
	labels: Record<string, string>
}

export const heapProfiler: typeof heap & {
	encodedProfile(): Promise<Buffer>
}

export function monitorOutOfMemory(args: {
	exportOptions: ExportOptions
}): void