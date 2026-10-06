export interface FormSchema {
  version: string;
  title: string;
  description?: string;
  labelCol?: number;
  wrapperCol?: number;
  fields: FormField[];
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  span: number;
  options?: { label: string; value: string }[];
  dataSource?: DataSourceConfig;
  rules?: ValidationRule[];
  linkages?: LinkageRule[];
  children?: FormField[];
  listConfig?: {
    min?: number;
    max?: number;
    addText?: string;
  };
  [key: string]: any;
}

export interface DataSourceConfig {
  type: 'static' | 'api';
  url?: string;
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
  dataPath?: string;
  labelField?: string;
  valueField?: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface LinkageRule {
  triggerField: string;
  mode?: 'rule' | 'handler';
  conditions?: { operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'notContains'; value: any }[];
  actions?: { targetField: string; type: 'visible' | 'hidden' | 'disabled' | 'enabled' | 'required' | 'setValue' | 'setOptions'; value?: any }[];
  handlerId?: string;
}

export interface ValidationError {
  fieldId: string;
  fieldLabel: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface LinkageContext {
  triggerField: string;
  triggerValue: any;
  formValues: Record<string, any>;
  form: any;
}

export interface LinkageResult {
  [targetFieldName: string]: {
    visible?: boolean;
    disabled?: boolean;
    required?: boolean;
    value?: any;
    options?: { label: string; value: string }[];
  };
}

export interface LinkageHandler {
  id: string;
  label: string;
  description?: string;
  handler: (ctx: LinkageContext) => LinkageResult;
}

export interface FormRendererProps {
  schema: FormSchema;
  initialValues?: Record<string, any>;
  onFinish?: (values: Record<string, any>) => void;
  onValuesChange?: (changedValues: Record<string, any>, allValues: Record<string, any>) => void;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical' | 'inline';
}

export interface FieldLinkageState {
  visible?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: any;
  options?: { label: string; value: string }[];
}
