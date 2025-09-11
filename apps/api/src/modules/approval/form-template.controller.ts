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
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { FormTemplateService } from './form-template.service';
import { CreateFormTemplateDto, UpdateFormTemplateDto } from './dto/form-template.dto';

@ApiTags('Form Templates')
@Controller('api/v1/form-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FormTemplateController {
  constructor(private readonly formTemplateService: FormTemplateService) {}

  @Post()
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Create form template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() dto: CreateFormTemplateDto,
    @Request() req
  ) {
    return await this.formTemplateService.createFormTemplate(
      dto,
      req.user.companyId
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get form templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(
    @Query('includeSystem') includeSystem: string,
    @Request() req
  ) {
    const includeSystemTemplates = includeSystem !== 'false';
    return await this.formTemplateService.getFormTemplates(
      req.user.companyId,
      includeSystemTemplates
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get form template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(
    @Param('id') id: string,
    @Request() req
  ) {
    return await this.formTemplateService.getFormTemplate(
      id,
      req.user.companyId
    );
  }

  @Put(':id')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Update form template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateFormTemplateDto,
    @Request() req
  ) {
    return await this.formTemplateService.updateFormTemplate(
      id,
      dto,
      req.user.companyId
    );
  }

  @Delete(':id')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Delete form template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(
    @Param('id') id: string,
    @Request() req
  ) {
    return await this.formTemplateService.deleteFormTemplate(
      id,
      req.user.companyId
    );
  }

  @Post(':id/clone')
  @Roles('HR_ADMIN', 'SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Clone form template' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  async cloneTemplate(
    @Param('id') id: string,
    @Body('name') name: string,
    @Request() req
  ) {
    return await this.formTemplateService.cloneFormTemplate(
      id,
      req.user.companyId,
      name
    );
  }

  @Post('init-defaults')
  @Roles('SYSTEM_ADMIN')
  @ApiOperation({ summary: 'Initialize default templates' })
  @ApiResponse({ status: 201, description: 'Default templates created' })
  async initDefaults() {
    await this.formTemplateService.createDefaultTemplates();
    return { message: 'Default templates initialized successfully' };
  }
}