import React, { useEffect, useMemo, useState } from 'react';
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
import { generateSettleNo, getSettleOrderById, nowString, saveSettleOrder } from './mockData';
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

const SETTLE_TYPE_OPTIONS = ['F1-境外-支付', 'F2-境内-收款', 'F3-境外-退款'];
const CHANNEL_OPTIONS: SettleOrder['channel'][] = ['SWIFT', '银企直连'];
const STATUS_OPTIONS: SettleStatus[] = [
  SettleStatus.ToBeSettled,
  SettleStatus.PendingSplit,
  SettleStatus.ResidualPayFailed,
];
const CURRENCY_OPTIONS = [
  'HKD-港元', 'USD-美元', 'EUR-欧元', 'SGD-新加坡元', 'THB-泰铢',
  'GBP-英镑', 'JPY-日元', 'IDR-印度尼西亚卢比', 'KRW-韩元', 'AUD-澳元',
];
const TRADE_NATURE_OPTIONS = [
  '货款', '服务费', '市场推广费', '模具开发费', '保险赔付', '国际运费',
  '劳务费', '技术咨询费', '设备采购款', '样品费', '关税', '仓储费',
];

const SettleOrderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm<SettleFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(id);
  const record = useMemo(() => (id ? getSettleOrderById(id) : null), [id]);

  useEffect(() => {
    if (isEdit && !record) {
      message.error('未找到该结算单');
      navigate('/settle-pool');
      return;
    }
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.setFieldsValue({
        settleNo: generateSettleNo(),
        status: SettleStatus.ToBeSettled,
        createdAt: nowString(),
        channel: 'SWIFT',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** 重置：编辑模式回到原始值，新增模式回到默认值 */
  const handleResetForm = () => {
    if (record) {
      form.setFieldsValue(record);
    } else {
      form.resetFields();
      form.setFieldsValue({
        settleNo: generateSettleNo(),
        status: SettleStatus.ToBeSettled,
        createdAt: nowString(),
        channel: 'SWIFT',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setTimeout(() => {
        saveSettleOrder({
          ...(record ? { id: record.id } : {}),
          ...values,
        });
        setSubmitting(false);
        message.success(isEdit ? '保存成功' : '新增成功');
        navigate('/settle-pool');
      }, 300);
    } catch {
      message.warning('请检查表单必填项');
    }
  };

  return (
    <div className="sp-edit-page">
      <Card
        className="sp-edit-card"
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
