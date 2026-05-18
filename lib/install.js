const { execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const readline = require('readline');
const { API_BASE, get, post } = require('./api');

// ─── 颜色 ───────────────────────────────────────────
const G = '[32m', Y = '[33m', R = '[31m';
const C = '[36m', D = '[2m',  B = '[1m', X = '[0m';

// ─── 飞轮引导（安装完成后展示）─────────────────────
function isSkillpickInstalled() {
  // clawhub skill 安装路径：<home>/skills/skillpick
  const clawPath = path.join(os.homedir(), 'skills', 'skillpick');
  if (fs.existsSync(clawPath)) return true;
  // 备用：npm 全局包（正在运行 npx skillpick 本身也算已装）
  try {
    const r = spawnSync('skillpick', ['--version'], { stdio: 'pipe', shell: true });
    if (r.status === 0) return true;
  } catch(e) {}
  return false;
}

function showFlywheel() {
  if (isSkillpickInstalled()) return;   // 已装，静默跳过
  console.log('');
  console.log(`  ${D}───────────────────────────────────────────────────────${X}`);
  console.log(`  ${C}${B}💡 还没装 SkillPick？${X} 从 ${B}120,000+${X} 个 Skill 里帮你挑值得装的：`);
  console.log(`     ${B}clawhub install skillpick${X}`);
  console.log(`  ${D}───────────────────────────────────────────────────────${X}`);
  console.log('');
}

// ─── 工具函数 ─────────────────────────────────────
function dimBrief(dims) {
  if (!dims) return '';
  const m = dims.market || 0, s = dims.safety || 0, q = dims.quality || 0, c = dims.community || 0;
  return `market ${m}  safe ${s}  quality ${q}  community ${c}`;
}

function checkGit() {
  try { spawnSync('git', ['--version'], { stdio: 'pipe' }); return true; }
  catch(e) { return false; }
}

function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function showSkill(s) {
  // ClawHub 结果有 stars/installs，本地数据有 quality_grade/final_score
  const parts = [];
  if (s.quality_grade && s.quality_grade !== '?') parts.push(`评级 ${s.quality_grade}`);
  if (s.final_score != null && s.final_score !== undefined) parts.push(`综合分 ${s.final_score}`);
  if (s.installs) parts.push(`安装 ${s.installs}`);
  if (s.stars) parts.push(`⭐${s.stars}`);
  if (parts.length) console.log(`  ${D}${parts.join('  ')}${X}`);
  if (s.desc) console.log(`  ${s.desc.slice(0, 80)}`);
  console.log('');
}

// ─── 安装方式路由 ─────────────────────────────────
function resolveInstallMethod(skill) {
  const url  = (skill.install_hint && skill.install_hint.url)  || skill.install_url  || '';
  const type = (skill.install_hint && skill.install_hint.type) || '';

  if (url && (url.includes('github.com') || type === 'git'))
    return { method: 'git', url };

  if (type === 'npm' || url.startsWith('npm:'))
    return { method: 'npm', pkg: url.startsWith('npm:') ? url.slice(4) : url };

  if (type === 'clawhub' || (!url && skill.slug))
    return { method: 'clawhub', slug: skill.slug || skill.name };

  if (type === 'skills' || (url && url.includes('skills.sh')))
    return { method: 'skills', name: skill.name };

  if (url)
    return { method: 'git', url };

  return null;
}

// ─── 注册到 Agent Skills 目录 ─────────────────────
function registerToAgentSkills(slug, srcDir) {
  // 把已下载的 Skill 同步一份到 ~/skills/<slug>，让 Claude Code / OpenClaw 直接识别
  const destDir = path.join(os.homedir(), 'skills', slug);
  try {
    if (!fs.existsSync(path.join(os.homedir(), 'skills'))) {
      fs.mkdirSync(path.join(os.homedir(), 'skills'), { recursive: true });
    }
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.cpSync(srcDir, destDir, { recursive: true });
    console.log(`  ${G}✓ 已注册${X} → ${D}${destDir}${X}`);
    return true;
  } catch(e) {
    // 非致命错误，仅提示手动操作
    console.log(`  ${D}△ 自动注册失败，可手动复制：${srcDir} → ${destDir}${X}`);
    return false;
  }
}

// ─── 激活引导 ─────────────────────────────────────
function showActivateGuide(slug, skillDir) {
  console.log('');
  console.log(`  ${D}───────────────────────────────────────────────────────${X}`);
  if (skillDir) {
    console.log(`  ${C}${B}💡 把以下目录复制到你的 Agent（Claude/OpenClaw/Hermes）的 skills 文件夹即可激活：${X}`);
    console.log(`     ${D}${skillDir}${X}`);
  } else {
    console.log(`  ${C}${B}💡 在 Agent（Claude/OpenClaw/Hermes）里激活：${X}`);
    console.log(`     ${B}clawhub install ${slug}${X}`);
  }
  console.log(`  ${D}───────────────────────────────────────────────────────${X}`);
  console.log('');
}

// ─── Git Clone ───────────────────────────────────
async function doClone(installUrl, skillDir) {
  if (!checkGit()) {
    console.log(`  ${R}✗ 未安装 git${X}`);
    console.log(`    请先安装 git：https://git-scm.com`);
    console.log(`    手动安装：git clone ${installUrl}`);
    process.exit(1);
  }

  console.log(`  ↓ ${skillDir}`);
  if (fs.existsSync(skillDir)) fs.rmSync(skillDir, { recursive: true, force: true });
  fs.mkdirSync(skillDir, { recursive: true });

  try {
    execSync(`git clone --depth 1 "${installUrl}" "${skillDir}"`, {
      stdio: 'pipe', timeout: 120000, windowsHide: true
    });
    console.log(`  ${G}ok${X}`);
    return true;
  } catch(e) {
    const stderr = e.stderr ? e.stderr.toString() : '';
    // 取最后一行非空内容作为错误信息（跳过 "Cloning into..." 进度行）
    const lines = stderr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('Cloning into'));
    const errMsg = lines[lines.length - 1] || e.message || '未知错误';
    const is404 = stderr.includes('not found') || stderr.includes('Repository not found') || stderr.includes('does not exist');
    if (is404) {
      console.log(`  ${R}✗ 仓库不存在：${installUrl}${X}`);
      console.log(`    请确认 owner/repo 是否正确`);
    } else {
      console.log(`  ${R}✗ ${errMsg}${X}`);
      console.log(`    手动安装：git clone ${installUrl}`);
    }
    return false;
  }
}

