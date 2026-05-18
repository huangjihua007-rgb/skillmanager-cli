#!/usr/bin/env node
/**
 * SkillManager CLI — AI Skill 全家桶
 *
 *   skillmanager install <name>    搜索+安装+体检
 *   skillmanager search  <keyword>  搜索 SkillPick TOP3
 *   skillmanager check   <name>     SkillGuard 安全体检
 *   skillmanager browse             打开本地 SkillPick
 */

const { program } = require('commander');
const pkg = require('../package.json');
const https = require('https');

// ─── 静默检查版本更新（不阻塞主流程）────────────────
function checkUpdate() {
  const req = https.get(
    `https://registry.npmjs.org/skillpick/latest`,
    { headers: { 'User-Agent': 'skillpick-cli/' + pkg.version } },
    (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const latest = JSON.parse(data).version;
          if (latest && latest !== pkg.version) {
            const Y = '\x1b[33m', B = '\x1b[1m', X = '\x1b[0m', D = '\x1b[2m';
            console.log(`\n  ${Y}${B}↑ 有新版本可用：skillpick ${latest}${X}`);
            console.log(`  ${D}  运行 npm i -g skillpick 升级${X}\n`);
          }
        } catch(e) {}
      });
    }
  );
  req.on('error', () => {});
  req.setTimeout(3000, () => req.destroy());
}

checkUpdate();

program
  .name('skillpick')
  .description('AI技能精选管家 — 装 Skill、搜优选、做体检')
  .version(pkg.version);

program
  .command('install <name> [rest...]')
  .description('安装 Skill（自动搜索最优 + 安全体检）')
  .action((name, rest) => {
    const fullName = rest && rest.length ? name + ' ' + rest.join(' ') : name;
    require('../lib/install')(fullName);
  });

program
  .command('search <keyword> [rest...]')
  .description('搜索 SkillPick 推荐（纯查询，不安装）')
  .action((keyword, rest) => {
    const fullKeyword = rest && rest.length ? keyword + ' ' + rest.join(' ') : keyword;
    require('../lib/search')(fullKeyword);
  });

program
  .command('check <name>')
  .description('SkillGuard 安全体检（4维评分 + 风险报告）')
  .action(require('../lib/check'));

program
  .command('browse')
  .description('打开本地 SkillPick 精选页面')
  .action(require('../lib/browse'));

program
  .command('uninstall <name>')
  .alias('remove')
  .description('卸载已安装的 Skill')
  .action(require('../lib/uninstall'));

program
  .command('list')
  .alias('ls')
  .description('列出所有已安装的 Skill')
  .action(require('../lib/list'));

program.parse();
