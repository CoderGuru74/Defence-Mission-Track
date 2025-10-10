import { Router } from 'express';
import { MessageController } from '../controllers/messageController.js';
import { authenticateToken, requireTeamMember } from '../middleware/auth.js';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route POST /api/messages
 * @desc Send a message to a team
 * @access Private (Team Member)
 */
router.post(
  '/',
  authenticateToken,
  validate(schemas.sendMessage),
  MessageController.sendMessage
);

/**
 * @route GET /api/messages/team/:teamId
 * @desc Get messages for a team
 * @access Private (Team Member)
 */
router.get(
  '/team/:teamId',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validateQuery(schemas.pagination),
  requireTeamMember('teamId'),
  MessageController.getTeamMessages
);

/**
 * @route GET /api/messages/mission/:missionId
 * @desc Get messages for a specific mission
 * @access Private (Team Member)
 */
router.get(
  '/mission/:missionId',
  authenticateToken,
  validateParams(schemas.missionIdParam),
  validateQuery(schemas.pagination),
  MessageController.getMissionMessages
);

/**
 * @route POST /api/messages/decrypt
 * @desc Decrypt a message
 * @access Private
 */
router.post(
  '/decrypt',
  authenticateToken,
  MessageController.decryptMessage
);

/**
 * @route DELETE /api/messages/:messageId
 * @desc Delete a message
 * @access Private (Sender or Team Leader)
 */
router.delete(
  '/:messageId',
  authenticateToken,
  validateParams(schemas.uuidParam),
  MessageController.deleteMessage
);

/**
 * @route GET /api/messages/team/:teamId/stats
 * @desc Get message statistics for a team
 * @access Private (Team Member)
 */
router.get(
  '/team/:teamId/stats',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  requireTeamMember('teamId'),
  MessageController.getMessageStats
);

export default router;
