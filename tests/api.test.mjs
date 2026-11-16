import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, execSync } from 'node:child_process';

describe('Public Server HTTP Endpoints Tests', () => {
  let serverProcess;
  const TEST_PORT = '4567';

  before(async () => {
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    await new Promise((resolve) => {
      const handler = (data) => {
        if (data.toString().includes('Listening on')) {
          serverProcess.stdout.off('data', handler);
          resolve();
        }
      };
      serverProcess.stdout.on('data', handler);
      setTimeout(resolve, 3000);
    });
  });

  after(() => {
    if (serverProcess) {
      try {
        serverProcess.stdout.destroy();
        serverProcess.stderr.destroy();
      } catch {}
      if (process.platform === 'win32' && serverProcess.pid) {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } catch {}
      } else {
        try {
          serverProcess.kill('SIGKILL');
        } catch {}
      }
    }
  });

  function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}${path}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      }).on('error', reject);
    });
  }

  it('GET /health should return 200 with status ok', async () => {
    const res = await get('/health');
    assert.equal(res.status, 200);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.status, 'ok');
  });

  it('GET /.well-known/security.txt should return 200 text/plain', async () => {
    const res = await get('/.well-known/security.txt');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'));
    assert.ok(res.body.includes('KIVO Browser'));
    assert.ok(res.body.includes('support@kivobrowser.com'));
  });

  it('GET /LICENSE should return 200 text/plain', async () => {
    const res = await get('/LICENSE');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'));
    assert.ok(res.body.includes('KIVO BROWSER END USER LICENSE AGREEMENT'));
  });

  it('GET / should include security headers', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-permitted-cross-domain-policies'], 'none');
  });
});
