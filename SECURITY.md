# Nova HR - Security Implementation Guide

## 🔒 보안 개요

Nova HR 시스템에 구현된 포괄적인 보안 조치들에 대한 가이드입니다.

## 🛡️ 구현된 보안 기능

### 1. **환경변수 및 시크릿 관리**

#### 프로덕션 환경변수 요구사항
- **JWT 시크릿**: 최소 256-bit 암호화 강도
- **데이터 암호화 키**: AES-256-GCM 사용
- **CORS 설정**: 프로덕션에서 특정 도메인만 허용
- **SSL/TLS**: 프로덕션 환경에서 필수

#### 환경변수 검증
```typescript
// 자동 검증 및 오류 발생
const securityConfig = createSecurityConfig(configService);
validateSecurityConfig(securityConfig);
```

### 2. **API 보안**

#### 보안 헤더 적용
- **Content Security Policy (CSP)**
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff  
- **Strict-Transport-Security**: HSTS 적용
- **Referrer-Policy**: strict-origin-when-cross-origin

#### CORS 보안
```typescript
// 개발/프로덕션 환경별 CORS 설정
cors: {
  origin: securityConfig.cors.origin, // 환경별 도메인 제한
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}
```

#### Rate Limiting
- **글로벌 제한**: 분당 60회 요청 (설정 가능)
- **사용자별 제한**: 시간당 1000회 요청
- **IP별 추적** 및 차단

### 3. **인증 및 인가**

#### Enhanced JWT Guard
```typescript
@UseGuards(EnhancedJwtAuthGuard, RolesGuard)
@RequireAuth(['ADMIN'], ['manage_users'])
async getUserList() { ... }
```

**주요 기능:**
- **토큰 블랙리스트**: 로그아웃된 토큰 무효화
- **세션 검증**: IP 주소, User Agent 검증 (선택적)
- **동시 세션 제한**: 사용자당 최대 5개 세션
- **토큰 만료 시간**: 24시간 자동 만료

#### 역할 기반 접근 제어 (RBAC)
```typescript
// 사전 정의된 역할 데코레이터
@RequireAdmin()        // ADMIN, SUPER_ADMIN
@RequireManager()      // + HR_MANAGER, DEPARTMENT_MANAGER  
@RequireHR()          // + HR_MANAGER
@RequireEmployee()    // 모든 역할

// 권한 기반 접근
@CanManageUsers()     // manage_users 권한 필요
@CanViewReports()     // view_reports 권한 필요
```

#### 리소스 기반 접근 제어
```typescript
@Resource('own_profile')      // 자신의 프로필만 접근
@Resource('company_data')     // 자신의 회사 데이터만 접근  
@Resource('subordinate_data') // 부하직원 데이터만 접근
```

### 4. **비밀번호 보안**

#### 강화된 해시
- **bcrypt**: 12 rounds saltRounds
- **Pepper**: 추가 보안을 위한 HMAC-SHA256
- **비밀번호 강도 검증**: 8자 이상, 대소문자, 숫자, 특수문자

```typescript
// 비밀번호 강도 검증
const validation = passwordService.validatePasswordStrength(password);
if (!validation.isValid) {
  throw new BadRequestException(validation.errors);
}
```

#### 보안 기능
- **일반적 비밀번호 차단**: 흔한 비밀번호 패턴 거부
- **연속 문자 검증**: 123, abc 등 패턴 검증  
- **반복 문자 제한**: 동일 문자 3회 이상 반복 방지
- **비밀번호 히스토리**: 최근 5개 비밀번호 재사용 방지 (구현 예정)

### 5. **데이터베이스 보안**

#### 자동 암호화
```typescript
// 민감한 필드 자동 암호화
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'ssn', 'salary', 'bank_account'
];
```

#### 감사 로깅
```typescript
// 데이터베이스 작업 자동 로깅
logQuery(query, params, userId, result);
```

**로깅 레벨:**
- **all**: 모든 쿼리 로깅
- **write**: INSERT, UPDATE, DELETE만 로깅  
- **sensitive**: 민감한 데이터 관련 쿼리만 로깅

#### 보안 삭제
```typescript
// 민감 데이터 덮어쓰기 후 삭제
await prismaSecurityService.secureDelete('users', { id: userId });
```

