const path = require('path');
const os   = require('os');
const fs   = require('fs');

// ─── 颜色 ────────────────────────────────────────
const G = '\x1b[32m', Y = '\x1b[33m';
const C = '\x1b[36m', D = '\x1b[2m',  B = '\x1b[1m', X = '\x1b[0m';

function listDir(baseDir, label) {
  if (!fs.existsSync(baseDir)) return [];
  try {
    return fs.readdirSync(baseDir)
      .filter(name => {
        const full = path.join(baseDir, name);
        return fs.statSync(full).isDirectory();
      })
      .map(name => ({ name, dir: path.join(baseDir, name), source: label }));
  } catch(e) {
    return [];
  }
}

module.exports = function list() {
  const dirs1 = listDir(path.join(os.homedir(), '.skillmanager', 'skills'), '~/.skillmanager/skills');
  const dirs2 = listDir(path.join(os.homedir(), 'skills'), '~/skills');

  // 合并，按 name 去重（dirs2 优先级低）
  const seen = new Set();
  const all = [];
  for (const item of [...dirs1, ...dirs2]) {
    if (!seen.has(item.name)) {
      seen.add(item.name);
      all.push(item);
    }
  }

  if (all.length === 0) {
    console.log(`\n  ${Y}△ 尚未安装任何 Skill${X}`);
    console.log(`  ${D}提示：用 skillpick install <name> 安装${X}`);
    console.log('');
    return;
  }

  console.log(`\n${B}◆ 已安装的 Skill（${all.length} 个）${X}\n`);

  for (const { name, dir, source } of all) {
    // 尝试读取 SKILL.md 里的 display_name / version
    let meta = '';
    try {
      const skillMd = path.join(dir, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, 'utf8').slice(0, 2000);
        const nameMatch    = content.match(/display_name[:\s]+(.+)/i);
        const versionMatch = content.match(/version[:\s]+([\d.]+)/i);
        const parts = [];
        if (nameMatch)    parts.push(nameMatch[1].trim().replace(/^["']|["']$/g, ''));
        if (versionMatch) parts.push(`v${versionMatch[1].trim()}`);
        meta = parts.join('  ');
      }
    } catch(e) {}

    const displayName = meta || name;
    console.log(`  ${G}●${X} ${B}${name}${X}${meta ? `  ${D}${meta}${X}` : ''}`);
    console.log(`    ${D}${dir}${X}`);
  }

  console.log('');
  console.log(`  ${D}卸载：skillpick uninstall <name>${X}`);
  console.log('');
};