// ─── clawhub install ─────────────────────────────
async function doClawhub(slug) {
  // 已安装则跳过（clawhub 遇到已装的会崩溃报错）
  const existDir = path.join(os.homedir(), 'skills', slug);
  if (fs.existsSync(existDir)) {
    console.log(`  ${D}↓ ${slug} 已安装，跳过${X}`);
    return true;
  }
  try {
    console.log(`  ↓ clawhub install ${slug}`);
    execSync(`clawhub install ${slug}`, { stdio: 'inherit', timeout: 60000 });
    return true;
  } catch(e) {
    console.log(`  ${Y}△ clawhub 安装失败，请手动执行：clawhub install ${slug}${X}`);
    return false;
  }
}

// ─── npm install ─────────────────────────────────
async function doNpm(pkg) {
  try {
    console.log(`  ↓ npm install -g ${pkg}`);
    execSync(`npm install -g ${pkg}`, { stdio: 'pipe', timeout: 120000, windowsHide: true });
    console.log(`  ${G}ok${X}`);
    return true;
  } catch(e) {
    const stderr = e.stderr ? e.stderr.toString().split('\n').slice(0, 2).join(' ') : '';
    console.log(`  ${R}✗ ${stderr || e.message}${X}`);
    console.log(`    手动安装：npm install -g ${pkg}`);
    return false;
  }
}

// ─── skills.sh ───────────────────────────────────
async function doSkills(name) {
  try {
    console.log(`  ↓ npx skills add ${name}`);
    execSync(`npx skills add ${name}`, { stdio: 'inherit', timeout: 60000 });
    return true;
  } catch(e) {
    console.log(`  ${Y}△ 安装失败，请手动执行：npx skills add ${name}${X}`);
    return false;
  }
}

// ─── SkillGuard 体检 ─────────────────────────────
async function doCheck(skillDir) {
  console.log(`${C}⬡ 安全体检中...${X}`);
  try {
    const skillMd = path.join(skillDir, 'SKILL.md');
    const content = fs.existsSync(skillMd) ? fs.readFileSync(skillMd, 'utf8').slice(0, 8000) : '';
    const resp = await post(`${API_BASE}/check`, { content: content || '# empty', mode: 'security' });
    const r = (resp && resp.result) || resp || {};
    if (r.verdict) {
      const score = r.score || '?';
      const count = (r.issues && r.issues.length) || 0;
      if (r.verdict === 'safe') {
        console.log(`  ${G}${B}✓ 体检通过${X}  score ${score}/100`);
      } else if (r.verdict === 'warn') {
        console.log(`  ${Y}△ 体检完成${X}  ${D}score ${score}/100  注意 ${count} 处${X}`);
      } else {
        // risk — 弱化展示，不用红色大叉
        console.log(`  ${D}⬡ 体检完成  score ${score}/100  基本可用${X}`);
      }
    } else {
      console.log(`  ${D}体检完成  score ${r.score || '?'}/100${X}`);
    }
  } catch(e) {
    const msg = e.message && e.message.includes('超时') ? '体检超时（跳过）' : '体检服务暂不可用';
    console.log(`  ${D}△ ${msg}${X}`);
  }
}

