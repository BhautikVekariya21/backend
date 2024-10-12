import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { Tweet } from "../models/tweet.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import  User  from "../models/user.model.js";

// Create a tweet
const createTweet = asyncHandler(async (req, res) => {
    console.log("Creating a new tweet"); // Debugging log
    const { content } = req.body;

    if (!content) {
        console.log("Content is missing in the request body"); // Debugging log
        throw new ApiError(400, "content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if (!tweet) {
        console.log("Failed to create tweet"); // Debugging log
        throw new ApiError(500, "failed to create tweet please try again");
    }

    console.log("Tweet created successfully:", tweet); // Debugging log
    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

// Update a tweet
const updateTweet = asyncHandler(async (req, res) => {
    console.log("Updating tweet:", req.params.tweetId); // Debugging log
    const { content } = req.body;
    const { tweetId } = req.params;

    if (!content) {
        console.log("No content provided to update tweet"); // Debugging log
        throw new ApiError(400, "content is required");
    }

    if (!isValidObjectId(tweetId)) {
        console.log("Invalid tweetId:", tweetId); // Debugging log
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        console.log("Tweet not found:", tweetId); // Debugging log
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        console.log("User is not the owner of the tweet"); // Debugging log
        throw new ApiError(400, "only owner can edit their tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!newTweet) {
        console.log("Failed to update tweet:", tweetId); // Debugging log
        throw new ApiError(500, "Failed to edit tweet please try again");
    }

    console.log("Tweet updated successfully:", newTweet); // Debugging log
    return res
        .status(200)
        .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
});

// Delete a tweet
const deleteTweet = asyncHandler(async (req, res) => {
    console.log("Deleting tweet:", req.params.tweetId); // Debugging log
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        console.log("Invalid tweetId:", tweetId); // Debugging log
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        console.log("Tweet not found:", tweetId); // Debugging log
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        console.log("User is not the owner of the tweet"); // Debugging log
        throw new ApiError(400, "only owner can delete their tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);
    console.log("Tweet deleted successfully:", tweetId); // Debugging log

    return res
        .status(200)
        .json(new ApiResponse(200, { tweetId }, "Tweet deleted successfully"));
});

// Get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
    console.log("Fetching tweets for user:", req.params.userId); // Debugging log
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        console.log("Invalid userId:", userId); // Debugging log
        throw new ApiError(400, "Invalid userId");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails",
                },
                ownerDetails: {
                    $first: "$ownerDetails",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            },
        },
    ]);

    console.log("Tweets fetched successfully for user:", userId); // Debugging log
    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

export { createTweet, updateTweet, deleteTweet, getUserTweets };
