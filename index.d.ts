import type { heap } from "@datadog/pprof"


export type ExportOptions = {
	endpoint?: string
	projectId?: string
	labels?: Record<string, string>
	headers?: Record<string, string>
	timeout?: number
	localSourceMapRoots?: string[]
}

export type EncodeOptions = {
	/**
	 * Directories to walk for `.map` files. When set, frames are resolved
	 * locally at encode time and server-side resolution is skipped. When
	 * omitted (default), frames are encoded for server-side resolution.
	 */
	localSourceMapRoots?: string[]
}

export const heapProfiler: typeof heap & {
	encodedProfile(options?: EncodeOptions): Promise<Buffer>
}

export function encodedProfileFromTree(
	rootNode: unknown,
	options?: EncodeOptions,
): Promise<Buffer>

export function monitorOutOfMemory(args: {
	exportOptions: ExportOptions
}): void