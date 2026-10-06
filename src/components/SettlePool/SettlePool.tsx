import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Col,
  Dropdown,
  Form,
  Input,
  Menu,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  DownOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ColumnsType } from 'antd/es/table';
import { SettleOrder, SettleStatus } from '../../types/settlePool';
import { registerModule } from '../../copilot/moduleRegistry';
import { MOCK_SETTLE_ORDERS, querySettleOrders } from './mockData';
import './SettlePool.css';

/** 状态 → 标签颜色 */
const STATUS_COLOR: Record<SettleStatus, string> = {
  [SettleStatus.PendingSplit]: 'blue',
  [SettleStatus.ToBeSettled]: 'gold',
  [SettleStatus.ResidualPayFailed]: 'red',
};

/** 顶部页签 */
const STATUS_TABS = [
  { key: 'ALL', label: '全部' },
  { key: SettleStatus.ToBeSettled, label: SettleStatus.ToBeSettled },
  { key: SettleStatus.PendingSplit, label: SettleStatus.PendingSplit },
  { key: SettleStatus.ResidualPayFailed, label: SettleStatus.ResidualPayFailed },
];

/** 常用筛选项（默认展示） */
const PRIMARY_FIELDS = [
  { name: 'settleNo', label: '结算单编号', placeholder: '请输入结算单编号' },
  { name: 'settleType', label: '结算类型', placeholder: '请输入交易性质类型', type: 'select' },
  { name: 'tradeNature', label: '交易性质', placeholder: '请输入交易性质类型' },
  { name: 'channel', label: '交易属性', placeholder: '请选择交易属性', type: 'select' },
  { name: 'status', label: '收支标志', placeholder: '请选择收支类型', type: 'select' },
  { name: 'localAccountNo', label: '本方账户', placeholder: '请选择本方账户', type: 'select' },
  { name: 'localName', label: '本方户名', placeholder: '请输入本方户名' },
] as const;

/** 展开后的更多筛选项（首项补位，保证默认 7 个条件 + 操作区正好填满两行） */
const MORE_FIELDS = [
  { name: 'localAccountName', label: '本方单位名称', placeholder: '请输入单位名称' },
  { name: 'counterAccountNo', label: '对手方账户', placeholder: '请选择对手方账户' },
  { name: 'counterName', label: '对手方户名', placeholder: '请输入对手方户名' },
  { name: 'currency', label: '币种', placeholder: '请选择币种', type: 'select' },
  { name: 'settleType2', label: '用途', placeholder: '请输入用途' },
  { name: 'settleType3', label: '结算渠道', placeholder: '请选择结算渠道', type: 'select' },
  { name: 'settleType4', label: '事由', placeholder: '请输入事由' },
  { name: 'settleType5', label: '银行返回详情', placeholder: '请选择事由详情' },
] as const;

/** 结算类型选项 */
const SETTLE_TYPE_OPTIONS = ['F1-境外-支付', 'F2-境内-收款', 'F3-境外-退款'];
/** 交易属性/渠道选项 */
const CHANNEL_OPTIONS = ['SWIFT', '银企直连'];
/** 收支标志/状态选项 */
const STATUS_OPTIONS: SettleStatus[] = [
  SettleStatus.PendingSplit,
  SettleStatus.ToBeSettled,
  SettleStatus.ResidualPayFailed,
];
/** 币种选项 */
const CURRENCY_OPTIONS = [
  'HKD-港元', 'USD-美元', 'EUR-欧元', 'SGD-新加坡元', 'THB-泰铢',
  'GBP-英镑', 'JPY-日元', 'IDR-印度尼西亚卢比',
];
/** 本方账户选项 */
const LOCAL_ACCOUNT_OPTIONS = [
  'B3T1012345678', 'B3T10880000001234', 'B3T10880000012324',
  'HU417116301111110...', 'DE125001000001234...',
];

