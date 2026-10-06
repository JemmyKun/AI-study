import React from 'react';
import {
  Input,
  InputNumber,
  Select,
  Radio,
  Checkbox,
  DatePicker,
  Switch,
  Rate,
  Slider,
} from 'antd';
import {
  EditOutlined,
  AlignLeftOutlined,
  NumberOutlined,
  DownCircleOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  CalendarOutlined,
  PoweroffOutlined,
  StarOutlined,
  ColumnWidthOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { ComponentConfig } from './types';
import { componentRegistry } from './componentRegistry';

const ListPlaceholder: React.FC = () => (
  <div>列表容器（渲染时由 ListRenderer 接管）</div>
);

const defaultComponents: ComponentConfig[] = [
  {
    type: 'input',
    label: '单行输入',
    icon: <EditOutlined />,
    category: 'basic',
    component: Input,
    defaultProps: { span: 12, placeholder: '请输入' },
  },
  {
    type: 'textarea',
    label: '多行输入',
    icon: <AlignLeftOutlined />,
    category: 'basic',
    component: Input.TextArea,
    defaultProps: { span: 24, placeholder: '请输入', rows: 4 },
  },
  {
    type: 'number',
    label: '数字输入',
    icon: <NumberOutlined />,
    category: 'basic',
    component: InputNumber,
    defaultProps: { span: 12 },
  },
  {
    type: 'select',
    label: '下拉选择',
    icon: <DownCircleOutlined />,
    category: 'select',
    component: Select,
    defaultProps: { span: 12, placeholder: '请选择', options: [] },
  },
  {
    type: 'radio',
    label: '单选框',
    icon: <CheckCircleOutlined />,
    category: 'select',
    component: Radio.Group,
    defaultProps: { span: 12, options: [] },
  },
  {
    type: 'checkbox',
    label: '多选框',
    icon: <CheckSquareOutlined />,
    category: 'select',
    component: Checkbox.Group,
    defaultProps: { span: 12, options: [] },
  },
  {
    type: 'datePicker',
    label: '日期选择',
    icon: <CalendarOutlined />,
    category: 'date',
    component: DatePicker,
    defaultProps: { span: 12 },
  },
  {
    type: 'switch',
    label: '开关',
    icon: <PoweroffOutlined />,
    category: 'basic',
    component: Switch,
    defaultProps: { span: 8 },
  },
  {
    type: 'rate',
    label: '评分',
    icon: <StarOutlined />,
    category: 'basic',
    component: Rate,
    defaultProps: { span: 12 },
  },
  {
    type: 'slider',
    label: '滑动条',
    icon: <ColumnWidthOutlined />,
    category: 'basic',
    component: Slider,
    defaultProps: { span: 12 },
  },
  {
    type: 'list',
    label: '列表(一对多)',
    icon: <UnorderedListOutlined />,
    category: 'layout',
    component: ListPlaceholder,
    defaultProps: {
      span: 24,
      children: [],
      listConfig: { min: 0, max: 10, addText: '添加一项' },
    },
  },
];

componentRegistry.registerAll(defaultComponents);
