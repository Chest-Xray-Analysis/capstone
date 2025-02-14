/**
 * ---IMPORTS---
 * 
 * The imports for Binary and sharp are important for the MongoDB and image processing functionality.
 * 
 * Sharp is a high-performance image processing library that allows us to resize and compress images before storing them in the database.
 * 
 * The Binary class is used to store binary data in MongoDB. We will use it to store the compressed image data.
 * --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * ---Usage---
 * THIS API ENDPOITN IS UTLIZED BY DASHHOARD.SVELTE TO UPLOAD IMAGES TO THE DATABASE
 * --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * 
 * ---Overview and Functionality---
 * The ALLOWED_MIME_TYPES array contains the MIME types that are allowed for image uploads. We will only accept JPEG, PNG, and WebP images.
 * 
 * The connectDB function is an async function that connects to the MongoDB database and returns the database object
 * 
 * The POST function is the main function that handles the image upload. 
 * - It takes the request and cookies as parameters.
 * - It parses the session from the cookies and checks if the user is authenticated.
 * - It gets the uploaded file from the request data. It checks if the file is a valid image and if it is one of the allowed MIME types.
 * - It converts the file to a buffer and compresses the image using sharp.
 * - It connects to the database, stores the compressed image data, and updates the user's images array with the new image.
 * - It returns a success message if the upload is successful or an error message if there is an issue.
 * 
 * @params {request, cookies}
 * @returns {json}
 * 
 * --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 * ---Errors/Feedback---
 * 
 * Following are the error messages that can be returned:
 * 
 * - 401: Not authenticated
 * - 400: Invalid session data  or Session missing username
 * - 400: No valid image uploaded
 * - 415: Invalid file type. Only JPEG, PNG, and WebP are allowed.
 * - 404: User not found or image not saved
 * - 500: Internal server error
 * 
 * It returns the following success message 
 * - 201: Upload successful
 * --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 */


import { MongoClient, Binary } from "mongodb";
import { json } from "@sveltejs/kit";
import sharp from "sharp";

const MONGO_URI = "mongodb+srv://chestxraygrpacc:y40YFGS0bNGSPHSY@chestxray.qfyks.mongodb.net/?retryWrites=true&w=majority"; 
const DATABASE_NAME = "ChestXraydb";

// Allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Connect to MongoDB
async function connectDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    return client.db(DATABASE_NAME);

}

export async function POST({ request, cookies }) {
    // ✅ Parse session from cookies
    const sessionCookie = cookies.get("session");
    if (!sessionCookie) {
        return json({ error: "Not authenticated" }, { status: 401 });
    }

    let session;
    try {
        session = JSON.parse(sessionCookie);
    } catch (error) {
        return json({ error: "Invalid session data" }, { status: 400 });
    }

    const username = session._username;
    if (!username) {
        return json({ error: "Session missing username" }, { status: 400 });
    }

    // ✅ Get uploaded file
    const data = await request.formData();
    const file = data.get("file");

    if (!file || !(file instanceof Blob)) {
        return json({ error: "No valid image uploaded" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 415 });
    }

    try {
        // ✅ Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const inputBuffer = Buffer.from(arrayBuffer);

        // ✅ Compress image using sharp
        const compressedBuffer = await sharp(inputBuffer)
            .resize(512) // Resize to 512px width
            .jpeg({ quality: 70 }) // Convert to JPEGz
            .toBuffer();

        // ✅ Connect to DB & store image
        const db = await connectDB();
        const users = db.collection("users");

        const newImage = {
            filename: file.name, // Store original filename
            data: new Binary(compressedBuffer), // Store as binary data
            predictions: [], // Empty array for AI model results
            timestamp: new Date() // Current timestamp
        };

        // Push new image into user's images array
        const updateResult = await users.updateOne(
            { _username: username },
            { $push: { images: newImage } }
        );

        if (updateResult.modifiedCount > 0) {
            return json({ message: "Upload successful" }, { status: 201 });
        } else {
            return json({ error: "User not found or image not saved" }, { status: 404 });
        }
    } catch (error) {
        console.error("Upload error:", error);
        return json({ error: "Internal server error" }, { status: 500 });
    }
}
