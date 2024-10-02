import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });
    
    const uploadcloudnary = async(localFilePath)=>{
        try{
            if(!localFilePath) return null;

            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type:"auto",
            });
            console.log("file uploaded to cloudinary",response.url);
            fs.unlinkSync(localFilePath); // Delete the file after upload to Cloudync
            return response;
        }
        catch (error) {
            fs.unlinkSync(localFilePath); // Delete the file.
            return null;
        }
    }   
      
})();

export default uploadcloudnary