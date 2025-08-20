# Nova HR Docker Development Environment

이 디렉터리는 Nova HR 프로젝트의 로컬 개발환경을 위한 Docker 설정을 포함합니다.

## 서비스

### 1. PostgreSQL (포트: 5432)
- **용도**: 메인 데이터베이스
- **접속 정보**:
  - Host: localhost
  - Port: 5432
  - Database: nova_hr
  - Username: nova_hr
  - Password: password

### 2. MinIO (포트: 9000, 9001)
- **용도**: S3 호환 객체 스토리지 (파일 업로드)
- **접속 정보**:
  - API Endpoint: http://localhost:9000
  - Console: http://localhost:9001
  - Access Key: minioadmin
  - Secret Key: minioadmin123

### 3. MailHog (포트: 1025, 8025)
- **용도**: 이메일 테스트
- **접속 정보**:
  - SMTP: localhost:1025
  - Web UI: http://localhost:8025

### 4. Redis (포트: 6379)
- **용도**: 캐싱 및 세션 저장소
- **접속 정보**:
  - Host: localhost
  - Port: 6379
  - Password: novahrredis

### 5. pgAdmin (포트: 5050)
- **용도**: 데이터베이스 관리 UI
- **접속 정보**:
  - URL: http://localhost:5050
  - Email: admin@nova-hr.com
  - Password: admin123

## 사용법

### 서비스 시작
```bash
# 루트 디렉터리에서
pnpm docker:up

# 또는 직접
docker compose -f infra/docker/docker-compose.yml up -d
```

### 서비스 중지
```bash
# 루트 디렉터리에서
pnpm docker:down

# 또는 직접
docker compose -f infra/docker/docker-compose.yml down
```

### 로그 확인
```bash
# 루트 디렉터리에서
pnpm docker:logs

# 또는 직접
docker compose -f infra/docker/docker-compose.yml logs -f
```

### 데이터 초기화
```bash
# 볼륨까지 삭제 (모든 데이터 삭제)
docker compose -f infra/docker/docker-compose.yml down -v
```

## 초기 설정

### MinIO 버킷 생성
1. http://localhost:9001 접속
2. minioadmin / minioadmin123로 로그인
3. 'nova-hr-dev' 버킷 생성
4. 버킷 정책을 'public'으로 설정 (개발용)

### pgAdmin 설정
1. http://localhost:5050 접속
2. admin@nova-hr.com / admin123으로 로그인
3. PostgreSQL 서버가 자동으로 등록됨

## 환경변수 설정

API 서버의 `.env` 파일에 다음 설정을 추가:

```env
# Database
DATABASE_URL="postgresql://nova_hr:password@localhost:5432/nova_hr?schema=public"

# MinIO (S3 Compatible)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin123"
S3_BUCKET="nova-hr-dev"
S3_ENDPOINT="http://localhost:9000"
S3_FORCE_PATH_STYLE=true

# Email (MailHog)
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""

# Redis
REDIS_URL="redis://:novahrredis@localhost:6379"
```

## 문제 해결

### 포트 충돌
만약 포트가 이미 사용 중이라면, docker-compose.yml에서 포트를 변경하세요.

### 권한 문제 (Windows)
Docker Desktop에서 파일 공유가 활성화되어 있는지 확인하세요.

### 컨테이너 재시작
```bash
docker compose -f infra/docker/docker-compose.yml restart
```