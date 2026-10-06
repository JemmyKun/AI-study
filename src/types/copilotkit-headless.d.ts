/**
 * CopilotKit v2 headless 入口的类型声明。
 *
 * 说明：该包的 package.json 只通过 exports map 暴露子路径，
 * 而 CRA 工程的 tsconfig 使用 moduleResolution: "node"（node10），
 * TypeScript 无法解析 '@copilotkit/react-core/v2/headless'，
 * 因此这里按打包产物的真实路径显式声明本项目用到的 API 类型。
 * 运行时仍是同一个模块实例（它内部 import '@copilotkit/react-core/v2/context'），
 * 与 App 里的 CopilotKitProvider 共享同一份上下文。
 */
declare module '@copilotkit/react-core/v2/headless' {
  /** 决定哪些 agent 变化会触发组件重渲染 */
  export const UseAgentUpdate: {
    readonly OnMessagesChanged: 'OnMessagesChanged';
    readonly OnStateChanged: 'OnStateChanged';
    readonly OnRunStatusChanged: 'OnRunStatusChanged';
  };

  export type AgentUpdateKind =
    | 'OnMessagesChanged'
    | 'OnStateChanged'
    | 'OnRunStatusChanged';

  /** AG-UI 消息的宽松结构，只取页面需要的字段 */
  export interface RawAguiMessage {
    id?: string;
    role?: string;
    content?: unknown;
    toolCalls?: Array<{ id?: string; function?: { name?: string } }>;
  }

  export interface ChatAgent {
    /** 会话消息列表，流式过程中会原地更新 */
    messages: ReadonlyArray<RawAguiMessage>;
    /** 是否正在生成 */
    isRunning: boolean;
    subscribe(subscriber: Record<string, unknown>): { unsubscribe: () => void };
    addMessage(message: unknown): void;
    setMessages(messages: unknown[]): void;
    runAgent(parameters?: unknown): Promise<unknown>;
    abortRun(): void;
  }

  export function useAgent(props?: {
    agentId?: string;
    updates?: AgentUpdateKind[];
    throttleMs?: number;
  }): {
    agent: ChatAgent;
    /** Runtime 是否已同步完成（false 时拿到的是临时占位 agent） */
    isReady: boolean;
  };

  export type RuntimeConnectionStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error';

  export interface CopilotKitCoreLike {
    runtimeConnectionStatus: RuntimeConnectionStatus;
    /**
     * 发起一次 agent 运行。与直接调用 agent.runAgent() 不同，
     * 这里会带上本页注册的前端工具并自动处理工具回包。
     */
    runAgent(params: { agent: ChatAgent; forwardedProps?: unknown }): Promise<unknown>;
  }

  /** 获取 CopilotKit Core 实例（必须在 CopilotKitProvider 内使用） */
  export function useCopilotKit(): { copilotkit: CopilotKitCoreLike };
}
