const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const scenario = process.env.LOAD_TEST_SCENARIO ?? 'health';
const requests = Number(process.env.LOAD_TEST_REQUESTS ?? 100);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 10);
const scenarios = {
  health: ['/api/health'],
  bootstrap: ['/api/health', '/api/version'],
  common_reads: [
    '/api/health',
    '/api/version',
    '/api/health/metrics',
    '/api/map',
    '/api/marketplace',
    '/api/reports',
    '/api/messages',
    '/api/notifications',
  ],
  launch_100: ['/api/health', '/api/version'],
  launch_500: ['/api/health', '/api/version'],
  launch_1000: ['/api/health', '/api/version'],
};
const paths = scenarios[scenario] ?? scenarios.health;
let next = 0;
let completed = 0;
let failed = 0;
const durations = [];

async function worker() {
  while (next < requests) {
    const index = next;
    next += 1;
    const target = new URL(paths[index % paths.length], baseUrl).toString();
    const startedAt = performance.now();
    try {
      const response = await fetch(target);
      durations.push(performance.now() - startedAt);
      if (response.status < 500) {
        completed += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }
}

const start = Date.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const seconds = (Date.now() - start) / 1000;
durations.sort((a, b) => a - b);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.floor(durations.length * p))] ?? 0;

console.log(
  JSON.stringify({
    baseUrl,
    scenario,
    requests,
    concurrency,
    completed,
    failed,
    seconds,
    requestsPerSecond: Number((requests / seconds).toFixed(2)),
    averageMs: Number((durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    p99Ms: Number(percentile(0.99).toFixed(2)),
    errorRate: Number((failed / requests).toFixed(4)),
  }),
);
if (failed > 0) {
  process.exit(1);
}
