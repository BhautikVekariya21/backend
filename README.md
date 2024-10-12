
# Backend API Project

This is the backend for a full-stack web application, built using **Node.js**, **Express**, **MongoDB**, and other tools such as **Cloudinary** for image storage, and **bcrypt** for password encryption. The backend handles user authentication, password management, media uploads, and API error handling.

## Features

- **User Authentication**: Sign up, login, and change password functionalities using **JWT** for token-based authentication.
- **Password Encryption**: Secure password storage with **bcrypt** hashing.
- **Media Uploads**: Images and files are uploaded to **Cloudinary**.
- **API Error Handling**: Custom error handling middleware for improved API responses.
- **Logging**: Configured with **Winston** and **Morgan** for logging errors and requests.
- **Environment Variables**: Using **dotenv** for managing sensitive configurations.
  
## Tech Stack

- **Node.js**: JavaScript runtime for server-side programming.
- **Express**: Web framework for building RESTful APIs.
- **MongoDB**: NoSQL database for storing user and media information.
- **Mongoose**: ODM (Object Data Modeling) library for MongoDB.
- **Cloudinary**: Cloud-based image and video storage.
- **bcrypt**: Hashing library for secure password management.
- **Winston & Morgan**: For logging and monitoring.
- **Nodemon**: Utility that helps automatically restart the server during development.

## Project Setup

### Prerequisites

- Node.js
- MongoDB
- Cloudinary account for media uploads
- `.env` file for environment variables

## Database Schema

You can view the schema diagram for the project using the link below:

[View Schema Diagram on Eraser](https://app.eraser.io/workspace/yl7yZNg1c3BRbG4y1d0H?origin=share)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/BhautikVekariya21/backend.git
   ```

2. **Install dependencies**:

   Navigate to the project directory and run:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root of the project and add the following variables:

   ```bash
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
   CLOUDINARY_API_KEY=<your-cloudinary-api-key>
   CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
   JWT_SECRET=<your-jwt-secret>
   MONGO_URI=<your-mongodb-uri>
   ```

4. **Run the development server**:

   ```bash
   npm run dev
   ```

   This will start the server using **nodemon** and automatically restart the server on file changes.

### API Endpoints

#### User Authentication

- **POST** `/api/auth/signup`: User registration.
- **POST** `/api/auth/login`: User login, returns JWT token.
- **PUT** `/api/auth/change-password`: User changes password.

#### Media Upload

- **POST** `/api/upload`: Upload files to Cloudinary (requires authentication).

### Handling Password Change Issues

If you encounter errors when changing passwords, ensure you are sending **JSON** data rather than form data in the request body. Use the following structure:

```json
{
    "oldPassword": "yourOldPassword",
    "newPassword": "yourNewPassword"
}
```

Alternatively, if using form data, make sure to add the following middleware to your `index.js`:

```javascript
app.use(express.urlencoded({ extended: true }));
```

### Error Handling

The project uses a custom `ApiError` class to throw and handle errors. For example, if a user attempts to change their password with incorrect credentials, the response will include a meaningful error message.

### Cloudinary Integration

Files uploaded to Cloudinary are automatically removed from local storage after a successful upload. You can adjust this behavior in `cloudinary.js`:

```javascript
fs.unlinkSync(localFilePath); // Removes file after uploading to Cloudinary
```

---

## Contribution

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/your-feature`.
5. Open a pull request.

## Credits

All video tutorials and guidance for this backend project are based on the excellent **Chai Aur Code** YouTube channel.

You can check out the backend playlist here:

[Chai Aur Code - Backend Playlist](https://www.youtube.com/@chaiaurcode)

Special thanks to the creator of the channel for providing valuable content to learn backend development!

## Contact

For any queries, feel free to reach out:

- GitHub: [BhautikVekariya21](https://github.com/BhautikVekariya21)

---

This template provides a clear and structured `README.md` file to guide other developers through your backend project setup, key features, and usage.
