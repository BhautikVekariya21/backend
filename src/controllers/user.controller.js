import asyncHandler from "../utils/asyncHandler.js"; 
import ApiError from "../utils/ApiError.js"; 
import User from "../models/user.model.js"; 
import uploadOnCloudinary from "../utils/cloudinary.js"; 
import ApiResponse from "../utils/ApiResponse.js"; 
import jwt from "jsonwebtoken"

// Function to generate access and refresh tokens for a user

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // Log the start of the token generation process
        console.log("Generating access and refresh tokens for user ID:", userId);

        // Fetch the user from the database using the provided userId
        const user = await User.findById(userId);
        if (!user) {
            console.error("User not found with ID:", userId);
            throw new ApiError(404, "User not found");
        }

        // Generate access token for the user
        const accessToken = await user.generateAccessToken();
        console.log("Access token generated:", accessToken);

        // Generate refresh token for the user
        const refreshToken = await user.generateRefreshToken();
        console.log("Refresh token generated:", refreshToken);

        // Save the refresh token in the user's record
        user.refreshToken = refreshToken;

        // Save the user with the new refresh token without validating other fields
        await user.save({ validateBeforeSave: false });
        console.log("User saved with new refresh token:", userId);

        // Return both tokens
        return { accessToken, refreshToken };

    } catch (error) {
        console.error("Error generating access and refresh tokens:", error.message);
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
};

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

    console.log(req.files);

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

const loginUser = asyncHandler(async (req, res) => {
    console.log("Login user request body:", req.body);  // Debugging log to track incoming request data

    const { email, username, password } = req.body;

    // Check if username or email and password are provided
    if (!(username || email) || !password) {
        throw new ApiError(400, "Email/Username and password are required");
    }

    // Find user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(401, "Invalid email or username");
    }

    // Validate the password
    const isPasswordValid = await user.isPasswordCorrect(password);  // bcrypt.compare will be called here

    if (!isPasswordValid) {
        console.error(`Invalid password for user: ${username}`);
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate tokens and proceed with the rest of the login flow
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("access_token", accessToken, options)
        .cookie("refresh_token", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "User logged in successfully")
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    console.log("Logging out user:", req.user); // Debug log for the user
    
    // Remove refresh token from DB
    await User.findByIdAndUpdate(
        req.user._id,
        { refreshToken: undefined },  // Clear refresh token from user
        { new: true }
    );

    // Options for clearing cookies
    const options = {
        httpOnly: true,  //// Secure cookies by making them inaccessible via JavaScript
        secure: true,   // Should be true in production over HTTPS
        sameSite: "None",  // For cross-site requests
        domain: "localhost",  // Adjust this to your domain
        path: "/"  // Clear cookie for the root path
    };

    // Clear the access and refresh tokens in the response
    return res.status(200)
        .clearCookie("access_token", options)  // Clear access token
        .clearCookie("refresh_token", options) // Clear refresh token
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Log incoming request details for debugging
    console.log("=== Refresh Token Request ===");
    console.log("Request cookies:", req.cookies);  // Check what cookies are sent in the request
    console.log("Request body:", req.body);  // Log body (in case refreshToken is sent in the request body)
    
    // Extract refresh token either from cookies or the request body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // Check if the refresh token is present
    if (!incomingRefreshToken) {
        console.error("Unauthorized request: No refresh token provided");
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        // Verify the refresh token using the secret key from environment variables
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log("Decoded refresh token:", decodedToken);  // Debugging log for decoded token

        // Find the user by ID from the decoded token payload
        const user = await User.findById(decodedToken?._id);
        console.log("User found for refresh token:", user ? user._id : "None");  // Debugging log to check if user was found

        // Check if the user exists
        if (!user) {
            console.error("Invalid refresh token: User not found");
            throw new ApiError(401, "Invalid refresh token");
        }

        // Validate if the incoming refresh token matches the user's stored refresh token
        if (user.refreshToken !== incomingRefreshToken) {
            console.error("Refresh token mismatch or expired");
            throw new ApiError(401, "Refresh token is invalid or expired");
        }

        // Generate a new access token and refresh token for the user
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);
        console.log("Newly generated access token:", accessToken);  // Log the new access token
        console.log("Newly generated refresh token:", newrefreshToken);  // Log the new refresh token

        // Cookie options for secure handling
        const options = {
            httpOnly: true,  // Secure cookies by making them inaccessible via JavaScript
            secure: true, // Use secure cookies in production only
            sameSite: "None",  // Allow cross-site cookie sharing
            domain: "localhost",  // Set your domain or adjust for production
            path: "/"  // Make the cookie available across your entire app
        };

        // Send the new tokens back to the client in cookies and JSON response
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)  // Set new access token cookie
            .cookie("refreshToken", newrefreshToken, options)  // Set new refresh token cookie
            .json(new ApiResponse(200, {
                accessToken,
                refreshToken: newrefreshToken
            }, "User's access token refreshed successfully"));

    } catch (error) {
        // Log any error during the refresh process for debugging
        console.error("Error refreshing access token:", error.message);
        throw new ApiError(500, error?.message || "Error refreshing access token");
    }
});




export default {registerUser,loginUser,logoutUser,refreshAccessToken};
