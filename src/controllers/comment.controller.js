import mongoose, { Schema } from "mongoose";
import { Comment } from "../models/comment.model.js";
import Video from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// Get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log(`Fetching comments for video: ${videoId}`);
    const video = await Video.findById(videoId);

    if (!video) {
        console.error("Video not found");
        throw new ApiError(404, "Video not found");
    }

    console.log("Video found, aggregating comments...");

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1,
            },
        },
    ]);

    console.log("Comments aggregated, paginating results...");

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(commentsAggregate, options);

    console.log("Comments fetched successfully");
    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// Add a comment to a video
const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        console.error("Content is required");
        throw new ApiError(400, "Content is required");
    }

    console.log(`Adding comment to video: ${videoId}`);
    const video = await Video.findById(videoId);

    if (!video) {
        console.error("Video not found");
        throw new ApiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        console.error("Failed to add comment");
        throw new ApiError(500, "Failed to add comment please try again");
    }

    console.log("Comment added successfully");
    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        console.error("Content is required");
        throw new ApiError(400, "content is required");
    }

    console.log(`Updating comment: ${commentId}`);
    const comment = await Comment.findById(commentId);

    if (!comment) {
        console.error("Comment not found");
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        console.error("Unauthorized comment update attempt");
        throw new ApiError(400, "only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        { $set: { content } },
        { new: true }
    );

    if (!updatedComment) {
        console.error("Failed to update comment");
        throw new ApiError(500, "Failed to edit comment please try again");
    }

    console.log("Comment updated successfully");
    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment edited successfully"));
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    console.log(`Deleting comment: ${commentId}`);
    const comment = await Comment.findById(commentId);

    if (!comment) {
        console.error("Comment not found");
        throw new ApiError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        console.error("Unauthorized comment deletion attempt");
        throw new ApiError(400, "only comment owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user,
    });

    console.log("Comment deleted successfully");
    return res
        .status(200)
        .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
