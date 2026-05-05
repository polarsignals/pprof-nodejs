import type { heap } from "@datadog/pprof"


export type ExportOptions = {
	endpoint?: string
	projectId?: string
	labels?: Record<string, string>
	headers?: Record<string, string>
	timeout?: number
}

export const heapProfiler: typeof heap & {
	encodedProfile(): Promise<Buffer>
}

export function monitorOutOfMemory(args: {
	exportOptions: ExportOptions
}): void