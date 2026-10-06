/**
 * CRA 强制 moduleResolution: "node"（node10），无法解析包的 exports 子路径，
 * 这里手写类型声明，让 `@copilotkit/react-core/v2` 通过类型检查。
 * webpack 5 原生支持 exports 字段，运行时解析不受影响。
 */
declare module '@copilotkit/react-core/v2' {
  import type { FC, ReactNode } from 'react';

  export interface CopilotKitProviderProps {
    runtimeUrl?: string;
    publicApiKey?: string;
    publicLicenseKey?: string;
    agentId?: string;
    headers?: Record<string, string>;
    children?: ReactNode;
  }

  export const CopilotKitProvider: FC<CopilotKitProviderProps>;

  export interface CopilotSidebarProps {
    instructions?: string;
    defaultOpen?: boolean;
    /** 受控开关：传给组件后由外部 state 决定显示/隐藏 */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** 传入 () => null 可隐藏组件自带的悬浮按钮，改用你自己的开关 */
    toggleButton?: React.ComponentType<any>;
    width?: number | string;
    position?: 'left' | 'right';
    labels?: Record<string, string>;
    children?: ReactNode;
  }

  export const CopilotSidebar: FC<CopilotSidebarProps>;
  export const CopilotPopup: FC<CopilotSidebarProps>;
  export const CopilotChat: FC<CopilotSidebarProps>;

  export interface FrontendToolConfig<TArgs = any> {
    name: string;
    description?: string;
    parameters?: any;
    handler: (args: TArgs) => any | Promise<any>;
    render?: any;
  }

  export function useFrontendTool<TArgs = any>(config: FrontendToolConfig<TArgs>): void;
  export function useFrontendTools(configs: FrontendToolConfig<any>[]): void;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_COPILOTKIT_RUNTIME_URL?: string;
  }
}
