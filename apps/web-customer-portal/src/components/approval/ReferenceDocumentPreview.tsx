import React from 'react';
import { Card, Typography, Tag, Space, Divider, Button, Empty } from 'antd';
import { EyeOutlined, LinkOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { ApprovalDraft } from '../../lib/api';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface ReferenceDocumentPreviewProps {
  referenceDocument: ApprovalDraft | null;
  onViewDocument?: (document: ApprovalDraft) => void;
  onRemoveReference?: () => void;
}

export const ReferenceDocumentPreview: React.FC<ReferenceDocumentPreviewProps> = ({
  referenceDocument,
  onViewDocument,
  onRemoveReference,
}) => {
  if (!referenceDocument) {
    return (
      <Card size="small" title="참조 문서" className="border border-dashed">
        <Empty 
          description="참조 문서가 없습니다" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '20px 0' }}
        />
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'processing';
      case 'REJECTED': return 'error';
      case 'DRAFT': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return '승인완료';
      case 'PENDING': return '진행중';
      case 'REJECTED': return '반려';
      case 'DRAFT': return '임시저장';
      default: return status;
    }
  };

  return (
    <Card 
      size="small" 
      title={
        <div className="flex items-center justify-between">
          <span>참조 문서</span>
          {onRemoveReference && (
            <Button 
              size="small" 
              type="text" 
              onClick={onRemoveReference}
              className="text-gray-400 hover:text-red-500"
            >
              ✕
            </Button>
          )}
        </div>
      }
      className="border-l-4 border-l-blue-500"
    >
      <div className="space-y-3">
        {/* 문서 제목 및 상태 */}
        <div>
          <div className="flex items-start justify-between mb-1">
            <Text strong className="text-sm line-clamp-2 flex-1">
              {referenceDocument.title}
            </Text>
            <Tag 
              color={getStatusColor(referenceDocument.status)} 
              className="ml-2 text-xs"
            >
              {getStatusText(referenceDocument.status)}
            </Tag>
          </div>
          <Text type="secondary" className="text-xs">
            {referenceDocument.category?.name}
          </Text>
        </div>

        <Divider className="my-2" />

        {/* 문서 정보 */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-gray-500">
            <UserOutlined className="mr-1" />
            <Text className="text-xs">
              {referenceDocument.creator?.name || '알 수 없음'}
            </Text>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <CalendarOutlined className="mr-1" />
            <Text className="text-xs">
              {dayjs(referenceDocument.created_at).format('YYYY.MM.DD')}
            </Text>
          </div>
        </div>

        {/* 문서 내용 미리보기 */}
        {referenceDocument.description && (
          <>
            <Divider className="my-2" />
            <div>
              <Text className="text-xs text-gray-600 block mb-1">내용 미리보기</Text>
              <Paragraph 
                ellipsis={{ rows: 3 }} 
                className="text-xs text-gray-700 mb-0"
              >
                {referenceDocument.description.replace(/<[^>]*>/g, '')}
              </Paragraph>
            </div>
          </>
        )}

        {/* 동적 필드 미리보기 */}
        {referenceDocument.content && Object.keys(referenceDocument.content).length > 0 && (
          <>
            <Divider className="my-2" />
            <div>
              <Text className="text-xs text-gray-600 block mb-1">첨부 정보</Text>
              <div className="space-y-1">
                {Object.entries(referenceDocument.content)
                  .filter(([key]) => !key.startsWith('__'))
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <Text className="text-gray-600 truncate flex-1 mr-2">
                        {key}:
                      </Text>
                      <Text className="text-gray-800 truncate">
                        {String(value)}
                      </Text>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* 액션 버튼 */}
        <div className="pt-2 border-t">
          <Space size="small" className="w-full justify-center">
            {onViewDocument && (
              <Button 
                size="small" 
                type="link" 
                icon={<EyeOutlined />}
                onClick={() => onViewDocument(referenceDocument)}
                className="text-xs px-2"
              >
                상세보기
              </Button>
            )}
            <Button 
              size="small" 
              type="link" 
              icon={<LinkOutlined />}
              className="text-xs px-2"
            >
              연결됨
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};