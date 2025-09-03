import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Building, User, Mail, Phone, MapPin, FileText, MessageSquare } from 'lucide-react';

const CompanyRequestPage: React.FC = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    business_number: '',
    ceo_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    description: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/request-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: '기업 도입 신청이 접수되었습니다! 검토 후 연락드리겠습니다.' 
        });
        setFormData({
          company_name: '',
          business_number: '',
          ceo_name: '',
          contact_email: '',
          contact_phone: '',
          address: '',
          description: '',
          notes: '',
        });
      } else {
        setMessage({ type: 'error', text: data.message || '신청서 제출에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link to="/" className="flex items-center justify-center">
          <Building2 className="h-12 w-12 text-primary-600" />
          <span className="ml-2 text-3xl font-bold text-gray-900">Nova HR</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          기업 도입 신청
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Nova HR을 기업에 도입하고 싶으신가요? 아래 정보를 입력해주시면 전문 컨설턴트가 연락드리겠습니다.
          <br />
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
            개인 사용자이신가요?
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  회사명 *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                    placeholder="(주)예시회사"
                  />
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="business_number" className="block text-sm font-medium text-gray-700">
                  사업자등록번호
                </label>
                <div className="mt-1 relative">
                  <input
                    id="business_number"
                    name="business_number"
                    type="text"
                    value={formData.business_number}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                    placeholder="123-45-67890"
                  />
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="ceo_name" className="block text-sm font-medium text-gray-700">
                  대표자명 *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="ceo_name"
                    name="ceo_name"
                    type="text"
                    required
                    value={formData.ceo_name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                    placeholder="김대표"
                  />
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                  연락처 *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="contact_phone"
                    name="contact_phone"
                    type="tel"
                    required
                    value={formData.contact_phone}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                    placeholder="02-1234-5678"
                  />
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                담당자 이메일 *
              </label>
              <div className="mt-1 relative">
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                  placeholder="contact@company.com"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                회사 주소
              </label>
              <div className="mt-1 relative">
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                  placeholder="서울특별시 강남구 테헤란로 123"
                />
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                회사 소개
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="회사 규모, 업종, 직원 수 등 간단한 회사 소개를 입력해주세요."
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                추가 요청사항 및 문의사항
              </label>
              <div className="mt-1 relative">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 pl-10"
                  placeholder="특별한 요구사항이나 문의할 내용이 있으시면 입력해주세요."
                />
                <MessageSquare className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">신청 후 진행 과정</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. 신청서 검토 (1-2 영업일)</li>
                <li>2. 전문 컨설턴트 배정 및 연락</li>
                <li>3. 온라인/오프라인 상담 및 데모</li>
                <li>4. 맞춤형 제안서 제공</li>
                <li>5. 계약 체결 및 시스템 구축</li>
              </ol>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '신청서 제출 중...' : '기업 도입 신청하기'}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                개인 사용자이신가요?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  개인 회원가입
                </Link>
              </span>
            </div>
          </form>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                <strong>급하신 경우 직접 연락주세요:</strong>
              </p>
              <div className="flex justify-center space-x-8 text-sm">
                <div>
                  <span className="font-medium text-gray-900">전화:</span>
                  <span className="ml-1 text-primary-600">02-1234-5678</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">이메일:</span>
                  <span className="ml-1 text-primary-600">sales@nova-hr.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyRequestPage;