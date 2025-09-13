# Reko HR - Claude Development Notes

이 파일은 Claude Code가 프로젝트를 이해하고 개발을 지원하기 위한 정보를 담고 있습니다.

## 🚨 필독: 개발 가이드라인

**모든 개발 작업 전에 반드시 [DEVELOPMENT_SECURITY_GUIDE.md](./DEVELOPMENT_SECURITY_GUIDE.md) 문서를 숙지하고 준수해야 합니다.**

### 핵심 원칙:
- ❌ **Mock 데이터/가짜 구현 절대 사용 금지**
- ❌ **TypeScript `any` 타입 절대 사용 금지**  
- ✅ **실제 데이터베이스 연동 필수**
- ✅ **엄격한 타입 시스템 준수 필수**

## 프로젝트 개요

Reko HR은 통합 HR 관리 시스템으로, 출퇴근 관리, 휴가 관리, 전자결재 시스템을 포함합니다.

### 아키텍처
- **모노레포**: pnpm workspace를 사용한 멀티 패키지 구조
- **백엔드**: NestJS + Prisma + PostgreSQL
- **프론트엔드**: React + TypeScript + Vite + Ant Design
- **모바일**: Expo + React Native + TypeScript
- **개발환경**: Docker (PostgreSQL, MinIO, MailHog, Redis)

## 📦 프로젝트 산출물 목록

### 🎯 주요 애플리케이션
```
apps/
├── api/                    # 🏗️ API 서버 (NestJS + Prisma + PostgreSQL)
│   ├── 포트: 3000
│   ├── 기술스택: NestJS, Prisma, PostgreSQL, JWT
│   ├── 기능: 인증, 휴가관리, 출퇴근, 전자결재, 사용자관리
│   └── Swagger: http://localhost:3000/api/v1/docs
│
├── web-customer-portal/    # 👥 통합 임직원 포털 (React + Vite)
│   ├── 포트: 3001
│   ├── 기술스택: React, TypeScript, Vite, Ant Design, TailwindCSS
│   ├── 대상: 모든 직원 (일반직원 + HR관리자 역할별 기능 제공)
│   ├── 기능: 출퇴근, 휴가신청/승인, 전자결재, 조직관리, 커뮤니티
│   └── URL: http://localhost:3001
│
├── web-homepage/           # 🌐 마케팅 홈페이지 (Next.js)
│   ├── 기술스택: Next.js, TypeScript, TailwindCSS
│   ├── 대상: 잠재고객, 서비스 소개
│   ├── 기능: 제품소개, 가격정책, 고객사례, 문의하기
│   └── 배포: Vercel 또는 자체 서버
│
├── web-provider-admin/     # 🔧 서비스 제공자 포털 (React + Vite)
│   ├── 포트: 3003
│   ├── 기술스택: React, TypeScript, Vite, Ant Design, TailwindCSS
│   ├── 대상: 시스템 관리자, 서비스 제공업체
│   ├── 기능: 멀티테넌트 관리, 시스템 설정, 서비스 모니터링
│   └── URL: http://localhost:3003
│
├── desktop-agent/          # 🖥️ 데스크톱 에이전트 (Electron)
│   ├── 기술스택: Electron, TypeScript, React
│   ├── 대상: 재택근무자, 업무태도 모니터링 대상자
│   ├── 기능: 스크린샷, 앱사용량, 웹사이트 추적, 자동출퇴근
│   └── 배포: Windows, macOS, Linux 지원
│
├── mobile-app/             # 📱 모바일 앱 (React Native + Expo)
│   ├── 기술스택: React Native, Expo, TypeScript, NativeWind
│   ├── 대상: 현장직, 외근직, 모든 직원
│   ├── 기능: GPS 출퇴근, 휴가신청, 푸시알림, 간단한 전자결재
│   └── 배포: iOS App Store, Google Play Store
│

packages/
├── config/                # ⚙️ 공용 설정
│   ├── ESLint, Prettier 설정
│   ├── TypeScript 설정
│   ├── Tailwind CSS 설정
│   └── Vite/Webpack 설정
│
├── ui/                    # 🎨 공용 UI 컴포넌트
│   ├── Ant Design 커스터마이징
│   ├── 공통 버튼, 폼, 모달
│   ├── 차트, 테이블 컴포넌트
│   └── 아이콘, 로고 세트
│
├── shared/                # 🔗 공용 라이브러리
│   ├── API 타입 정의
│   ├── 유틸리티 함수
│   ├── 상수 및 enum
│   └── Zod 스키마 검증
│
└── auth/                  # 🔐 인증 라이브러리
    ├── JWT 토큰 관리
    ├── 권한 기반 라우터 가드
    ├── 로그인/로그아웃 훅
    └── 역할 기반 접근 제어 (RBAC)
```

