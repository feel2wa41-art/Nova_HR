# Nova HR 배포 가이드

## 🚀 AWS 배포 완료 상태

### ✅ 현재 배포된 인프라
- **PostgreSQL RDS**: `nova-hr-test.cfu9ttczrjex.ap-southeast-3.rds.amazonaws.com:5432`
- **Redis ElastiCache**: `nova-hr-test.srlpps.0001.apse3.cache.amazonaws.com:6379`
- **EC2 인스턴스**: `16.78.76.150` (Ubuntu 22.04, Docker 설치 완료)

### ✅ 완료된 개발 작업
- **API 모듈 완성**: 모든 누락된 controller/service 파일 생성 완료
- **TypeScript 빌드**: 로컬에서 성공적으로 빌드 완료
- **데이터베이스**: Prisma 스키마 및 시드 데이터 준비 완료

## 📋 배포 단계별 가이드

### 1단계: 환경 준비 (완료)
```bash
# EC2 인스턴스에 Docker, Node.js, pnpm 설치 완료
ssh -i nova-hr-key.pem ubuntu@16.78.76.150
```

### 2단계: 소스 코드 배포 (진행 중)
```bash
# 프로젝트 파일을 EC2에 업로드
cd C:\Tank_Dev\Nova_HR
scp -r -i nova-hr-key.pem apps ubuntu@16.78.76.150:~/nova-hr/
scp -r -i nova-hr-key.pem packages ubuntu@16.78.76.150:~/nova-hr/
scp -i nova-hr-key.pem package.json pnpm-workspace.yaml ubuntu@16.78.76.150:~/nova-hr/
```

### 3단계: API 서버 배포
```bash
# EC2에서 실행
ssh -i nova-hr-key.pem ubuntu@16.78.76.150

cd ~/nova-hr/apps/api
npm install
npx prisma generate
npm run build
nohup npm run start:prod > api.log 2>&1 &
```

### 4단계: 웹 포털 배포
```bash
# 웹 포털 빌드 및 배포
cd ~/nova-hr/apps/web-customer-portal
npm install
VITE_API_URL=http://16.78.76.150:3000/api/v1 npm run build
sudo apt install -y nginx
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

### 5단계: Docker Compose 배포 (권장)
```bash
# Docker Compose로 전체 시스템 배포
cd ~/nova-hr
docker-compose up -d --build
```

## 🌐 접속 URL

### API 서버
- **Base URL**: `http://16.78.76.150:3000`
- **Swagger UI**: `http://16.78.76.150:3000/api/docs`
- **Health Check**: `http://16.78.76.150:3000/health`

### 웹 포털
- **Customer Portal**: `http://16.78.76.150:3001`
- **Admin Portal**: `http://16.78.76.150:3002`

## 🔧 환경 설정

### API 환경 변수 (.env)
```env
DATABASE_URL="postgresql://nova_user:BwHk8Nq5R7mP@nova-hr-test.cfu9ttczrjex.ap-southeast-3.rds.amazonaws.com:5432/nova_hr_db"
REDIS_URL="redis://nova-hr-test.srlpps.0001.apse3.cache.amazonaws.com:6379"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NODE_ENV="production"
PORT=3000
APP_URL="http://16.78.76.150:3000"
```

### 데이터베이스 정보
- **Host**: nova-hr-test.cfu9ttczrjex.ap-southeast-3.rds.amazonaws.com
- **Port**: 5432
- **Database**: nova_hr_db
- **Username**: nova_user
- **Password**: BwHk8Nq5R7mP

### Redis 정보
- **Host**: nova-hr-test.srlpps.0001.apse3.cache.amazonaws.com
- **Port**: 6379

## 👤 테스트 계정

### 관리자 계정
- **Email**: admin@nova-hr.com
- **Password**: admin123
- **Role**: SUPER_ADMIN

### HR 매니저 계정
- **Email**: hr@nova-hr.com
- **Password**: admin123
- **Role**: HR_MANAGER

### 일반 직원 계정
- **Email**: employee@nova-hr.com
- **Password**: admin123
- **Role**: EMPLOYEE

## 🔍 서비스 상태 확인

### API 서버 상태
```bash
curl http://16.78.76.150:3000/health
curl http://16.78.76.150:3000/api/v1/auth/status
```

