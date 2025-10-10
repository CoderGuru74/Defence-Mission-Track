import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route GET /api/notifications
 * @desc Get user notifications
 * @access Private
 */
router.get(
  '/',
  authenticateToken,
  validateQuery(schemas.pagination),
  NotificationController.getUserNotifications
);

/**
 * @route GET /api/notifications/stats
 * @desc Get notification statistics
 * @access Private
 */
router.get(
  '/stats',
  authenticateToken,
  NotificationController.getNotificationStats
);

/**
 * @route PUT /api/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  '/:notificationId/read',
  authenticateToken,
  validateParams(schemas.uuidParam),
  NotificationController.markAsRead
);

/**
 * @route PUT /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put(
  '/read-all',
  authenticateToken,
  NotificationController.markAllAsRead
);

/**
 * @route DELETE /api/notifications/:notificationId
 * @desc Delete notification
 * @access Private
 */
router.delete(
  '/:notificationId',
  authenticateToken,
  validateParams(schemas.uuidParam),
  NotificationController.deleteNotification
);

/**
 * @route POST /api/notifications
 * @desc Create notification
 * @access Private (Admin or Self)
 */
router.post(
  '/',
  authenticateToken,
  validate(schemas.createNotification),
  NotificationController.createNotification
);

/**
 * @route POST /api/notifications/bulk
 * @desc Create bulk notifications for team
 * @access Private (Team Member)
 */
router.post(
  '/bulk',
  authenticateToken,
  NotificationController.createBulkNotifications
);

export default router;
