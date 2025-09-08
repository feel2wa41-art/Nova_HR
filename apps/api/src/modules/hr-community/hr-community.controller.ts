import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HrCommunityService } from './hr-community.service';
import { NotificationService } from '../../shared/services/notification.service';
import {
  CreateCommunityPostDto,
  UpdateCommunityPostDto,
  GetCommunityPostsQueryDto,
  CreateCommentDto,
  UpdateCommentDto,
  UpdateNotificationPreferencesDto,
  WebPushSubscriptionDto,
} from './dto/hr-community.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('hr-community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-community')
export class HrCommunityController {
  constructor(
    private readonly hrCommunityService: HrCommunityService,
    private readonly notificationService: NotificationService
  ) {}

  // ================================
  // POSTS
  // ================================

  @Post('posts')
  @ApiOperation({ summary: '커뮤니티 게시글 작성' })
  @ApiResponse({ status: 201, description: '게시글 작성 성공' })
  async createPost(@Request() req: any, @Body() dto: CreateCommunityPostDto) {
    const companyId = req.user.tenantId;
    const authorId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.createPost(companyId, authorId, dto, tenantId);
  }

  @Get('posts')
  @ApiOperation({ summary: '커뮤니티 게시글 목록 조회' })
  @ApiResponse({ status: 200, description: '게시글 목록 조회 성공' })
  async getPosts(@Request() req: any, @Query() query: GetCommunityPostsQueryDto) {
    const companyId = req.user.tenantId;
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.findAllPosts(companyId, userId, query, tenantId);
  }

  @Get('posts/popular')
  @ApiOperation({ summary: '인기 게시글 조회' })
  @ApiResponse({ status: 200, description: '인기 게시글 조회 성공' })
  async getPopularPosts(@Request() req: any, @Query('limit') limit?: number) {
    const companyId = req.user.tenantId;
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.getPopularPosts(companyId, userId, limit, tenantId);
  }

  @Get('posts/my')
  @ApiOperation({ summary: '내 게시글 목록 조회' })
  @ApiResponse({ status: 200, description: '내 게시글 목록 조회 성공' })
  async getMyPosts(@Request() req: any) {
    const companyId = req.user.tenantId;
    const authorId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.getMyPosts(companyId, authorId, tenantId);
  }

  @Get('posts/tags')
  @ApiOperation({ summary: '사용 가능한 태그 목록 조회' })
  @ApiResponse({ status: 200, description: '태그 목록 조회 성공' })
  async getTags(@Request() req: any) {
    const companyId = req.user.tenantId;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.getAvailableTags(companyId, tenantId);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: '게시글 상세 조회' })
  @ApiResponse({ status: 200, description: '게시글 상세 조회 성공' })
  async getPost(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.findPostById(id, userId, tenantId);
  }

  @Put('posts/:id')
  @ApiOperation({ summary: '게시글 수정' })
  @ApiResponse({ status: 200, description: '게시글 수정 성공' })
  async updatePost(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCommunityPostDto,
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.updatePost(id, userId, dto, tenantId);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: '게시글 삭제' })
  @ApiResponse({ status: 200, description: '게시글 삭제 성공' })
  async deletePost(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.deletePost(id, userId, tenantId);
  }

  @Post('posts/:id/like')
  @ApiOperation({ summary: '게시글 좋아요/취소' })
  @ApiResponse({ status: 200, description: '좋아요 처리 성공' })
  async toggleLike(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.toggleLike(id, userId, tenantId);
  }

  @Post('posts/:id/view')
  @ApiOperation({ summary: '게시글 조회수 기록' })
  @ApiResponse({ status: 200, description: '조회수 기록 성공' })
  async recordView(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.hrCommunityService.recordView(id, userId);
    return { message: 'View recorded successfully' };
  }

  // ================================
  // COMMENTS
  // ================================

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: '댓글 작성' })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  async createComment(
    @Request() req: any,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.createComment(postId, userId, dto, tenantId);
  }

  @Put('comments/:id')
  @ApiOperation({ summary: '댓글 수정' })
  @ApiResponse({ status: 200, description: '댓글 수정 성공' })
  async updateComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.updateComment(id, userId, dto, tenantId);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '댓글 삭제' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  async deleteComment(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    const tenantId = req.user.tenantId;
    return this.hrCommunityService.deleteComment(id, userId, tenantId);
  }

  // ================================
  // NOTIFICATIONS
  // ================================

  @Get('notifications')
  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({ status: 200, description: '알림 목록 조회 성공' })
  async getNotifications(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUserNotifications(userId, page, limit);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 수 조회' })
  @ApiResponse({ status: 200, description: '읽지 않은 알림 수 조회 성공' })
  async getUnreadNotificationCount(@Request() req: any) {
    const userId = req.user.sub;
    const count = await this.notificationService.getUnreadNotificationCount(userId);
    return { count };
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '알림 읽음 처리 성공' })
  async markNotificationAsRead(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.notificationService.markNotificationAsRead(id, userId);
    return { message: 'Notification marked as read' };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: '모든 알림 읽음 처리' })
  @ApiResponse({ status: 200, description: '모든 알림 읽음 처리 성공' })
  async markAllNotificationsAsRead(@Request() req: any) {
    const userId = req.user.sub;
    await this.notificationService.markAllNotificationsAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  // ================================
  // NOTIFICATION PREFERENCES
  // ================================

  @Get('notification-preferences')
  @ApiOperation({ summary: '알림 설정 조회' })
  @ApiResponse({ status: 200, description: '알림 설정 조회 성공' })
  async getNotificationPreferences(@Request() req: any) {
    const userId = req.user.sub;
    return this.notificationService.getUserNotificationPreferences(userId);
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: '알림 설정 수정' })
  @ApiResponse({ status: 200, description: '알림 설정 수정 성공' })
  async updateNotificationPreferences(
    @Request() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user.sub;
    return this.notificationService.updateUserNotificationPreferences(userId, dto);
  }

  // ================================
  // WEB PUSH SUBSCRIPTIONS
  // ================================

  @Post('push-subscription')
  @ApiOperation({ summary: '웹 푸쉬 구독 등록' })
  @ApiResponse({ status: 201, description: '웹 푸쉬 구독 등록 성공' })
  async subscribeToPush(@Request() req: any, @Body() dto: WebPushSubscriptionDto) {
    const userId = req.user.sub;
    return this.notificationService.saveWebPushSubscription(userId, dto);
  }

  @Delete('push-subscription')
  @ApiOperation({ summary: '웹 푸쉬 구독 해제' })
  @ApiResponse({ status: 200, description: '웹 푸쉬 구독 해제 성공' })
  async unsubscribeFromPush(@Body() body: { endpoint: string }) {
    await this.notificationService.removeWebPushSubscription(body.endpoint);
    return { message: 'Push subscription removed successfully' };
  }

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'VAPID 공개 키 조회' })
  @ApiResponse({ status: 200, description: 'VAPID 공개 키 조회 성공' })
  async getVapidPublicKey() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BNa40JvIaPzkCVAuCvhW0TIHHfaDQeP_h4SLjYDJ7aewVQnE8iLrjDU'
    };
  }
}