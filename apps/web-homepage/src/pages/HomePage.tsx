import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  FileText, 
  Users, 
  BarChart3, 
  Shield,
  Download,
  ArrowRight,
  CheckCircle,
  Building2,
  Smartphone,
  Monitor
} from 'lucide-react';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: '스마트 출퇴근 관리',
      description: 'GPS 기반 지오펜스, 얼굴 인증, 웹/모바일 체크인으로 정확한 근태 관리',
    },
    {
      icon: Calendar,
      title: '휴가 관리 시스템',
      description: '연차 자동 계산, 휴가 신청/승인, 잔여 휴가 실시간 확인',
    },
    {
      icon: FileText,
      title: '전자결재 시스템',
      description: '동적 폼 생성, 다단계 승인, 실시간 알림으로 업무 효율성 극대화',
    },
    {
      icon: Users,
      title: '조직 관리',
      description: '직급별 권한 관리, 부서 조직도, 사용자 역할 설정',
    },
    {
      icon: BarChart3,
      title: '실시간 대시보드',
      description: '출근율, 휴가 현황, 결재 통계를 한눈에 확인',
    },
    {
      icon: Shield,
      title: '보안 & 컴플라이언스',
      description: '데이터 암호화, 접근 제어, 감사 로그로 안전한 정보 관리',
    },
  ];

  const platforms = [
    {
      icon: Monitor,
      title: '웹 포털',
      description: '관리자와 직원 모두를 위한 직관적인 웹 인터페이스',
    },
    {
      icon: Smartphone,
      title: '모바일 앱',
      description: 'iOS/Android 지원, 언제 어디서나 출퇴근 체크',
    },
    {
      icon: Download,
      title: '데스크톱 에이전트',
      description: 'PC 모니터링, 스크린샷, 업무 시간 추적 (선택사항)',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Nova HR</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600">기능</a>
              <a href="#platforms" className="text-gray-700 hover:text-primary-600">플랫폼</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary-600">요금제</a>
              <a href="#contact" className="text-gray-700 hover:text-primary-600">문의</a>
            </nav>
            <div className="flex space-x-4">
              <Link 
                to="/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                개인 회원가입
              </Link>
              <Link 
                to="/company-request"
                className="border border-primary-600 text-primary-600 px-4 py-2 rounded-md hover:bg-primary-50 transition-colors"
              >
                기업 도입 문의
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            차세대 통합 인사관리 시스템
            <br />
            <span className="text-primary-600">Nova HR</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            출퇴근 관리부터 전자결재까지, 하나의 플랫폼으로 모든 인사업무를 효율적으로 관리하세요. 
            중소기업부터 대기업까지 맞춤형 솔루션을 제공합니다.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/register"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              무료로 시작하기
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="#demo"
              className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors"
            >
              데모 보기
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              완전한 인사관리 솔루션
            </h2>
            <p className="text-xl text-gray-600">
              현대 기업이 필요로 하는 모든 인사관리 기능을 하나로
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <feature.icon className="h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              모든 플랫폼에서 접근 가능
            </h2>
            <p className="text-xl text-gray-600">
              웹, 모바일, 데스크톱 - 어떤 환경에서든 Nova HR을 이용하세요
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {platforms.map((platform, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <platform.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {platform.title}
                </h3>
                <p className="text-gray-600">
                  {platform.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Desktop Agent Download Section */}
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Nova HR 데스크톱 에이전트</h3>
            <p className="text-lg mb-6 opacity-90">
              업무 시간 모니터링과 생산성 분석을 위한 선택적 도구
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="/downloads/nova-hr-agent-setup.exe"
                className="bg-white text-primary-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                download
              >
                <Download className="mr-2 h-5 w-5" />
                Windows 다운로드
              </a>
              <a 
                href="/downloads/Nova HR Agent.dmg"
                className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white hover:text-primary-600 transition-colors flex items-center"
                download
              >
                <Download className="mr-2 h-5 w-5" />
                macOS 다운로드
              </a>
            </div>
            <p className="text-sm mt-4 opacity-75">
              * 데스크톱 에이전트는 선택사항이며, 관리자 정책에 따라 설치할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              투명하고 합리적인 요금제
            </h2>
            <p className="text-xl text-gray-600">
              기업 규모에 맞는 최적의 플랜을 선택하세요
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Basic</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                월 ₩5,000
                <span className="text-lg font-normal text-gray-600">/사용자</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  기본 출퇴근 관리
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  휴가 신청/승인
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  간단한 전자결재
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  모바일 앱 지원
                </li>
              </ul>
              <Link 
                to="/company-request?plan=basic"
                className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg text-center block hover:bg-gray-200 transition-colors"
              >
                시작하기
              </Link>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border-2 border-primary-600 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm">인기</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Professional</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                월 ₩10,000
                <span className="text-lg font-normal text-gray-600">/사용자</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  모든 Basic 기능
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  고급 전자결재
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  조직 관리 기능
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  실시간 대시보드
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  데스크톱 에이전트
                </li>
              </ul>
              <Link 
                to="/company-request?plan=professional"
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg text-center block hover:bg-primary-700 transition-colors"
              >
                시작하기
              </Link>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Enterprise</h3>
              <div className="text-4xl font-bold text-primary-600 mb-4">
                문의
                <span className="text-lg font-normal text-gray-600">필요</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  모든 Professional 기능
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  커스터마이징
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  API 연동 지원
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  전담 기술 지원
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  온프레미스 설치
                </li>
              </ul>
              <a 
                href="#contact"
                className="w-full border border-primary-600 text-primary-600 py-3 px-4 rounded-lg text-center block hover:bg-primary-50 transition-colors"
              >
                문의하기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Nova HR로 인사업무를 혁신하고 싶으시다면 언제든지 연락주세요. 
            전문 컨설턴트가 맞춤형 솔루션을 제안해드립니다.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              to="/company-request"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              기업 도입 문의
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a 
              href="mailto:contact@nova-hr.com"
              className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg hover:bg-primary-50 transition-colors"
            >
              이메일 문의
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-2xl font-bold">Nova HR</span>
              </div>
              <p className="text-gray-400">
                차세대 통합 인사관리 시스템으로 기업의 효율성을 극대화하세요.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">제품</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">기능</a></li>
                <li><a href="#platforms" className="hover:text-white">플랫폼</a></li>
                <li><a href="#pricing" className="hover:text-white">요금제</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">지원</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">도움말 센터</a></li>
                <li><a href="#" className="hover:text-white">API 문서</a></li>
                <li><a href="#contact" className="hover:text-white">문의하기</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">회사</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">회사 소개</a></li>
                <li><a href="#" className="hover:text-white">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-white">서비스 약관</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Nova HR. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;