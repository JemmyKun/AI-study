import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { SettleOrder, SettleStatus } from '../../types/settle-pool';
import {
  CHANNEL_OPTIONS,
  CURRENCY_OPTIONS,
  SETTLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
  TRADE_NATURE_OPTIONS,
} from './constants';
import { nowString } from './mockData';
import { settleOrderRepository } from './repository';
import './SettlePool.css';

/** 表单字段类型 */
interface SettleFormValues {
  settleNo: string;
  settleType: string;
  tradeNature: string;
  amount: number;
  currency: string;
  status: SettleStatus;
  localAccountNo: string;
  localAccountName: string;
  localName: string;
  counterAccountNo: string;
  counterName: string;
  channel: SettleOrder['channel'];
  createdAt: string;
}

/** 新增模式的默认值；编号由 repository 生成，避免与已有数据撞号 */
function buildDefaults() {
  return {
    settleNo: settleOrderRepository.nextSettleNo(),
    status: SettleStatus.ToBeSettled,
    createdAt: nowString(),
    channel: 'SWIFT' as SettleOrder['channel'],
  };
}

const SettleOrderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<SettleFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [record, setRecord] = useState<SettleOrder | null>(null);
  /** 卸载标记 + 请求序号：避免组件卸载或切换 id 后旧响应写入状态 */
  const aliveRef = useRef(true);
  const reqIdRef = useRef(0);

  const isEdit = Boolean(id);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    if (!id) {
      setRecord(null);
      form.setFieldsValue(buildDefaults());
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const found = await settleOrderRepository.getById(id);
        if (!aliveRef.current || reqId !== reqIdRef.current) return;
        if (!found) {
          message.error('未找到该结算单');
          navigate('/settle-pool');
          return;
        }
        setRecord(found);
        form.setFieldsValue(found);
      } finally {
        if (aliveRef.current && reqId === reqIdRef.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** 重置：编辑模式回到原始值，新增模式回到默认值 */
  const handleResetForm = () => {
    if (record) {
      form.setFieldsValue(record);
      return;
    }
    form.resetFields();
    form.setFieldsValue(buildDefaults());
  };

  const handleSubmit = async () => {
    let values: SettleFormValues;
    try {
      values = await form.validateFields();
    } catch {
      message.warning('请检查表单必填项');
      return;
    }
    setSubmitting(true);
    try {
      await settleOrderRepository.save({ ...(record ? { id: record.id } : {}), ...values });
      message.success(isEdit ? '保存成功' : '新增成功');
      navigate('/settle-pool');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      if (aliveRef.current) setSubmitting(false);
    }
  };

  return (
    <div className="sp-edit-page">
      <Card
        className="sp-edit-card"
        loading={loading}
        title={
          <div className="sp-edit-title">
            <Button
              type="text"
              size="small"
              className="sp-edit-back"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/settle-pool')}
            >
              返回
            </Button>
            <span className="sp-title-bar" />
            {isEdit ? '编辑结算单' : '新增结算单'}
          </div>
        }
        actions={[
          <div className="sp-edit-footer" key="footer">
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/settle-pool')}>
                返回
              </Button>
              <Button onClick={handleResetForm}>重置</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={submitting}
                onClick={handleSubmit}
              >
                保存
              </Button>
            </Space>
          </div>,
        ]}
      >
        <Form form={form} layout="vertical" requiredMark className="sp-edit-form">
          <Row gutter={16}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="settleNo"
                label="结算单编号"
                rules={[{ required: true, message: '请输入结算单编号' }]}
              >
                <Input placeholder="请输入结算单编号" disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="settleType"
                label="结算类型"
                rules={[{ required: true, message: '请选择结算类型' }]}
              >
                <Select
                  placeholder="请选择结算类型"
                  options={SETTLE_TYPE_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="tradeNature"
                label="交易性质"
                rules={[{ required: true, message: '请选择交易性质' }]}
              >
                <Select
                  placeholder="请选择交易性质"
                  options={TRADE_NATURE_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="amount"
                label="金额"
                rules={[{ required: true, message: '请输入金额' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="请输入金额"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="currency"
                label="币种"
                rules={[{ required: true, message: '请选择币种' }]}
              >
                <Select
                  placeholder="请选择币种"
                  options={CURRENCY_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  placeholder="请选择状态"
                  options={STATUS_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>

            <Col span={24} className="sp-edit-section">
              本方信息
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="localAccountNo"
                label="本方账号"
                rules={[{ required: true, message: '请输入本方账号' }]}
              >
                <Input placeholder="请输入本方账号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="localAccountName" label="本方账号户名">
                <Input placeholder="请输入本方账号户名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="localName" label="本方户名">
                <Input placeholder="请输入本方户名" />
              </Form.Item>
            </Col>

            <Col span={24} className="sp-edit-section">
              对手方信息
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="counterAccountNo"
                label="对手方账号"
                rules={[{ required: true, message: '请输入对手方账号' }]}
              >
                <Input placeholder="请输入对手方账号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="counterName" label="对手方户名">
                <Input placeholder="请输入对手方户名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="channel"
                label="结算渠道"
                rules={[{ required: true, message: '请选择结算渠道' }]}
              >
                <Select
                  placeholder="请选择结算渠道"
                  options={CHANNEL_OPTIONS.map((o) => ({ label: o, value: o }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="createdAt" label="创建时间">
                <Input placeholder="创建时间" disabled />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default SettleOrderEdit;