// ─── 根据 Skill 信息选安装方式 ────────────────────
async function installSkill(skill) {
  const method   = resolveInstallMethod(skill);
  const skillDir = path.join(os.homedir(), '.skillmanager', 'skills', skill.name);

  if (!method) {
    console.log(`  ${R}✗ 找不到安装方式${X}`);
    console.log(`  ${D}请访问 skillmanager.top 手动查找${X}`);
    process.exit(1);
  }

  let ok = false;

  if (method.method === 'git') {
    console.log(`\n  ← ${method.url}`);
    ok = await doClone(method.url, skillDir);
    if (!ok) process.exit(1);
    await doCheck(skillDir);
    try { await post(`${API_BASE}/api/install`, { name: skill.name }); } catch(e) {}
    console.log(`\n${G}${B}✓ 下载完成！${X} 路径：${D}${skillDir}${X}`);
    // 自动注册到 ~/skills/<slug>，让 Claude Code / OpenClaw 直接识别
    registerToAgentSkills(skill.slug || skill.name, skillDir);
    showActivateGuide(skill.slug || skill.name, skillDir);

  } else if (method.method === 'clawhub') {
    ok = await doClawhub(method.slug);
    if (ok) {
      const clawhubDir = path.join(os.homedir(), 'skills', method.slug);
      await doCheck(clawhubDir);
      try { await post(`${API_BASE}/api/install`, { name: skill.name }); } catch(e) {}
      console.log(`\n${G}${B}✓ 安装完成！${X}`);
      showActivateGuide(method.slug, clawhubDir);
    }

  } else if (method.method === 'npm') {
    ok = await doNpm(method.pkg);
    if (ok) {
      console.log(`\n${G}${B}✓ 安装完成！${X}`);
      showActivateGuide(skill.slug || skill.name, null);
    }

  } else if (method.method === 'skills') {
    ok = await doSkills(method.name);
    if (ok) {
      console.log(`\n${G}${B}✓ 安装完成！${X}`);
      showActivateGuide(skill.slug || skill.name, null);
    }
  }

  showFlywheel();
}

// ─── 主函数 ──────────────────────────────────────
module.exports = async function install(name) {

  // ══════════════════════════════════════════════
  // 模式一：owner/repo  直接 GitHub clone
  // ══════════════════════════════════════════════
  if (name.includes('/')) {
    const parts = name.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      console.log('用法：npx skillpick install owner/repo');
      process.exit(1);
    }
    const installUrl = `https://github.com/${name}`;
    const skillName  = parts[0] + '__' + parts[1];
    const skillDir   = path.join(os.homedir(), '.skillmanager', 'skills', skillName);

    console.log(`\n${B}◆ 正在安装 ${name}（来自 GitHub）${X}`);
    console.log(`  ← ${installUrl}`);

    const ok = await doClone(installUrl, skillDir);
    if (!ok) process.exit(1);

    await doCheck(skillDir);
    try { await post(`${API_BASE}/api/install`, { name: skillName }); } catch(e) {}

    console.log(`\n${G}${B}✓ 下载完成！${X} 路径：${D}${skillDir}${X}`);
    // 自动注册到 ~/skills/<repoName>，让 Claude Code / OpenClaw 直接识别
    registerToAgentSkills(parts[1], skillDir);
    showActivateGuide(parts[1], skillDir);
    showFlywheel();
    return;
  }

  // ══════════════════════════════════════════════
  // 模式二：关键词搜索 → 推荐安装
  // ══════════════════════════════════════════════
  console.log(`\n${B}◆ 搜索 "${name}"...${X}`);

  let results;
  try {
    const resp = await get(`${API_BASE}/api/search?q=${encodeURIComponent(name)}`);
    if (!resp.ok || !resp.results || resp.results.length === 0) {
      console.log(`  ${R}✗ 未找到："${name}"${X}`);
      console.log(`  ${D}提示：精确安装请用 npx skillpick install owner/repo${X}`);
      process.exit(1);
    }
    results = resp.results;
  } catch(e) {
    console.log(`  ${R}✗ 搜索失败：${e.message}${X}`);
    console.log(`  ${D}提示：精确安装请用 npx skillpick install owner/repo${X}`);
    process.exit(1);
  }

  // 精确匹配 → 直接安装
  const exact = results.find(r => r.name === name);
  if (exact) {
    console.log(`  ${G}✓ 精确匹配 ${exact.display_name || exact.name}${X}`);
    showSkill(exact);
    await installSkill(exact);
    return;
  }

  // 无精确匹配 → 推荐最接近
  const best = results[0];
  console.log(`  ${Y}未找到精确匹配，最接近：${X}\n`);
  console.log(`  ${B}${best.display_name || best.name}${X}`);
  showSkill(best);

  const choice = await askConfirm('  安装这个？[y/N] ');
  if (!choice) {
    console.log('  已取消');
    return;
  }

  await installSkill(best);
};
