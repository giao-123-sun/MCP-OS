# MCP-OS · Model Context Protocol Orchestration System  
> **让你的大模型只关注解决问题，而不是在茫茫 MCP 中“择木而栖”**
> **👉 [查看英文版 README](./README_en-EN.md)**
---

## ✨ 项目愿景
随着 **Model Context Protocol (MCP)** 生态迅猛发展，海量的 MCP Server 给 LLM 带来了三大痛点：

| 痛点 | 描述 |
| ---- | ---- |
| Prompt 膨胀 | 长篇 MCP 描述占据上下文，模型“挑工具”远多于 **planning / analysis** |
| 连接治理 | 需要实时监控 *哪些* MCP 可用、*是否*满足当前任务 |
| 资源安全 | 长时间开放的 MCP Server 造成 **内存占用**、**接口暴露** 等风险 |

**MCP-OS** 的目标是：  
> *“像操作系统管理进程一样管理 MCP，让 LLM 获得‘用时即检、闲时即卸’的极简体验。”*

---

## 🌟 当前阶段：MCP-Retriever（已完成 ✅）
1. **向量化检索** —— 对任务描述生成 Embedding，在 MCP 索引中召回 Top-k 候选  
2. **轻量提示模板** —— 仅将 *Top-k* MCP 描述拼接进 Prompt，平均节省 70% Token  
3. **可插拔后端** —— 默认使用 `openai/embeddings`，支持 Any-Vector-DB（FAISS, Qdrant, Milvus …）

> 📖 详细实现请见 [`/packages/retriever`](./packages/retriever) 目录。

---

## 🛣️ 路线图

| 里程碑 | 功能 | 进度 |
| ------ | ---- | ---- |
| v0.1   | **MCP-Retriever**：检索式匹配 | ✅ 已发布 |
| v0.2   | **MCP-Retriever**：轻量化检索式匹配 | ⏳ 进行中 |
| v0.3   | **Health-Check Daemon**：自动探活 & 失效剔除 | ⏳ 进行中 |
| v0.4   | **Runtime Manager**：需求驱动的 MCP Server 启停 | 🕑 规划 |
| v1.0   | **Policy Sandbox**：权限、速率、费用的细粒度控制 | 🕑 规划 |

---

## ⚙️ 快速开始

### 1. 克隆与安装

```bash
git clone https://github.com/your-org/mcp-os.git
cd mcp-os
npm install   # 或 npm / yarn
```

### 2. 构建检索索引

```bash
# 扫描本地 / 远程 MCP 描述，生成向量索引
npm run build:index --src ./mcp_list.json --out ./index
```

### 3. 启动 Retriever Server

```bash
npm run start:retriever
# 默认监听 127.0.0.1:5500，支持 HTTP / SSE
```

### 4. 在 LLM / Agent 中调用

```jsonc
// 以 Claude Desktop 为例
{
  "mcpServers": {
    "mcp-os": {
      "command": "/absolute/path/to/mcp-os/bin/retriever.js"
    }
  }
}
```

或者直接通过 REST：

```bash
curl -X POST http://localhost:5500/match \
  -H "Content-Type: application/json" \
  -d '{"task": "爬取一个网页并提取标题"}'
```

返回示例：

```json
{
  "matches": [
    {
      "id": "web-scraper",
      "score": 0.89,
      "functions": ["fetchHtml", "querySelector"]
    },
    ...
  ]
}
```

---

## 📂 目录结构
```
mcp-os/
├─ packages/
│  ├─ retriever/        # 阶段一：向量检索
│  ├─ health-check/     # 阶段二：探活守护进程（开发中）
│  └─ runtime-manager/  # 阶段三：按需启停（规划）
├─ scripts/             # CLI & 辅助脚本
├─ examples/            # 使用示例
└─ docs/                # 架构设计与进阶指南
```

---

## 🧩 配置文件格式

`mcp_list.json` 用来描述 MCP 元数据：

```json
{
  "web-scraper": {
    "name": "Web Scraper MCP",
    "description": "爬取网页并解析 DOM",
    "functions": ["fetchHtml", "querySelector"]
  },
  "calc": { ... }
}
```

---

## 📝 常见问题

<details>
<summary>检索效果不理想，如何调参？</summary>

- 增大 `topK` 提升召回率
- 切换更强的 Embedding 模型
- 调整任务描述归一化规则
</details>

<details>
<summary>如何接入自定义存储？</summary>

实现 `VectorStore` 接口即可：`src/store/yourStore.ts`
</details>

---

## 🤝 Contributing

1. **Fork** 本仓库  
2. 新建分支 `feature/awesome-stuff`  
3. 提交 PR，并在描述中关联 Issue  
4. 等待 CI 通过 & Review 🎉

---

## 📜 License
[Apache License v2](./LICENSE)

---

## 🙏 Acknowledgements
- **Model Context Protocol (MCP)** 社区提供的开放规范  
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) 调试工具  
- 以及所有提交 Issue / PR 的开源贡献者们 ❤️
