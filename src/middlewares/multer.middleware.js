import multer from "multer";
import path from "path";

// Configure Multer storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Log file upload destination
        console.log("Setting file destination to ./public/temp");
        cb(null, "./public/temp"); // Temporary directory to store files
    },
    filename: function (req, file, cb) {
        // Log file name being uploaded
        console.log("Setting file name: ", file.originalname);
        cb(null, file.originalname); // Save file with its original name
    }
});

// Multer upload configuration, accepting avatar and coverImage
export const upload = multer({
    storage, // Use the defined storage engine
    limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB (optional)
    fileFilter: (req, file, cb) => {
        // Optional: Filter by file type
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            console.log(`File ${file.originalname} uploaded successfully`); // Log successful upload
            cb(null, true);
        } else {
            console.error("File type not allowed: ", file.originalname); // Log the error
            cb(new Error("File upload only supports the following file types: jpeg, jpg, png"), false);
        }
    }
});
