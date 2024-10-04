import asyncHandler from "../utils/asyncHandler.js"; 
import ApiError from "../utils/ApiError.js"; 
import User from "../models/user.model.js"; 
import uploadOnCloudinary from "../utils/cloudinary.js"; 
import ApiResponse from "../utils/ApiResponse.js"; 

const registerUser = asyncHandler(async (req, res) => {
    // Log the request body and files for debugging purposes
    console.log("Register user request body:", req.body);
    console.log("Register user request files:", req.files);

    // Step 1: Extract user details from the request body
    const { fullName, email, username, password } = req.body;

    // Step 2: Validate all required fields
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Step 3: Check if the user already exists in the database by email or username
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Step 4: Handle file uploads for avatar and cover image
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("Avatar local file path:", avatarLocalPath); // Log avatar path
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Step 5: Ensure the avatar is provided, otherwise throw an error
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Step 6: Upload files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed"); // This will throw if Cloudinary upload fails
    }

    // Step 7: Create a new user in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Step 8: Fetch the created user, excluding sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Step 9: Return a success response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
});



export default registerUser;
