# Reko HR - Claude Development Notes

이 파일은 Claude Code가 프로젝트를 이해하고 개발을 지원하기 위한 정보를 담고 있습니다.

## 프로젝트 개요

Reko HR은 통합 HR 관리 시스템으로, 출퇴근 관리, 휴가 관리, 전자결재 시스템을 포함합니다.

### 아키텍처
- **모노레포**: pnpm workspace를 사용한 멀티 패키지 구조
- **백엔드**: NestJS + Prisma + PostgreSQL
- **프론트엔드**: React + TypeScript + Vite + Ant Design
- **모바일**: Expo + React Native + TypeScript
- **개발환경**: Docker (PostgreSQL, MinIO, MailHog, Redis)

### 앱 구조
```
apps/
├── api/                    # NestJS API 서버 (포트: 3000)
├── web-customer-portal/    # 임직원 포털 (포트: 3001)
├── web-customer-admin/     # HR 관리자 포털 (포트: 3002)
├── web-provider-admin/     # 서비스 제공자 포털 (포트: 3003)
└── mobile-app/            # Expo 모바일 앱

packages/
├── config/                # 공용 설정 (ESLint, TypeScript, Tailwind)
├── ui/                    # 공용 UI 컴포넌트
├── shared/                # 공용 타입, 스키마, 유틸리티
└── auth/                  # 인증 관련 훅과 가드
```

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