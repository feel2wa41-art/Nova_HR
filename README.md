# Nova HR

통합 HR 관리 시스템 - 출퇴근, 휴가, 전자결재를 포함한 종합 HR 솔루션

## 🏗️ 아키텍처

### 모노레포 구조
```
nova-hr/
├── apps/
│   ├── web-customer-portal/     # 임직원 포털
│   ├── web-customer-admin/      # 고객사 HR 관리자
│   ├── web-provider-admin/      # 서비스제공자 HQ 관리자
│   ├── mobile-app/              # Expo 모바일 앱
│   └── api/                     # NestJS API 서버
├── packages/
│   ├── ui/                      # 공용 UI 컴포넌트
│   ├── shared/                  # 공용 타입/스키마/유틸
│   ├── config/                  # 공용 설정
│   └── auth/                    # 클라이언트 인증
└── infra/
    ├── docker/                  # 로컬 개발환경
    └── cdk/                     # AWS CDK 인프라
```

### 기술 스택
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + Ant Design
- **Mobile**: Expo + React Native + TypeScript
- **Backend**: NestJS 10 + Prisma + PostgreSQL 16
- **Development**: Docker (PostgreSQL, MinIO, MailHog)
- **Production**: AWS (RDS, S3, CloudFront, SES, ECS)

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### 설치 및 실행

1. **의존성 설치**
```bash
pnpm install
```

2. **개발환경 시작**
```bash
# Docker 서비스 시작 (PostgreSQL, MinIO, MailHog)
pnpm docker:up

# 데이터베이스 마이그레이션
pnpm migrate:dev

# 모든 앱 개발 서버 시작
pnpm dev
```

3. **개별 앱 실행**
```bash
# API 서버만 실행
pnpm dev:api

# 웹 앱들만 실행
pnpm dev:web

# 모바일 앱만 실행
pnpm dev:mobile
```

### 개발 URL
- **API**: http://localhost:3000
- **Customer Portal**: http://localhost:3001
- **Customer Admin**: http://localhost:3002
- **Provider Admin**: http://localhost:3003
- **Mobile**: Metro bundler
- **MailHog**: http://localhost:8025
- **MinIO Console**: http://localhost:9001

## 📱 주요 기능

### 임직원 포털
- 출퇴근 체크인/아웃 (지오펜스 기반)
- 휴가 신청 및 관리
- 전자결재 기안 작성
- 개인 근무 기록 조회

### HR 관리자
- 조직 및 사용자 관리
- 출퇴근 정책 설정
- 전자결재 승인 구조 관리
- 근무 현황 및 보고서

### 서비스 제공자
- 테넌트 및 라이선스 관리
- 전사 정책 템플릿
- 시스템 모니터링

## 🛠️ 개발 명령어

```bash
# 빌드
pnpm build

# 테스트
pnpm test

# 린트 및 포맷팅
pnpm lint
pnpm format

# 타입 체크
pnpm typecheck

# 데이터베이스
pnpm migrate:dev      # 개발환경 마이그레이션
pnpm db:seed          # 시드 데이터 생성

# Docker
pnpm docker:up        # 서비스 시작
pnpm docker:down      # 서비스 정지
pnpm docker:logs      # 로그 확인
```

## 📋 개발 로드맵

- [x] 프로젝트 초기 설정
- [ ] 인증 시스템
- [ ] 출퇴근 기능
- [ ] 휴가 관리
- [ ] 전자결재 시스템
- [ ] 조직 관리
- [ ] 보고서 기능

## 📄 라이선스

Private License - TANK Development