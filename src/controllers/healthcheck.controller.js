import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { Tweet } from "../models/tweet.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import  User  from "../models/user.model.js";

const healthcheck = asyncHandler(async (req, res) => {
    // Check the database connection status
    const dbState = mongoose.connection.readyState;

    // Mongoose connection states: 
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    let dbStatus = "disconnected";
    if (dbState === 1) dbStatus = "connected";
    else if (dbState === 2) dbStatus = "connecting";
    else if (dbState === 3) dbStatus = "disconnecting";

    // Log the database status for debugging purposes
    console.log("Database Status:", dbStatus);

    // If the database is disconnected, throw an error
    if (dbStatus !== "connected") {
        throw new ApiError(500, "Database connection is not healthy");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "Everything is O.K", dbStatus },
                "Healthcheck passed"
            )
        );
});

export { healthcheck };
