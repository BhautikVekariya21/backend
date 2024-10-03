import asyncHandler from "../utils/asyncHandler.js"; // No curly braces since it's a default export

const registerUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "ok"
    });
});

export default registerUser; // Default export
