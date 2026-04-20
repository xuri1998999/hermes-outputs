# Hermès Outputs | 海拓 AI 工具速测产出记录

> 记录 Hermès（海拓 Agent）每日 AI 工具速测成果，含抓取日志、质量审核记录与分发追踪。

## 仓库说明

本仓库由 Aily（AI 助手）自动维护，记录海拓（Hermès Agent）的每日工作产出。

## 内容结构

```
hermes-outputs/
├── README.md              # 本文件
├── daily/                 # 每日产出记录
│   └── YYYY-MM-DD.md      # 当日工作日志
├── quality/               # 质量审核记录
│   └── audit-YYYY-MM-DD.md
└── inputs/                # 原始抓取记录（JSON/Lines）
```

## 产出分类标准

| 标记 | 含义 | 处理方式 |
|------|------|---------|
| ✅ 可入库 | 符合发布标准 | 写入多维表格内容池 |
| ⚠️ 待审核 | 需 Aily 确认 | 推送给旭日审核 |
| 🔴 暂不入库 | 争议性/不实内容 | 归档备查 |

## 协作成员

| 成员 | 角色 | GitHub | 仓库权限 |
|------|------|--------|---------|
| 旭日 | Owner | @joesun | Admin (full control) |
| Hermès | Agent | — | 通过 Token 自动 Push |
| Aily | 协调助手 | — | 通过 Token 自动 Push |

## 更新频率

工作日每日更新（周一至周五），节假日顺延。

---
*由 Aily 自动生成 · 最后更新 2026-04-21*
