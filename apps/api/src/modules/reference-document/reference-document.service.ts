import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { 
  CreateReferenceDocumentDto, 
  UpdateReferenceDocumentDto, 
  GetReferenceDocumentsQueryDto,
  UploadAttachmentDto 
} from './dto/reference-document.dto';

@Injectable()
export class ReferenceDocumentService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, authorId: string, dto: CreateReferenceDocumentDto) {
    const document = await this.prisma.reference_document.create({
      data: {
        company_id: companyId,
        author_id: authorId,
        title: dto.title,
        content: dto.content,
        description: dto.description,
        category_id: dto.category_id,
        tags: dto.tags || [],
        is_public: dto.is_public ?? true,
        is_template: dto.is_template ?? false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            views: true,
          }
        }
      }
    });

    // Handle attachments if provided
    if (dto.attachments && dto.attachments.length > 0) {
      // This would typically involve moving temporary uploads to the document folder
      // For now, we'll assume the attachments are already uploaded and just link them
      await this.prisma.reference_document_attachment.createMany({
        data: dto.attachments.map(attachment => ({
          document_id: document.id,
          file_name: 'uploaded_file.pdf', // This should come from the upload
          file_path: `/uploads/reference/${document.id}/${attachment}`,
          file_size: 0, // This should come from the upload
          mime_type: 'application/pdf', // This should come from the upload
        }))
      });
    }

    return document;
  }

  async findAll(companyId: string, query: GetReferenceDocumentsQueryDto) {
    const {
      search,
      category_id,
      tag,
      author_id,
      templates_only,
      sort_by = 'updated_at',
      order = 'desc',
      page = 1,
      limit = 20
    } = query;

    const where: any = {
      company_id: companyId,
      is_public: true, // Only show public documents
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (author_id) {
      where.author_id = author_id;
    }

    if (templates_only !== undefined) {
      where.is_template = templates_only;
    }

    const orderBy: any = {};
    orderBy[sort_by] = order;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.reference_document.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              code: true,
              icon: true,
            }
          },
          attachments: true,
          _count: {
            select: {
              views: true,
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.reference_document.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const document = await this.prisma.reference_document.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            form_schema: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            views: true,
          }
        }
      }
    });

    if (!document) {
      throw new NotFoundException('Reference document not found');
    }

    // Record view if user is provided
    if (userId && userId !== document.author_id) {
      await this.recordView(id, userId);
    }

    return document;
  }

  async update(id: string, userId: string, dto: UpdateReferenceDocumentDto) {
    const document = await this.prisma.reference_document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Reference document not found');
    }

    if (document.author_id !== userId) {
      throw new ForbiddenException('You can only update your own documents');
    }

    return this.prisma.reference_document.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        description: dto.description,
        category_id: dto.category_id,
        tags: dto.tags,
        is_public: dto.is_public,
        is_template: dto.is_template,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            views: true,
          }
        }
      }
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.prisma.reference_document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Reference document not found');
    }

    if (document.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    await this.prisma.reference_document.delete({
      where: { id },
    });

    return { message: 'Reference document deleted successfully' };
  }

  async recordView(documentId: string, userId: string) {
    try {
      await this.prisma.reference_document_view.upsert({
        where: {
          document_id_user_id: {
            document_id: documentId,
            user_id: userId,
          }
        },
        update: {
          viewed_at: new Date(),
        },
        create: {
          document_id: documentId,
          user_id: userId,
        }
      });

      // Update view count
      await this.prisma.reference_document.update({
        where: { id: documentId },
        data: {
          view_count: {
            increment: 1,
          }
        }
      });
    } catch (error) {
      // Ignore view recording errors
      console.warn('Failed to record document view:', error.message);
    }
  }

  async getMyDocuments(companyId: string, authorId: string) {
    return this.prisma.reference_document.findMany({
      where: {
        company_id: companyId,
        author_id: authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          }
        },
        attachments: true,
        _count: {
          select: {
            views: true,
          }
        }
      },
      orderBy: {
        updated_at: 'desc',
      }
    });
  }

  async getPopularDocuments(companyId: string, limit: number = 10) {
    return this.prisma.reference_document.findMany({
      where: {
        company_id: companyId,
        is_public: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          }
        },
        _count: {
          select: {
            views: true,
          }
        }
      },
      orderBy: {
        view_count: 'desc',
      },
      take: limit,
    });
  }

  async getRecentDocuments(companyId: string, limit: number = 10) {
    return this.prisma.reference_document.findMany({
      where: {
        company_id: companyId,
        is_public: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
          }
        },
        _count: {
          select: {
            views: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }

  async getAvailableTags(companyId: string) {
    const documents = await this.prisma.reference_document.findMany({
      where: {
        company_id: companyId,
        is_public: true,
      },
      select: {
        tags: true,
      }
    });

    const allTags = documents.flatMap(doc => doc.tags);
    const uniqueTags = [...new Set(allTags)];
    
    return uniqueTags.sort();
  }

  async uploadAttachment(documentId: string, dto: UploadAttachmentDto, filePath: string) {
    return this.prisma.reference_document_attachment.create({
      data: {
        document_id: documentId,
        file_name: dto.file_name,
        file_path: filePath,
        file_size: dto.file_size,
        mime_type: dto.mime_type,
      }
    });
  }

  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.reference_document_attachment.findUnique({
      where: { id: attachmentId },
      include: {
        document: {
          select: {
            author_id: true,
          }
        }
      }
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.document.author_id !== userId) {
      throw new ForbiddenException('You can only delete attachments from your own documents');
    }

    await this.prisma.reference_document_attachment.delete({
      where: { id: attachmentId },
    });

    return { message: 'Attachment deleted successfully' };
  }
}