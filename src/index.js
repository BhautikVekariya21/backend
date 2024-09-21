import dotenv from "dotenv";
import express from "express";
import connection from "./db/index.js";

// Load environment variables from the `.env` file
dotenv.config({
  path: './env',
});

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to the database
connection();

// Handle express app errors
app.on("error", (error) => {
  console.error("Express app error:", error);
  throw error;
});

// Start the server
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});


// ;(async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//     // Handle express app errors
//     app.on("error", (error) => {
//       console.error("Express app error:", error);
//       throw error;
//     });

//     // Start listening on the specified port
//     app.listen(process.env.PORT, () => {
//       console.log(`App listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("Error connecting to MongoDB", error);
//     throw error;
//   }
// })();