### 🎯 타겟 사용자별 분류
- **👥 Customer Portal**: 통합 포털 (일반직원 + HR관리자 역할별 기능)
- **🔧 Provider Admin**: 시스템 관리자 (멀티테넌트, 시스템 설정)
- **🖥️ Desktop Agent**: 재택근무자 (업무 모니터링)
- **📱 Mobile App**: 현장직, 외근직 (GPS 출퇴근)
- **🌐 Homepage**: 잠재고객 (서비스 소개, 마케팅)

## 개발 명령어

### 전체 프로젝트
```bash
# 의존성 설치
pnpm install

# 개발환경 시작 (Docker 서비스 + 모든 앱)
pnpm docker:up
pnpm dev

# 특정 앱만 실행
pnpm dev:api          # API 서버만
pnpm dev:web          # 웹 앱들만
pnpm dev:mobile       # 모바일 앱만

# 데이터베이스
pnpm migrate:dev      # 개발용 마이그레이션
pnpm db:seed          # 시드 데이터 생성

# 빌드 및 테스트
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

### Docker 서비스
```bash
pnpm docker:up        # 서비스 시작
pnpm docker:down      # 서비스 중지
pnpm docker:logs      # 로그 확인
```

## 주요 기능

### 1. 출퇴근 관리
- GPS 기반 지오펜스 체크인/체크아웃
- 반경 밖 출근 시 사유 입력 및 승인 플로우
- 소급 신청 (관리자 승인 필요)
- 얼굴 인증 (선택사항)
- 근무시간 정책 설정

### 2. 휴가 관리
- 연차, 병가, 특별휴가 등 휴가 타입별 관리
- 잔여 연차 자동 계산
- 휴가 신청 및 승인 플로우
- 휴가 일정 캘린더

### 3. 전자결재
- JSON Schema 기반 동적 폼 생성
- 합의 → 결재 → 참조 단계별 승인 구조
- 부서별 결재선 템플릿
- 첨부파일 지원 (S3/MinIO)

### 4. 조직 관리
- 회사/지점 관리
- 부서 조직도
- 사용자 권한 관리
- 근무 정책 설정

## 데이터베이스

### 주요 테이블
- `auth_users`: 사용자 정보
- `companies`: 회사 정보
- `company_locations`: 회사 지점 (지오펜스)
- `org_units`: 조직 구조
- `attendance`: 출퇴근 기록
- `attendance_requests`: 출퇴근 정정 요청
- `leave_requests`: 휴가 신청
- `approval_drafts`: 전자결재 문서
- `approval_routes`: 결재선 정보

### 테스트 계정
```
관리자: admin@reko-hr.com / admin123
HR매니저: hr@reko-hr.com / admin123
직원: employee@reko-hr.com / admin123
```

## 개발 가이드

### 코드 스타일
- ESLint + Prettier 적용
- TypeScript strict mode
- Conventional Commits
- 함수형 컴포넌트 + 커스텀 훅 패턴

### API 개발
- NestJS 모듈 기반 구조
- Prisma ORM 사용
- Swagger 문서 자동 생성
- JWT 기반 인증
- Role 기반 권한 관리

### 프론트엔드 개발
- React Query로 서버 상태 관리
- Ant Design 컴포넌트 사용
- React Hook Form + Zod 검증
- Tailwind CSS 스타일링

### 모바일 개발
- Expo Managed Workflow
- React Native Paper UI
- NativeWind (Tailwind for RN)
- Expo Location, Camera 등 네이티브 API

## 환경 설정

### 필수 서비스 URL
- API: http://localhost:3000
- Customer Portal: http://localhost:3001
- Customer Admin: http://localhost:3002
- Provider Admin: http://localhost:3003
- pgAdmin: http://localhost:5050
- MinIO Console: http://localhost:9001
- MailHog: http://localhost:8025

### 환경변수
주요 환경변수는 `apps/api/.env` 파일 참조

## 다음 개발 단계

1. **인증 시스템 완성**
   - JWT 토큰 기반 로그인/로그아웃
   - 역할 기반 접근 제어 (RBAC)
   - 토큰 갱신 로직

2. **출퇴근 기능 구현**
   - 지오펜스 기반 체크인/체크아웃
   - 위치 권한 처리
   - 예외 상황 처리 (반경 밖, 소급 신청)

3. **휴가 관리 시스템**
   - 휴가 신청 폼
   - 승인 플로우
   - 연차 잔여일 계산

4. **전자결재 시스템**
   - 동적 폼 렌더러
   - 결재선 설정 UI
   - 승인/반려 처리

5. **관리자 기능**
   - 조직도 관리
   - 정책 설정
   - 보고서 생성

## 참고사항

- 모든 시간은 서버 기준으로 처리
- 지오펜스 반경은 지점별로 설정 가능 (기본 200m)
- 파일 업로드는 MinIO(개발)/S3(운영) 사용
- 이메일 발송은 MailHog(개발)/SES(운영) 사용
- 모든 중요한 액션은 audit_log에 기록

## 🔄 최신 성공 이력 및 중요 설정

### 2025-09-13 시스템 통합 성공 이력
**참조 파일**:
- `SUCCESS_LOG_2025_09_13.md` - 초기 TypeScript 오류 해결 및 API 통합
- `WORK_SESSION_LOG_2025_09_13_PART2.md` - 웹 포털 401 오류 해결 및 휴가 시스템 테스트 완료
- `API_ENDPOINT_FIX_LOG_2025_09_13.md` - **최신** API 엔드포인트 404/500 오류 해결 완료

#### ✅ 해결된 주요 문제
1. **API TypeScript 오류 86개 → 0개 완전 해결**
2. **웹 포털 API 연결 문제 해결**: `.env` 파일에서 `VITE_API_URL=http://localhost:3000/api/v1`로 수정
3. **Prisma 스키마 관계 불일치 해결**: `leave_type` → `leave_type_ref`
4. **Docker PostgreSQL 컨테이너 corruption 해결** 및 데이터베이스 재구성
5. **웹 포털 401 인증 오류 해결**: 정상적인 인증 플로우임을 확인
6. **휴가 잔여일 할당 문제 해결**: 모든 사용자에게 휴가 잔여일 할당 완료

