// routes/uploadRoutes.js
import { Router } from 'express';
import {
  uploadImageController,
  uploadFileController,
  deleteFileController,
} from '../controllers/uploadController.js';
import { uploadImage, uploadFile } from '../middleware/multer.js';

const uploadRouter = Router();

// Upload single image
uploadRouter.post(
  '/upload',
  uploadImage.single('image'),
  uploadImageController
);

// Upload single file (documents, etc.)
uploadRouter.post(
  '/upload-file',
  uploadFile.single('file'),
  uploadFileController
);

// Delete file
uploadRouter.delete('/delete-file', deleteFileController);

export default uploadRouter;
