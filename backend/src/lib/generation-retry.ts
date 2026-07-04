export type GenerationRetryOptions = {
	label: string;
	maxAttempts?: number;
};

// gpt-oss-120b intermittently returns output that fails schema
// validation (NoObjectGeneratedError); retrying makes it reliable.
export async function generateWithRetries<T>(
	generate: () => Promise<T>,
	{ label, maxAttempts = 3 }: GenerationRetryOptions
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await generate();
		} catch (generationError) {
			lastError = generationError;
			if (attempt === maxAttempts) {
				break;
			}
			console.warn(
				`[${label}] Structured generation failed (attempt ${attempt}/${maxAttempts}), retrying:`,
				generationError instanceof Error
					? generationError.message
					: String(generationError)
			);
		}
	}
	throw lastError;
}
