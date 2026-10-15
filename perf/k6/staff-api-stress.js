// k6 stress test for the Staff Management API (hospital-facing endpoints).
//
// Unlike staff-api-load.js, which checks the expected load (20 users), this test keeps
// raising the load well past it to find where the API starts to slow down or fail,
// then drops back to normal load to check that it recovers.
//
// Scenario:
//   stress - hospital dashboard reads (staff directory, shifts, coverage, cover requests, booths),
//            stepping 20 -> 50 -> 100 -> 150 -> 200 virtual users, then back to 20.
//
// Run (API on the host at :5004, k6 in Docker):
//   docker run --rm -v "$PWD/perf:/perf" -e BASE_URL=http://host.docker.internal:5004 \
//     -e HOSPITAL_PASSWORD=... //     grafana/k6 run /perf/k6/staff-api-stress.js
//
// Run against a disposable database only: 200 users is far beyond the shared development database.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5004';
const EMAIL = __ENV.HOSPITAL_EMAIL || 'hospital@vaxora.local';
const PASSWORD = __ENV.HOSPITAL_PASSWORD;
const OUT_DIR = __ENV.OUT_DIR || '/perf/results';

// One step per load level, so the summary can show where response times start to climb.
const STEPS = [
  { name: 'normal_20', target: 20 },
  { name: 'step_50', target: 50 },
  { name: 'step_100', target: 100 },
  { name: 'step_150', target: 150 },
  { name: 'peak_200', target: 200 },
  { name: 'recovery_20', target: 20 },
];
const RAMP_SECONDS = 15;
const HOLD_SECONDS = 30;

const endpointErrors = new Rate('endpoint_errors');
const stepDurations = {};
const stepErrors = {};
const stepRequests = {};
for (const step of STEPS) {
  stepDurations[step.name] = new Trend(`duration_${step.name}`, true);
  stepErrors[step.name] = new Rate(`errors_${step.name}`);
  stepRequests[step.name] = new Counter(`requests_${step.name}`);
}

const stages = [];
for (const step of STEPS) {
  stages.push({ duration: `${RAMP_SECONDS}s`, target: step.target });
  stages.push({ duration: `${HOLD_SECONDS}s`, target: step.target });
}
stages.push({ duration: '10s', target: 0 });

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      exec: 'stress',
      startVUs: 0,
      stages,
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // Normal load must still meet the load-test targets.
    duration_normal_20: ['p(95)<500'],
    errors_normal_20: ['rate<0.01'],
    // Under stress the API may slow down, but it must not start failing requests.
    http_req_failed: ['rate<0.01'],
    endpoint_errors: ['rate<0.01'],
    duration_peak_200: ['p(95)<3000'],
    // After the peak, response times and errors must return to normal.
    duration_recovery_20: ['p(95)<500'],
    errors_recovery_20: ['rate<0.01'],
  },
};

function isoDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /api/auth/login' } }
  );
  if (res.status !== 200 || !res.json('token')) {
    throw new Error(`Setup login failed: ${res.status} ${res.body}`);
  }
  return { token: res.json('token'), startedAt: Date.now() };
}

// Only the hold part of each step is measured, so ramp-up time does not blur the levels.
function currentStep(startedAt) {
  const elapsed = (Date.now() - startedAt) / 1000;
  const stepLength = RAMP_SECONDS + HOLD_SECONDS;
  const index = Math.floor(elapsed / stepLength);
  if (index >= STEPS.length) return null;
  return elapsed - index * stepLength >= RAMP_SECONDS ? STEPS[index].name : null;
}

function getJson(path, name, token, step) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name },
  });
  const ok = check(res, {
    [`${name} is 200`]: (r) => r.status === 200,
  });
  endpointErrors.add(!ok);
  if (step) {
    stepDurations[step].add(res.timings.duration);
    stepErrors[step].add(!ok);
    stepRequests[step].add(1);
  }
  return res;
}

export function stress(data) {
  const from = isoDate(0);
  const to = isoDate(7);
  const step = currentStep(data.startedAt);

  group('hospital staff dashboard', () => {
    getJson('/api/staff/hospital', 'GET /api/staff/hospital', data.token, step);
    getJson(`/api/staff/shifts/hospital?from=${from}&to=${to}`, 'GET /api/staff/shifts/hospital', data.token, step);
    getJson(`/api/staff/coverage?from=${from}&to=${to}`, 'GET /api/staff/coverage', data.token, step);
    getJson('/api/staff/shift-swaps/hospital?limit=40', 'GET /api/staff/shift-swaps/hospital', data.token, step);
    getJson('/api/staff/booths', 'GET /api/staff/booths', data.token, step);
  });

  // Think time between page loads, like a real hospital admin.
  sleep(1);
}

export function handleSummary(data) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const lines = [];
  lines.push(`Vaxora Staff API - k6 stress run (${new Date().toISOString()})`);
  lines.push(`Target: ${BASE_URL}`);
  lines.push('');

  const m = data.metrics;
  const fmt = (v) => (v === undefined ? '-' : `${v.toFixed(1)} ms`);
  lines.push(`${'Step'.padEnd(14)} ${'VUs'.padStart(4)}  ${'requests'.padStart(8)}  ${'avg'.padStart(10)}  ${'p95'.padStart(10)}  ${'max'.padStart(10)}  ${'errors'.padStart(7)}`);
  for (const step of STEPS) {
    const duration = m[`duration_${step.name}`];
    const errors = m[`errors_${step.name}`];
    const requests = m[`requests_${step.name}`];
    if (!duration) continue;
    const v = duration.values;
    const errorRate = errors ? `${(errors.values.rate * 100).toFixed(2)}%` : '-';
    lines.push(`${step.name.padEnd(14)} ${String(step.target).padStart(4)}  ${String(requests ? requests.values.count : '-').padStart(8)}  ${fmt(v.avg).padStart(10)}  ${fmt(v['p(95)']).padStart(10)}  ${fmt(v.max).padStart(10)}  ${errorRate.padStart(7)}`);
  }
  lines.push('');
  lines.push(`Requests: ${m.http_reqs.values.count}  (${m.http_reqs.values.rate.toFixed(1)}/s)`);
  lines.push(`HTTP failure rate: ${(m.http_req_failed.values.rate * 100).toFixed(2)}%`);
  lines.push(`Endpoint check failure rate: ${(m.endpoint_errors.values.rate * 100).toFixed(2)}%`);
  lines.push(`Peak VUs: ${m.vus_max.values.max}`);
  lines.push('');
  lines.push('Thresholds:');
  for (const [name, metric] of Object.entries(m)) {
    if (!metric.thresholds) continue;
    for (const [expr, res] of Object.entries(metric.thresholds)) {
      lines.push(`  ${res.ok ? 'PASS' : 'FAIL'}  ${name}: ${expr}`);
    }
  }
  const text = lines.join('\n') + '\n';

  return {
    stdout: text,
    [`${OUT_DIR}/staff-api-stress-${stamp}.txt`]: text,
    [`${OUT_DIR}/staff-api-stress-${stamp}.json`]: JSON.stringify(data, null, 2),
  };
}
