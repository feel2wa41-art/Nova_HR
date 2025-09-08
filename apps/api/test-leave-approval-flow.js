const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLeaveApprovalFlow() {
  try {
    console.log('🔍 휴가 승인 플로우 테스트 시작...\n');

    // 1. 사용자 확인
    const hongUser = await prisma.auth_user.findFirst({
      where: { email: 'employee@nova-hr.com' }
    });

    const kimHRUser = await prisma.auth_user.findFirst({
      where: { email: 'hr@nova-hr.com' }
    });

    console.log('👤 신청자: ' + hongUser.name + ' (' + hongUser.email + ')');
    console.log('👤 승인자: ' + kimHRUser.name + ' (' + kimHRUser.email + ')');
    console.log('');

    // 2. 휴가 카테고리 확인
    const leaveCategory = await prisma.approval_category.findFirst({
      where: { code: 'LEAVE_REQUEST' }
    });

    if (!leaveCategory) {
      console.log('❌ 휴가 승인 카테고리가 없습니다.');
      return;
    }

    // 3. 휴가 타입 확인
    const annualLeaveType = await prisma.leave_type.findFirst({
      where: { code: 'ANNUAL' }
    });

    // 4. 새로운 휴가 신청 생성 (홍길동 → 김인사)
    console.log('📝 새로운 휴가 신청 생성 중...');
    
    // 승인 문서 생성
    const approvalDraft = await prisma.approval_draft.create({
      data: {
        user_id: hongUser.id,
        category_id: leaveCategory.id,
        title: '연차 휴가 신청 - 홍길동 (2025-09-20)',
        description: '연차 휴가 신청',
        content: {
          leave_type: 'ANNUAL',
          start_date: '2025-09-20',
          end_date: '2025-09-20',
          duration: 'FULL_DAY',
          reason: '개인 사유로 인한 연차 사용',
          emergency_contact: '010-1234-5678',
          approver: kimHRUser.name,
          approver_id: kimHRUser.id
        },
        status: 'PENDING',
        submitted_at: new Date()
      }
    });

    console.log('✅ 승인 문서 생성: ID=' + approvalDraft.id);

    // 휴가 요청 레코드 생성
    const leaveRequest = await prisma.leave_request.create({
      data: {
        user_id: hongUser.id,
        leave_type_id: annualLeaveType.id,
        start_date: new Date('2025-09-20'),
        end_date: new Date('2025-09-20'),
        days_count: 1,
        reason: '개인 사유로 인한 연차 사용',
        duration: 'FULL_DAY',
        emergency_contact: '010-1234-5678',
        status: 'PENDING',
        approval_draft_id: approvalDraft.id,
        submitted_at: new Date()
      }
    });

    console.log('✅ 휴가 요청 생성: ID=' + leaveRequest.id);
    console.log('');

    // 5. 승인 라우트 생성 (김인사가 승인자)
    const approvalRoute = await prisma.approval_route.create({
      data: {
        draft_id: approvalDraft.id
      }
    });

    // 승인 단계 생성
    const approvalStage = await prisma.approval_route_stage.create({
      data: {
        route_id: approvalRoute.id,
        type: 'APPROVAL',
        mode: 'SEQUENTIAL',
        order_index: 1,
        name: '휴가 승인',
        status: 'PENDING'
      }
    });

    // 승인자 할당
    const approvalRouteApprover = await prisma.approval_route_approver.create({
      data: {
        stage_id: approvalStage.id,
        user_id: kimHRUser.id,
        order_index: 1,
        status: 'PENDING'
      }
    });

    console.log('📋 승인 라우트 설정 완료');
    console.log('   - 승인자: ' + kimHRUser.name);
    console.log('   - 상태: PENDING (대기중)');
    console.log('');

    // 6. 김인사가 승인 처리
    console.log('✅ 김인사가 휴가를 승인합니다...');
    
    // 승인 액션 기록
    const approvalAction = await prisma.approval_action.create({
      data: {
        draft_id: approvalDraft.id,
        user_id: kimHRUser.id,
        action: 'APPROVE',
        comments: '승인합니다. 좋은 휴가 되세요!',
        created_at: new Date()
      }
    });

    // 승인 문서 상태 업데이트
    await prisma.approval_draft.update({
      where: { id: approvalDraft.id },
      data: {
        status: 'APPROVED',
        completed_at: new Date()
      }
    });

    // 휴가 요청 상태 업데이트
    await prisma.leave_request.update({
      where: { id: leaveRequest.id },
      data: {
        status: 'APPROVED',
        decided_by: kimHRUser.id,
        decided_at: new Date(),
        comments: '승인합니다. 좋은 휴가 되세요!'
      }
    });

    // 승인자 상태 업데이트
    await prisma.approval_route_approver.update({
      where: { id: approvalRouteApprover.id },
      data: {
        status: 'APPROVED',
        acted_at: new Date(),
        comments: '승인합니다. 좋은 휴가 되세요!'
      }
    });

    // 단계 상태 업데이트
    await prisma.approval_route_stage.update({
      where: { id: approvalStage.id },
      data: {
        status: 'COMPLETED'
      }
    });

    console.log('✅ 승인 완료!');
    console.log('');

    // 7. 최종 상태 확인
    const finalLeaveRequest = await prisma.leave_request.findUnique({
      where: { id: leaveRequest.id },
      include: {
        user: {
          select: { name: true, email: true }
        },
        leave_type: {
          select: { name: true }
        },
        approval_draft: {
          select: { status: true, completed_at: true }
        }
      }
    });

    console.log('📊 최종 휴가 신청 상태:');
    console.log('================================');
    console.log('신청자: ' + finalLeaveRequest.user.name);
    console.log('휴가 종류: ' + finalLeaveRequest.leave_type.name);
    console.log('기간: 2025-09-20 (1일)');
    console.log('상태: ' + finalLeaveRequest.status + ' ✅');
    console.log('승인자: ' + kimHRUser.name);
    console.log('승인 일시: ' + finalLeaveRequest.decided_at.toLocaleString('ko-KR'));
    console.log('승인 코멘트: ' + finalLeaveRequest.comments);
    console.log('전자결재 상태: ' + finalLeaveRequest.approval_draft.status);
    console.log('결재 완료 시간: ' + finalLeaveRequest.approval_draft.completed_at.toLocaleString('ko-KR'));
    console.log('================================');
    console.log('');

    // 8. 휴가 잔여 업데이트 (연차 차감)
    const currentYear = new Date().getFullYear();
    const leaveBalance = await prisma.leave_balance.findFirst({
      where: {
        user_id: hongUser.id,
        leave_type: 'ANNUAL',
        year: currentYear
      }
    });

    if (leaveBalance) {
      const newUsed = Number(leaveBalance.used) + 1;
      await prisma.leave_balance.update({
        where: { id: leaveBalance.id },
        data: {
          used: newUsed,
          pending: Math.max(0, Number(leaveBalance.pending) - 1)
        }
      });

      console.log('📊 연차 잔여 업데이트:');
      console.log('   - 할당: ' + leaveBalance.allocated + '일');
      console.log('   - 사용: ' + newUsed + '일 (+1)');
      console.log('   - 잔여: ' + (Number(leaveBalance.allocated) - newUsed) + '일');
    }

    console.log('\n🎉 휴가 승인 플로우 테스트 완료!');
    console.log('홍길동님의 휴가가 김인사님에 의해 성공적으로 승인되었습니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaveApprovalFlow();