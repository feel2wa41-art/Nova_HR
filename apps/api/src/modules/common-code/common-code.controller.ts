import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CommonCodeService } from './common-code.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import {
  CreateCommonCodeCategoryDto,
  UpdateCommonCodeCategoryDto,
  CreateCommonCodeDto,
  UpdateCommonCodeDto,
  AssignUserPositionDto,
  AssignUserGradeDto,
  CreateExpenseLimitDto,
  UpdateExpenseLimitDto,
} from './dto/common-code.dto';

@ApiTags('Common Code Management')
@ApiBearerAuth()
@Controller('common-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommonCodeController {
  constructor(private readonly commonCodeService: CommonCodeService) {}

  // ================================
  // Common Code Categories
  // ================================

  @Get('company/:companyId/categories')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '회사 공통코드 카테고리 목록 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async getCategories(@Param('companyId') companyId: string) {
    return await this.commonCodeService.getCategories(companyId);
  }

  @Post('company/:companyId/categories')
  @Roles('ADMIN', 'CUSTOMER_ADMIN')
  @ApiOperation({ summary: '공통코드 카테고리 생성' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async createCategory(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCommonCodeCategoryDto
  ) {
    return await this.commonCodeService.createCategory(companyId, dto);
  }

  @Put('categories/:categoryId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN')
  @ApiOperation({ summary: '공통코드 카테고리 수정' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCommonCodeCategoryDto
  ) {
    return await this.commonCodeService.updateCategory(categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN')
  @ApiOperation({ summary: '공통코드 카테고리 삭제' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return await this.commonCodeService.deleteCategory(categoryId);
  }

  // ================================
  // Common Codes
  // ================================

  @Get('categories/:categoryId/codes')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: '카테고리별 공통코드 목록 조회' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  async getCodes(@Param('categoryId') categoryId: string) {
    return await this.commonCodeService.getCodes(categoryId);
  }

  @Get('company/:companyId/category/:categoryCode/codes')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: '회사별 카테고리 코드로 공통코드 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  @ApiParam({ name: 'categoryCode', description: '카테고리 코드 (POSITION, GRADE 등)' })
  async getCodesByCategory(
    @Param('companyId') companyId: string,
    @Param('categoryCode') categoryCode: string
  ) {
    return await this.commonCodeService.getCodesByCategory(companyId, categoryCode);
  }

  @Post('categories/:categoryId/codes')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '공통코드 생성' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  async createCode(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateCommonCodeDto
  ) {
    return await this.commonCodeService.createCode(categoryId, dto);
  }

  @Put('codes/:codeId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '공통코드 수정' })
  @ApiParam({ name: 'codeId', description: '코드 ID' })
  async updateCode(
    @Param('codeId') codeId: string,
    @Body() dto: UpdateCommonCodeDto
  ) {
    return await this.commonCodeService.updateCode(codeId, dto);
  }

  @Delete('codes/:codeId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '공통코드 삭제' })
  @ApiParam({ name: 'codeId', description: '코드 ID' })
  async deleteCode(@Param('codeId') codeId: string) {
    return await this.commonCodeService.deleteCode(codeId);
  }

  // ================================
  // User Position/Grade Management
  // ================================

  @Post('users/:userId/positions')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '사용자 직급 할당' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async assignUserPosition(
    @Param('userId') userId: string,
    @Body() dto: AssignUserPositionDto
  ) {
    return await this.commonCodeService.assignUserPosition(userId, dto);
  }

  @Post('users/:userId/grades')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '사용자 등급 할당' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async assignUserGrade(
    @Param('userId') userId: string,
    @Body() dto: AssignUserGradeDto
  ) {
    return await this.commonCodeService.assignUserGrade(userId, dto);
  }

  @Get('users/:userId/positions')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: '사용자 직급 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async getUserPositions(@Param('userId') userId: string) {
    return await this.commonCodeService.getUserPositions(userId);
  }

  @Get('users/:userId/grades')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: '사용자 등급 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  async getUserGrades(@Param('userId') userId: string) {
    return await this.commonCodeService.getUserGrades(userId);
  }

  @Get('my-positions')
  @ApiOperation({ summary: '내 직급 조회' })
  async getMyPositions(@Request() req) {
    return await this.commonCodeService.getUserPositions(req.user.id);
  }

  @Get('my-grades')
  @ApiOperation({ summary: '내 등급 조회' })
  async getMyGrades(@Request() req) {
    return await this.commonCodeService.getUserGrades(req.user.id);
  }

  // ================================
  // Expense Limits Management
  // ================================

  @Get('company/:companyId/expense-limits')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '회사 비용 한도 설정 조회' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async getExpenseLimits(@Param('companyId') companyId: string) {
    return await this.commonCodeService.getExpenseLimits(companyId);
  }

  @Post('company/:companyId/expense-limits')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '비용 한도 설정 생성' })
  @ApiParam({ name: 'companyId', description: '회사 ID' })
  async createExpenseLimit(
    @Param('companyId') companyId: string,
    @Body() dto: CreateExpenseLimitDto
  ) {
    return await this.commonCodeService.createExpenseLimit(companyId, dto);
  }

  @Put('expense-limits/:limitId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '비용 한도 설정 수정' })
  @ApiParam({ name: 'limitId', description: '한도 설정 ID' })
  async updateExpenseLimit(
    @Param('limitId') limitId: string,
    @Body() dto: UpdateExpenseLimitDto
  ) {
    return await this.commonCodeService.updateExpenseLimit(limitId, dto);
  }

  @Delete('expense-limits/:limitId')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER')
  @ApiOperation({ summary: '비용 한도 설정 삭제' })
  @ApiParam({ name: 'limitId', description: '한도 설정 ID' })
  async deleteExpenseLimit(@Param('limitId') limitId: string) {
    return await this.commonCodeService.deleteExpenseLimit(limitId);
  }

  @Get('users/:userId/expense-limits')
  @Roles('ADMIN', 'CUSTOMER_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE')
  @ApiOperation({ summary: '사용자별 비용 한도 조회' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiQuery({ name: 'category', required: false, description: '비용 카테고리' })
  async getUserExpenseLimits(
    @Param('userId') userId: string,
    @Query('category') category?: string
  ) {
    return await this.commonCodeService.getUserExpenseLimits(userId, category);
  }

  @Get('my-expense-limits')
  @ApiOperation({ summary: '내 비용 한도 조회' })
  @ApiQuery({ name: 'category', required: false, description: '비용 카테고리' })
  async getMyExpenseLimits(@Request() req, @Query('category') category?: string) {
    return await this.commonCodeService.getUserExpenseLimits(req.user.id, category);
  }
}