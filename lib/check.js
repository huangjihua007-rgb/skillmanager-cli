const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { API_BASE, post } = require('./api');

module.exports = async function check(name) {
  console.log(`\n🔍 SkillGuard 体检：「${name}」\n`);

  const skillDir = path.join(os.homedir(), '.skillmanager', 'skills', name);
  let content = '';

  if (fs.existsSync(skillDir)) {
    const md = path.join(skillDir, 'SKILL.md');
    if (fs.existsSync(md)) {
      content = fs.readFileSync(md, 'utf8').slice(0, 50000);
      console.log(`📄 已找到本地 SKILL.md (${(content.length/1024).toFixed(0)}KB)`);
    }
  }

  if (!content) {
    console.log('📡 尝试从 GitHub 拉取...');
    try {
      const url = name.includes('/') ? `https://github.com/${name}` : `https://github.com/${name}`;
      const tmpDir = path.join(os.tmpdir(), `skillguard-${Date.now()}`);
      execSync(`git clone --depth 1 ${url} "${tmpDir}"`, { stdio: 'pipe', timeout: 15000 });
      const md = path.join(tmpDir, 'SKILL.md');
      if (fs.existsSync(md)) content = fs.readFileSync(md, 'utf8').slice(0, 50000);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch(e) {
      console.log('⚠️ GitHub 拉取失败');
    }
  }

  try {
    const resp = await post(`${API_BASE}/check`, { content, mode: 'security' });

    if (resp && resp.verdict) {
      const icon = resp.verdict === 'safe' ? '✅' : resp.verdict === 'warn' ? '⚠️' : '🔴';
      console.log(`\n${icon} 综合评定：${resp.verdict_text || resp.verdict} · ${resp.score || '?'}/100`);
    }

    const dims = resp.result?.dimensions || resp.dimensions || {};
    if (Object.keys(dims).length > 0) {
      console.log('\n8 维检测：');
      ['supply_chain','cmd_exec','network','file_ops','prompt_inject','remote_script','obfuscation','frontmatter'].forEach(id => {
        const d = dims[id];
        if (d) {
          const icon = d.status === 'safe' ? '✅' : d.status === 'warn' ? '⚠️' : '🔴';
          console.log(`  ${icon} ${d.name || id}: ${d.detail || ''}`);
        }
      });
    }

    const issues = resp.issues || resp.result?.issues || [];
    if (issues.length > 0) {
      const p0 = issues.filter(i => i.level === 'P0').length;
      const p1 = issues.filter(i => i.level === 'P1').length;
      console.log(`\n📋 问题：P0×${p0} P1×${p1}`);
    }
  } catch(e) {
    console.log('❌ 体检失败:', e.message);
  }
};
