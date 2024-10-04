import { Router } from "express";
import registerUser from "../controllers/user.controller.js"; // Ensure path is correct
import { upload } from "../middlewares/multer.middleware.js"; // Ensure path is correct

const router = Router();

// Define route for user registration with file upload
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 }, // Expect 'avatar' field (single file)
        { name: "coverImage", maxCount: 1 } // Expect 'coverImage' field (single file)
    ]),
    (req, res, next) => {
        // Log the incoming request body and files for debugging
        console.log("Incoming request fields:", req.body); // Log request body (non-file fields)
        console.log("Incoming request files:", req.files); // Log request files

        if (!req.files || !req.files.avatar || !req.files.coverImage) {
            console.error("File upload error: Missing required files");
            return res.status(400).json({ error: "Missing required files" });
        }

        next();
    },
    registerUser // Call the registerUser controller function
);

export default router;
