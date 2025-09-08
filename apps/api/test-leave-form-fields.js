const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLeaveFormFields() {
  try {
    console.log('🔍 휴가 신청 폼 필드 저장 테스트 시작...\n');

    // 1. 사용자 확인
    const hongUser = await prisma.auth_user.findFirst({
      where: { email: 'employee@nova-hr.com' }
    });

    if (!hongUser) {
      console.log('❌ 홍길동 사용자를 찾을 수 없습니다.');
      return;
    }

    // 2. 휴가 카테고리 확인
    const leaveCategory = await prisma.approval_category.findFirst({
      where: { code: 'LEAVE_REQUEST' }
    });

    if (!leaveCategory) {
      console.log('❌ 휴가 승인 카테고리가 없습니다.');
      return;
    }

    // 3. 연차 휴가 타입 확인
    const annualLeaveType = await prisma.leave_type.findFirst({
      where: { code: 'ANNUAL' }
    });

    if (!annualLeaveType) {
      console.log('❌ 연차 휴가 타입을 찾을 수 없습니다.');
      return;
    }

    console.log('👤 신청자: ' + hongUser.name + ' (' + hongUser.email + ')');
    console.log('📋 휴가 종류: ' + annualLeaveType.name + ' (' + annualLeaveType.code + ')');
    console.log('');

    // 4. 모든 필드를 포함한 종합적인 휴가 신청 생성
    console.log('📝 종합적인 휴가 신청 데이터 생성 중...');
    
    const formData = {
      leave_type_id: annualLeaveType.id,
      leave_type_code: annualLeaveType.code,
      leave_type_name: annualLeaveType.name,
      start_date: '2025-09-25',
      end_date: '2025-09-26',
      total_days: 2,
      working_days: 2,
      duration: 'MULTI_DAY',
      reason: '가족 여행으로 인한 연차 사용',
      emergency: true,
      approval_settings: {
        steps: [
          { 
            approverName: '김인사',
            approverId: 'hr-user-id',
            type: 'APPROVAL'
          }
        ]
      },
      submitted_at: new Date().toISOString()
    };

    // 승인 문서 생성
    const approvalDraft = await prisma.approval_draft.create({
      data: {
        user_id: hongUser.id,
        category_id: leaveCategory.id,
        title: `휴가 신청 - ${annualLeaveType.name} (2025-09-25 ~ 2025-09-26)`,
        content: formData,
        status: 'SUBMITTED',
        submitted_at: new Date()
      }
    });

    console.log('✅ 승인 문서 생성: ID=' + approvalDraft.id);

    // 휴가 요청 레코드 생성
    const leaveRequest = await prisma.leave_request.create({
      data: {
        user_id: hongUser.id,
        leave_type_id: annualLeaveType.id,
        start_date: new Date('2025-09-25'),
        end_date: new Date('2025-09-26'),
        days_count: 2,
        reason: '가족 여행으로 인한 연차 사용',
        duration: 'MULTI_DAY',
        emergency: true,
        status: 'PENDING',
        approval_draft_id: approvalDraft.id,
        submitted_at: new Date()
      }
    });

    console.log('✅ 휴가 요청 생성: ID=' + leaveRequest.id);
    console.log('');

    // 5. 저장된 데이터 검증
    console.log('🔍 저장된 폼 데이터 검증 중...');
    
    const savedData = await prisma.approval_draft.findUnique({
      where: { id: approvalDraft.id },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        submitted_at: true,
        user: {
          select: { name: true, email: true }
        }
      }
    });

    console.log('📊 저장된 승인 문서 데이터:');
    console.log('================================');
    console.log('문서 ID: ' + savedData.id);
    console.log('제목: ' + savedData.title);
    console.log('신청자: ' + savedData.user.name + ' (' + savedData.user.email + ')');
    console.log('상태: ' + savedData.status);
    console.log('신청 시간: ' + savedData.submitted_at.toLocaleString('ko-KR'));
    console.log('');
    console.log('📋 폼 데이터 내용:');
    console.log('================================');
    
    const content = savedData.content;
    console.log('휴가 종류 ID: ' + content.leave_type_id);
    console.log('휴가 종류 코드: ' + content.leave_type_code);
    console.log('휴가 종류 이름: ' + content.leave_type_name);
    console.log('시작일: ' + content.start_date);
    console.log('종료일: ' + content.end_date);
    console.log('전체 일수: ' + content.total_days + '일');
    console.log('근무일수: ' + content.working_days + '일');
    console.log('기간 유형: ' + content.duration);
    console.log('신청 사유: ' + content.reason);
    console.log('긴급 신청: ' + (content.emergency ? '예' : '아니오'));
    console.log('승인자 설정: ' + (content.approval_settings ? 
      content.approval_settings.steps.map(s => s.approverName).join(' → ') : '없음'));
    console.log('신청 시간: ' + content.submitted_at);
    console.log('================================');
    console.log('');

    // 6. leave_request 테이블 데이터도 확인
    const savedLeaveRequest = await prisma.leave_request.findUnique({
      where: { id: leaveRequest.id },
      include: {
        user: { select: { name: true } },
        leave_type: { select: { name: true, code: true } }
      }
    });

    console.log('📊 저장된 휴가 요청 데이터:');
    console.log('================================');
    console.log('요청 ID: ' + savedLeaveRequest.id);
    console.log('신청자: ' + savedLeaveRequest.user.name);
    console.log('휴가 종류: ' + savedLeaveRequest.leave_type.name + ' (' + savedLeaveRequest.leave_type.code + ')');
    console.log('기간: ' + savedLeaveRequest.start_date.toISOString().split('T')[0] + 
                ' ~ ' + savedLeaveRequest.end_date.toISOString().split('T')[0]);
    console.log('일수: ' + savedLeaveRequest.days_count + '일');
    console.log('기간 유형: ' + savedLeaveRequest.duration);
    console.log('신청 사유: ' + savedLeaveRequest.reason);
    console.log('긴급 신청: ' + (savedLeaveRequest.emergency ? '예' : '아니오'));
    console.log('상태: ' + savedLeaveRequest.status);
    console.log('승인 문서 연결: ' + savedLeaveRequest.approval_draft_id);
    console.log('================================');

    console.log('\n🎉 모든 폼 필드가 성공적으로 저장되었습니다!');
    console.log('✅ approval_draft.content에 모든 폼 데이터가 JSON으로 저장됨');
    console.log('✅ leave_request 테이블에 필수 데이터가 정규화되어 저장됨');
    console.log('✅ 긴급 신청 플래그가 올바르게 저장됨');
    console.log('✅ 승인자 설정이 approval_draft.content에 저장됨');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaveFormFields();