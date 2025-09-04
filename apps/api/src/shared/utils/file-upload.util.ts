import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import * as multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export const imageFileFilter = (req: any, file: any, callback: (error: any, acceptFile: boolean) => void) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(new BadRequestException('Only image files are allowed!'), false);
  }
  callback(null, true);
};

export const documentFileFilter = (req: any, file: any, callback: (error: any, acceptFile: boolean) => void) => {
  if (!file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/)) {
    return callback(new BadRequestException('Only document files are allowed!'), false);
  }
  callback(null, true);
};

export const editFileName = (req: any, file: any, callback: (error: any, filename: string) => void) => {
  const name = file.originalname.split('.')[0];
  const fileExtName = extname(file.originalname);
  const randomName = uuidv4();
  callback(null, `${randomName}${fileExtName}`);
};

export const diskStorageConfig = multer.diskStorage({
  destination: './uploads',
  filename: editFileName,
});

export const memoryStorageConfig = multer.memoryStorage();

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const multerOptions = {
  storage: memoryStorageConfig,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

export const multerDocumentOptions = {
  storage: memoryStorageConfig,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};