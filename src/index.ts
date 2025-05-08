#!/usr/bin/env node

/**
 * MCP matcher for LLM in use.
 * This server implements an MCP matching system that helps find the most appropriate MCP for a given task.
 * It demonstrates:
 * - Listing MCPs as resources
 * - Reading individual MCP details
 * - Finding matching MCPs via a tool based on task description
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai'; // 引入 OpenAI

/**
 * Type alias for an MCP object.
 */
type MCPInfo = { 
  name: string, 
  description: string, 
  functions: string[] 
};

// 把默认的MCPs移到一个单独的对象中，作为备份
const defaultMcps: { [id: string]: MCPInfo } = {
  "weather": { 
    name: "Weather MCP", 
    description: "Provides weather information for locations", 
    functions: ["getWeather", "getForecast"] 
  },
  "todo": { 
    name: "Todo MCP", 
    description: "Manages todo items and task lists", 
    functions: ["addTask", "listTasks", "completeTask"] 
  },
  "calendar": { 
    name: "Calendar MCP", 
    description: "Manages calendar events and appointments", 
    functions: ["addEvent", "listEvents", "getAvailability"] 
  }
};

// 用于存储实际使用的MCP数据
let mcps: { [id: string]: MCPInfo } = {};


/**
 * Load MCP information from a JSON file
 * @param filePath Path to the mcp.json file, defaults to 'mcp.json' in the current directory
 * @return true if file was loaded successfully, false otherwise
 */
function loadMCPsFromFile(filePath: string = 'mcp.json'): boolean {
  try {
    console.error(`Attempting to load MCPs from: ${filePath}`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const mcpData = JSON.parse(data);
      
      // 重置mcps，先用默认值初始化
      mcps = { ...defaultMcps };
      
      // 然后合并外部配置的值，允许覆盖
      Object.assign(mcps, mcpData);
      
      console.error(`Successfully loaded MCPs from ${filePath}`);
      console.error(`MCPs from file: ${Object.keys(mcpData).length}`);
      console.error(`Total MCPs available: ${Object.keys(mcps).length}`);
      
      // 打印所有可用的MCP ID，方便调试
      console.error(`Available MCP IDs: ${Object.keys(mcps).join(', ')}`);
      
      // 初始化或更新RAG引擎 (注释掉)
      /*
      if (!ragEngine) {
        ragEngine = new RagMatchEngine(mcps);
      } else {
        ragEngine.setMCPs(mcps);
      }
      */
      return true;
    } else {
      console.error(`MCP file not found at: ${filePath}, using default MCPs`);
      // 如果文件不存在，使用默认MCPs
      mcps = { ...defaultMcps };
      console.error(`Using ${Object.keys(mcps).length} default MCPs`);
      
      // 初始化RAG引擎 (注释掉)
      /*
      if (!ragEngine) {
        ragEngine = new RagMatchEngine(mcps);
      } else {
        ragEngine.setMCPs(mcps);
      }
      */
      return false;
    }
  } catch (error) {
    console.error(`Error loading MCPs from file: ${error}`);
    // 发生错误时，使用默认MCPs
    mcps = { ...defaultMcps };
    console.error(`Using ${Object.keys(mcps).length} default MCPs due to error`);
    
    // 初始化RAG引擎 (注释掉)
    /*
    if (!ragEngine) {
      ragEngine = new RagMatchEngine(mcps);
    } else {
      ragEngine.setMCPs(mcps);
    }
    */
    return false;
  }
}

/**
 * Simple name-based matching function (for backup) - 注释掉
 * @param taskDescription The task description to match against MCPs
 * @returns Array of matching MCP IDs sorted by relevance
 */
/*
function simpleFindMatchingMCPs(taskDescription: string): string[] {
  const matches: [string, number][] = [];
  
  // For now, just do simple name matching
  for (const [id, mcp] of Object.entries(mcps)) {
    // Check if MCP name or description contains words from the task
    const searchText = `${mcp.name} ${mcp.description}`.toLowerCase();
    const taskWords = taskDescription.toLowerCase().split(/\s+/);
    
    let matchScore = 0;
    for (const word of taskWords) {
      if (word.length > 2 && searchText.includes(word)) { // Ignore very short words
        matchScore += 1;
      }
    }
    
    if (matchScore > 0) {
      matches.push([id, matchScore]);
    }
  }
  
  // Sort by match score (descending)
  matches.sort((a, b) => b[1] - a[1]);
  
  // Return just the IDs
  return matches.map(match => match[0]);
}
*/

/**
 * Find matching MCPs using the RAG engine with fallback to simple matching - 将被替换
 * @returns {Object} 包含最佳匹配和所有匹配的结果
 */
