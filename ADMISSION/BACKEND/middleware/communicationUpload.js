import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadsDirectory = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);

    cb(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
    files: 10,
  },
});

export const communicationAttachmentsUpload = upload.array('attachments', 10);
