const https = require('https');
const pkg = require('../package.json');

const API_BASE = 'https://skillmanager.top';
const UA = 'skillpick-cli/' + pkg.version;
const TIMEOUT = 20000;  // 20秒超时（留足服务器 AI 降级时间）

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('API 返回异常')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => { req.destroy(new Error('请求超时')); });
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + (parsed.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': UA
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch(e) { reject(new Error('API 返回异常')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => { req.destroy(new Error('请求超时')); });
    req.write(data);
    req.end();
  });
}

module.exports = { API_BASE, get, post };
