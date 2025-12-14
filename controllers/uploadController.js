// controllers/uploadController.js - FIXED VERSION
import { v2 as cloudinary } from 'cloudinary';
import {
  uploadImageCloudinary,
  uploadFileCloudinary,
} from '../utils/cloudinary.js';

export const uploadImageController = async (request, response) => {
  try {
    console.log('📤 Upload request received');
    console.log('Request file:', request.file);
    console.log('Request body:', request.body);

    const file = request.file;

    if (!file) {
      console.log('❌ No file found in request');
      return response.status(400).json({
        message: 'Please provide an image',
        error: true,
        success: false,
      });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return response.status(400).json({
        message: 'Invalid file type. Only images are allowed.',
        error: true,
        success: false,
      });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSize = file.buffer?.length || 0;
    if (fileSize > maxSize) {
      return response.status(400).json({
        message: 'File too large. Maximum size is 10MB.',
        error: true,
        success: false,
      });
    }

    console.log('✅ File validation passed, uploading to Cloudinary...');

    // ✅ Pass folder from request body if provided
    const folder = request.body.folder || 'teenshapers';
    const upload = await uploadImageCloudinary(file, folder);

    console.log('✅ Cloudinary upload successful:', upload.secure_url);

    return response.json({
      message: 'Upload done',
      success: true,
      error: false,
      data: {
        url: upload.secure_url,
        secure_url: upload.secure_url,
        public_id: upload.public_id,
        resource_type: upload.resource_type,
        format: upload.format,
        width: upload.width,
        height: upload.height,
        bytes: upload.bytes,
        created_at: upload.created_at,
      },
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    return response.status(500).json({
      message: error.message || 'Failed to upload image',
      error: true,
      success: false,
    });
  }
};

export const uploadFileController = async (request, response) => {
  try {
    console.log('📤 File upload request received');
    console.log('Request file:', request.file);
    console.log('Request body:', request.body);

    const file = request.file;

    if (!file) {
      console.log('❌ No file found in request');
      return response.status(400).json({
        message: 'Please provide a file',
        error: true,
        success: false,
      });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return response.status(400).json({
        message: 'Invalid file type. Only images and PDF files are allowed.',
        error: true,
        success: false,
      });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSize = file.buffer?.length || 0;
    if (fileSize > maxSize) {
      return response.status(400).json({
        message: 'File too large. Maximum size is 10MB.',
        error: true,
        success: false,
      });
    }

    console.log('✅ File validation passed, uploading to Cloudinary...');
    const upload = await uploadFileCloudinary(file);
    console.log('✅ Cloudinary upload successful:', upload.secure_url);

    const responseData = {
      secure_url: upload.secure_url,
      public_id: upload.public_id,
      resource_type: upload.resource_type,
      format: upload.format,
      bytes: upload.bytes,
      original_filename: file.originalname,
      width: upload.width,
      height: upload.height,
      created_at: upload.created_at,
    };

    return response.json({
      message: 'File uploaded successfully',
      success: true,
      error: false,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    return response.status(500).json({
      message: error.message || 'Failed to upload file',
      error: true,
      success: false,
    });
  }
};

export const deleteFileController = async (request, response) => {
  try {
    console.log('🗑️ Delete file request received');
    console.log('Request body:', request.body);
    console.log('User:', request.user?.name);

    const { public_id } = request.body;

    if (!public_id) {
      console.log('❌ No public_id provided');
      return response.status(400).json({
        message: 'Public ID is required for file deletion',
        error: true,
        success: false,
      });
    }

    console.log('🗑️ Attempting to delete file with public_id:', public_id);

    // ✅ Try deleting as image first, then as raw file
    let deleteResult;

    try {
      // First try as image
      deleteResult = await cloudinary.uploader.destroy(public_id, {
        resource_type: 'image',
        invalidate: true, // Invalidate CDN cache
      });

      console.log('📋 Delete result (image):', deleteResult);

      // If not found as image, try as raw file (for PDFs, etc.)
      if (deleteResult.result === 'not found') {
        deleteResult = await cloudinary.uploader.destroy(public_id, {
          resource_type: 'raw',
          invalidate: true,
        });
        console.log('📋 Delete result (raw):', deleteResult);
      }
    } catch (error) {
      console.error('❌ Cloudinary delete error:', error);
      // Try one more time with 'auto' resource type
      deleteResult = await cloudinary.uploader.destroy(public_id, {
        resource_type: 'auto',
        invalidate: true,
      });
      console.log('📋 Delete result (auto):', deleteResult);
    }

    if (deleteResult.result === 'ok') {
      console.log('✅ File deleted successfully');
      return response.json({
        message: 'File deleted successfully',
        success: true,
        error: false,
        data: {
          public_id: public_id,
          result: deleteResult.result,
        },
      });
    } else if (deleteResult.result === 'not found') {
      console.log('⚠️ File not found in Cloudinary');
      return response.status(404).json({
        message: 'File not found in cloud storage',
        error: true,
        success: false,
        data: {
          public_id: public_id,
          result: deleteResult.result,
        },
      });
    } else {
      console.log('❌ Unexpected delete result:', deleteResult.result);
      return response.status(500).json({
        message: 'Failed to delete file from cloud storage',
        error: true,
        success: false,
        data: {
          public_id: public_id,
          result: deleteResult.result,
        },
      });
    }
  } catch (error) {
    console.error('❌ Delete file error:', error);
    return response.status(500).json({
      message: error.message || 'Failed to delete file',
      error: true,
      success: false,
    });
  }
};
