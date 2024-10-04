import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Define the user schema
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true, // Full name is mandatory
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true, // Avatar is mandatory
    },
    coverimage: {
      type: String, // Cover image is optional
    },
    watchhistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video", // Reference to videos watched by the user
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"], // Password must be present
    },
    refreshToken: {
      type: String, // To store JWT refresh tokens
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Pre-save middleware to hash password before saving
userSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it has been modified or is new
  if (!user.isModified("password")) {
    console.log("Password is not modified. Skipping hash generation.");
    return next();
  }

  // Hash the password and update the user document
  try {
    console.log("Hashing password...");
    user.password = await bcrypt.hash(user.password, 10);
    console.log("Password hashed successfully.");
    next();
  } catch (error) {
    console.error("Error hashing password:", error.message);
    next(error);
  }
});

// Method to check if the provided password matches the hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
  try {
    const isMatch = await bcrypt.compare(password, this.password);
    console.log(`Password match status: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error("Error comparing passwords:", error.message);
    return false;
  }
};

// Method to generate JWT access token
userSchema.methods.generateAccessToken = function () {
  try {
    console.log("Generating access token...");

    const token = jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullName, // Fixed the incorrect field name
      },
      process.env.ACCESS_TOKEN_SECRET, // Secret key for signing the token
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // Token expiry time
      }
    );

    console.log("Access token generated successfully.");
    return token;
  } catch (error) {
    console.error("Error generating access token:", error.message);
    return null;
  }
};

export default mongoose.model("User", userSchema);
