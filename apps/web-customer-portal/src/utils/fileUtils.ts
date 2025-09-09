import { message } from 'antd';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}

export interface FileUploadResult {
  success: boolean;
  file?: File;
  error?: string;
}

export const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg', 
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain' // .txt
  ],
  maxFiles: 10
};

export const OVERTIME_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ],
  maxFiles: 10
};

export const validateFile = (
  file: File, 
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): FileUploadResult => {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
    return {
      success: false,
      error: `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다.`
    };
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `지원하지 않는 파일 형식입니다. 허용된 형식: ${getAllowedExtensions(options.allowedTypes)}`
    };
  }

  return {
    success: true,
    file
  };
};

export const validateFileList = (
  files: File[],
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): { success: boolean; validFiles: File[]; errors: string[] } => {
  const validFiles: File[] = [];
  const errors: string[] = [];

  // Check max files limit
  if (options.maxFiles && files.length > options.maxFiles) {
    errors.push(`최대 ${options.maxFiles}개의 파일만 업로드할 수 있습니다.`);
    return { success: false, validFiles, errors };
  }

  // Validate each file
  files.forEach((file, index) => {
    const result = validateFile(file, options);
    if (result.success && result.file) {
      validFiles.push(result.file);
    } else if (result.error) {
      errors.push(`파일 ${index + 1} (${file.name}): ${result.error}`);
    }
  });

  return {
    success: errors.length === 0,
    validFiles,
    errors
  };
};

export const getAllowedExtensions = (mimeTypes: string[]): string => {
  const extensionMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
    'text/plain': 'TXT'
  };

  return mimeTypes
    .map(type => extensionMap[type] || type)
    .join(', ');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  if (mimeType === 'text/plain') return '📋';
  return '📎';
};

export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 미리보기가 가능합니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('파일을 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
};