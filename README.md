<div align="center">

# rag-knowledge-web

[![Vue](https://img.shields.io/badge/Vue-3.x-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vite.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.x-409eff.svg)](https://element-plus.org/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)

**中文** | [English](README.en.md)

</div>

## 🌟 项目介绍

rag-knowledge-web 是 [rag-knowledge-system](https://github.com/OOMEcho/rag-knowledge-system) 后端的 Web 前端，提供知识库/文档管理和 RAG 流式问答界面。采用前后端分离架构，构建产物为纯静态文件，可部署到任意静态服务器。

### ✨ 核心特性

- 📚 **知识库管理**: 列表、搜索、新建、编辑、删除（含删除保护提示）
- 📄 **文档管理**: 拖拽上传（自动触发入库）、入库状态实时轮询、失败重试、分块预览、删除
- 💬 **RAG 问答**: SSE 打字机流式回答、markdown 渲染、引用来源卡片（文档名/分块号/融合分数）、停止生成、复制回答
- 🔁 **多轮对话**: 前端维护对话历史随请求发送，追问被服务端改写时展示"已根据上下文理解为…"提示条
- 🔍 **仅检索模式**: 直接查看混合检索（向量 + 关键词 RRF 融合）命中结果，调试检索质量
- ⚙️ **连接设置**: 设置弹窗配置后端地址和 API Key（localStorage 持久化），切换无需刷新
- 🎛️ **检索参数**: topK、相似度阈值界面可调

## 🔗 相关项目

- 点击跳转[后端仓库](https://github.com/OOMEcho/rag-knowledge-system)（Spring Boot 3 + Spring AI + Ollama + pgvector）

## 🏗️ 技术架构

| 技术 | 版本 | 描述 |
|------|------|------|
| Vue | 3.5 | 组合式 API |
| TypeScript | 6.0 | 类型安全 |
| Vite | 8.x | 构建工具 + 开发代理 |
| Element Plus | 2.14 | UI 组件库（全量引入） |
| Pinia | 3.x | 状态管理（连接设置） |
| Vue Router | 5.x | hash 模式路由（部署无需服务器 fallback） |
| axios | 1.x | HTTP 客户端（统一解包 ApiResponse、注入 X-API-Key） |
| markdown-it + DOMPurify | - | 回答渲染 + XSS 防护 |

## 🚀 快速开始

### 环境要求

- 📦 Node.js 20+
- 🔙 已启动的后端服务（默认 `http://localhost:8080`，见后端 README）

### 本地开发

```bash
git clone https://github.com/OOMEcho/rag-knowledge-web.git
cd rag-knowledge-web
npm install
npm run dev
```

打开 `http://localhost:5173`。开发模式下 Vite 把 `/api` 和 `/actuator` 代理到本地后端（见 `vite.config.ts`），无需任何配置。

### 构建部署

```bash
npm run build
```

`dist/` 产物用任意静态服务器托管（nginx、静态托管平台均可）。部署后两步接通后端：

1. 页面右上角「设置」填写后端地址（如 `http://192.168.1.10:8080`）和 API Key（后端开启认证时）
2. 后端把前端域名加入跨域白名单：`RAG_CORS_ALLOWED_ORIGINS=https://your-frontend-domain`

## 🏛️ 系统架构

### 目录结构

```
src/
├── api/
│   ├── http.ts               # axios 封装：动态 baseURL、X-API-Key 注入、ApiResponse 解包
│   ├── sse.ts                # POST SSE 客户端：fetch + ReadableStream 手写解析
│   ├── knowledgeBase.ts      # 知识库 API
│   ├── document.ts           # 文档 API
│   └── rag.ts                # 检索/问答/流式 API
├── stores/
│   └── settings.ts           # 连接设置（localStorage 持久化）
├── types/
│   └── api.ts                # 与后端 DTO 对应的类型（ID 均为 string）
├── views/
│   ├── KnowledgeBaseView.vue # 知识库管理
│   ├── DocumentView.vue      # 文档管理（上传/轮询/分块抽屉）
│   └── ChatView.vue          # 问答（SSE 流式 + 仅检索 Tab）
├── components/
│   ├── ReferenceList.vue     # 引用来源折叠列表
│   ├── DocumentStatusTag.vue # 入库状态徽章
│   └── SettingsDialog.vue    # 连接设置弹窗
└── router/                   # hash 路由
```

### 页面路由

| 路由 | 页面 |
|------|------|
| `/#/kbs` | 知识库列表 |
| `/#/kbs/:id/documents` | 指定知识库的文档管理 |
| `/#/chat?kbId=` | RAG 问答（可带知识库跳转） |

## 🔧 与后端的契约要点

- **ID 为字符串**: 后端所有 ID 类字段（19 位雪花 ID）序列化为 JSON 字符串——雪花 ID 超出 JS Number 安全整数范围（2^53），数字形式会精度丢失
- **POST SSE**: 流式问答是 POST + JSON 体，原生 EventSource 不支持，故用 fetch + ReadableStream 手动解析 `text/event-stream`；事件顺序 `rewrittenQuestion`（仅多轮改写时）→ `references`（JSON 引用列表）→ 若干 `delta`（回答增量）→ `done`，任何错误转为 `error` 事件
- **输入长度**: 问答和检索问题最多 4096 个字符，发送前校验并显示字数
- **无状态多轮**: 服务端不保存会话，`history` 仅发送完整成功的问答轮次（按时间升序，最多 20 条）。单条历史副本最多保留前 8192 个字符，页面仍展示完整回答；失败或主动停止的整轮对话不进入历史
- **流式中断**: 必须收到完整的 `done` 或 `error` 事件才结束；提前断开会保留部分回答并提示重试。切换知识库或离开问答页会取消当前流式请求
- **入库为异步任务**: 上传后触发入库立即返回 `PARSING`，前端每 2 秒轮询文档详情直到 `COMPLETED`/`FAILED` 终态自动停止

## 📄 许可证

本项目基于 [Apache-2.0](LICENSE) 许可证开源（与后端一致）。

## ❓ 常见问题

<details>
<summary>页面能打开但所有请求报"无法连接后端服务"？</summary>

开发模式确认后端已在 8080 端口启动；生产部署确认「设置」中的后端地址正确，且后端 `RAG_CORS_ALLOWED_ORIGINS` 已包含前端域名。
</details>

<details>
<summary>后端开启认证后请求全部 401？</summary>

在页面右上角「设置」中填入后端 `RAG_API_KEYS` 中配置的任意一个 Key，保存后立即生效（无需刷新）。
</details>

<details>
<summary>为什么用 hash 路由而不是 history 路由？</summary>

hash 路由不需要服务器端 SPA fallback 配置，`dist/` 扔到任何静态服务器（甚至 `file://`）都能直接用，符合本项目"部署零配置"的定位。
</details>

<details>
<summary>如何调整检索效果？</summary>

问答页左侧可调 topK 和相似度阈值；用「仅检索」Tab 直接观察混合检索命中的分块和分数，比通过回答质量反推更直观。
</details>

## 📞 支持

如果您在使用过程中遇到问题，可以通过以下方式寻求帮助：

- 🐛 Issue: [提交Issue](https://github.com/OOMEcho/rag-knowledge-web/issues)
- 📖 后端项目: [rag-knowledge-system](https://github.com/OOMEcho/rag-knowledge-system)

---

<div align="center">

**如果这个项目对您有帮助，请给它一个 ⭐ Star！**

Made with ❤️ by [OOMEcho](https://github.com/OOMEcho)

</div>
