require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const path = require("path");

const app = express();
const port = 3000;
app.use(express.static("public"));

// Configure AWS S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Set up Multer for file uploads (stores files in memory before uploading)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files (CSS, JS)
app.use(express.static("public"));

// Set up view engine (EJS for rendering HTML)
app.set("view engine", "ejs");

// Function to upload files to S3
const uploadFileToS3 = async (file) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: Date.now().toString() + "-" + file.originalname,
            Body: file.buffer,
            ContentType: file.mimetype
        }
    });

    return upload.done(); // Returns upload result
};

// Route: Show images from S3
app.get("/", async (req, res) => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME
        });
        const data = await s3.send(command);

        const images = data.Contents
            ? data.Contents.map(item => ({
                  name: item.Key,
                  url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`
              }))
            : [];

        res.render("index", { images });
    } catch (err) {
        console.error("Error fetching images:", err);
        res.status(500).send("Error loading images");
    }
});

// Route: Upload file to S3
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const result = await uploadFileToS3(req.file);
        console.log("Upload success:", result);

        res.redirect("/");
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).send("Error uploading file.");
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
