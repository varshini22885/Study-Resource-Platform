const Resource = require('../models/Resource');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url) {
  try {
    if (!url) return null;
    
    // Handle youtu.be format
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0].split('#')[0];
      return videoId.trim();
    }
    
    // Handle youtube.com/watch format
    if (url.includes('watch?v=')) {
      const videoId = url.split('watch?v=')[1].split('&')[0].split('#')[0];
      return videoId.trim();
    }
    
    // Handle youtube.com/embed format
    if (url.includes('/embed/')) {
      const videoId = url.split('/embed/')[1].split('?')[0].split('#')[0];
      return videoId.trim();
    }
    
    // If it's just a video ID (11 alphanumeric characters with dashes/underscores)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url.trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting YouTube ID:', error);
    return null;
  }
}

/**
 * Convert any YouTube URL format to standard watch URL
 */
function normalizeYouTubeUrl(url) {
  try {
    console.log('[YOUTUBE] Input URL:', url);
    const videoId = extractYouTubeId(url);
    console.log('[YOUTUBE] Extracted video ID:', videoId);
    
    if (!videoId) {
      console.warn('[YOUTUBE] Failed to extract video ID from:', url);
      return url;
    }
    
    // Always return watch format for consistency
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log('[YOUTUBE] Normalized URL:', normalizedUrl);
    return normalizedUrl;
  } catch (error) {
    console.error('[YOUTUBE] Error normalizing YouTube URL:', error);
    return url;
  }
}

/**
 * Upload a resource (PDF or video link)
 */