### 데이터베이스 연결 확인
```bash
# EC2에서 실행
psql -h nova-hr-test.cfu9ttczrjex.ap-southeast-3.rds.amazonaws.com -U nova_user -d nova_hr_db -c "SELECT COUNT(*) FROM auth_users;"
```

### Redis 연결 확인
```bash
redis-cli -h nova-hr-test.srlpps.0001.apse3.cache.amazonaws.com ping
```

## 🚨 트러블슈팅

### API 서버가 시작되지 않는 경우
1. 로그 확인: `tail -f ~/nova-hr/apps/api/api.log`
2. Prisma 클라이언트 재생성: `npx prisma generate`
3. 데이터베이스 연결 확인: 환경 변수 검증
4. 포트 충돌 확인: `netstat -tulpn | grep :3000`

### 웹 포털 접속이 안 되는 경우
1. Nginx 상태 확인: `sudo systemctl status nginx`
2. 빌드 파일 확인: `ls -la /var/www/html/`
3. 방화벽 확인: `sudo ufw status`

### 데이터베이스 연결 오류
1. 보안 그룹 확인: EC2에서 RDS 5432 포트 접근 허용
2. 네트워크 ACL 확인
3. RDS 인스턴스 상태 확인

## 📊 모니터링

### 로그 위치
- **API 로그**: `~/nova-hr/apps/api/api.log`
- **Nginx 로그**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **시스템 로그**: `/var/log/syslog`

### 성능 모니터링
```bash
# CPU, 메모리 사용량
top
htop

# 디스크 사용량
df -h

# 네트워크 트래픽
netstat -i
```

## 🔄 업데이트 배포

### API 코드 업데이트
```bash
cd ~/nova-hr/apps/api
git pull origin main  # 또는 수동으로 파일 업로드
npm run build
pm2 restart api  # 또는 Docker 컨테이너 재시작
```

### 웹 포털 업데이트
```bash
cd ~/nova-hr/apps/web-customer-portal
git pull origin main
npm run build
sudo cp -r dist/* /var/www/html/
```

## 🔒 보안 설정

### SSL 인증서 설정 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 방화벽 설정
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 3000    # API
sudo ufw enable
```

### JWT 시크릿 변경
1. 새로운 강력한 시크릿 생성
2. 환경 변수 업데이트
3. API 서버 재시작

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `POST /api/v1/auth/logout` - 로그아웃

### 사용자 관리
- `GET /api/v1/users` - 사용자 목록
- `GET /api/v1/users/me` - 내 프로필
- `PATCH /api/v1/users/me` - 프로필 수정

### 출퇴근 관리
- `POST /api/v1/attendance/check-in` - 출근
- `POST /api/v1/attendance/check-out` - 퇴근
- `GET /api/v1/attendance/records` - 출퇴근 기록

### 전자결재
- `GET /api/v1/approval/drafts` - 결재 문서 목록
- `POST /api/v1/approval/drafts` - 결재 문서 생성
- `POST /api/v1/approval/drafts/:id/submit` - 결재 요청

## 🎯 다음 단계

1. **SSL 인증서 설정**: 보안 연결을 위한 HTTPS 적용
2. **도메인 설정**: 실제 도메인으로 서비스 운영
3. **백업 전략**: 데이터베이스 정기 백업 설정
4. **모니터링 도구**: CloudWatch, Grafana 등 모니터링 시스템 구축
5. **CI/CD 파이프라인**: GitHub Actions를 통한 자동 배포
6. **로드 밸런서**: 고가용성을 위한 ALB 설정
7. **스케일링**: Auto Scaling Group 설정

## 🏗️ 아키텍처 다이어그램

```
[사용자] -> [ALB] -> [EC2 인스턴스들]
                         |
                         v
            [RDS PostgreSQL] + [ElastiCache Redis]
```

## 📞 지원

문제가 발생하거나 추가 지원이 필요한 경우:
1. 로그 파일 확인 후 문제점 파악
2. 환경 설정 검토
3. 인프라 상태 점검
4. 필요시 전문가 지원 요청

---

**배포 완료 상태**: AWS 인프라 구축 완료, API 모듈 개발 완료, 배포 준비 완료 ✅