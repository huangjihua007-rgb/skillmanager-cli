# SkillPick — AI技能精选管家

AI Skill 全家桶 — 一键安装 AI Skill，含 SkillPick 搜索优选 + SkillGuard 安全体检。

## 安装

```bash
npx skillpick install pdf
```

（兼容别名：`npx skillmgr` 同样可用）

## 命令

```bash
skillpick install <name>    安装 Skill（自动搜索最优 + 安全体检）
skillpick search  <keyword>  搜索 SkillPick TOP3（纯查询）
skillpick check   <name>     SkillGuard 安全体检
skillpick browse             打开本地 SkillPick 精选页面
```

## 示例

```bash
# 直接安装（自动选最优）
npx skillpick install pdf

# 先搜索看看
npx skillpick search "video editing"

# 体检已安装的 skill
npx skillpick check huangjihua007-rgb/skillpick

# 浏览 SkillPick
npx skillpick browse
```
