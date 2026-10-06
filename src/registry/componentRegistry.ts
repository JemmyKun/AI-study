import React from 'react';
import { ComponentConfig } from './types';

class ComponentRegistry {
  private registry: Map<string, ComponentConfig> = new Map();

  register(config: ComponentConfig): void {
    this.registry.set(config.type, config);
  }

  registerAll(configs: ComponentConfig[]): void {
    configs.forEach(c => this.register(c));
  }

  override(type: string, component: React.ComponentType<any>): void {
    const existing = this.registry.get(type);
    if (existing) {
      this.registry.set(type, { ...existing, component });
    }
  }

  get(type: string): ComponentConfig | undefined {
    return this.registry.get(type);
  }

  getAll(): ComponentConfig[] {
    return Array.from(this.registry.values());
  }

  getByCategory(): Map<string, ComponentConfig[]> {
    const result = new Map<string, ComponentConfig[]>();
    this.registry.forEach(config => {
      const list = result.get(config.category) || [];
      list.push(config);
      result.set(config.category, list);
    });
    return result;
  }
}

export const componentRegistry = new ComponentRegistry();
