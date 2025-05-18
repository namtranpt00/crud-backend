import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const app = express();
app.use(cors());

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  //   credentials: {
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  //   },
});

app.get("/generate-presigned-url", async (req, res) => {
  try {
    const { filename, filetype } = req.query;
    const key = `avatars/${Date.now()}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: filetype,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.json({
      uploadUrl,
      fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    });
  } catch (err) {
    console.error("Error generating presigned URL:", err);
    res.status(500).json({ error: "Could not generate presigned URL" });
  }
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
