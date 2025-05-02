# MCP-OS · Model Context Protocol Orchestration System  
> **Let your large language model focus on solving tasks—not wading through a sea of MCPs.**

![CI](https://img.shields.io/github/actions/workflow/status/your-org/mcp-os/ci.yml?label=CI)  
![License](https://img.shields.io/github/license/your-org/mcp-os)  
![Version](https://img.shields.io/github/v/release/your-org/mcp-os)

---

## ✨ Project Vision
As the **Model Context Protocol (MCP)** ecosystem explodes, hundreds of MCP servers create three familiar headaches:

| Pain Point | Description |
| ---------- | ----------- |
| **Prompt Bloat** | Lengthy MCP descriptions crowd the context window; the model spends more tokens picking tools than **planning / analysis**. |
| **Connection Hygiene** | We must constantly track *which* MCPs are alive and *whether* they satisfy the current task. |
| **Resource & Security** | Always-on MCP servers consume memory and expose interfaces, increasing attack surface. |

**MCP-OS** aims to:  
> *“Manage MCPs the way an operating system manages processes—load on demand, unload when idle.”*

---

## 🌟 Current Phase: MCP-Retriever (Completed ✅)
1. **Vector Retrieval** — Embed task descriptions and retrieve Top-k MCPs from a vector index.  
2. **Slim Prompt Template** — Inject only the *Top-k* MCP descriptions, saving ~70 % prompt tokens on average.  
3. **Pluggable Back-ends** — Default `openai/embeddings`; swap in FAISS, Qdrant, Milvus, etc.

> 📖 Details in [`/packages/retriever`](./packages/retriever).

---

## 🛣️ Roadmap

| Milestone | Feature | Status |
| --------- | ------- | ------ |
| **v0.1**  | **MCP-Retriever** – vector search | ✅ Released |
| **v0.2**  | **Health-Check Daemon** – auto heartbeat & pruning | ⏳ In progress |
| **v0.3**  | **Runtime Manager** – on-demand MCP start/stop | 🗓 Planned |
| **v1.0**  | **Policy Sandbox** – fine-grained auth, rate, cost | 🗓 Planned |

---

## ⚙️ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-org/mcp-os.git
cd mcp-os
pnpm install      # or npm / yarn
```

### 2. Build the Vector Index

```bash
# Scan local / remote MCP metadata and create an index
pnpm run build:index --src ./mcp_list.json --out ./index
```

### 3. Start the Retriever Server

```bash
pnpm run start:retriever
# Default listens on 127.0.0.1:5500 (HTTP + SSE)
```

### 4. Wire It into Your LLM / Agent

```jsonc
// Example: Claude Desktop
{
  "mcpServers": {
    "mcp-os": {
      "command": "/absolute/path/to/mcp-os/bin/retriever.js"
    }
  }
}
```

Or call the REST endpoint:

```bash
curl -X POST http://localhost:5500/match \
  -H "Content-Type: application/json" \
  -d '{"task": "Scrape a web page and extract its title"}'
```

Sample response:

```json
{
  "matches": [
    {
      "id": "web-scraper",
      "score": 0.89,
      "functions": ["fetchHtml", "querySelector"]
    }
  ]
}
```

---

## 📂 Repository Layout
```
mcp-os/
├─ packages/
│  ├─ retriever/        # Phase 1: vector retrieval
│  ├─ health-check/     # Phase 2: heartbeat daemon (WIP)
│  └─ runtime-manager/  # Phase 3: load/unload (planned)
├─ scripts/             # CLI helpers
├─ examples/            # Usage demos
└─ docs/                # Architecture & deep dives
```

---

## 🧩 MCP List Format

`mcp_list.json` describes MCP metadata:

```json
{
  "web-scraper": {
    "name": "Web Scraper MCP",
    "description": "Fetches HTML and parses DOM.",
    "functions": ["fetchHtml", "querySelector"]
  },
  "calc": { ... }
}
```

---

## ❓ FAQ

<details>
<summary>Retrieval quality is poor—how do I tune it?</summary>

* Increase `topK` for higher recall.  
* Switch to a stronger embedding model.  
* Refine task-text normalization rules.
</details>

<details>
<summary>How do I plug in my own vector store?</summary>

Implement the `VectorStore` interface: `src/store/yourStore.ts`.
</details>

---

## 🤝 Contributing

1. **Fork** the repo  
2. Create a branch `feature/awesome-stuff`  
3. Open a PR and link related issues  
4. Wait for CI + review 🎉

---

## 📜 License
[MIT](./LICENSE)

---

## 🙏 Acknowledgements
- The **Model Context Protocol** community for the open specification  
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) for debugging  
- Everyone who files issues or PRs—thank you! ❤️