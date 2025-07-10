import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getUserProfile,
  updateUserProfile,
} from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middleware";
const router: Router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
router
  .route("/profile")
  .get(verifyJWT, getUserProfile)
  .put(verifyJWT, updateUserProfile);

export default router;
