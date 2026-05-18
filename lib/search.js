const { API_BASE, get } = require('./api');

module.exports = async function search(keyword) {
  console.log(`\n🔍 SkillPick 搜索：「${keyword}」\n`);

  try {
    const resp = await get(`${API_BASE}/api/search?q=${encodeURIComponent(keyword)}`);
    if (!resp.ok || !resp.results) {
      console.log('❌ 未找到匹配的 Skill');
      return;
    }

    resp.results.forEach((s, i) => {
      const rank = ['🥇', '🥈', '🥉'][i] || '  ';
      console.log(`${rank} ${s.display_name || s.name}`);
      console.log(`   质量：${s.quality_grade || '?'} · ${s.final_score} 分 · ⭐${s.stars || 0}`);
      const dims = s.dims || {};
      console.log(`   市场${dims.market||0}/安全${dims.safety||0}/体验${dims.quality||0}/口碑${dims.community||0}`);
      if (s.vendor) console.log(`   出品：${s.vendor}`);
      if (s.desc) console.log(`   ${s.desc.slice(0, 80)}`);
      console.log();
    });
  } catch(e) {
    console.log('❌ 搜索失败:', e.message);
  }
};