#### 🚀 검증된 기능
- **API 서버**: http://localhost:3000 (NestJS) ✅
- **웹 포털**: http://localhost:3001 (React + Vite) ✅
- **로그인 API**: JWT 토큰 인증 정상 작동 ✅
- **출퇴근 API**: `/attendance/today` 엔드포인트 정상 작동 ✅
- **회사 위치 API**: `/company/locations` 엔드포인트 정상 작동 ✅
- **휴가 관리 API**:
  - 사용자별 잔여 조회 및 요약 기능 ✅
  - 휴가 신청 생성 (`POST /leave/requests`) ✅
  - 기본 승인 워크플로우 (복잡한 승인은 임시 비활성화) ✅
- **휴가 잔여일 할당**: 관리자 15일, HR매니저 15일, 직원 12일 ✅
- **웹 포털 인증**: 401 오류 정상 플로우 확인 ✅
- **데이터베이스**: 3명 사용자 + 5개 휴가 타입 + 휴가 잔여일 데이터 ✅

#### 🔑 테스트 계정 (모든 계정 비밀번호: admin123)
- **관리자**: admin@reko-hr.com
- **HR매니저**: hr@reko-hr.com  
- **직원**: employee@reko-hr.com

#### ⚠️ 중요한 개발 설정
- **API URL**: 반드시 `/api/v1` 경로 사용
- **환경변수**: `VITE_API_URL=http://localhost:3000/api/v1`
- **Prisma 관계**: `leave_type_ref` 사용 (문자열 필드 `leave_type` 아님)
- **비활성화된 모듈**: OvertimeModule, SettingsModule (Prisma 테이블 누락으로 임시 비활성화)