#!/usr/bin/env node
/**
 * 小红书内容墙刷新脚本
 * 用法：node refresh-wall.js [--source feishu|local]
 *
 * 数据源优先级：
 *   1) feishu CLI 拉 tblpB82QdYcbiEqY（需要 base:record:retrieve scope）
 *   2) 失败时自动回退到本地 markdown 扫描（小红书目录下所有 -小红书*.md）
 *
 * 输出：同目录 index.html
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const APP_TOKEN = "UUUcbggPraDrEqspiQecFVvBnFe";
const TABLE_ID = "tblpB82QdYcbiEqY";
const DIR = __dirname;
const FEISHU_CLI = "D:/Software/dev/nodejs/node_global/node_modules/@fanfanv5/feishu-cli/bin/feishu.js";

// ---------- 数据源 1：飞书 ----------
function fetchFromFeishu() {
  console.log("→ 尝试从飞书拉取...");
  const all = [];
  let pageToken = null;
  let page = 0;
  while (true) {
    page++;
    const args = [
      FEISHU_CLI, "bitable", "record", "list",
      APP_TOKEN, TABLE_ID,
      "--page_size", "100",
    ];
    if (pageToken) args.push("--page_token", pageToken);
    const r = spawnSync("node", args, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    const out = r.stdout || "";
    // JSON 走 stdout，日志走 stderr。但 stdout 末尾就是完整 JSON 对象，括号匹配反向扫描
    const jsonEnd = out.lastIndexOf("}");
    if (jsonEnd < 0) throw new Error("飞书返回为空:\n" + (r.stderr || "").slice(-500));
    let depth = 0, jsonStart = -1;
    for (let i = jsonEnd; i >= 0; i--) {
      if (out[i] === "}") depth++;
      else if (out[i] === "{") { depth--; if (depth === 0) { jsonStart = i; break; } }
    }
    if (jsonStart < 0) throw new Error("JSON 括号不匹配");
    const payload = JSON.parse(out.slice(jsonStart, jsonEnd + 1));
    if (payload.error) throw new Error("飞书错误: " + payload.error);
    const items = payload.records || payload.items || payload.data?.records || payload.data?.items || [];
    items.forEach(it => all.push(it.fields || it));
    pageToken = payload.page_token || payload.data?.page_token;
    if (!pageToken) break;
    if (page > 20) break;
  }
  return all.map(f => ({
    标题: extractText(f["标题"]),
    正文内容: extractText(f["正文内容"]),
    封面图URL: extractText(f["封面图URL"]),
    图片2URL: extractText(f["图片2URL"]),
    图片3URL: extractText(f["图片3URL"]),
    图片4URL: extractText(f["图片4URL"]),
    状态: extractText(f["状态"]) || "待发布",
    发布时间: extractText(f["发布时间"]) || "",
  }));
}

function extractText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(x => x.text || x.link || x).join("");
  if (typeof v === "object") return v.text || v.link || JSON.stringify(v);
  return String(v);
}

// ---------- 数据源 2：本地 markdown ----------
function fetchFromLocal() {
  console.log("→ 回退到本地 markdown 扫描...");
  const files = fs.readdirSync(DIR).filter(f =>
    /-小红书.*\.md$/.test(f) || /小红书三篇.*\.md$/.test(f) || /小红书第四篇\.md$/.test(f)
  );
  const records = [];
  files.forEach(file => {
    const date = (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || file.slice(0, 10);
    const content = fs.readFileSync(path.join(DIR, file), "utf8");
    // 按 "## 篇" 或 "## 第X" 分篇
    const chunks = content.split(/^##\s+/m).filter(c => c.match(/^[篇①②③④]|科普|种草|对比|技巧|【/));
    chunks.forEach(chunk => {
      const lines = chunk.split("\n");
      const titleLine = lines[0].trim().replace(/^#+\s*/, "");
      // 提取所有图片 URL
      const imgUrls = [...chunk.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)].map(m => m[1]);
      if (imgUrls.length < 1) return;
      // 摘要：第一段非空非引用文本
      const excerpt = lines.slice(1).find(l =>
        l.trim() && !l.startsWith(">") && !l.startsWith("!") && !l.startsWith("#")
      ) || "";
      records.push({
        标题: titleLine.replace(/^[篇①②③④]+\s*[【\|｜]?\s*\w*型?\s*[】\|｜]?\s*/, "").trim() || titleLine,
        正文内容: chunk,
        封面图URL: imgUrls[0],
        图片2URL: imgUrls[1] || imgUrls[0],
        图片3URL: imgUrls[2] || imgUrls[0],
        图片4URL: imgUrls[3] || imgUrls[0],
        状态: "待发布",
        发布时间: date,
        _excerpt: excerpt.trim().slice(0, 80),
      });
    });
  });
  return records;
}

