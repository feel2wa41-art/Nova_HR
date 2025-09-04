import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles, 
  UseGuards, 
  BadRequestException,
  Query
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile() file: any,
    @Query('folder') folder?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type (images and documents)
    const allowedTypes = ['image', 'application/pdf', 'application/msword', 'text'];
    if (!this.uploadService.validateFileType(file, allowedTypes)) {
      throw new BadRequestException('File type not allowed');
    }

    // Validate file size (10MB max)
    if (!this.uploadService.validateFileSize(file, 10)) {
      throw new BadRequestException('File size too large (max 10MB)');
    }

    return this.uploadService.uploadFile(file, folder);
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: any[],
    @Query('folder') folder?: string
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate each file
    for (const file of files) {
      const allowedTypes = ['image', 'application/pdf', 'application/msword', 'text'];
      if (!this.uploadService.validateFileType(file, allowedTypes)) {
        throw new BadRequestException(`File type not allowed: ${file.originalname}`);
      }

      if (!this.uploadService.validateFileSize(file, 10)) {
        throw new BadRequestException(`File size too large: ${file.originalname} (max 10MB)`);
      }
    }

    return this.uploadService.uploadMultipleFiles(files, folder);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No avatar file uploaded');
    }

    // Validate image only
    const allowedTypes = ['image'];
    if (!this.uploadService.validateFileType(file, allowedTypes)) {
      throw new BadRequestException('Only image files are allowed for avatars');
    }

    // Smaller size limit for avatars (2MB)
    if (!this.uploadService.validateFileSize(file, 2)) {
      throw new BadRequestException('Avatar file size too large (max 2MB)');
    }

    return this.uploadService.uploadFile(file, 'avatars');
  }
}