exports.uploadResource = async (req, res) => {
  try {
    const { title, description, subject, type, url } = req.body;
    const userId = req.user?.id;

    console.log('\n📤 ===== UPLOAD RESOURCE REQUEST =====');
    console.log('  User ID:', userId);
    console.log('  User:', req.user?.name || 'Unknown');
    console.log('  Title:', title);
    console.log('  Subject:', subject);
    console.log('  Type:', type);
    if (type === 'video') console.log('  URL:', url);
    if (type === 'pdf') console.log('  File received:', req.file ? 'Yes' : 'No');
    console.log('=====================================\n');

    // Check authentication
    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({
        error: {
          message: 'Unauthorized - User not authenticated',
          status: 401
        }
      });
    }

    // Validate required fields
    if (!title || !subject || !type) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        error: {
          message: 'Title, subject, and type are required',
          status: 400
        }
      });
    }

    const duplicateQuery = {
      uploadedBy: userId,
      title: title.trim(),
      subject,
      type
    };

    if (type !== 'pdf') {
      duplicateQuery.url = url;
    }

    const existingResource = await Resource.findOne(duplicateQuery);
    if (existingResource) {
      return res.status(409).json({
        error: {
          message: 'You have already uploaded this resource',
          status: 409
        }
      });
    }

    let resourceUrl = url;
    let fileSize = null;
    let cloudinaryId = null;

    // Handle file upload for PDFs
    if (type === 'pdf' && req.file) {
      fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
      try {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:application/pdf;base64,${b64}`;

        const result = await cloudinary.uploader.upload(dataURI, {
          resource_type: 'raw',
          folder: 'study-platform/resources',
          original_filename: req.file.originalname
        });

        resourceUrl = result.secure_url;
        cloudinaryId = result.public_id;
      } catch (uploadError) {
        // Fall back to local storage when Cloudinary is unavailable.
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'resources');
        fs.mkdirSync(uploadsDir, { recursive: true });

        const safeName = (req.file.originalname || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadsDir, fileName);

        fs.writeFileSync(filePath, req.file.buffer);
        resourceUrl = `${req.protocol}://${req.get('host')}/uploads/resources/${fileName}`;
        cloudinaryId = null;
      }
    } else if (type === 'video' && !url) {
      return res.status(400).json({
        error: {
          message: 'YouTube URL is required for video type',
          status: 400
        }
      });
    } else if (type === 'video' && url) {
      // For videos, just store the URL like we do for web links
      // Don't do special processing - let YouTube handle it directly
      console.log('[VIDEO] Storing video URL as-is:', url);
      resourceUrl = url;
    } else if (type === 'pdf' && !req.file && !url) {
      return res.status(400).json({
        error: {
          message: 'PDF file is required for pdf type',
          status: 400
        }
      });
    }

    // Create new resource
    const resource = new Resource({
      title,
      description,
      subject,
      type,
      url: resourceUrl,
      cloudinaryId,
      uploadedBy: userId,
      status: 'pending',
      fileSize
    });

    try {
      console.log('💾 Saving resource to database...');
      await resource.save();
      console.log('✅ Resource saved successfully with ID:', resource._id);
    } catch (saveErr) {
      console.error('❌ Error saving resource:', saveErr.message);
      // Handle duplicate key error (race condition / double-submit)
      if (saveErr && saveErr.code === 11000) {
        console.error('   Duplicate key error detected');
        return res.status(409).json({
          error: {
            message: 'Duplicate resource detected. It appears you already uploaded this resource.',
            status: 409
          }
        });
      }

      throw saveErr;
    }

    // Populate uploader details
    await resource.populate('uploadedBy', 'name email profilePicture');

    console.log('✅ Resource upload completed successfully');
    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully. Pending admin approval.',
      resource
    });
  } catch (error) {
    console.error('❌ UPLOAD ERROR:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      error: {
        message: 'Error uploading resource',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Get all approved resources (public access)
 */
exports.getApprovedResources = async (req, res) => {
  try {
    const { subject, type, search } = req.query;
    let query = { status: 'approved' };

    if (subject) {
      query.subject = subject;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const resources = await Resource.find(query)
      .populate('uploadedBy', 'name profilePicture')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching resources',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Get resources uploaded by current user
 */
exports.getUserResources = async (req, res) => {
  try {
    const userId = req.user.id;

    const resources = await Resource.find({ uploadedBy: userId })
      .populate('uploadedBy', 'name email profilePicture')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching user resources',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Get pending resources (for admin approval)
 */
exports.getPendingResources = async (req, res) => {
  try {
    const resources = await Resource.find({ status: 'pending' })
      .populate('uploadedBy', 'name email profilePicture')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: resources.length,
      resources
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching pending resources',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Approve a resource (admin only)
 */
exports.approveResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const adminId = req.user.id;

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      {
        status: 'approved',
        approvedBy: adminId,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('uploadedBy', 'name email profilePicture')
     .populate('approvedBy', 'name');

    if (!resource) {
      return res.status(404).json({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.json({
      success: true,
      message: 'Resource approved successfully',
      resource
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error approving resource',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Reject a resource (admin only)
 */
exports.rejectResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { reason } = req.body;

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      {
        status: 'rejected',
        rejectionReason: reason || 'No reason provided',
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('uploadedBy', 'name email profilePicture');

    if (!resource) {
      return res.status(404).json({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    }

    res.json({
      success: true,
      message: 'Resource rejected',
      resource
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error rejecting resource',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Download a resource (authenticated users only)
 */
exports.downloadResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await Resource.findByIdAndUpdate(
      resourceId,
      { $inc: { downloadCount: 1 } },
      { new: true }
    ).populate('uploadedBy', 'name email profilePicture');

    if (!resource) {
      return res.status(404).json({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    }

    const isUploader = resource.uploadedBy && resource.uploadedBy._id.toString() === req.user.id;
    if (resource.status !== 'approved' && req.user.role !== 'admin' && !isUploader) {
      return res.status(403).json({
        error: {
          message: 'Resource is not available for download',
          status: 403
        }
      });
    }

    // For PDF files, fetch and send with proper headers
    if (resource.type === 'pdf') {
      try {
        const https = require('https');
        const http = require('http');
        
        const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
        res.setHeader('Content-Disposition', `${disposition}; filename="${resource.title}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        // Determine if URL is https or http
        const protocol = resource.url.startsWith('https') ? https : http;
        
        // Fetch the file from the URL and pipe it to response
        protocol.get(resource.url, (fileRes) => {
          fileRes.pipe(res);
        }).on('error', (err) => {
          console.error('Error fetching PDF:', err);
          res.status(500).json({
            error: {
              message: 'Error fetching PDF file',
              details: err.message
            }
          });
        });
        
        return;
      } catch (error) {
        console.error('Error in PDF download:', error);
        return res.status(500).json({
          error: {
            message: 'Error downloading PDF',
            details: error.message
          }
        });
      }
    }

    // For other types, return the URL
    res.json({
      success: true,
      message: 'Download link retrieved',
      downloadUrl: resource.url,
      resource
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error downloading resource',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Get resource details by ID
 */
exports.getResourceById = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await Resource.findById(resourceId)
      .populate('uploadedBy', 'name email profilePicture')
      .populate('approvedBy', 'name');

    if (!resource) {
      return res.status(404).json({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    }

    // If user is not authenticated and resource is not approved, don't return full details
    if (!req.user && resource.status !== 'approved') {
      return res.status(403).json({
        error: {
          message: 'Unauthorized. Please log in to view this resource.',
          status: 403
        }
      });
    }

    res.json({
      success: true,
      resource
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching resource',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Delete a resource (owner or admin)
 */
exports.deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const userId = req.user.id;

    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({
        error: {
          message: 'Resource not found',
          status: 404
        }
      });
    }

    // Only admin or the uploader can delete
    if (req.user.role !== 'admin' && resource.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        error: {
          message: 'You do not have permission to delete this resource',
          status: 403
        }
      });
    }

    // If the file was uploaded to Cloudinary, attempt to remove it
    try {
      if (resource.cloudinaryId) {
        await cloudinary.uploader.destroy(resource.cloudinaryId, { resource_type: 'raw' });
      }
    } catch (cloudErr) {
      console.warn('Failed to remove Cloudinary asset for resource:', cloudErr.message);
    }

    // If the file is stored locally under /uploads/resources, remove it
    try {
      const uploadsSegment = '/uploads/resources/';
      if (resource.url && resource.url.includes(uploadsSegment)) {
        const parts = resource.url.split(uploadsSegment);
        const filename = parts[1];
        const filePath = path.join(__dirname, '..', 'uploads', 'resources', filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (fsErr) {
      console.warn('Failed to remove local file for resource:', fsErr.message);
    }

    await Resource.findByIdAndDelete(resourceId);

    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error deleting resource',
        details: error.message,
        status: 500
      }
    });
  }
};
