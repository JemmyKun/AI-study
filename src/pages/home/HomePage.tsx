import React from 'react';
import { Link } from 'react-router-dom';
import {
  ApiOutlined,
  ArrowRightOutlined,
  FormOutlined,
  FundProjectionScreenOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { ROUTES } from '../../constants';
import './HomePage.css';

interface ModuleCard {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags: string[];
}

/** 业务模块：新增页面同步追加即可，AI 助手会自动感知注册进来的模块 */
const BUSINESS_MODULES: ModuleCard[] = [
  {
    to: ROUTES.FORM_BUILDER,
    icon: <FormOutlined />,
    title: '表单设计器',
    desc: '拖拽式搭建表单结构，实时产出可序列化的 Schema，支持字段类型扩展与校验规则。',
    tags: ['拖拽编排', 'Schema 驱动'],
  },
  {
    to: ROUTES.FORM_RENDERER,
    icon: <FundProjectionScreenOutlined />,
    title: '表单渲染演示',
    desc: '按 Schema 动态渲染表单并完成校验提交，验证配置效果与设计器形成闭环。',
    tags: ['动态渲染', '即时校验'],
  },
  {
    to: ROUTES.SETTLE_POOL,
    icon: <WalletOutlined />,
    title: '资金结算池',
    desc: '结算单录入、状态流转与金额统计，内置待结算 / 已结算待分设 / 付残失败等流程。',
    tags: ['状态流转', '金额统计'],
  },
];

const AI_MODULES: ModuleCard[] = [
  {
    to: ROUTES.CHAT,
    icon: <MessageOutlined />,
    title: 'AI 问答',
    desc: '基于 CopilotKit Agent，可调用前端工具直接读取并操作当前已打开的业务模块。',
    tags: ['前端工具', '可操作页面'],
  },
  {
    to: ROUTES.DEEPSEEK_CHAT,
    icon: <RobotOutlined />,
    title: 'DeepSeek 对话',
    desc: '经本地代理直连 DeepSeek 模型，支持流式输出与 R1 思维链，可切换对话模型。',
    tags: ['流式输出', '思维链'],
  },
];

const STATS = [
  { value: '3', label: '业务模块' },
  { value: '2', label: 'AI 助手' },
  { value: 'SSE', label: '流式响应' },
  { value: '∞', label: '字段组合' },
];

function Card({ to, icon, title, desc, tags }: ModuleCard) {
  return (
    <Link to={to} className="hp-card">
      <span className="hp-card-glow" />
      <div className="hp-card-icon">{icon}</div>
      <h3 className="hp-card-title">{title}</h3>
      <p className="hp-card-desc">{desc}</p>
      <div className="hp-card-foot">
        <div className="hp-card-tags">
          {tags.map(t => (
            <span key={t} className="hp-tag">{t}</span>
          ))}
        </div>
        <span className="hp-card-arrow">
          <ArrowRightOutlined />
        </span>
      </div>
    </Link>
  );
}

const HomePage: React.FC = () => (
  <div className="hp">
    {/* ---------- Hero ---------- */}
    <section className="hp-hero">
      <div className="hp-hero-grid" />
      <span className="hp-hero-orb hp-hero-orb-a" />
      <span className="hp-hero-orb hp-hero-orb-b" />

      <div className="hp-hero-inner">
        <span className="hp-badge">
          <ThunderboltOutlined /> AI Native · Low-Code
        </span>
        <h1 className="hp-title">
          智枢
          <span className="hp-title-grad">智能业务平台</span>
        </h1>
        <p className="hp-subtitle">
          用低代码组装业务流程，用 AI 理解页面数据。表单配置、资金结算与智能问答，
          在同一套工作台内完成闭环。
        </p>

        <div className="hp-actions">
          <Link to={ROUTES.FORM_BUILDER} className="hp-btn hp-btn-primary">
            开始搭建
            <ArrowRightOutlined />
          </Link>
          <Link to={ROUTES.DEEPSEEK_CHAT} className="hp-btn hp-btn-ghost">
            体验 AI 对话
            <RobotOutlined />
          </Link>
        </div>

        <div className="hp-stats">
          {STATS.map(s => (
            <div key={s.label} className="hp-stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- 业务模块 ---------- */}
    <section className="hp-section">
      <header className="hp-section-head">
        <h2>业务模块</h2>
        <p>开箱即用的能力单元，挂载后即被 AI 助手自动感知</p>
      </header>
      <div className="hp-cards">
        {BUSINESS_MODULES.map(m => (
          <Card key={m.to} {...m} />
        ))}
      </div>
    </section>

    {/* ---------- AI 助手 ---------- */}
    <section className="hp-section">
      <header className="hp-section-head">
        <h2>AI 助手</h2>
        <p>两套独立技术栈，覆盖「能操作页面」与「纯深度对话」两种场景</p>
      </header>
      <div className="hp-cards">
        {AI_MODULES.map(m => (
          <Card key={m.to} {...m} />
        ))}
      </div>
    </section>

    {/* ---------- 架构说明 ---------- */}
    <section className="hp-arch">
      <div className="hp-arch-item">
        <ApiOutlined />
        <div>
          <h4>统一的后端网关</h4>
          <p>前端只认同源相对路径，开发与生产的差异由代理层吸收，无需硬编码地址。</p>
        </div>
      </div>
      <div className="hp-arch-item">
        <ThunderboltOutlined />
        <div>
          <h4>密钥不出服务端</h4>
          <p>模型凭证由本地代理持有，模型白名单与系统提示词均在服务端校验注入。</p>
        </div>
      </div>
      <div className="hp-arch-item">
        <RobotOutlined />
        <div>
          <h4>可扩展的助手体系</h4>
          <p>业务模块注册后立即具备被 AI 查询与操作的能力，新增页面无需改动助手逻辑。</p>
        </div>
      </div>
    </section>

    <footer className="hp-footer">
      <span>智枢 · 智能业务平台</span>
      <span className="hp-footer-dot">·</span>
      <span>Low-Code Forms · Settlement · AI Assistant</span>
    </footer>
  </div>
);

export default HomePage;
