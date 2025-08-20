import type { ReactNode } from 'react';

export interface BaseComponent {
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

export interface LoadingState {
  loading?: boolean;
}

export interface ErrorState {
  error?: string | null;
}

export interface AsyncState extends LoadingState, ErrorState {}

export type Size = 'small' | 'medium' | 'large';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number, pageSize?: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => ReactNode;
}

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  sortOrder?: 'ascend' | 'descend' | null;
  fixed?: 'left' | 'right';
}

export interface FormFieldProps extends BaseComponent {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}