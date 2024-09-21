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
connection()
.then(()=>{
    app.listen(process.env.PORT || 8080,()=>{
        console.log(`server is running at port : ${process.env.PORT};
        {process.env.PORT}`);
    });
})
.catch((error)=>{
    console.error("Failed to connect to the database", error);
    process.exit(1);  // Exit the process with an error code 1 (non-zero) to indicate failure.  This is a common convention for Node.js applications.  Other frameworks may have different conventions.  For example, in Python, you might use `sys.exit(1)` instead.  However, in this case, the application should be designed to handle the error gracefully and continue running, so it's not necessary to exit the process.  It's just a best practice to follow the conventions of your chosen programming language.  This will make your code more maintainable and easier to debug.  In the future, consider using a logging library or framework that automatically logs errors and provides a way to handle them gracefully.  For example, in Node.js, you could use `winston` or `log4js`.  In Python, you could use `logging`.
})

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
