import React from 'react';
import { FormField } from '../../../types/form';

export interface ComponentConfig {
  type: string;
  label: string;
  icon?: React.ReactNode;
  category: 'basic' | 'select' | 'date' | 'layout' | 'custom';
  component: React.ComponentType<any>;
  defaultProps?: Partial<FormField>;
  configurableProps?: string[];
}
