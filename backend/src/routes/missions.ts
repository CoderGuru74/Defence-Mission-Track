import { Router } from 'express';
import { MissionController } from '../controllers/missionController.js';
import { authenticateToken, requireTeamMember, requireTeamLeader } from '../middleware/auth.js';
import { validate, validateParams, validateQuery, schemas } from '../middleware/validation.js';

const router = Router();

/**
 * @route POST /api/missions
 * @desc Create a new mission
 * @access Private (Team Leader)
 */
router.post(
  '/',
  authenticateToken,
  validate(schemas.createMission),
  MissionController.createMission
);

/**
 * @route GET /api/missions/:missionId
 * @desc Get mission details
 * @access Private (Team Member)
 */
router.get(
  '/:missionId',
  authenticateToken,
  validateParams(schemas.missionIdParam),
  MissionController.getMission
);

/**
 * @route GET /api/missions/team/:teamId
 * @desc Get missions for a team
 * @access Private (Team Member)
 */
router.get(
  '/team/:teamId',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  validateQuery(schemas.pagination),
  requireTeamMember('teamId'),
  MissionController.getTeamMissions
);

/**
 * @route PUT /api/missions/:missionId
 * @desc Update mission
 * @access Private (Team Leader)
 */
router.put(
  '/:missionId',
  authenticateToken,
  validateParams(schemas.missionIdParam),
  validate(schemas.updateMission),
  MissionController.updateMission
);

/**
 * @route DELETE /api/missions/:missionId
 * @desc Delete mission
 * @access Private (Team Leader)
 */
router.delete(
  '/:missionId',
  authenticateToken,
  validateParams(schemas.missionIdParam),
  MissionController.deleteMission
);

/**
 * @route GET /api/missions/team/:teamId/stats
 * @desc Get mission statistics for a team
 * @access Private (Team Member)
 */
router.get(
  '/team/:teamId/stats',
  authenticateToken,
  validateParams(schemas.teamIdParam),
  requireTeamMember('teamId'),
  MissionController.getMissionStats
);

/**
 * @route POST /api/missions/:missionId/assign
 * @desc Assign mission to team member
 * @access Private (Team Leader)
 */
router.post(
  '/:missionId/assign',
  authenticateToken,
  validateParams(schemas.missionIdParam),
  validate(schemas.uuidParam),
  MissionController.assignMission
);

export default router;
