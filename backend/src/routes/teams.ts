import { Router } from 'express';
import { TeamController } from '../controllers/teamController.js';
import { authenticateToken, requireTeamMember, requireTeamLeader } from '../middleware/auth.js';
import { validate, validateParams, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route POST /api/teams
 * @desc Create a new team
 * @access Private
 */
router.post(
  '/',
  authenticateToken,
  validate(schemas.createTeam),
  TeamController.createTeam
);

/**
 * @route GET /api/teams/user
 * @desc Get user's teams
 * @access Private
 */
router.get(
  '/user',
  authenticateToken,
  TeamController.getUserTeams
);

/**
 * @route GET /api/teams/:teamId
 * @desc Get team details
 * @access Private (Team Member)
 */
router.get(
  '/:teamId',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  requireTeamMember('teamId'),
  TeamController.getTeam
);

/**
 * @route PUT /api/teams/:teamId
 * @desc Update team information
 * @access Private (Team Leader)
 */
router.put(
  '/:teamId',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validate(schemas.updateTeam),
  requireTeamLeader('teamId'),
  TeamController.updateTeam
);

/**
 * @route POST /api/teams/:teamId/members
 * @desc Add member to team
 * @access Private (Team Leader)
 */
router.post(
  '/:teamId/members',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validate(schemas.uuidParam),
  requireTeamLeader('teamId'),
  TeamController.addTeamMember
);

/**
 * @route DELETE /api/teams/:teamId/members/:userId
 * @desc Remove member from team
 * @access Private (Team Leader or Self)
 */
router.delete(
  '/:teamId/members/:userId',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validateParams(schemas.uuidParam),
  TeamController.removeTeamMember
);

/**
 * @route PUT /api/teams/:teamId/status
 * @desc Update user status in team
 * @access Private (Team Member)
 */
router.put(
  '/:teamId/status',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validate(schemas.updateUserStatus),
  requireTeamMember('teamId'),
  TeamController.updateUserStatus
);

/**
 * @route GET /api/teams/:teamId/stats
 * @desc Get team statistics
 * @access Private (Team Member)
 */
router.get(
  '/:teamId/stats',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  requireTeamMember('teamId'),
  TeamController.getTeamStats
);

export default router;
