import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
// import { nanoid } from 'nanoid'; // ESM module causing issues

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: any, folder?: string): Promise<{ 
    url: string; 
    filename: string; 
    originalname: string; 
    size: number 
  }> {
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${Math.random().toString(36).substr(2, 9)}-${Date.now()}${fileExt}`;
    
    // Create folder path if specified
    const folderPath = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Full file path
    const filePath = path.join(folderPath, fileName);
    
    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Generate URL
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const relativePath = folder ? `${folder}/${fileName}` : fileName;
    const fileUrl = `${baseUrl}/uploads/${relativePath}`;

    return {
      url: fileUrl,
      filename: fileName,
      originalname: file.originalname,
      size: file.size,
    };
  }

  async uploadMultipleFiles(files: any[], folder?: string) {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(filename: string, folder?: string): Promise<boolean> {
    try {
      const filePath = folder 
        ? path.join(this.uploadDir, folder, filename)
        : path.join(this.uploadDir, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  getFileUrl(filename: string, folder?: string): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    const relativePath = folder ? `${folder}/${filename}` : filename;
    return `${baseUrl}/uploads/${relativePath}`;
  }

  validateFileType(file: any, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => file.mimetype.includes(type));
  }

  validateFileSize(file: any, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}