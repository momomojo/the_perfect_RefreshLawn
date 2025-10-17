/**
 * Performance Monitoring Utility
 *
 * Tracks performance metrics for real-time updates, optimistic updates,
 * and other critical operations in the RefreshLawn application.
 */

export interface PerformanceMetric {
  name: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastUpdated: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private maxMetrics: number = 1000; // Keep last 1000 metrics

  /**
   * Start timing an operation
   *
   * @example
   * performanceMonitor.startTimer('real-time-update');
   */
  startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
    console.log(`[PerformanceMonitor] Timer started: ${operationId}`);
  }

  /**
   * End timing an operation and record the metric
   *
   * @example
   * performanceMonitor.endTimer('real-time-update', { userId: '123' });
   */
  endTimer(operationId: string, metadata?: Record<string, any>): number | null {
    const startTime = this.timers.get(operationId);

    if (!startTime) {
      console.warn(
        `[PerformanceMonitor] No start time found for: ${operationId}`
      );
      return null;
    }

    const duration = Date.now() - startTime;

    this.recordMetric({
      name: operationId,
      timestamp: Date.now(),
      duration,
      metadata,
    });

    this.timers.delete(operationId);

    console.log(
      `[PerformanceMonitor] ${operationId} completed in ${duration}ms`,
      metadata
    );

    return duration;
  }

  /**
   * Record a metric without timing
   *
   * @example
   * performanceMonitor.recordMetric({
   *   name: 'subscription-established',
   *   timestamp: Date.now(),
   *   metadata: { channelName: 'notifications' }
   * });
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get statistics for a specific operation
   *
   * @example
   * const stats = performanceMonitor.getStats('real-time-update');
   * console.log(`Average latency: ${stats.avgDuration}ms`);
   */
  getStats(operationName: string): PerformanceStats | null {
    const operationMetrics = this.getMetricsByName(operationName).filter(
      (m) => m.duration !== undefined
    );

    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map((m) => m.duration!);
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      operation: operationName,
      count: operationMetrics.length,
      avgDuration: Math.round(avg),
      minDuration: min,
      maxDuration: max,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get statistics for all operations
   */
  getAllStats(): PerformanceStats[] {
    const operationNames = [...new Set(this.metrics.map((m) => m.name))];

    return operationNames
      .map((name) => this.getStats(name))
      .filter((stat): stat is PerformanceStats => stat !== null);
  }

  /**
   * Clear all metrics and timers
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
    console.log("[PerformanceMonitor] All metrics cleared");
  }

  /**
   * Get metrics from the last N minutes
   */
  getRecentMetrics(minutes: number): PerformanceMetric[] {
    const cutoffTime = Date.now() - minutes * 60 * 1000;
    return this.metrics.filter((m) => m.timestamp >= cutoffTime);
  }

  /**
   * Get performance summary for console output
   */
  logSummary(): void {
    const stats = this.getAllStats();

    console.log("\n═══════════════════════════════════════════");
    console.log("📊 Performance Monitor Summary");
    console.log("═══════════════════════════════════════════");

    if (stats.length === 0) {
      console.log("No performance data collected yet.");
      console.log("═══════════════════════════════════════════\n");
      return;
    }

    stats.forEach((stat) => {
      console.log(`\n${stat.operation}:`);
      console.log(`  Count: ${stat.count} operations`);
      console.log(`  Avg Duration: ${stat.avgDuration}ms`);
      console.log(`  Min Duration: ${stat.minDuration}ms`);
      console.log(`  Max Duration: ${stat.maxDuration}ms`);
    });

    console.log("\n═══════════════════════════════════════════\n");
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper function for measuring async operations
 *
 * @example
 * const result = await measureAsync('database-query', async () => {
 *   return await supabase.from('bookings').select();
 * }, { userId: '123' });
 */
export async function measureAsync<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const timerId = `${operationName}-${Date.now()}`;

  performanceMonitor.startTimer(timerId);

  try {
    const result = await operation();
    performanceMonitor.endTimer(timerId, { ...metadata, success: true });
    return result;
  } catch (error) {
    performanceMonitor.endTimer(timerId, { ...metadata, success: false, error });
    throw error;
  }
}

/**
 * Helper function for measuring synchronous operations
 *
 * @example
 * const result = measureSync('data-transformation', () => {
 *   return transformData(data);
 * });
 */
export function measureSync<T>(
  operationName: string,
  operation: () => T,
  metadata?: Record<string, any>
): T {
  const timerId = `${operationName}-${Date.now()}`;

  performanceMonitor.startTimer(timerId);

  try {
    const result = operation();
    performanceMonitor.endTimer(timerId, { ...metadata, success: true });
    return result;
  } catch (error) {
    performanceMonitor.endTimer(timerId, { ...metadata, success: false, error });
    throw error;
  }
}

// Predefined operation names for consistency
export const PERF_OPS = {
  REALTIME_UPDATE: "realtime-update",
  REALTIME_SUBSCRIPTION: "realtime-subscription-setup",
  OPTIMISTIC_UPDATE: "optimistic-update",
  DATABASE_QUERY: "database-query",
  API_CALL: "api-call",
  COMPONENT_RENDER: "component-render",
  STATE_UPDATE: "state-update",
} as const;
