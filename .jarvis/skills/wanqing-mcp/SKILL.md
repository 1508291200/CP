---
name: wanqing-mcp
description: This skill should be used when the user wants to manage or invoke MCP tools on the Wanqing (万擎) platform. Use when the user mentions "万擎", "MCP", "mcp工具", "查询mcp", "调用mcp", "万擎平台", "mcp管理", "查看mcp列表", "调用工具", or discusses querying, invoking, or managing MCP tools on the Wanqing platform.
version: 1.1.0
author: zhenghanxiao@kuaishou.com
---

# 万擎 MCP 管理与调用

本 skill 用于管理和调用万擎平台的 MCP（Model Context Protocol）工具。

## 执行流程

### Step 1：理解用户意图

分析用户输入，明确：
- 用户想使用什么类型的能力（搜索、地图、财经、翻译等）
- 用户提供了哪些参数信息
- 用户的最终目标是什么

### Step 2：获取万擎平台所有 MCP 工具列表

```bash
curl --location 'https://ewind-env.corp.kuaishou.com/rest/n/live/east/workflow/scene/custom/search-server-list' \
--header 'accept: application/json, text/plain, */*' \
--header 'accept-language: zh' \
--header 'Content-Type: application/json' \
--data '{}'
```

响应结构：
```json
{
  "msg": "success",
  "data": [
    {"label": "工具显示名", "value": {"id": "工具ID", "name": "工具名"}}
  ],
  "status": 0
}
```

根据用户意图，从列表中筛选出最合适的 MCP 工具（可能是一个或多个）。

### Step 3：让用户二次确认选用的 MCP 工具

向用户展示推荐使用的 MCP 工具，格式如下：

```
根据您的需求，我推荐使用以下 MCP 工具：
1. 【工具名称】- 工具用途说明

请确认是否使用以上工具？(y/n，或输入序号选择)
```

等待用户确认后再继续。

### Step 4：获取 MCP 工具详细信息

用户确认后，对每个选中的 MCP 工具调用详情接口（`serverId` 为 Step 2 中对应工具的 `id`）：

```bash
curl --location 'https://ewind-env.corp.kuaishou.com/rest/n/live/east/workflow/scene/custom/server-info' \
--header 'accept: application/json, text/plain, */*' \
--header 'accept-language: zh' \
--header 'Content-Type: application/json' \
--data '{"serverId": "<工具ID>"}'
```

从响应中提取关键信息：
- `data.localServerConfig.toolsConfig`：可调用的方法列表
  - `toolName`：方法名称
  - `toolDescription`：方法描述
  - `localToolConfig.inputSchema`：入参定义（类型、描述、是否必填）

### Step 5：确认调用方法及参数

根据用户意图和工具详情，确定应调用的方法，并向用户展示：

```
我将调用【工具名称】的【方法名】方法
方法说明：{toolDescription}

所需参数：
- 参数名 (类型, 必填/可选): 参数描述
  当前值: {用户提供的值 / 待填写}

请确认参数是否正确？
```

**参数校验规则**：
- 若用户输入中缺少 `required` 字段列出的必填参数，**必须让用户补充**，不得猜测或省略
- 若参数类型与 `inputSchema` 中定义的类型不符，告知用户并请其修正
- 所有必填参数齐全且类型正确后，才可进入下一步

### Step 6：调用 MCP 工具方法

参数确认无误后，构造请求并调用：

```bash
curl --location 'https://kuaishou-canteen-recommend.staging.kuaishou.com/rest/n/live/east/mcp/client/invokeTool' \
--header 'accept: application/json, text/plain, */*' \
--header 'accept-language: zh' \
--header 'Content-Type: application/json' \
--data '{
    "traceId": "<随机生成的traceId>",
    "toolId": "<Step 2 中的工具 id>",
    "mcpMethodInfo": {
        "methodName": "<toolName>",
        "description": "<toolDescription>",
        "params": {
            "<参数名>": "<参数值>"
        }
    }
}'
```

**字段说明**：
- `traceId`：随机生成，用于追踪请求，如时间戳字符串
- `toolId`：Step 2 响应中的工具 `id`
- `mcpMethodInfo.methodName`：Step 4 中的 `toolName`
- `mcpMethodInfo.description`：Step 4 中的 `toolDescription`
- `mcpMethodInfo.params`：用户提供的参数键值对

### Step 7：返回执行结果

解析响应并以友好方式展示给用户：

- 若 `data.success = true`：提取 `data.data.content` 中的内容，整理后返回
- 若 `data.success = false` 或请求失败：告知用户调用失败，展示错误信息，建议用户检查参数或重试

## 注意事项

- Step 3 和 Step 5 均需用户明确确认后才能继续，不可跳过
- 必填参数不足时必须暂停并要求用户补充，不可自行填充默认值
- `traceId` 每次调用随机生成，可使用当前时间戳
