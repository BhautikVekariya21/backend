import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// CORS setup
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Fallback to allow all origins
    credentials: true,
}));

// Middleware to parse JSON bodies and URL-encoded data
app.use(express.json());  // To parse JSON payloads
app.use(express.urlencoded({ extended: true }));  // To parse URL-encoded payloads

// Middleware to parse cookies
app.use(cookieParser());

//routes import
import userRouter from './routes/user.routes.js';

//routes declaration
app.use("/api/v1/users",userRouter)

export {app}