const SettlePool: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [expanded, setExpanded] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SettleOrder | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [list, setList] = useState<SettleOrder[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  /** 表格可视区高度（用于列表沉底 + 内部滚动） */
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [tableBodyHeight, setTableBodyHeight] = useState<number>(360);

  /** 执行查询（页签 + 筛选 + 分页） */
  const fetchData = useCallback(
    (current: number, pageSize: number, tab: string) => {
      setLoading(true);
      const values = form.getFieldsValue();
      // 模拟网络延迟
      setTimeout(() => {
        const { list: rows, total } = querySettleOrders({
          current,
          pageSize,
          filters: values,
          statusTab: tab,
        });
        setList(rows);
        setPagination({ current, pageSize, total });
        setLoading(false);
      }, 300);
    },
    [form],
  );

  useEffect(() => {
    fetchData(1, 10, 'ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 供 AI 助手读取的最新状态快照 */
  const snapshotRef = useRef({
    activeTab,
    total: pagination.total,
    list,
  });
  snapshotRef.current = { activeTab, total: pagination.total, list };

  /** 将结算池登记为业务模块，AI 助手可通过 listModules / getModuleSummary 感知 */
  useEffect(
    () =>
      registerModule({
        id: 'settle-pool',
        name: '结算池',
        description: '结算单列表：按状态页签与条件筛选、查看统计、新增/编辑结算单',
        getSummary: () => {
          const { activeTab: tab, total, list: rows } = snapshotRef.current;
          const counts: Record<string, number> = {};
          let amountSum = 0;
          MOCK_SETTLE_ORDERS.forEach(o => {
            counts[o.status] = (counts[o.status] ?? 0) + 1;
          });
          rows.forEach(o => {
            amountSum += o.amount;
          });
          return {
            currentTab: tab === 'ALL' ? '全部' : tab,
            total,
            statusCounts: counts,
            currentPageCount: rows.length,
            currentPageAmountSum: Number(amountSum.toFixed(2)),
            sample: rows.slice(0, 5).map(o => ({
              settleNo: o.settleNo,
              amount: o.amount,
              currency: o.currency,
              status: o.status,
              counterName: o.counterName,
            })),
          };
        },
      }),
    [],
  );

  /** 表格高度自适应：容器高度 - 表头 - 分页条 */
  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;
    const compute = () => {
      const headerH = el.querySelector('.ant-table-thead')?.clientHeight ?? 39;
      const pagerH = el.querySelector('.ant-pagination')?.clientHeight ?? 48;
      setTableBodyHeight(Math.max(200, el.clientHeight - headerH - pagerH));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** 查询 */
  const handleSearch = () => fetchData(1, pagination.pageSize, activeTab);
  /** 重置 */
  const handleReset = () => {
    form.resetFields();
    fetchData(1, pagination.pageSize, activeTab);
    message.info('已重置查询条件');
  };
  /** 切换页签 */
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelectedRowKeys([]);
    fetchData(1, pagination.pageSize, key);
  };

  /** 删除（仅前端演示） */
  const handleDelete = (record: SettleOrder) => {
    const idx = MOCK_SETTLE_ORDERS.findIndex((o) => o.id === record.id);
    if (idx >= 0) MOCK_SETTLE_ORDERS.splice(idx, 1);
    message.success(`已删除结算单 ${record.settleNo}`);
    fetchData(pagination.current, pagination.pageSize, activeTab);
  };

  const handleBatchDelete = () => {
    for (let i = MOCK_SETTLE_ORDERS.length - 1; i >= 0; i--) {
      if (selectedRowKeys.includes(MOCK_SETTLE_ORDERS[i].id)) MOCK_SETTLE_ORDERS.splice(i, 1);
    }
    message.success(`已批量删除 ${selectedRowKeys.length} 条结算单`);
    setSelectedRowKeys([]);
    fetchData(pagination.current, pagination.pageSize, activeTab);
  };

  /** 各页签数量（基于当前数据源统计） */
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: MOCK_SETTLE_ORDERS.length };
    MOCK_SETTLE_ORDERS.forEach((o) => {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    });
    return counts;
  }, [pagination.total]);

  const columns: ColumnsType<SettleOrder> = useMemo(
    () => [
      { title: '结算单编号', dataIndex: 'settleNo', width: 150, ellipsis: true },
      { title: '结算类型', dataIndex: 'settleType', width: 130 },
      { title: '交易性质', dataIndex: 'tradeNature', width: 130, ellipsis: true },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 110,
        align: 'right',
        render: (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }),
      },
      { title: '币种', dataIndex: 'currency', width: 150 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 130,
        render: (s: SettleStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
      },
      { title: '本方账号', dataIndex: 'localAccountNo', width: 160, ellipsis: true },
      { title: '本方账号户名', dataIndex: 'localAccountName', width: 160, ellipsis: true },
      { title: '本方户名', dataIndex: 'localName', width: 150, ellipsis: true },
      { title: '对手方账号', dataIndex: 'counterAccountNo', width: 180, ellipsis: true },
      { title: '对手方户名', dataIndex: 'counterName', width: 180, ellipsis: true },
      { title: '结算渠道', dataIndex: 'channel', width: 100 },
      { title: '创建时间', dataIndex: 'createdAt', width: 150 },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 260,
        className: 'sp-col-action',
        render: (_, record) => (
          <Space size={0} wrap>
            <Button
              type="link"
              size="small"
              className="sp-link"
              onClick={() => navigate(`/settle-pool/${record.id}/edit`)}
            >
              编辑
            </Button>
            <Button type="link" size="small" className="sp-link" onClick={() => message.info(`分设 ${record.settleNo}`)}>
              分设
            </Button>
            <Popconfirm title="确认退单？" onConfirm={() => message.success(`已退单 ${record.settleNo}`)}>
              <Button type="link" size="small" className="sp-link">退单</Button>
            </Popconfirm>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger className="sp-link">删除</Button>
            </Popconfirm>
            <Button type="link" size="small" className="sp-link" onClick={() => setDetail(record)}>
              查看详情
            </Button>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagination],
  );

  /** 一行固定放 4 个查询条件（24 / 4 = 6） */
  const fieldSpan = 6;
  /** 操作区与条件同宽；按最后一行已占格数偏移，始终落在最后一栏 */
  const visibleCount = PRIMARY_FIELDS.length + (expanded ? MORE_FIELDS.length : 0);
  const rest = visibleCount % 4;
  const actionOffset = Math.max(0, 18 - rest * 6);

  /** 渲染单个筛选项 */
  const renderField = (
    field: {
      name: string;
      label: string;
      placeholder: string;
      type?: string;
      options?: readonly string[];
    },
    span: number = fieldSpan,
  ) => (
    <Col xs={24} sm={12} md={8} lg={span} xl={span} key={field.name}>
      <Form.Item name={field.name} label={field.label} className="sp-form-item">
        {field.type === 'select' ? (
          <Select
            allowClear
            placeholder={field.placeholder}
            options={(field.options ?? []).map((o) => ({ label: o, value: o }))}
          />
        ) : (
          <Input placeholder={field.placeholder} allowClear />
        )}
      </Form.Item>
    </Col>
  );

  const moreMenu = (
    <Menu onClick={({ key }) => message.info(key)}>
      <Menu.Item key="导出结算单">导出结算单</Menu.Item>
      <Menu.Item key="批量分设">批量分设</Menu.Item>
      <Menu.Item key="结算冲正">结算冲正</Menu.Item>
    </Menu>
  );

  return (
    <div className="sp-page">
      {/* 顶部页签 */}
      <div className="sp-tabs-card">
        <Tabs
          className="sp-tabs"
          activeKey={activeTab}
          onChange={handleTabChange}
          items={STATUS_TABS.map((t) => ({
            key: t.key,
            label: (
              <span>
                {t.label}
                <span className="sp-tab-count">{tabCounts[t.key] ?? 0}</span>
              </span>
            ),
          }))}
        />
      </div>

      {/* 筛选区 */}
      <div className="sp-filter">
        <Form form={form} layout="vertical" onFinish={handleSearch}>
          <Row gutter={[16, 0]}>
            {PRIMARY_FIELDS.map((f) =>
              renderField({
                ...f,
                options:
                  f.name === 'settleType'
                    ? SETTLE_TYPE_OPTIONS
                    : f.name === 'channel'
                    ? CHANNEL_OPTIONS
                    : f.name === 'status'
                    ? STATUS_OPTIONS
                    : f.name === 'localAccountNo'
                    ? LOCAL_ACCOUNT_OPTIONS
                    : undefined,
              }),
            )}
            {expanded &&
              MORE_FIELDS.map((f) =>
                renderField({
                  ...f,
                  options:
                    f.name === 'settleType3'
                      ? CHANNEL_OPTIONS
                      : f.name === 'currency'
                      ? CURRENCY_OPTIONS
                      : undefined,
                }),
              )}
            {/* 末尾栅格：查询 / 重置 / 展开更多条件，右对齐 */}
            <Col
              xs={24}
              sm={24}
              md={12}
              lg={{ span: 6, offset: actionOffset }}
              xl={{ span: 6, offset: actionOffset }}
              className="sp-filter-actions"
            >
              <Form.Item label=" " colon={false} className="sp-form-item">
                <div className="sp-filter-actions-inner">
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                  <Button type="link" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? '收起更多条件' : '展开更多条件'}{' '}
                    <DownOutlined rotate={expanded ? 180 : 0} />
                  </Button>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      {/* 工具栏：按钮移到表格上方 */}
      <div className="sp-toolbar">
        <div className="sp-toolbar-left">
          {selectedRowKeys.length > 0 ? (
            <>
              <span className="sp-selected-tip">已选 {selectedRowKeys.length} 项</span>
              <Popconfirm title="确认批量删除？" onConfirm={handleBatchDelete}>
                <Button type="link" size="small" danger>批量删除</Button>
              </Popconfirm>
              <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>
                取消选择
              </Button>
            </>
          ) : (
            <span className="sp-toolbar-total">共 {pagination.total} 条结算单</span>
          )}
        </div>
        <Space wrap>
          <Button type="primary" onClick={() => navigate('/settle-pool/new')}>新增</Button>
          <Button>分流</Button>
          <Button>退单</Button>
          <Button icon={<UploadOutlined />}>批量导入</Button>
          <Dropdown overlay={moreMenu}>
            <Button>
              更多操作 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* 表格：占满剩余高度，列表内部滚动，分页沉底 */}
      <div className="sp-table-wrap" ref={tableWrapRef}>
        <Table<SettleOrder>
          className="sp-table"
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          scroll={{ x: 2350, y: tableBodyHeight }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
          }}
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${t} 条`,
            onChange: (current, pageSize) => fetchData(current, pageSize, activeTab),
          }}
        />
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="结算单详情"
        visible={!!detail}
        footer={null}
        onCancel={() => setDetail(null)}
        width={640}
      >
        {detail && (
          <div className="sp-detail">
            {(
              [
                ['结算单编号', detail.settleNo],
                ['结算类型', detail.settleType],
                ['交易性质', detail.tradeNature],
                ['金额', detail.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })],
                ['币种', detail.currency],
                ['状态', detail.status],
                ['本方账号', detail.localAccountNo],
                ['本方账号户名', detail.localAccountName],
                ['本方户名', detail.localName],
                ['对手方账号', detail.counterAccountNo],
                ['对手方户名', detail.counterName],
                ['结算渠道', detail.channel],
                ['创建时间', detail.createdAt],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div className="sp-detail-row" key={label}>
                <span className="sp-detail-label">{label}</span>
                <Tooltip title={value}>
                  <span className="sp-detail-value">{value}</span>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SettlePool;