/* // 旧的 findMatchingMCPs 函数，将被新的基于 LLM 的函数替代
function findMatchingMCPs(taskDescription: string): { 
  bestMatch: string | null, 
  bestMatchScore: number | null,
  allMatches: string[] 
} {
  // 默认结果
  const result = {
    bestMatch: null as string | null,
    bestMatchScore: null as number | null,
    allMatches: [] as string[]
  };
  
  // 首先使用RAG引擎进行匹配
  if (ragEngine) {
    try {
      // 获取所有匹配
      result.allMatches = ragEngine.findMatches(taskDescription, 5);
      
      // 获取最佳匹配
      const bestMatch = ragEngine.findBestMatch(taskDescription);
      if (bestMatch) {
        const [id, score] = bestMatch;
        result.bestMatch = id;
        result.bestMatchScore = score;
        console.error(`RAG引擎最佳匹配: ${id}, 分数: ${score.toFixed(4)}`);
      }
      
      if (result.allMatches.length > 0) {
        console.error(`RAG引擎找到 ${result.allMatches.length} 个匹配项`);
        return result;
      }
    } catch (error) {
      console.error(`RAG引擎匹配失败: ${error}`);
    }
  }
  
  // 如果RAG匹配失败或没有结果，回退到简单匹配
  console.error('回退到简单关键词匹配');
  result.allMatches = simpleFindMatchingMCPs(taskDescription);
  
  // 设置最佳匹配为简单匹配的第一个结果
  if (result.allMatches.length > 0) {
    result.bestMatch = result.allMatches[0];
    result.bestMatchScore = 0.5; // 指示这是简单匹配的估计分数
  }
  
  return result;
}
*/

/**
 * 使用 LLM 查找匹配的 MCP
 * @param taskDescription 任务描述
 * @returns 包含最佳匹配和所有相关匹配的结果
 */
async function findMatchingMCPsWithLLM(taskDescription: string): Promise<{ bestMatchId: string | null, relevantMatchIds: string[] }> {
  console.error(`使用LLM查找任务 \"${taskDescription}\" 的匹配MCP`);

  const availableMcpsText = Object.entries(mcps)
    .map(([id, mcp]) => 
      `ID: ${id}\nName: ${mcp.name}\nDescription: ${mcp.description}\nFunctions: ${mcp.functions.join(', ')}`
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert assistant helping to select the most appropriate Model Context Protocol (MCP) component for a given task. 
Based on the user's task description and the list of available MCPs below, identify the single best matching MCP ID. 
If other MCPs also seem relevant, list their IDs as well. 
Respond ONLY with a JSON object containing two keys: 
1. 'bestMatchId': A string containing the ID of the single best matching MCP, or null if no single best match is clear.
2. 'relevantMatchIds': An array of strings containing the IDs of all relevant MCPs (including the best match, if one exists). Return an empty array if no MCPs are relevant.

Available MCPs:
${availableMcpsText}`;

  const userPrompt = `Task Description: ${taskDescription}`;

  try {
    // 初始化 OpenAI 客户端
    // 它会自动从环境变量 OPENAI_API_KEY 读取密钥
    const openai = new OpenAI(); 

    const response = await openai.chat.completions.create({
      //model: "gemini-2.0-flash", 
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" }, // 要求返回 JSON 格式
      temperature: 0.2, // 较低的温度使输出更具确定性
    });

    const resultJson = response.choices[0]?.message?.content;

    if (resultJson) {
      console.error("LLM 原始响应:", resultJson);
      const parsedResult = JSON.parse(resultJson);
      
      // 基本的验证
      const bestMatchId = typeof parsedResult.bestMatchId === 'string' ? parsedResult.bestMatchId : null;
      const relevantMatchIds = Array.isArray(parsedResult.relevantMatchIds) 
          ? parsedResult.relevantMatchIds.filter((id: string) => typeof id === 'string')
          : [];
          
      // 确保 ID 存在于 mcps 列表中 (可选，但推荐)
      const validatedBestMatchId = bestMatchId && mcps[bestMatchId] ? bestMatchId : null;
      const validatedRelevantMatchIds = relevantMatchIds.filter((id: string) => mcps[id]);
      
      // 如果最佳匹配不在相关列表中，但有效，则添加进去
      if (validatedBestMatchId && !validatedRelevantMatchIds.includes(validatedBestMatchId)) {
           validatedRelevantMatchIds.unshift(validatedBestMatchId); // 加到最前面
      }

      console.error(`LLM 解析结果: bestMatchId=${validatedBestMatchId}, relevantMatchIds=[${validatedRelevantMatchIds.join(', ')}]`);
      return { bestMatchId: validatedBestMatchId, relevantMatchIds: validatedRelevantMatchIds };
    } else {
      console.error("LLM 未返回有效内容");
      return { bestMatchId: null, relevantMatchIds: [] };
    }

  } catch (error) {
    console.error("调用 OpenAI API 或解析响应时出错:", error);
    // 返回空结果或抛出错误，根据你的错误处理策略决定
    return { bestMatchId: null, relevantMatchIds: [] };
  }
}

/**
 * Create an MCP server with capabilities for resources (to list/read MCPs),
 * tools (to match MCPs), and prompts.
 */
const server = new Server(
  {
    name: "rag-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler for listing available MCPs as resources.
 * Each MCP is exposed as a resource with:
 * - An mcp:// URI scheme
 * - JSON MIME type
 * - Human readable name and description
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: Object.entries(mcps).map(([id, mcp]) => ({
      uri: `mcp:///${id}`,
      mimeType: "application/json",
      name: mcp.name,
      description: mcp.description
    }))
  };
});

