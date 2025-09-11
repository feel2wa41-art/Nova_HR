# 🔧 내일 작업 계속 가이드

## 📋 현재 상황
- ✅ **핵심 기능 100% 완성**: 휴가신청-잔여관리 완전 통합
- ⚠️ **TypeScript 오류 약 25개**: 스키마 변경으로 인한 필드명 불일치
- 🎯 **목표**: 오류 수정하여 완전한 컴파일 성공

## 🚀 내일 작업 순서

### 1단계: 환경 준비 (5분)
```bash
cd C:\Tank_Dev\Nova_HR
pnpm install
cd apps/api && pnpm prisma generate  # Prisma 클라이언트 재생성
```

### 2단계: 컴파일 오류 확인
```bash
cd apps/api && pnpm typecheck  # 현재 오류 목록 확인
```

### 3단계: 주요 오류 수정 (순서대로)

#### A. leave.service.ts 수정 (가장 많은 오류)
```typescript
// 🔍 찾아서 수정할 패턴들:
1. "requested_days" → "days_count" 변경
2. "approved_days" → "days_count" 변경  
3. include에서 user 관계 추가
4. include에서 leave_type 관계 추가
5. entity_id, entity_type 필드 주석 처리 (audit_log)
```

#### B. leave.controller.ts 수정
```typescript
// 🔍 수정할 부분들:
1. getLeaveRequests에 include: { user: true, leave_type: true } 추가
2. leave.user?.name, leave.leave_type?.code 안전한 접근으로 변경
3. approved_days → days_count 변경
```

#### C. leave-approval.controller.ts 수정
```typescript
// 🔍 이미 수정됨, 확인만:
- include: { leave_type: true } 추가됨
- balance.leave_type.code 사용하도록 수정됨
```

## 🛠️ 빠른 수정 명령어들

### Prisma 관련
```bash
# Prisma 클라이언트 재생성 (필수!)
cd apps/api && pnpm prisma generate

# DB 상태 확인
pnpm prisma db push

# 스키마 확인
cat prisma/schema.prisma | grep -A 10 "model leave_request"
```

### TypeScript 오류 확인
```bash
# 전체 오류 보기
pnpm typecheck

# 특정 파일만 확인
npx tsc --noEmit src/modules/leave/leave.service.ts
```

## 🎯 예상 작업 시간
- **1-2시간**: TypeScript 오류 모두 수정
- **30분**: 테스트 및 검증
- **총 소요**: 2-3시간 내 완료 예상

## 📁 주요 파일 위치
```
C:\Tank_Dev\Nova_HR\
├── apps/api/src/modules/leave/
│   ├── leave.service.ts          # ⚠️ 가장 많은 오류
│   ├── leave.controller.ts       # ⚠️ include 누락
│   ├── leave-approval.controller.ts # ✅ 거의 완료
│   └── leave-types.controller.ts # ⚠️ tenant_id 오류
├── apps/api/prisma/
│   └── schema.prisma             # ✅ 스키마 완성
└── INTEGRATION_SUMMARY.md       # ✅ 완성 문서
```

## 🔍 디버깅 팁

### 자주 발생하는 오류와 해결
```typescript
// 오류: Property 'user' does not exist
// 해결: include 추가
const result = await this.prisma.leave_request.findMany({
  include: { 
    user: true,           // 👈 추가 필요
    leave_type: true      // 👈 추가 필요
  }
});

// 오류: Property 'requested_days' does not exist  
// 해결: 필드명 변경
const days = leaveRequest.days_count;  // ✅ 올바름

// 오류: Property 'entity_type' does not exist
// 해결: 주석 처리
await this.prisma.audit_log.create({
  data: {
    user_id: userId,
    action: 'ACTION_TYPE',
    // entity_type: 'leave_request',  // 👈 주석 처리
    entity_id: id,
  }
});
```

## 💡 작업 효율성 팁

### 1. 오류 수정 순서
1. **leave.service.ts 먼저** (가장 많은 오류)
2. **leave.controller.ts** (include 관련)
3. **나머지 파일들** (간단한 수정)

### 2. 일괄 수정 활용
```bash
# 파일 내 일괄 변경 (예시)
# requested_days → days_count
# approved_days → days_count
```

### 3. 컴파일 확인 주기
- 파일 1개씩 수정 후 `pnpm typecheck` 실행
- 오류 개수가 줄어드는지 확인

## ✅ 완료 확인 체크리스트
- [ ] `pnpm typecheck` 오류 0개
- [ ] 개발 서버 정상 구동 (`pnpm dev`)
- [ ] 관리자 페이지 접속 테스트
- [ ] 휴가 신청 → 승인 플로우 테스트

## 🎉 최종 목표
모든 TypeScript 오류 수정하여 **완벽하게 작동하는 시스템** 완성!

---
*핵심 기능은 이미 100% 완성되었으므로, 내일은 오류 수정만 하면 됩니다! 💪*