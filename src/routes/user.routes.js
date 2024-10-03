import {Router} from "express";
import registerUser from "../controllers/user.controller.js"; // Default import

const router = Router()

router.route("/register").post(registerUser)

export default router
