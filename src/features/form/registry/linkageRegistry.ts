import { LinkageHandler } from '../../../types/form';

class LinkageRegistry {
  private handlers: Map<string, LinkageHandler> = new Map();

  register(handler: LinkageHandler): void {
    this.handlers.set(handler.id, handler);
  }

  registerAll(handlers: LinkageHandler[]): void {
    handlers.forEach(h => this.register(h));
  }

  get(id: string): LinkageHandler | undefined {
    return this.handlers.get(id);
  }

  getAll(): LinkageHandler[] {
    return Array.from(this.handlers.values());
  }
}

export const linkageRegistry = new LinkageRegistry();
