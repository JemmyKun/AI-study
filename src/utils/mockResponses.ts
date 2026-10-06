interface MockResponse {
  keywords: string[];
  response: string;
}

const mockData: MockResponse[] = [
  {
    keywords: ['react', 'React', 'REACT'],
    response: `## React 简介

React 是由 Meta（Facebook）开发的开源 JavaScript 库，用于构建用户界面。

### 核心特性

- **组件化开发**：将 UI 拆分为独立、可复用的组件
- **虚拟 DOM**：通过 Diff 算法高效更新真实 DOM
- **单向数据流**：数据从父组件流向子组件，易于追踪

### 一个简单的组件示例

\`\`\`tsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>当前计数: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        点击 +1
      </button>
    </div>
  );
}
\`\`\`

### Hooks 常用列表

| Hook | 用途 |
|------|------|
| \`useState\` | 状态管理 |
| \`useEffect\` | 副作用处理 |
| \`useCallback\` | 函数缓存 |
| \`useMemo\` | 计算缓存 |
| \`useRef\` | DOM 引用 |

如果你想深入学习 React，建议从官方文档开始：[react.dev](https://react.dev)`,
  },
  {
    keywords: ['typescript', 'TypeScript', 'ts', 'TS'],
    response: `## TypeScript 入门

TypeScript 是 JavaScript 的超集，添加了静态类型检查，帮助你在编码阶段发现错误。

### 为什么使用 TypeScript？

1. **类型安全** - 编译时捕获类型错误
2. **智能提示** - IDE 提供更好的代码补全
3. **代码可读性** - 类型即文档，易于理解
4. **重构友好** - 类型系统保证重构正确性

### 基础类型示例

\`\`\`typescript
// 基本类型
let name: string = "Alice";
let age: number = 25;
let isActive: boolean = true;

// 数组类型
let scores: number[] = [90, 85, 92];

// 对象类型
interface User {
  id: number;
  name: string;
  email?: string;  // 可选属性
}

// 泛型
function identity<T>(arg: T): T {
  return arg;
}
\`\`\`

> **提示**：TypeScript 的类型是可选的，你可以逐步将 JS 项目迁移到 TS。`,
  },
  {
    keywords: ['你好', 'hello', 'hi', 'Hi', '嗨'],
    response: `你好！我是 AI 助手，很高兴为你服务！😊

我可以帮你解答以下方面的问题：

- **编程技术** - React、TypeScript、JavaScript、Node.js 等
- **开发工具** - VS Code、Git、npm 等
- **最佳实践** - 代码规范、架构设计、性能优化等

请随时向我提问，我会尽力给出详细的解答！`,
  },
  {
    keywords: ['css', 'CSS', '样式', '布局', 'flex', 'grid'],
    response: `## CSS 现代布局技术

现代 CSS 提供了强大的布局能力，主要推荐使用 **Flexbox** 和 **Grid**。

### Flexbox 布局

适合一维布局（行或列）：

\`\`\`css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.item {
  flex: 1;  /* 等分剩余空间 */
}
\`\`\`

### Grid 布局

适合二维布局（行和列）：

\`\`\`css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
}

/* 跨列 */
.full-width {
  grid-column: 1 / -1;
}
\`\`\`

### 对比

| 特性 | Flexbox | Grid |
|------|---------|------|
| 维度 | 一维 | 二维 |
| 适用场景 | 导航栏、列表 | 页面整体布局 |
| 对齐控制 | 灵活 | 更强大 |
| 学习曲线 | 简单 | 中等 |`,
  },
  {
    keywords: ['node', 'Node', 'nodejs', 'NodeJS', 'express', 'Express'],
    response: `## Node.js 简介

Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时环境。

### 核心优势

- **非阻塞 I/O** - 高效处理并发请求
- **事件驱动** - 适合 I/O 密集型应用
- **统一语言** - 前后端使用 JavaScript

### Express 服务器示例

\`\`\`javascript
const express = require('express');
const app = express();

// 中间件
app.use(express.json());

// 路由
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  // 处理创建逻辑...
  res.status(201).json({ id: 1, name, email });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
\`\`\`

> Node.js 非常适合构建 API 服务、实时通信应用和命令行工具。`,
  },
];

const defaultResponse = `感谢你的提问！这是一个很好的问题。

让我从几个方面来分析：

### 关键点

1. **理解需求** - 首先要明确你想要实现什么
2. **技术选型** - 根据场景选择合适的技术方案
3. **逐步实现** - 从简单的原型开始，逐步迭代优化

### 建议

- 多参考优秀的开源项目
- 注重代码质量和可维护性
- 保持学习新技术的热情

> 如果你能提供更多细节，我可以给出更有针对性的回答！

你可以尝试问我关于 **React**、**TypeScript**、**CSS** 或 **Node.js** 的问题。`;

export function getMockResponse(userMessage: string): string {
  for (const item of mockData) {
    if (item.keywords.some((keyword) => userMessage.includes(keyword))) {
      return item.response;
    }
  }
  return defaultResponse;
}
