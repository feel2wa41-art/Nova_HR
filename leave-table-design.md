# 사용자별 휴가 할당 관리 테이블 설계

## Phase 1: 기본 구현 (우선 순위)

### 1. leave_type 테이블 개선
```prisma
model leave_type {
  id              String   @id @default(uuid())
  tenant_id       String   // 필수! 테넌트별 분리
  company_id      String?  // 회사별 휴가 정책
  name            String   // "연차", "병가", "경조사휴가"
  code            String   // "ANNUAL", "SICK", "FAMILY_EVENT"
  description     String?
  
  // 기본 정책
  default_days_year    Int?     // 기본 연간 할당 일수
  max_days_year        Int?     // 최대 연간 할당 일수
  
  // 간단한 정책 옵션
  carry_forward        Boolean  @default(false)  // 이월 가능
  requires_approval    Boolean  @default(true)
  allow_half_days      Boolean  @default(true)   // 반차 허용
  deduct_weekends      Boolean  @default(false)
  
  // UI 설정
  color_hex       String   @default("#3b82f6")
  is_paid         Boolean  @default(true)
  is_active       Boolean  @default(true)
  display_order   Int      @default(0)
  
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  // Relations
  tenant          tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  leave_requests  leave_request[]
  user_balances   user_leave_balance[]

  @@unique([code, tenant_id, company_id])  // 테넌트별 고유성 보장
  @@map("leave_types")
}
```

### 2. 핵심 사용자별 휴가 잔여량 테이블
```prisma
model user_leave_balance {
  id                String   @id @default(uuid())
  tenant_id         String   // 필수! 테넌트별 분리
  user_id           String
  leave_type_id     String   // leave_type과 연결 (기존 String에서 변경)  
  company_id        String   // 회사별 분리
  year              Int
  
  // 할당량 (관리자가 직접 설정)
  allocated         Decimal  @db.Decimal(5, 2) @default(0) // 총 할당일수
  
  // 사용량 (시스템이 자동 계산)
  used              Decimal  @db.Decimal(5, 2) @default(0) // 사용한 일수
  pending           Decimal  @db.Decimal(5, 2) @default(0) // 승인 대기 중
  available         Decimal  @db.Decimal(5, 2)             // 사용가능 = allocated - used - pending
  
  // 관리자 메모
  notes             String?
  updated_by        String?  // 마지막 수정한 관리자
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  // Relations
  tenant      tenant     @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  user        auth_user  @relation(fields: [user_id], references: [id], onDelete: Cascade)
  leave_type  leave_type @relation(fields: [leave_type_id], references: [id])

  @@unique([user_id, leave_type_id, year, tenant_id])  // 테넌트별 고유성
  @@index([tenant_id, company_id])  // 성능을 위한 인덱스
  @@map("user_leave_balances")
}
```

### 3. 간단한 변경 이력 테이블
```prisma
model leave_allocation_history {
  id                String   @id @default(uuid())
  tenant_id         String   // 필수! 테넌트별 분리
  user_id           String
  leave_type_id     String
  year              Int
  
  // 변경 내용
  action_type       String   // "MANUAL_ADJUST", "INITIAL_SETUP"
  old_allocated     Decimal? @db.Decimal(5, 2)
  new_allocated     Decimal  @db.Decimal(5, 2)
  
  // 변경 사유
  reason            String?
  created_by        String   // 변경한 관리자 ID
  created_at        DateTime @default(now())

  // Relations
  tenant     tenant    @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  
  @@index([tenant_id, user_id])  // 성능을 위한 인덱스
  @@map("leave_allocation_histories")
}
```

## Phase 2: 향후 확장 (나중에 구현)
- leave_balance_policy (직급/부서별 정책)
- 자동 연차 증가 로직
- 복잡한 이월 정책
- 시간 단위 휴가

## 구현 목표
1. **관리자 화면**: 사용자 목록 + 휴가 할당량 테이블 (인라인 수정)
2. **API**: CRUD 작업을 위한 엔드포인트
3. **반차 지원**: Decimal(5,2) 타입으로 0.5일 단위 관리
4. **실시간 계산**: available = allocated - used - pending

## 예상 화면
```
사용자 목록 및 휴가 할당 관리

[사용자]    [연차]    [병가]    [경조사] [특별휴가] [액션]
김철수      15.0/20   0/30     2/5     0/3       수정
박영희      18.5/20   5/30     0/5     1/3       수정
이민수      10.0/15   0/30     1/5     0/3       수정
```

이 구조로 1단계 구현을 시작하면 어떨까요?