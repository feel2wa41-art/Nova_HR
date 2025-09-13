# 🚀 Reko HR 로컬 개발 환경 구동 가이드

## 📅 최종 검증: 2025-09-13
**✅ 한 번에 성공적으로 실행 완료**

## 🎯 빠른 시작 (Quick Start)

### 1️⃣ Docker 서비스 확인
```bash
# Docker 컨테이너 상태 확인
docker ps

# 필요시 Docker 서비스 시작
pnpm docker:up
```

### 2️⃣ API 서버 실행
```bash
cd apps/api
pnpm install  # 최초 1회만
pnpm run dev
```

### 3️⃣ 웹 포털 실행
```bash
cd apps/web-customer-portal
pnpm install  # 최초 1회만
pnpm run dev
```

## ✅ 정상 작동 확인 체크리스트

### 서비스 URL
- **API 서버**: http://localhost:3000
- **웹 포털**: http://localhost:3001
- **pgAdmin**: http://localhost:5050
- **MinIO Console**: http://localhost:9001
- **MailHog**: http://localhost:8025

### 테스트 계정 (비밀번호: 모두 admin123)
- **관리자**: admin@reko-hr.com
- **HR매니저**: hr@reko-hr.com
- **직원**: employee@reko-hr.com

## 🔧 자주 발생하는 문제 해결

### TypeScript 오류 발생 시
최근 수정된 오류 (2025-09-13):
- `leave-sequential.service.ts`: `created_at` 필드 제거
- `leave.service.ts`: `created_at` 필드 제거

### API 서버 시작 명령어
```bash
# 올바른 명령어
pnpm run dev

# 잘못된 명령어 (존재하지 않음)
pnpm run start:dev  # ❌
```

## 📝 API 테스트 명령어

### 로그인 테스트
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@reko-hr.com\",\"password\":\"admin123\"}"
```

### 휴가 잔여일 조회 (토큰 필요)
```bash
curl -H "Authorization: Bearer [YOUR_TOKEN]" \
  http://localhost:3000/api/v1/user-leave-balance/summary
```

### 출퇴근 정보 조회 (토큰 필요)
```bash
curl -H "Authorization: Bearer [YOUR_TOKEN]" \
  http://localhost:3000/api/v1/attendance/today
```

### 회사 위치 정보 조회 (토큰 필요)
```bash
curl -H "Authorization: Bearer [YOUR_TOKEN]" \
  http://localhost:3000/api/v1/company/locations
```

## 🐳 Docker 환경 관리

### 필수 컨테이너
- `nova-hr-postgres`: PostgreSQL 데이터베이스
- `nova-hr-redis`: 캐시 서버
- `nova-hr-minio`: 파일 스토리지
- `nova-hr-mailhog`: 이메일 테스트 서버
- `nova-hr-pgadmin`: DB 관리 도구 (선택)

### Docker 명령어
```bash
# 서비스 시작
pnpm docker:up

# 서비스 중지
pnpm docker:down

# 로그 확인
pnpm docker:logs

# 컨테이너 상태 확인
docker ps
```

## 📊 데이터베이스 정보

### 기본 설정
- Host: localhost
- Port: 5432
- Database: reko_hr_dev
- Username: postgres
- Password: postgres123

### 시드 데이터
- 사용자 3명 (관리자, HR매니저, 직원)
- 휴가 타입 5개 (연차, 병가, 출산휴가, 육아휴직, 개인사유)
- 휴가 잔여일 할당 완료

## ⚠️ 주의사항

1. **Docker 서비스 유지**: 개발 중 Docker 컨테이너를 중지하지 마세요
2. **환경변수 확인**: `apps/web-customer-portal/.env`에서 `VITE_API_URL=http://localhost:3000/api/v1` 확인
3. **포트 충돌**: 3000, 3001, 5432 포트가 사용 중인지 확인
4. **의존성 설치**: 최초 실행 시 각 앱 디렉토리에서 `pnpm install` 필수

## 🎉 성공 지표

모든 것이 정상적으로 작동하면:
1. API 서버 콘솔에 "Application is running on: http://localhost:3000" 표시
2. 웹 포털 콘솔에 "VITE ready" 표시
3. 웹 브라우저에서 http://localhost:3001 접속 가능
4. 로그인 후 대시보드 정상 표시

## 📚 참고 문서

- [CLAUDE.md](./CLAUDE.md) - 프로젝트 전체 구조 및 개발 가이드
- [DEVELOPMENT_SECURITY_GUIDE.md](./DEVELOPMENT_SECURITY_GUIDE.md) - 보안 개발 가이드
- [SUCCESS_LOG_2025_09_13.md](./SUCCESS_LOG_2025_09_13.md) - 최근 성공 이력

---

**Last Updated**: 2025-09-13
**Status**: ✅ 완벽하게 작동 확인됨