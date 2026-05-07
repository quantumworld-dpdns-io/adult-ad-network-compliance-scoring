import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp up to 100 users
    { duration: '1m', target: 1000 }, // ramp up to 1000 users
    { duration: '2m', target: 1000 }, // stay at 1000 users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'], // 99% of requests must complete below 100ms
  },
};

export default function () {
  const url = 'http://localhost:3001/v1/ad-request';
  const payload = JSON.stringify({
    publisherId: '00000000-0000-0000-0000-000000000001',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ip: '1.2.3.4',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has adContent': (r) => r.json().adContent !== undefined,
  });

  sleep(0.1);
}
