const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = async function browse() {
  console.log('\n🌐 打开 SkillPick 精选页面...\n');

  const skillDir = path.join(os.homedir(), '.skillmanager', 'skillpick');
  const indexPath = path.join(skillDir, 'index.html');

  // 本地没有就自动下载
  if (!fs.existsSync(indexPath)) {
    console.log('📦 首次使用，下载 SkillPick ...');
    try {
      fs.mkdirSync(skillDir, { recursive: true });
      execSync('git clone --depth 1 https://github.com/huangjihua007-rgb/skillpick.git "' + skillDir + '"', {
        stdio: 'pipe', timeout: 30000
      });
      console.log('✅ 下载完成');
    } catch(e) {
      console.log('⚠️ 下载失败，尝试打开在线版');
      openUrl('https://skillmanager.top');
      return;
    }
  }

  openUrl(indexPath);
  console.log('✅ 已在浏览器中打开 SkillPick');
};

function openUrl(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') execSync(`start "" "${url}"`, { stdio: 'ignore' });
    else if (platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' });
    else execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
  } catch(e) {
    console.log(`📎 请手动打开: ${url}`);
  }
}
