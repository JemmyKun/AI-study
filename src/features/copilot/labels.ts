import type { LocaleCode } from '../../locales';

/**
 * CopilotKit 内置聊天界面文案（v2 的 CopilotChatLabels）。
 * 字段名与官方默认标签一一对应，未配置的字段会回退为英文。
 */

const ZH: Record<string, string> = {
  // 输入框
  chatInputPlaceholder: '输入消息…',
  chatInputToolbarStartTranscribeButtonLabel: '语音输入',
  chatInputToolbarCancelTranscribeButtonLabel: '取消',
  chatInputToolbarFinishTranscribeButtonLabel: '完成',
  chatInputToolbarAddButtonLabel: '添加附件',
  chatInputToolbarToolsButtonLabel: '工具',

  // 助手消息操作栏
  assistantMessageToolbarCopyCodeLabel: '复制代码',
  assistantMessageToolbarCopyCodeCopiedLabel: '已复制',
  assistantMessageToolbarCopyMessageLabel: '复制',
  assistantMessageToolbarThumbsUpLabel: '回答不错',
  assistantMessageToolbarThumbsDownLabel: '回答不好',
  assistantMessageToolbarReadAloudLabel: '朗读',
  assistantMessageToolbarRegenerateLabel: '重新生成',

  // 检查器（仅本地开发可见）
  assistantMessageToolbarInspectorLabel: '在检查器中查看',
  assistantMessageToolbarInspectorDescription: '在检查器中打开这条消息',
  assistantMessageToolbarInspectorLocalOnlyLabel: '仅本地',
  assistantMessageToolbarInspectorLocalOnlyDescription:
    '仅在开发环境的 localhost 下可见，生产环境不会显示。',
  assistantMessageToolbarInspectorTitle: 'CopilotKit 检查器',
  assistantMessageToolbarInspectorHideLabel: '隐藏此图标',
  assistantMessageToolbarInspectorHideDescription: '直到刷新页面后重新显示',

  // 用户消息操作栏
  userMessageToolbarCopyMessageLabel: '复制',
  userMessageToolbarEditMessageLabel: '编辑',

  // 其他
  chatDisclaimerText: 'AI 生成内容可能存在错误，请核实重要信息。',
  chatToggleOpenLabel: '打开 AI 助手',
  chatToggleCloseLabel: '关闭 AI 助手',
  modalHeaderTitle: 'AI 助手',
  welcomeMessageText:
    '您好，我是 AI 助手，可以帮您查看和操作各业务模块（如表单配置、结算池：统计状态与金额、检索结算单、打开编辑页）。',
};

const EN: Record<string, string> = {
  chatInputPlaceholder: 'Type a message…',
  chatInputToolbarStartTranscribeButtonLabel: 'Voice input',
  chatInputToolbarCancelTranscribeButtonLabel: 'Cancel',
  chatInputToolbarFinishTranscribeButtonLabel: 'Done',
  chatInputToolbarAddButtonLabel: 'Add attachment',
  chatInputToolbarToolsButtonLabel: 'Tools',

  assistantMessageToolbarCopyCodeLabel: 'Copy code',
  assistantMessageToolbarCopyCodeCopiedLabel: 'Copied',
  assistantMessageToolbarCopyMessageLabel: 'Copy',
  assistantMessageToolbarThumbsUpLabel: 'Good answer',
  assistantMessageToolbarThumbsDownLabel: 'Bad answer',
  assistantMessageToolbarReadAloudLabel: 'Read aloud',
  assistantMessageToolbarRegenerateLabel: 'Regenerate',

  assistantMessageToolbarInspectorLabel: 'View in inspector',
  assistantMessageToolbarInspectorDescription: 'Open this message in the inspector',
  assistantMessageToolbarInspectorLocalOnlyLabel: 'Local only',
  assistantMessageToolbarInspectorLocalOnlyDescription:
    'Only visible on localhost in development, hidden in production.',
  assistantMessageToolbarInspectorTitle: 'CopilotKit Inspector',
  assistantMessageToolbarInspectorHideLabel: 'Hide this icon',
  assistantMessageToolbarInspectorHideDescription: 'Until the page is reloaded',

  userMessageToolbarCopyMessageLabel: 'Copy',
  userMessageToolbarEditMessageLabel: 'Edit',

  chatDisclaimerText: 'AI generated content may be inaccurate. Verify important information.',
  chatToggleOpenLabel: 'Open AI assistant',
  chatToggleCloseLabel: 'Close AI assistant',
  modalHeaderTitle: 'AI Assistant',
  welcomeMessageText:
    'Hi, I am the AI assistant. I can inspect and operate the business modules (form designer, settlement pool: status/amount stats, order search, opening the edit page).',
};

/** 聊天界面文案：按语言切换 */
export const COPILOT_LABELS: Record<LocaleCode, Record<string, string>> = {
  'zh-CN': ZH,
  'en-US': EN,
};

/** 助手系统指令：描述它能调用的能力，新增工具后需同步补充 */
export const COPILOT_INSTRUCTIONS: Record<LocaleCode, string> = {
  'zh-CN':
    '你是本系统的通用 AI 助手。系统由多个业务模块组成（例如低代码表单配置、结算池等），可以用 listModules 查看当前已打开的模块，用 getModuleSummary 获取模块实时数据（结算池模块 id 为 settle-pool）。结算池相关能力：getSettlePoolStats 统计各状态数量与金额、searchSettleOrders 按状态和关键字检索结算单、openSettleOrderEdit 打开编辑页；表单设计器可增删字段、修改标题；还可以用 navigateTo 跳转页面。请使用简体中文回答，简明扼要。',
  'en-US':
    'You are the general AI assistant of this system. It consists of business modules (low-code form designer, settlement pool, etc.). Use listModules to see mounted modules and getModuleSummary for live data (settlement pool id: settle-pool). Settlement tools: getSettlePoolStats, searchSettleOrders, openSettleOrderEdit. Form designer tools: add/remove fields, update title. Use navigateTo to jump between pages. Answer concisely.',
};
