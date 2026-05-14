/**
 * k6 Load Test — InvestAdvisor Platform
 *
 * Scenarios:
 *   1. Standard load:  ramp 0→100 users over 5min, hold 15min, ramp down 5min
 *   2. Stress test:    ramp 0→300 users over 10min, hold 10min, ramp down 5min
 *   3. Spike test:     50 users baseline → spike to 500 in 30s → recover
 *
 * Usage:
 *   k6 run --env BASE_URL=http://localhost:8085 --env SCENARIO=load load-test.js
 *   k6 run --env BASE_URL=http://localhost:8085 --env SCENARIO=stress load-test.js
 *   k6 run --env BASE_URL=http://localhost:8085 --env SCENARIO=spike  load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ── Custom Metrics ─────────────────────────────────────────────────────────────

const loginSuccessRate    = new Rate('login_success_rate');
const analyticsSuccessRate = new Rate('analytics_success_rate');
const loginDuration       = new Trend('login_duration', true);
const analyticsDuration   = new Trend('analytics_duration', true);
const portfolioCreateRate = new Rate('portfolio_create_success_rate');
const errorCount          = new Counter('error_count');

// ── Configuration ──────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8085';
const SCENARIO = __ENV.SCENARIO || 'load';

// Pre-registered test users (populated by seed script before load test)
// Format: { email, password }
const testUsers = new SharedArray('testUsers', () => {
    return Array.from({ length: 100 }, (_, i) => ({
        email: `loadtest_user_${i}@investadvisor.test`,
        password: 'LoadTest@2024!',
    }));
});

// ── Scenarios ──────────────────────────────────────────────────────────────────

const scenarios = {
    load: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '5m',  target: 100 },  // ramp up
            { duration: '15m', target: 100 },  // steady state
            { duration: '5m',  target: 0   },  // ramp down
        ],
    },
    stress: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '5m',  target: 100 },
            { duration: '5m',  target: 300 },  // ramp to stress
            { duration: '10m', target: 300 },  // hold stress
            { duration: '5m',  target: 0   },
        ],
    },
    spike: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '2m',  target: 50  },  // baseline
            { duration: '30s', target: 500 },  // spike!
            { duration: '2m',  target: 500 },  // hold spike
            { duration: '2m',  target: 50  },  // recover
            { duration: '2m',  target: 0   },  // ramp down
        ],
    },
};

// ── Thresholds ─────────────────────────────────────────────────────────────────

export const options = {
    scenarios: {
        investadvisor: scenarios[SCENARIO] || scenarios.load,
    },
    thresholds: {
        // Login must be fast
        'http_req_duration{endpoint:login}':     ['p(99)<200', 'p(95)<100'],
        // Registration can be slower (BCrypt hashing)
        'http_req_duration{endpoint:register}':  ['p(99)<500', 'p(95)<300'],
        // Portfolio analytics can take up to 2s (MPT computation)
        'http_req_duration{endpoint:analytics}': ['p(99)<2000', 'p(95)<1000'],
        // Market data should be fast (DB query)
        'http_req_duration{endpoint:market}':    ['p(99)<100',  'p(95)<50'],
        // Success rates
        'login_success_rate':     ['rate>0.99'],
        'analytics_success_rate': ['rate>0.99'],
        'portfolio_create_success_rate': ['rate>0.99'],
        // Global error rate
        'http_req_failed':        ['rate<0.01'],
    },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRandomUser() {
    return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function loginUser(user) {
    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: user.email, password: user.password }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { endpoint: 'login' },
        }
    );
    loginDuration.add(Date.now() - start);

    const success = check(res, {
        'login: status 200': (r) => r.status === 200,
        'login: has token':  (r) => {
            try { return JSON.parse(r.body).token != null; }
            catch { return false; }
        },
    });
    loginSuccessRate.add(success);
    if (!success) errorCount.add(1);

    if (res.status === 200) {
        try { return JSON.parse(res.body).token; }
        catch { return null; }
    }
    return null;
}

function createPortfolio(token) {
    const res = http.post(
        `${BASE_URL}/api/portfolios`,
        JSON.stringify({
            name: `Load Test Portfolio ${Date.now()}`,
            description: 'Created by k6 load test',
            riskProfile: 'MODERATE',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            tags: { endpoint: 'portfolio_create' },
        }
    );
    const success = check(res, {
        'portfolio create: status 201': (r) => r.status === 201,
        'portfolio create: has id':     (r) => {
            try { return JSON.parse(r.body).id != null; }
            catch { return false; }
        },
    });
    portfolioCreateRate.add(success);
    if (!success) errorCount.add(1);

    if (res.status === 201) {
        try { return JSON.parse(res.body).id; }
        catch { return null; }
    }
    return null;
}

function getPortfolioAnalytics(token, portfolioId) {
    const start = Date.now();
    const res = http.get(
        `${BASE_URL}/api/portfolios/${portfolioId}/analytics`,
        {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'analytics' },
            timeout: '10s',
        }
    );
    analyticsDuration.add(Date.now() - start);

    const success = check(res, {
        'analytics: status 200':    (r) => r.status === 200,
        'analytics: has sharpe':    (r) => {
            try { return JSON.parse(r.body).sharpe_ratio != null; }
            catch { return false; }
        },
        'analytics: latency <2000': () => (Date.now() - start) < 2000,
    });
    analyticsSuccessRate.add(success);
    if (!success) errorCount.add(1);
}

function getMarketData(token) {
    const tickers = ['VCB', 'FPT', 'VNM', 'HPG', 'MSN'];
    const ticker = tickers[Math.floor(Math.random() * tickers.length)];

    const res = http.get(
        `${BASE_URL}/api/market/stocks/${ticker}`,
        {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'market' },
        }
    );
    check(res, {
        'market data: status 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
}

function getNotifications(token) {
    const res = http.get(
        `${BASE_URL}/api/notifications`,
        {
            headers: { 'Authorization': `Bearer ${token}` },
            tags: { endpoint: 'notifications' },
        }
    );
    check(res, {
        'notifications: status 200': (r) => r.status === 200,
    });
}

// ── Main VU Logic ─────────────────────────────────────────────────────────────

export default function () {
    const user = getRandomUser();

    group('1. Authentication Flow', () => {
        const token = loginUser(user);
        if (!token) {
            sleep(1);
            return;
        }

        sleep(0.5);

        group('2. Portfolio Operations', () => {
            const portfolioId = createPortfolio(token);
            if (portfolioId) {
                sleep(0.2);

                // Add a stock
                http.post(
                    `${BASE_URL}/api/portfolios/${portfolioId}/stocks`,
                    JSON.stringify({ ticker: 'VCB', quantity: 100, avgPrice: 69000 }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        tags: { endpoint: 'portfolio_add_stock' },
                    }
                );

                sleep(0.3);

                // Get analytics (most expensive operation)
                getPortfolioAnalytics(token, portfolioId);
            }
        });

        sleep(0.3);

        group('3. Market Data', () => {
            getMarketData(token);
        });

        sleep(0.2);

        group('4. Notifications', () => {
            getNotifications(token);
        });

        sleep(Math.random() * 2 + 0.5); // think time: 0.5-2.5s
    });
}

// ── Setup: verify services are up before test ─────────────────────────────────

export function setup() {
    const res = http.get(`${BASE_URL}/actuator/health`);
    if (res.status !== 200) {
        throw new Error(`API Gateway health check failed: ${res.status}. Abort.`);
    }
    console.log(`Load test starting against: ${BASE_URL}`);
    console.log(`Scenario: ${SCENARIO}`);
    return { baseUrl: BASE_URL };
}

// ── Teardown: log summary ─────────────────────────────────────────────────────

export function teardown(data) {
    console.log(`Load test completed. Target: ${data.baseUrl}`);
}
