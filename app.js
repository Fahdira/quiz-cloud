require("dotenv").config();
const express = require("express");
const path = require("path");
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const PORT = 3000;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async (req, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
    }));

    const images = await Promise.all((data.Contents || []).map(async item => {
      if (item.Key.endsWith("/")) return null;

      const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: item.Key
      }), { expiresIn: 3600 });

      return {
        key: item.Key,
        url,
      };
    }));

    res.render("index", { images: images.filter(Boolean) });
  } catch (err) {
    console.error("Error fetching images:", err);
    res.send("Failed to load gallery.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
