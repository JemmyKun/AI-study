/**
 * 主题唯一来源：构建期（craco 的 less modifyVars）与运行期（组件/布局）共用同一份配置。
 * 用 .js 而不是 .ts，是因为 craco.config.js 是 CommonJS，无法直接加载 TS 模块。
 * 改主题只改这里，src/styles/variables.less 中的业务变量会同步跟随。
 */

/** antd v4 主题：以 less 变量覆盖的方式由 craco 注入编译 */
const ANTD_LESS_VARS = {
  '@primary-color': '#1890ff',
  '@link-color': '#1890ff',
  '@border-radius-base': '4px',
  '@font-size-base': '14px',
};

/** 运行期 UI 尺寸：供组件与布局直接读取，避免硬编码
 * @type {{ antdSize: 'small' | 'middle' | 'large'; navHeight: number; contentMaxWidth: number }}
 */
const UI_TOKENS = {
  /** antd 组件统一尺寸 */
  antdSize: 'middle',
  /** 顶部导航高度（px） */
  navHeight: 56,
  /** 内容区最大宽度（px） */
  contentMaxWidth: 1200,
};

module.exports = { ANTD_LESS_VARS, UI_TOKENS };