// ---------- 渲染 ----------
function buildExcerpt(rec) {
  if (rec._excerpt) return rec._excerpt;
  const text = (rec.正文内容 || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/^>[^\n]*\n/gm, "")
    .replace(/^#+[^\n]*\n/gm, "")
    .replace(/^\s*[-*]\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^>.*$/gm, "")
    .trim();
  return text.slice(0, 60);
}

function cleanImg(url) {
  if (!url) return "";
  url = url.trim();
  // 修复缺 ? 的畸形 URL（photo-XXX&w=...）
  if (!/\?/.test(url) && /unsplash\.com\/photo-[^/?]+&/.test(url)) {
    url = url.replace(/(photo-[^/?]+)&/, "$1?");
  }
  return url;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function render(records, SOURCE_NAME) {
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const enriched = records.map((r, i) => {
    // 飞书日期字段是毫秒时间戳；本地 markdown 是 YYYY-MM-DD 字符串
    let ts = 0;
    const raw = r.发布时间;
    if (typeof raw === "number") ts = raw;
    else if (typeof raw === "string" && /^\d{10,13}$/.test(raw)) ts = Number(raw);
    else if (raw) ts = Date.parse(raw) || 0;
    if (!ts) ts = now.getTime(); // 没日期当今天处理，不归档
    const date = formatDate(ts);
    const isArchive = (now.getTime() - ts) > THIRTY_DAYS_MS;
    return {
      id: i,
      title: r.标题 || "(无标题)",
      excerpt: buildExcerpt(r),
      cover: cleanImg(r.封面图URL),
      imgs: [r.封面图URL, r.图片2URL, r.图片3URL, r.图片4URL].map(cleanImg).filter(Boolean),
      status: (r.状态 || "待发布").trim(),
      date,
      ts,
      isArchive,
    };
  }).sort((a, b) => b.ts - a.ts);

  const pending = enriched.filter(r => !r.isArchive && r.status === "待发布").length;
  const published = enriched.filter(r => !r.isArchive && r.status === "已发布").length;
  const archive = enriched.filter(r => r.isArchive);
  const active = enriched.filter(r => !r.isArchive);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>📔 旭日扬升 · 小红书内容墙</title>
<style>
  :root { --red:#FF2442; --bg:#FFF8F0; --card:#fff; --txt:#222; --mute:#888; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--txt);padding:32px 16px;min-height:100vh}
  .wrap{max-width:1280px;margin:0 auto}
  h1{text-align:center;font-size:30px;margin-bottom:8px;color:var(--red)}
  .sub{text-align:center;color:var(--mute);margin-bottom:24px;font-size:14px}
  .stats{display:flex;justify-content:center;gap:24px;margin-bottom:24px;flex-wrap:wrap}
  .stat{background:#fff;padding:14px 24px;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.05);text-align:center}
  .stat .n{font-size:24px;font-weight:700;color:var(--red)}
  .stat .l{font-size:12px;color:var(--mute);margin-top:2px}
  .tabs{display:flex;justify-content:center;gap:10px;margin-bottom:28px;flex-wrap:wrap}
  .tab{padding:8px 20px;border-radius:20px;background:#fff;cursor:pointer;font-size:14px;color:#444;border:1px solid #eee;user-select:none;transition:.2s}
  .tab.on{background:var(--red);color:#fff;border-color:var(--red)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px}
  .card{background:var(--card);border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);transition:transform .2s;position:relative}
  .card:hover{transform:translateY(-4px)}
  .cover{width:100%;aspect-ratio:3/4;object-fit:cover;background:#eee;cursor:pointer;display:block}
  .badge{position:absolute;top:12px;right:12px;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;backdrop-filter:blur(8px);background:rgba(255,36,66,.9)}
  .badge.pub{background:rgba(46,204,113,.9)}
  .body{padding:16px}
  .title{font-size:16px;font-weight:600;line-height:1.4;margin-bottom:10px;color:#222;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .excerpt{font-size:12.5px;color:#666;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:60px}
  .thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:12px}
  .thumbs img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:4px;cursor:pointer;background:#eee}
  .meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--mute);margin-top:10px}
  .date-pill{display:inline-block;padding:3px 10px;background:#fff0f3;color:var(--red);border-radius:10px;font-weight:500;letter-spacing:.3px}
  .archive{margin-top:48px}
  .archive summary{cursor:pointer;font-size:16px;font-weight:600;color:var(--mute);padding:12px;background:#fff;border-radius:10px;list-style:none}
  .archive summary::before{content:"▶ ";font-size:10px}
  .archive[open] summary::before{content:"▼ "}
  .archive .grid{margin-top:20px}
  .modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99;align-items:center;justify-content:center;padding:20px}
  .modal.on{display:flex}
  .modal img{max-width:92vw;max-height:92vh;border-radius:8px}
  .close{position:absolute;top:20px;right:30px;color:#fff;font-size:36px;cursor:pointer;user-select:none}
  .empty{text-align:center;padding:60px 20px;color:var(--mute);font-size:14px}
  .footer{text-align:center;margin-top:48px;color:var(--mute);font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <h1>📔 旭日扬升 · 小红书内容墙</h1>
  <p class="sub">最近 30 天 · 数据源：${SOURCE_NAME} · 刷新于 ${now.toLocaleString("zh-CN")}</p>
  <div class="stats">
    <div class="stat"><div class="n">${pending}</div><div class="l">待发布</div></div>
    <div class="stat"><div class="n">${published}</div><div class="l">已发布</div></div>
    <div class="stat"><div class="n">${active.length}</div><div class="l">活跃总数</div></div>
    <div class="stat"><div class="n">${archive.length}</div><div class="l">往期归档</div></div>
  </div>
  <div class="tabs">
    <div class="tab on" data-f="all">全部</div>
    <div class="tab" data-f="待发布">待发布</div>
    <div class="tab" data-f="已发布">已发布</div>
  </div>
  <div class="grid" id="grid"></div>
  ${archive.length ? `<details class="archive"><summary>📦 往期归档（${archive.length}）</summary><div class="grid" id="archive-grid"></div></details>` : ""}
  <div class="footer">© 旭日扬升 · 由 Claudian 自动生成 · node refresh-wall.js</div>
</div>
<div class="modal" id="m" onclick="this.classList.remove('on')"><span class="close">×</span><img id="mi" src=""></div>
<script>
const ACTIVE = ${JSON.stringify(active)};
const ARCHIVE = ${JSON.stringify(archive)};
let filter = "all";
function card(r){
  const cls = r.status === "已发布" ? "badge pub" : "badge";
  const FB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><rect width='60' height='60' fill='%23f5f5f7'/><text x='30' y='34' font-size='10' fill='%23bbb' text-anchor='middle'>裂图</text></svg>";
  const thumbs = r.imgs.slice(0,4).map(u=>\`<img src="\${u}" onerror="this.src='\${FB}'" onclick="show('\${u}')">\`).join("");
  return \`<div class="card" data-s="\${r.status}">
    <img class="cover" src="\${r.cover}" onerror="this.src='\${FB}'" onclick="show('\${r.cover}')">
    <div class="\${cls}">\${r.status==="已发布"?"🟢 已发布":"🔴 待发布"}</div>
    <div class="body">
      <div class="title">\${r.title}</div>
      <div class="excerpt">\${r.excerpt}</div>
      <div class="thumbs">\${thumbs}</div>
      <div class="meta"><span class="date-pill">\${r.date}</span></div>
    </div>
  </div>\`;
}
function render(){
  const g = document.getElementById("grid");
  const list = filter === "all" ? ACTIVE : ACTIVE.filter(r=>r.status===filter);
  g.innerHTML = list.length ? list.map(card).join("") : '<div class="empty">这个状态下还没有内容～</div>';
  const ag = document.getElementById("archive-grid");
  if (ag) ag.innerHTML = ARCHIVE.map(card).join("");
}
document.querySelectorAll(".tab").forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));
    t.classList.add("on");
    filter = t.dataset.f;
    render();
  };
});
function show(s){document.getElementById("mi").src=s;document.getElementById("m").classList.add("on");}
render();
</script>
</body>
</html>`;
}

// ---------- 主流程 ----------
let records = [];
let SOURCE_NAME = "本地 Markdown";
try {
  records = fetchFromFeishu();
  SOURCE_NAME = "飞书多维表（实时）";
  console.log(`✓ 飞书拉到 ${records.length} 条`);
} catch (e) {
  console.log(`✗ 飞书失败：${e.message.split("\n")[0]}`);
  console.log(`  → 修复方法：在飞书开放平台为应用补充 scope: base:record:retrieve，然后运行：`);
  console.log(`     feishu auth device-flow --scope "offline_access bitable:app base:record:create base:record:retrieve"`);
  records = fetchFromLocal();
  console.log(`✓ 本地扫到 ${records.length} 条`);
}

const html = render(records, SOURCE_NAME);
fs.writeFileSync(path.join(DIR, "index.html"), html, "utf8");
console.log(`✓ index.html 已生成：${path.join(DIR, "index.html")}`);
