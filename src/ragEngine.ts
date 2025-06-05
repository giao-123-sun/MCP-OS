import { OpenAI } from 'openai';

export interface MCPInfo {
  name: string;
  description: string;
  functions: string[];
}

/**
 * Simple RAG engine that embeds MCP descriptions using OpenAI embeddings
 * and performs cosine similarity search to find the best matches.
 */
export class RagMatchEngine {
  private openai: OpenAI;
  private mcpEmbeddings: Record<string, number[]> = {};

  constructor(private mcps: Record<string, MCPInfo>) {
    this.openai = new OpenAI();
  }

  async init() {
    for (const [id, mcp] of Object.entries(this.mcps)) {
      this.mcpEmbeddings[id] = await this.embed(
        `${mcp.name}. ${mcp.description}. ${mcp.functions.join(', ')}`
      );
    }
  }

  async setMCPs(mcps: Record<string, MCPInfo>) {
    this.mcps = mcps;
    this.mcpEmbeddings = {};
    await this.init();
  }

  private async embed(text: string): Promise<number[]> {
    const resp = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return resp.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findBestMatch(task: string): Promise<string | null> {
    const query = await this.embed(task);
    let best: { id: string; score: number } | null = null;
    for (const [id, vec] of Object.entries(this.mcpEmbeddings)) {
      const score = this.cosineSimilarity(query, vec);
      if (!best || score > best.score) {
        best = { id, score };
      }
    }
    return best ? best.id : null;
  }

  async findTopMatches(task: string, k = 5): Promise<string[]> {
    const query = await this.embed(task);
    const scored = Object.entries(this.mcpEmbeddings).map(([id, vec]) => ({
      id,
      score: this.cosineSimilarity(query, vec),
    }));
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((v) => v.id);
  }
}
