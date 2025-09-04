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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ReferenceDocumentService } from './reference-document.service';
import {
  CreateReferenceDocumentDto,
  UpdateReferenceDocumentDto,
  GetReferenceDocumentsQueryDto,
  UploadAttachmentDto,
} from './dto/reference-document.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('reference-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reference-documents')
export class ReferenceDocumentController {
  constructor(private readonly referenceDocumentService: ReferenceDocumentService) {}

  @Post()
  @ApiOperation({ summary: '참고문서 생성' })
  @ApiResponse({ status: 201, description: '참고문서 생성 성공' })
  async create(@Request() req: any, @Body() dto: CreateReferenceDocumentDto) {
    const companyId = req.user.company_id;
    const authorId = req.user.id;
    return this.referenceDocumentService.create(companyId, authorId, dto);
  }

  @Get()
  @ApiOperation({ summary: '참고문서 목록 조회' })
  @ApiResponse({ status: 200, description: '참고문서 목록 조회 성공' })
  async findAll(@Request() req: any, @Query() query: GetReferenceDocumentsQueryDto) {
    const companyId = req.user.company_id;
    return this.referenceDocumentService.findAll(companyId, query);
  }

  @Get('my')
  @ApiOperation({ summary: '내 참고문서 목록 조회' })
  @ApiResponse({ status: 200, description: '내 참고문서 목록 조회 성공' })
  async getMyDocuments(@Request() req: any) {
    const companyId = req.user.company_id;
    const authorId = req.user.id;
    return this.referenceDocumentService.getMyDocuments(companyId, authorId);
  }

  @Get('popular')
  @ApiOperation({ summary: '인기 참고문서 조회' })
  @ApiResponse({ status: 200, description: '인기 참고문서 조회 성공' })
  async getPopular(@Request() req: any, @Query('limit') limit?: number) {
    const companyId = req.user.company_id;
    return this.referenceDocumentService.getPopularDocuments(companyId, limit);
  }

  @Get('recent')
  @ApiOperation({ summary: '최근 참고문서 조회' })
  @ApiResponse({ status: 200, description: '최근 참고문서 조회 성공' })
  async getRecent(@Request() req: any, @Query('limit') limit?: number) {
    const companyId = req.user.company_id;
    return this.referenceDocumentService.getRecentDocuments(companyId, limit);
  }

  @Get('tags')
  @ApiOperation({ summary: '사용 가능한 태그 목록 조회' })
  @ApiResponse({ status: 200, description: '태그 목록 조회 성공' })
  async getTags(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.referenceDocumentService.getAvailableTags(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: '참고문서 상세 조회' })
  @ApiResponse({ status: 200, description: '참고문서 상세 조회 성공' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.referenceDocumentService.findOne(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '참고문서 수정' })
  @ApiResponse({ status: 200, description: '참고문서 수정 성공' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDocumentDto,
  ) {
    const userId = req.user.id;
    return this.referenceDocumentService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '참고문서 삭제' })
  @ApiResponse({ status: 200, description: '참고문서 삭제 성공' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.referenceDocumentService.remove(id, userId);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: '참고문서 첨부파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
  ) {
    const filePath = `/uploads/reference/${id}/${file.filename}`;
    const uploadDto = {
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
    };
    return this.referenceDocumentService.uploadAttachment(id, uploadDto, filePath);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: '참고문서 첨부파일 삭제' })
  @ApiResponse({ status: 200, description: '첨부파일 삭제 성공' })
  async deleteAttachment(
    @Request() req: any,
    @Param('attachmentId') attachmentId: string,
  ) {
    const userId = req.user.id;
    return this.referenceDocumentService.deleteAttachment(attachmentId, userId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: '참고문서 조회수 기록' })
  @ApiResponse({ status: 200, description: '조회수 기록 성공' })
  async recordView(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    await this.referenceDocumentService.recordView(id, userId);
    return { message: 'View recorded successfully' };
  }
}