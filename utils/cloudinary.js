// utils/cloudinary.js - FIXED VERSION
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param {Object} file - Multer file object with buffer
 * @param {String} folder - Optional folder path (default: 'teenshapers')
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadImageCloudinary = async (file, folder = 'teenshapers') => {
  try {
    console.log('📤 Starting Cloudinary image upload...');
    console.log('Folder:', folder);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' }, // Auto-optimize quality
            { fetch_format: 'auto' }, // Auto-select best format (WebP when supported)
          ],
          overwrite: false,
          invalidate: true, // Invalidate CDN cache
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful');
            console.log('Public ID:', result.public_id);
            console.log('Secure URL:', result.secure_url);
            resolve(result);
          }
        }
      );

      // Pipe the buffer to Cloudinary
      uploadStream.end(file.buffer);
    });
  } catch (error) {
    console.error('❌ Upload image error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload file (PDF, document) to Cloudinary
 * @param {Object} file - Multer file object with buffer
 * @param {String} folder - Optional folder path (default: 'teenshapers/documents')
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadFileCloudinary = async (
  file,
  folder = 'teenshapers/documents'
) => {
  try {
    console.log('📤 Starting Cloudinary file upload...');
    console.log('File type:', file.mimetype);
    console.log('Folder:', folder);

    // Determine resource type based on MIME type
    const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: resourceType,
          overwrite: false,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary file upload error:', error);
            reject(error);
          } else {
            console.log('✅ Cloudinary file upload successful');
            console.log('Public ID:', result.public_id);
            console.log('Secure URL:', result.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  } catch (error) {
    console.error('❌ Upload file error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - The public ID of the file to delete
 * @param {String} resourceType - The resource type ('image', 'raw', 'video', or 'auto')
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
export const deleteFileCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    console.log('🗑️ Deleting file from Cloudinary...');
    console.log('Public ID:', publicId);
    console.log('Resource Type:', resourceType);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // Invalidate CDN cache
    });

    console.log('✅ Cloudinary delete result:', result);
    return result;
  } catch (error) {
    console.error('❌ Delete file error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get Cloudinary file details
 * @param {String} publicId - The public ID of the file
 * @param {String} resourceType - The resource type ('image', 'raw', 'video')
 * @returns {Promise<Object>} - File details
 */
export const getFileDetails = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('❌ Get file details error:', error);
    throw new Error(`Failed to get file details: ${error.message}`);
  }
};

export default cloudinary;
