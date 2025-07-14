import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteUser,
} from "../controllers/user.controller";
import { verifyJWT } from "../middleware/auth.middleware";
const router: Router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/profile").get(verifyJWT, getUserProfile);
router.route("/profile").put(verifyJWT, updateUserProfile);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/delete").delete(verifyJWT, deleteUser);

export default router;
