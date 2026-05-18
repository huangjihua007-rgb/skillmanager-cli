const path = require('path');
const os   = require('os');
const fs   = require('fs');
const readline = require('readline');

// ─── 颜色 ────────────────────────────────────────
const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m';
const C = '\x1b[36m', D = '\x1b[2m',  B = '\x1b[1m', X = '\x1b[0m';

function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function removeDir(dir, label) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  ${G}✓ 已删除${X}  ${D}${label}${X}`);
    return true;
  } catch(e) {
    console.log(`  ${R}✗ 删除失败${X}  ${D}${label}${X}`);
    console.log(`    ${D}${e.message}${X}`);
    return false;
  }
}

module.exports = async function uninstall(name) {
  // name 可能是 slug / owner__repo / owner/repo（转换一下）
  const safeName = name.replace('/', '__');

  // 两个可能的安装位置
  const dirs = [
    { dir: path.join(os.homedir(), '.skillmanager', 'skills', safeName),  label: '~/.skillmanager/skills/' + safeName },
    { dir: path.join(os.homedir(), '.skillmanager', 'skills', name),       label: '~/.skillmanager/skills/' + name },
    { dir: path.join(os.homedir(), 'skills', name),                         label: '~/skills/' + name },
    { dir: path.join(os.homedir(), 'skills', safeName),                     label: '~/skills/' + safeName },
  ];

  // 去重（safeName === name 时会有重复）
  const seen = new Set();
  const toCheck = dirs.filter(({ dir }) => {
    if (seen.has(dir)) return false;
    seen.add(dir);
    return true;
  });

  const found = toCheck.filter(({ dir }) => fs.existsSync(dir));

  if (found.length === 0) {
    console.log(`\n  ${Y}△ 未找到已安装的 "${name}"${X}`);
    console.log(`  ${D}提示：用 skillpick list 查看已安装的 Skill${X}`);
    console.log('');
    return;
  }

  console.log(`\n${B}◆ 卸载 "${name}"${X}\n`);
  for (const { label } of found) {
    console.log(`  ${D}${label}${X}`);
  }
  console.log('');

  const ok = await askConfirm('  确认卸载？[y/N] ');
  if (!ok) {
    console.log('  已取消');
    console.log('');
    return;
  }

  console.log('');
  let anyOk = false;
  for (const { dir, label } of found) {
    if (removeDir(dir, label)) anyOk = true;
  }

  if (anyOk) {
    console.log(`\n${G}${B}✓ 卸载完成！${X}\n`);
  }
};
