/**
 * 中文文案（源语言字典）：新增 key 请先加到这里，再同步 en-US。
 * 采用扁平 key，用点号表达层级，便于类型推导与批量检索。
 */
export const zhCN = {
  // ---- 应用 ----
  'app.name': '智枢 · 智能业务平台',
  'app.shortName': '智枢',

  // ---- 导航 ----
  'nav.group.ai': 'AI 助手',
  'nav.home': '首页',
  'nav.formBuilder': '表单设计器',
  'nav.formRenderer': '表单渲染演示',
  'nav.settlePool': '资金结算池',
  'nav.chat': 'AI 问答',
  'nav.deepseekChat': 'DeepSeek 对话',
  'nav.hint.chat': 'CopilotKit Agent，可操作业务模块',
  'nav.hint.deepseekChat': '直连 DeepSeek 模型，纯对话',

  // ---- 全局 AI 助手 ----
  'assistant.open': '打开 AI 助手',
  'assistant.close': '隐藏 AI 助手',

  // ---- DeepSeek 对话页 ----
  'deepseek.status.checking': '检测中…',
  'deepseek.status.ready': '已就绪',
  'deepseek.status.unconfigured': '未配置密钥',
  'deepseek.status.offline': '未连接',
  'deepseek.statusTip': '服务状态：{status}',
  'deepseek.modelSelect': '选择模型',
  'deepseek.regenerate': '重新生成',
  'deepseek.regenerateTip': '重新生成最后一条回复',
  'deepseek.clear': '清空会话',
  'deepseek.clearTip': '清空全部对话内容',
  'deepseek.error.invalidKey': '模型密钥无效或未配置，请在 .env 中填写 DEEPSEEK_API_KEY 后重启服务。',
  'deepseek.error.offline': '无法连接后端代理，请确认已启动服务（npm run launch）。',
  'deepseek.error.generic': '生成失败，请重试。',
  'deepseek.error.streamUnsupported': '浏览器不支持流式响应（response.body 为空）',
  'deepseek.input.placeholder': '给 DeepSeek 发送消息…',
  'deepseek.input.stop': '停止',
  'deepseek.input.stopTip': '停止生成',
  'deepseek.input.send': '发送',
  'deepseek.input.hint.unconfigured': '后端尚未配置模型密钥，AI 无法回复',
  'deepseek.input.hint.offline': '后端代理未启动，请先执行 npm run launch',
  'deepseek.input.hint.normal': '内容由 DeepSeek 生成，可能存在错误，请酌情参考',
  'deepseek.welcome.title': '你好，我是 DeepSeek 助手',
  'deepseek.welcome.sub': '本页面直连 DeepSeek 模型（经本地代理转发），支持流式输出与思维链展示。',
  'deepseek.sample.1': '用一句话解释什么是 HTTP 缓存',
  'deepseek.sample.2': '帮我写一个 TypeScript 防抖函数，并说明用法',
  'deepseek.sample.3': '把下面这段需求拆成任务清单：搭建一个报表导出功能',
  'deepseek.sample.4': '介绍一下 React 的并发渲染',
  'deepseek.notice.close': '关闭',
  'deepseek.notice.unconfigured':
    '后端未检测到模型密钥，请在 .env 中配置 DEEPSEEK_API_KEY 后重启（npm run launch）。',
  'deepseek.notice.offline': '后端代理未连接，请启动服务后',
  'deepseek.model.chat': 'DeepSeek V3',
  'deepseek.model.chatHint': '通用对话，响应快',
  'deepseek.model.reasoner': 'DeepSeek R1',
  'deepseek.model.reasonerHint': '深度推理，带思维链',
  'deepseek.announce': '全新升级：支持流式输出与 R1 深度思考（思维链），欢迎体验并反馈 →',
  'deepseek.hero.title': '探索未至之境',
  'deepseek.thinking.active': '正在思考…',
  'deepseek.thinking.done': '已思考（用时 {seconds} 秒）',
  'deepseek.action.copy': '复制',
  'deepseek.action.copied': '已复制',
  'deepseek.action.copyTip': '复制全文',
  'deepseek.action.likeTip': '赞',
  'deepseek.action.dislikeTip': '踩',
  'deepseek.failed': '生成失败，请检查后端代理与密钥配置后重试。',
  'deepseek.pill.chat': 'V3 对话',
  'deepseek.pill.reasoner': '深度思考',
  'deepseek.toBottom': '回到底部',
  'deepseek.attach.add': '添加图片',
  'deepseek.attach.remove': '移除',
  'deepseek.attach.alt': '附件 {index}',
  'deepseek.attach.tip': '当前模型不支持图片理解，图片仅随消息展示',
  'deepseek.attach.limit': '最多 {max} 张图片',
  'deepseek.attach.tooLarge': '图片不能超过 {size}MB',
  'deepseek.preview.close': '点击关闭预览',
  'deepseek.outline': '提问记录',

  // ---- 404 ----
  'notFound.desc': '抱歉，你访问的页面不存在或已被移除。',
  'notFound.backHome': '返回首页',

  // ---- 语言 ----
  'locale.label': '语言',
  'locale.zh-CN': '简体中文',
  'locale.en-US': 'English',

  // ---- 通用 ----
  'common.retry': '重试',
  'common.loading': '加载中…',
  'common.error': '出错了',
} as const;

/** 字典 key 类型：新增语言包必须覆盖全部 key */
export type MessageKey = keyof typeof zhCN;
