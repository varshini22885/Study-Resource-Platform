const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

/**
 * Public endpoints - anyone can access
 */

/**
 * Get all approved resources (public - view only)
 */
router.get('/approved', resourceController.getApprovedResources);

/**
 * Get resource by ID (public - view only)
 */
router.get('/:resourceId', resourceController.getResourceById);

/**
 * Protected endpoints - requires authentication
 */

/**
 * Upload a new resource (authenticated users)
 */
router.post('/upload', 
  isAuthenticated,
  upload.single('file'),
  resourceController.uploadResource
);

/**
 * Get resources uploaded by current user
 */
router.get('/my-uploads/list', isAuthenticated, resourceController.getUserResources);

/**
 * Download a resource (authenticated users only)
 */
router.get('/:resourceId/download', isAuthenticated, resourceController.downloadResource);

/**
 * Delete a resource (owner or admin)
 */
router.delete('/:resourceId', isAuthenticated, resourceController.deleteResource);

/**
 * Admin only endpoints - moderation
 */

/**
 * Get all pending resources for approval (admin only)
 */
router.get('/pending/list', isAuthenticated, isAdmin, resourceController.getPendingResources);

/**
 * Approve a resource (admin only)
 */
router.put('/:resourceId/approve', isAuthenticated, isAdmin, resourceController.approveResource);

/**
 * Approve a resource using request body (admin only)
 */
router.post('/approve', isAuthenticated, isAdmin, (req, res, next) => {
  req.params.resourceId = req.body.resourceId;
  return resourceController.approveResource(req, res, next);
});

/**
 * Reject a resource (admin only)
 */
router.put('/:resourceId/reject', isAuthenticated, isAdmin, resourceController.rejectResource);

module.exports = router;