### 6. **프론트엔드 보안**

#### XSS 방지
```typescript
// HTML 입력 정화
const sanitized = SecurityUtils.XSSProtection.sanitizeHtml(userInput);

// 허용된 태그만 통과
const ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'br', 'p'];
```

#### CSRF 방지  
```typescript
// CSRF 토큰 자동 생성 및 검증
const token = SecurityUtils.CSRFProtection.generateToken();
```

#### 보안 스토리지
```typescript
// 클라이언트 측 암호화 스토리지
await SecurityUtils.SecureStorage.setSecureItem(key, sensitiveData);
```

#### 세션 보안
- **비활성 타임아웃**: 30분 후 자동 로그아웃
- **경고 시스템**: 25분 후 경고 표시
- **다중 탭 감지**: 동일 사용자의 여러 탭 모니터링

#### 입력 검증
```typescript
// 이메일, 전화번호, 비밀번호 패턴 검증
SecurityUtils.InputValidator.validateEmail(email);
SecurityUtils.InputValidator.validatePhone(phone);
SecurityUtils.InputValidator.validatePassword(password);
```

## 🚀 사용법

### 1. API 엔드포인트 보안 적용

```typescript
@Controller('users')
@UseGuards(EnhancedJwtAuthGuard, RolesGuard)
export class UsersController {
  
  @Get()
  @RequireAuth(['HR_MANAGER'], ['view_users'])
  async getUsers() { ... }
  
  @Post()
  @RequireAuth(['ADMIN'], ['create_users'])
  @Resource('company_data')
  async createUser() { ... }
}
```

### 2. 프론트엔드에서 보안 훅 사용

```typescript
import { useSecurity } from '@/hooks/useSecurity';

const MyComponent = () => {
  const { 
    secureFormSubmit, 
    secureFileUpload, 
    checkPasswordStrength 
  } = useSecurity();

  const handleSubmit = async (formData) => {
    await secureFormSubmit(formData, (data) => 
      apiClient.post('/api/users', data)
    );
  };
};
```

### 3. 환경 설정

#### 개발 환경
```bash
# .env
JWT_SECRET="dev-secret-key-minimum-32-chars"
CORS_ORIGIN="http://localhost:3001,http://localhost:3002"
DB_ENCRYPTION_ENABLED=false
```

#### 프로덕션 환경
```bash
# .env.production
JWT_SECRET="생성된-강력한-256비트-키"
CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com"
DB_ENCRYPTION_ENABLED=true
SSL_ENABLED=true
```

## ⚠️ 보안 주의사항

### 1. **절대 하지 말아야 할 것**
- ❌ JWT 시크릿을 코드에 하드코딩
- ❌ 프로덕션에서 CORS_ORIGIN='*' 사용
- ❌ 민감한 정보를 콘솔에 로깅
- ❌ 사용자 입력을 검증 없이 데이터베이스에 저장

### 2. **반드시 해야 할 것**
- ✅ 프로덕션 환경에서 HTTPS 사용
- ✅ 정기적인 보안 키 순환
- ✅ 감사 로그 모니터링
- ✅ 의존성 취약점 정기 점검

### 3. **모니터링**
```bash
# 보안 로그 확인
grep "AUDIT" logs/application.log
grep "SECURITY" logs/application.log  
grep "FAILED_LOGIN" logs/application.log
```

## 🔄 업데이트 및 유지보수

### 의존성 보안 점검
```bash
npm audit
pnpm audit
```

### 보안 설정 점검
```typescript
// 시스템 시작 시 자동 실행
const securityCheck = await prismaSecurityService.performSecurityChecks();
if (!securityCheck.passed) {
  console.error('Security issues found:', securityCheck.issues);
}
```

## 📞 보안 문제 신고

보안 취약점을 발견하신 경우:
1. **즉시 보고**: security@nova-hr.com
2. **상세 내용 포함**: 재현 방법, 영향도, 권장 해결책
3. **기밀 유지**: 공개 채널에 보안 이슈 게시 금지

---

**⚡ 보안은 지속적인 과정입니다. 정기적으로 이 문서를 업데이트하고 보안 조치를 검토해주세요.**