# 🌐 Nova HR - 환경별 설정 가이드

## 📋 환경 구분

| 환경 | 설명 | .env 파일 | URL 예시 |
|------|------|-----------|----------|
| **Local** | 로컬 개발환경 | `.env.local` | `http://localhost:3000` |
| **Dev** | 개발 서버 | `.env.dev` | `http://nova-hr-api-dev-alb.aws.com` |  
| **Prod** | 운영 서버 | `.env.prod` | `https://api.nova-hr.com` |

## 🚀 사용법

### 1️⃣ 로컬 개발 (Local)
```bash
# 로컬 도커 환경 시작
pnpm docker:up

# 로컬 개발 서버 실행
pnpm dev:local

# 개별 서비스 실행
pnpm dev:api    # API 서버 (localhost:3000)
pnpm dev:web    # 웹 앱들 (localhost:3001, 3002)
pnpm dev:desktop # 데스크톱 에이전트
```

**환경 변수:**
- API: `apps/api/.env.local`
- 웹: `apps/web-customer-portal/.env.local`
- 데스크톱: `apps/desktop-agent/.env.local`

### 2️⃣ 개발 서버 배포 (Dev)
```bash
# 개발 서버용 빌드
pnpm build:dev

# AWS Dev 환경 배포
pnpm deploy:dev

# 데스크톱 에이전트 배포
pnpm deploy:desktop:dev
```

**리소스:**
- **API**: ECS `nova-hr-dev-cluster`
- **DB**: RDS `nova-hr-db-dev.cfu9ttczrjex.ap-southeast-3.rds.amazonaws.com`
- **웹**: S3 `nova-hr-portal-dev`
- **파일**: S3 `nova-hr-files-dev`
- **데스크톱**: S3 `nova-hr-desktop-agent-dev`

### 3️⃣ 운영 서버 배포 (Prod)
```bash
# 운영 서버용 빌드
pnpm build:prod

# AWS Prod 환경 배포
pnpm deploy:prod

# 데스크톱 에이전트 배포
pnpm deploy:desktop:prod
```

**리소스:**
- **API**: `https://api.nova-hr.com`
- **웹**: `https://portal.nova-hr.com` 
- **파일**: S3 운영 버킷
- **데스크톱**: `https://downloads.nova-hr.com`

## 🔧 환경 변수 설정

### API 서버 (.env 파일들)

**필수 환경 변수:**
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"

# JWT 보안
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"

# AWS 설정  
AWS_REGION="ap-southeast-3"
AWS_S3_BUCKET="your-bucket-name"

# CORS 설정
CORS_ORIGINS="https://your-frontend-domain.com"
```

### 웹 앱 (.env 파일들)

**필수 환경 변수:**
```bash
# API 연결
VITE_API_BASE_URL=https://your-api-url

# 앱 정보
VITE_APP_NAME="Nova HR Portal"
VITE_ENVIRONMENT=production

# 서비스 URL
VITE_DESKTOP_AGENT_DOWNLOAD_URL=https://downloads.url
```

### 데스크톱 에이전트 (.env 파일들)

**필수 환경 변수:**
```bash
# API 연결
API_BASE_URL=https://your-api-url

# 모니터링 설정
SCREENSHOT_INTERVAL=30000
ACTIVITY_REPORT_INTERVAL=60000

# 보안 설정
ENABLE_SSL_VERIFY=true
```

## 🔄 배포 플로우

### 개발 워크플로우
1. **로컬 개발**: `pnpm dev:local`
2. **로컬 테스트**: 기능 검증
3. **개발 배포**: `pnpm deploy:dev`  
4. **개발 서버 테스트**: Dev 환경에서 통합 테스트
5. **운영 배포**: `pnpm deploy:prod`

### 빠른 배포 명령어
```bash
# 개발 서버 배포 (한 번에)
pnpm deploy:dev

# 운영 서버 배포 (한 번에)  
pnpm deploy:prod

# 데스크톱 에이전트만 배포
pnpm deploy:desktop:dev   # 개발
pnpm deploy:desktop:prod  # 운영
```

## 🔍 트러블슈팅

### 환경 변수 로드 안되는 경우
```bash
# 환경 확인
echo $NODE_ENV

# .env 파일 확인
ls -la apps/api/.env*
ls -la apps/web-customer-portal/.env*
```

### API 연결 실패
1. `.env` 파일의 `API_BASE_URL` 확인
2. CORS 설정 확인
3. 네트워크 연결 상태 확인

### 데이터베이스 연결 실패
1. `DATABASE_URL` 형식 확인
2. RDS 보안 그룹 설정 확인
3. VPC 네트워크 설정 확인

## 📞 지원

문제 발생 시:
1. 로그 확인: `pnpm docker:logs`
2. 환경 변수 검증
3. AWS 리소스 상태 확인
4. GitHub Issues에 문제 등록