/**
 * Performance Logging System
 * Logs AI and STT provider performance metrics for optimization
 */

export type PerformanceMetric = {
	timestamp: string;
	route: string;
	provider: string;
	model: string;
	operation: 'text-generation' | 'object-generation' | 'speech-to-text';
	durationMs: number;
	inputSize?: number;
	outputSize?: number;
	success: boolean;
	error?: string;
	metadata?: Record<string, any>;
};

class PerformanceLogger {
	private enabled: boolean;
	private metrics: PerformanceMetric[] = [];
	private maxStoredMetrics = 100; // Keep last 100 metrics in memory

	constructor(enabled: boolean = false) {
		this.enabled = enabled;
	}

	/**
	 * Enable or disable logging
	 */
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	/**
	 * Log a performance metric
	 */
	log(metric: PerformanceMetric) {
		if (!this.enabled) return;

		// Add to in-memory storage
		this.metrics.push(metric);
		if (this.metrics.length > this.maxStoredMetrics) {
			this.metrics.shift(); // Remove oldest
		}

		// Console output with nice formatting
		this.logToConsole(metric);
	}

	/**
	 * Format and log to console
	 */
	private logToConsole(metric: PerformanceMetric) {
		const emoji = metric.success ? '✅' : '❌';
		const color = metric.success ? '\x1b[32m' : '\x1b[31m';
		const reset = '\x1b[0m';
		const bold = '\x1b[1m';
		const dim = '\x1b[2m';

		console.log(
			`\n${bold}${color}${emoji} PERFORMANCE LOG${reset}`,
			`${dim}[${new Date(metric.timestamp).toLocaleTimeString()}]${reset}`
		);
		console.log(`${bold}Route:${reset} ${metric.route}`);
		console.log(`${bold}Provider:${reset} ${metric.provider} (${metric.model})`);
		console.log(`${bold}Operation:${reset} ${metric.operation}`);
		console.log(`${bold}⏱️  Duration:${reset} ${color}${metric.durationMs}ms${reset}`);

		if (metric.inputSize) {
			console.log(`${bold}Input:${reset} ${this.formatBytes(metric.inputSize)}`);
		}
		if (metric.outputSize) {
			console.log(`${bold}Output:${reset} ${this.formatBytes(metric.outputSize)}`);
		}

		if (metric.metadata) {
			console.log(`${bold}Metadata:${reset}`, metric.metadata);
		}

		if (!metric.success && metric.error) {
			console.log(`${bold}${color}Error:${reset} ${metric.error}`);
		}
		console.log(''); // Empty line for readability
	}

	/**
	 * Format bytes to human readable
	 */
	private formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} bytes`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	/**
	 * Get recent metrics
	 */
	getRecentMetrics(count: number = 10): PerformanceMetric[] {
		return this.metrics.slice(-count);
	}

	/**
	 * Get statistics for a specific provider
	 */
	getProviderStats(provider: string) {
		const providerMetrics = this.metrics.filter((m) => m.provider === provider);
		if (providerMetrics.length === 0) return null;

		const durations = providerMetrics.map((m) => m.durationMs);
		const successCount = providerMetrics.filter((m) => m.success).length;

		return {
			provider,
			totalCalls: providerMetrics.length,
			successRate: ((successCount / providerMetrics.length) * 100).toFixed(2) + '%',
			avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) + 'ms',
			minDuration: Math.min(...durations) + 'ms',
			maxDuration: Math.max(...durations) + 'ms',
		};
	}

	/**
	 * Get comparison between providers for same operation
	 */
	getProviderComparison(operation: PerformanceMetric['operation']) {
		const operationMetrics = this.metrics.filter((m) => m.operation === operation);
		const providers = [...new Set(operationMetrics.map((m) => m.provider))];

		return providers.map((provider) => this.getProviderStats(provider)).filter(Boolean);
	}

	/**
	 * Print a summary report
	 */
	printSummary() {
		if (!this.enabled || this.metrics.length === 0) {
			console.log('No performance metrics available');
			return;
		}

		console.log('\n=== PERFORMANCE SUMMARY ===\n');

		// Text generation comparison
		const textComparison = this.getProviderComparison('text-generation');
		if (textComparison.length > 0) {
			console.log('📝 TEXT GENERATION:');
			textComparison.forEach((stats) => console.table(stats));
		}

		// Object generation comparison
		const objectComparison = this.getProviderComparison('object-generation');
		if (objectComparison.length > 0) {
			console.log('\n📦 OBJECT GENERATION:');
			objectComparison.forEach((stats) => console.table(stats));
		}

		// STT comparison
		const sttComparison = this.getProviderComparison('speech-to-text');
		if (sttComparison.length > 0) {
			console.log('\n🎤 SPEECH-TO-TEXT:');
			sttComparison.forEach((stats) => console.table(stats));
		}

		console.log('\n===========================\n');
	}

	/**
	 * Clear all stored metrics
	 */
	clear() {
		this.metrics = [];
	}
}

// Singleton instance
let loggerInstance: PerformanceLogger | null = null;

/**
 * Get or create the performance logger instance
 */
export function getPerformanceLogger(enabled?: boolean): PerformanceLogger {
	if (!loggerInstance) {
		loggerInstance = new PerformanceLogger(enabled ?? false);
	} else if (enabled !== undefined) {
		loggerInstance.setEnabled(enabled);
	}
	return loggerInstance;
}

/**
 * Helper to measure and log an async operation
 */
export async function measurePerformance<T>(
	operation: () => Promise<T>,
	config: {
		route: string;
		provider: string;
		model: string;
		operationType: PerformanceMetric['operation'];
		inputSize?: number;
		metadata?: Record<string, any>;
		enabled?: boolean;
	}
): Promise<T> {
	const logger = getPerformanceLogger(config.enabled);

	const startTime = Date.now();
	let result: T;
	let success = true;
	let error: string | undefined;
	let outputSize: number | undefined;

	try {
		result = await operation();

		// Try to estimate output size
		if (typeof result === 'string') {
			outputSize = new TextEncoder().encode(result).length;
		} else if (result && typeof result === 'object') {
			outputSize = new TextEncoder().encode(JSON.stringify(result)).length;
		}

		return result;
	} catch (err) {
		success = false;
		error = String(err);
		throw err;
	} finally {
		const durationMs = Date.now() - startTime;

		logger.log({
			timestamp: new Date().toISOString(),
			route: config.route,
			provider: config.provider,
			model: config.model,
			operation: config.operationType,
			durationMs,
			inputSize: config.inputSize,
			outputSize,
			success,
			error,
			metadata: config.metadata,
		});
	}
}
