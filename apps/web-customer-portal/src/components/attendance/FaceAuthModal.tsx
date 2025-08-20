import { useState, useRef, useEffect } from 'react';
import { Modal, Button, Space, Typography, Alert, Progress } from 'antd';
import { CameraOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FaceAuthModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (photoData: string) => void;
  isLateAttendance?: boolean;
  type: 'checkin' | 'checkout';
}

export const FaceAuthModal = ({ 
  open, 
  onCancel, 
  onSuccess, 
  isLateAttendance = false,
  type 
}: FaceAuthModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [faceConfidence, setFaceConfidence] = useState(0);

  // Face detection mock (in real implementation, you would use ML libraries like MediaPipe or face-api.js)
  const detectFace = () => {
    // Simulate face detection
    const mockConfidence = Math.random() * 100;
    setFaceConfidence(mockConfidence);
    
    if (mockConfidence > 70) {
      setFaceDetected(true);
    } else {
      setFaceDetected(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
          setIsLoading(false);
          
          // Start face detection interval
          const faceDetectionInterval = setInterval(detectFace, 1000);
          
          // Clean up interval when component unmounts
          return () => clearInterval(faceDetectionInterval);
        };
      }
    } catch (err) {
      setError('카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraReady(false);
    setFaceDetected(false);
    setFaceConfidence(0);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);
      
      // Stop camera after capture
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto('');
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onSuccess(capturedPhoto);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto('');
    setError('');
    onCancel();
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [open]);

  const getTitle = () => {
    if (type === 'checkin') {
      return isLateAttendance ? '지각 출근 인증' : '출근 인증';
    }
    return '퇴근 인증';
  };

  const getInstructions = () => {
    if (type === 'checkin' && isLateAttendance) {
      return '지각으로 인한 출근 인증이 필요합니다. 얼굴이 화면 중앙에 오도록 위치를 조정해주세요.';
    }
    return '얼굴이 화면 중앙에 오도록 위치를 조정하고 촬영 버튼을 눌러주세요.';
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnHidden
      maskClosable={false}
    >
      <div className="space-y-4">
        {/* Instructions */}
        <Alert
          message={getInstructions()}
          type={isLateAttendance ? "warning" : "info"}
          showIcon
          className="mb-4"
        />

        {/* Camera Error */}
        {error && (
          <Alert
            message="카메라 오류"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={startCamera}>
                다시 시도
              </Button>
            }
          />
        )}

        {/* Camera Area */}
        <div className="flex justify-center">
          <div className="relative">
            {!capturedPhoto ? (
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-96 h-72 object-cover bg-gray-100"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect
                />
                
                {/* Face Detection Overlay */}
                {isCameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className={`w-64 h-64 border-4 rounded-full ${
                        faceDetected ? 'border-green-500' : 'border-yellow-500'
                      } border-dashed`}
                      style={{
                        animation: faceDetected ? 'none' : 'pulse 2s infinite'
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Text 
                          className={`text-sm font-medium ${
                            faceDetected ? 'text-green-600' : 'text-yellow-600'
                          }`}
                        >
                          {faceDetected ? '얼굴 감지됨' : '얼굴을 중앙에 위치시키세요'}
                        </Text>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <CameraOutlined className="text-2xl mb-2" />
                      <div>카메라를 시작하는 중...</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-96 h-72 object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Face Detection Status */}
        {isCameraReady && !capturedPhoto && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Text>얼굴 인식률:</Text>
              <Progress 
                percent={Math.round(faceConfidence)} 
                size="small" 
                style={{ width: 200 }}
                strokeColor={faceConfidence > 70 ? '#52c41a' : '#faad14'}
              />
            </div>
            {faceDetected && (
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircleOutlined />
                <Text className="text-green-600">촬영 준비 완료</Text>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center">
          {!capturedPhoto ? (
            <Space>
              <Button onClick={handleClose}>
                취소
              </Button>
              <Button
                type="primary"
                icon={<CameraOutlined />}
                onClick={capturePhoto}
                disabled={!isCameraReady || !faceDetected}
                size="large"
              >
                촬영하기
              </Button>
            </Space>
          ) : (
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={retakePhoto}
              >
                다시 촬영
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={confirmPhoto}
                size="large"
              >
                확인
              </Button>
            </Space>
          )}
        </div>

        {/* Hidden Canvas for Photo Capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </Modal>
  );
};