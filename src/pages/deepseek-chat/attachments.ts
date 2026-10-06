/**
 * 附件处理：类型识别、读取、入模拼装。
 * 纯逻辑，不含 JSX（图标组件见同目录 FileIcon.tsx）。
 */
import {
  Attachment,
  MAX_TEXT_CHARS,
  MAX_TEXT_FILE_SIZE,
  MAX_TOTAL_TEXT_CHARS,
} from './types';

/** 文件种类：决定展示图标 */
export type FileKind =
  | 'image'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'archive'
  | 'code'
  | 'text'
  | 'unknown';

/** 扩展名 → 种类：MIME 常常缺失或不准，这里以扩展名为主 */
const EXT_KIND: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', bmp: 'image',
  webp: 'image', svg: 'image', ico: 'image', avif: 'image', heic: 'image',

  pdf: 'pdf',

  doc: 'word', docx: 'word', rtf: 'word', odt: 'word',

  xls: 'excel', xlsx: 'excel', csv: 'excel', ods: 'excel', tsv: 'excel',

  ppt: 'ppt', pptx: 'ppt', odp: 'ppt',

  zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive',
  tar: 'archive', tgz: 'archive', bz2: 'archive',

  ts: 'code', tsx: 'code', js: 'code', jsx: 'code', mjs: 'code', cjs: 'code',
  json: 'code', yml: 'code', yaml: 'code', xml: 'code', html: 'code',
  htm: 'code', css: 'code', less: 'code', scss: 'code', vue: 'code',
  java: 'code', py: 'code', go: 'code', rb: 'code', php: 'code', c: 'code',
  h: 'code', cpp: 'code', hpp: 'code', cs: 'code', rs: 'code', kt: 'code',
  swift: 'code', sql: 'code', sh: 'code', bash: 'code', ps1: 'code',
  dart: 'code', scala: 'code', gradle: 'code', makefile: 'code',

  txt: 'text', md: 'text', markdown: 'text', log: 'text', ini: 'text',
  toml: 'text', env: 'text', gitignore: 'text', dockerfile: 'text',
};

/** 浏览器可能给出的文本类 MIME（扩展名白名单之外的补充） */
const TEXT_MIMES = new Set([
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/x-yaml',
  'application/yaml',
  'application/x-sh',
  'application/sql',
  'application/toml',
]);

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function kindOf(mime: string, name: string): FileKind {
  if (mime.startsWith('image/')) return 'image';
  const fromExt = EXT_KIND[extensionOf(name)];
  if (fromExt) return fromExt;
  return mime.startsWith('text/') ? 'text' : 'unknown';
}

export function isImage(mime: string, name: string): boolean {
  return kindOf(mime, name) === 'image';
}

/**
 * 是否可以按纯文本读取并送进模型：
 * 图片与二进制（pdf/office/压缩包）一律不读，避免把乱码塞进上下文。
 */
export function isReadableText(file: File): boolean {
  if (isImage(file.type, file.name)) return false;
  if (file.size > MAX_TEXT_FILE_SIZE) return false;

  const mime = file.type.toLowerCase();
  if (mime.startsWith('text/') || TEXT_MIMES.has(mime)) return true;

  const kind = kindOf(mime, file.name);
  return kind === 'code' || kind === 'text';
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('readAsDataURL failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文本文件内容。超限部分直接丢弃，只保留 MAX_TEXT_CHARS，
 * 避免大文件常驻内存并撑爆模型上下文。
 */
export function readFileAsText(file: File): Promise<{ text: string; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result);
      resolve({ text: raw.slice(0, MAX_TEXT_CHARS), truncated: raw.length > MAX_TEXT_CHARS });
    };
    reader.onerror = () => reject(reader.error ?? new Error('readAsText failed'));
    reader.readAsText(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 把可读文本附件拼成模型上下文片段。
 * 用「--- 附件：xxx ---」包裹而非代码围栏，防止文件内容里的 ``` 破坏结构。
 * 返回空串表示没有可注入内容。
 */
export function composeAttachmentText(list: Attachment[]): string {
  const readable = list.filter(a => a.text && a.text.trim());
  if (readable.length === 0) return '';

  let used = 0;
  const blocks: string[] = [];

  for (const item of readable) {
    const room = MAX_TOTAL_TEXT_CHARS - used;
    if (room <= 0) break;

    const raw = item.text ?? '';
    const body = raw.length > room ? `${raw.slice(0, room)}…` : raw;
    used += body.length;
    blocks.push(`--- 附件：${item.name} ---\n${body}\n--- 附件结束 ---`);
  }

  return blocks.length ? `\n\n${blocks.join('\n\n')}` : '';
}
