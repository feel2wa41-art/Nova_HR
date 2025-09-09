import React, { useState, useCallback } from 'react';
import {
  Upload,
  Button,
  List,
  Progress,
  message,
  Space,
  Typography,
  Card,
  Image,
  Modal,
  Tooltip
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FileOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { 
  validateFileList, 
  OVERTIME_FILE_OPTIONS, 
  formatFileSize, 
  getFileIcon,
  createFilePreview 
} from '../../utils/fileUtils';

const { Text } = Typography;

export interface FileAttachment {
  uid: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
  status?: 'uploading' | 'done' | 'error' | 'removed';
  progress?: number;
}

interface FileUploadComponentProps {
  value?: FileAttachment[];
  onChange?: (files: FileAttachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  onUpload?: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxFiles = 10,
  onUpload
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const updateFiles = useCallback((newFiles: FileAttachment[]) => {
    onChange?.(newFiles);
  }, [onChange]);

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    
    // Convert UploadFile[] to FileAttachment[]
    const attachments: FileAttachment[] = newFileList.map(file => ({
      uid: file.uid,
      name: file.name,
      size: file.size || 0,
      type: file.type || '',
      file: file.originFileObj,
      url: file.url,
      status: file.status,
      progress: file.percent
    }));
    
    updateFiles(attachments);
  };

  const beforeUpload = (file: File, fileList: File[]) => {
    // Validate files
    const validation = validateFileList([...value.map(f => f.file!).filter(Boolean), ...fileList], {
      ...OVERTIME_FILE_OPTIONS,
      maxFiles
    });

    if (!validation.success) {
      validation.errors.forEach(error => message.error(error));
      return false;
    }

    return true;
  };

  const customRequest = async ({ file, onSuccess, onError, onProgress }: any) => {
    try {
      console.log('📎 파일 업로드 시작:', file.name);
      
      if (onUpload) {
        // Use custom upload function if provided
        onProgress?.({ percent: 30 });
        await new Promise(resolve => setTimeout(resolve, 500)); // 업로드 시뮬레이션
        
        onProgress?.({ percent: 70 });
        const result = await onUpload(file as File);
        
        if (result.success) {
          onProgress?.({ percent: 100 });
          onSuccess?.(result, file);
          message.success(`${file.name} 업로드 완료!`);
        } else {
          onError?.(new Error(result.error || '업로드 실패'));
          message.error(`${file.name} 업로드 실패: ${result.error}`);
        }
      } else {
        // Simulate successful upload with more realistic progress
        onProgress?.({ percent: 30 });
        await new Promise(resolve => setTimeout(resolve, 800));
        
        onProgress?.({ percent: 70 });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onProgress?.({ percent: 100 });
        onSuccess?.('ok', file);
        message.success(`${file.name} 업로드 완료!`);
        console.log('✅ 파일 업로드 성공:', file.name);
      }
    } catch (error) {
      console.error('❌ 파일 업로드 오류:', error);
      onError?.(error);
      message.error(`파일 업로드 중 오류가 발생했습니다.`);
    }
  };

  const handleRemove = (file: UploadFile) => {
    const newAttachments = value.filter(attachment => attachment.uid !== file.uid);
    updateFiles(newAttachments);
  };

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      if (file.originFileObj && file.originFileObj.type.startsWith('image/')) {
        try {
          file.preview = await createFilePreview(file.originFileObj);
        } catch (error) {
          message.error('이미지 미리보기를 생성할 수 없습니다.');
          return;
        }
      }
    }

    if (file.url || file.preview) {
      setPreviewImage(file.url || (file.preview as string));
      setPreviewVisible(true);
      setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
    } else {
      message.info('이 파일은 미리보기를 지원하지 않습니다.');
    }
  };

  const handleDownload = (file: FileAttachment) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file.file) {
      const url = URL.createObjectURL(file.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const renderFileItem = (file: FileAttachment) => (
    <List.Item
      key={file.uid}
      actions={[
        file.type.startsWith('image/') && (
          <Tooltip title="미리보기">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handlePreview({ 
                uid: file.uid, 
                name: file.name, 
                url: file.url,
                preview: file.file ? undefined : file.url,
                originFileObj: file.file
              } as UploadFile)}
            />
          </Tooltip>
        ),
        <Tooltip title="다운로드">
          <Button 
            type="text" 
            icon={<DownloadOutlined />} 
            onClick={() => handleDownload(file)}
          />
        </Tooltip>,
        <Tooltip title="삭제">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleRemove({ uid: file.uid, name: file.name } as UploadFile)}
            disabled={disabled}
          />
        </Tooltip>
      ].filter(Boolean)}
    >
      <List.Item.Meta
        avatar={
          <div style={{ fontSize: '24px' }}>
            {file.status === 'uploading' ? <LoadingOutlined /> : getFileIcon(file.type)}
          </div>
        }
        title={
          <Space direction="vertical" size={0}>
            <Text strong>{file.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatFileSize(file.size)}
            </Text>
          </Space>
        }
        description={
          file.status === 'uploading' ? (
            <Progress 
              percent={file.progress || 0} 
              size="small" 
              status="active"
              showInfo={false}
            />
          ) : file.status === 'error' ? (
            <Text type="danger">업로드 실패</Text>
          ) : (
            <Text type="success">업로드 완료</Text>
          )
        }
      />
    </List.Item>
  );

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Upload
          multiple
          fileList={fileList}
          onChange={handleUploadChange}
          beforeUpload={beforeUpload}
          onRemove={handleRemove}
          onPreview={handlePreview}
          customRequest={customRequest}
          disabled={disabled}
          accept={OVERTIME_FILE_OPTIONS.allowedTypes?.join(',')}
          showUploadList={false}
        >
          <Button 
            icon={<UploadOutlined />} 
            disabled={disabled || value.length >= maxFiles}
          >
            파일 첨부 ({value.length}/{maxFiles})
          </Button>
        </Upload>

        <div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ✅ 지원 형식: PDF, 이미지(PNG, JPG), Excel(XLSX, XLS), Word(DOCX, DOC)<br/>
            ✅ 최대 파일 크기: 10MB<br/>
            ✅ 최대 파일 개수: {maxFiles}개
          </Text>
        </div>

        {value.length > 0 && (
          <List
            size="small"
            dataSource={value}
            renderItem={renderFileItem}
            locale={{ emptyText: '첨부된 파일이 없습니다.' }}
          />
        )}

        <Modal
          open={previewVisible}
          title={previewTitle}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          <Image
            alt="미리보기"
            style={{ width: '100%' }}
            src={previewImage}
          />
        </Modal>
      </Space>
    </Card>
  );
};

export default FileUploadComponent;