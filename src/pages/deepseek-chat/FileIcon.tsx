import React from 'react';
import {
  CodeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { FileKind } from './attachments';

/** 文件种类 → 图标：让非图片附件也能一眼看出类型 */
const ICONS: Record<FileKind, React.ComponentType> = {
  image: FileImageOutlined,
  pdf: FilePdfOutlined,
  word: FileWordOutlined,
  excel: FileExcelOutlined,
  ppt: FilePptOutlined,
  archive: FileZipOutlined,
  code: CodeOutlined,
  text: FileTextOutlined,
  unknown: FileOutlined,
};

const FileIcon: React.FC<{ kind: FileKind }> = ({ kind }) => {
  const Icon = ICONS[kind] ?? FileOutlined;
  return <Icon />;
};

export default FileIcon;