/**
 * Handler for reading the details of a specific MCP.
 * Takes an mcp:// URI and returns the MCP details as JSON.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const id = url.pathname.replace(/^\//, '');
  const mcp = mcps[id];

  if (!mcp) {
    throw new Error(`MCP ${id} not found`);
  }

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "application/json",
      text: JSON.stringify(mcp, null, 2)
    }]
  };
});

/**
 * Handler that lists available tools.
 * Exposes a "match_mcp" tool that matches MCPs for a task description.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "match_mcp",
        description: "Find MCPs that match a task description",
        inputSchema: {
          type: "object",
          properties: {
            taskDescription: {
              type: "string",
              description: "Description of the task that needs an MCP"
            }
          },
          required: ["taskDescription"]
        }
      }
    ]
  };
});

/**
 * Handler for the match_mcp tool.
 * Finds matching MCPs based on the task description.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "match_mcp": {
      const taskDescription = String(request.params.arguments?.taskDescription || "");
      if (!taskDescription) {
        throw new Error("Task description is required");
      }

      // 调用新的 LLM 匹配函数
      // const matchResult = findMatchingMCPs(taskDescription); // 旧调用
      const matchResult = await findMatchingMCPsWithLLM(taskDescription);
      
      const bestMatch = matchResult.bestMatchId;
      const matches = matchResult.relevantMatchIds; // LLM可能返回多个相关匹配
      
      // 格式化响应 (后续需要根据 matchResult 调整)
      let responseText = "";
      
      // 添加最佳匹配部分
      if (bestMatch && mcps[bestMatch]) { // 确保 bestMatch ID 有效
        const mcp = mcps[bestMatch];
        responseText += `## LLM 推荐的最佳匹配 MCP\n\n`;
        responseText += `- **${mcp.name}** (ID: ${bestMatch})\n`;
        // responseText += `  相似度: ${bestMatchScore ? (bestMatchScore * 100).toFixed(1) + '%' : 'N/A'}\n`; // LLM 不直接提供分数
        responseText += `  描述: ${mcp.description}\n`;
        responseText += `  函数: ${mcp.functions.join(", ")}\n\n`;
      } else if (bestMatch) {
         responseText += `## LLM 推荐的最佳匹配 MCP\n\n`;
         responseText += `- ID: ${bestMatch} (未在当前加载的 MCP 中找到详细信息)\n\n`;
      }
      
      // 添加所有匹配部分
      responseText += `## LLM 识别的相关 MCP\n\n`;
      
      if (matches.length === 0 && !bestMatch) { // 如果LLM没有返回任何ID
        responseText += "没有找到匹配的MCP。\n";
      } else {
        matches.forEach(id => {
          const mcp = mcps[id];
          // 为最佳匹配添加突出显示
          const isBest = id === bestMatch ? '✓ ' : ''; 
          if (mcp) {
            responseText += `- ${isBest}**${mcp.name}** (ID: ${id})\n`;
            responseText += `  描述: ${mcp.description}\n`;
            responseText += `  函数: ${mcp.functions.join(", ")}\n\n`;
          } else {
            responseText += `- ${isBest}ID: ${id} (未在当前加载的 MCP 中找到详细信息)\n\n`;
          }
        });
      }

      return {
        content: [{
          type: "text",
          text: responseText
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Handler that lists available prompts.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "mcp_selection_guide",
        description: "Get guidance on selecting the right MCP for your task",
      }
    ]
  };
});

/**
 * Handler for the mcp_selection_guide prompt.
 * Returns a prompt that provides guidance on selecting an MCP.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "mcp_selection_guide") {
    throw new Error("Unknown prompt");
  }

  const embeddedMCPs = Object.entries(mcps).map(([id, mcp]) => ({
    type: "resource" as const,
    resource: {
      uri: `mcp:///${id}`,
      mimeType: "application/json",
      text: JSON.stringify(mcp, null, 2)
    }
  }));

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "I need guidance on selecting the right MCP for my task. Here are the available MCPs:"
        }
      },
      ...embeddedMCPs.map(mcp => ({
        role: "user" as const,
        content: mcp
      })),
      {
        role: "user",
        content: {
          type: "text",
          text: "Please help me choose the most appropriate MCP based on my task requirements. For each MCP, explain what kinds of tasks it's suitable for."
        }
      }
    ]
  };
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  // 在服务器启动前加载MCP数据
  const loaded = loadMCPsFromFile('mcp.json');
  if (!loaded) {
    console.error("Failed to load external MCP configuration, using defaults");
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
