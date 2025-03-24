import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.post("/api/identify", upload.single("image"), (req, res) => {
  console.log("File uploaded:", req.file?.path);
  console.log("Sending image to OpenAI...");
  (async () => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }

      const imageBase64 = fs.readFileSync(req.file.path, {
        encoding: "base64",
      });

      const prompt = `
Analyze the image and identify the main object.
Respond in JSON only. Do NOT include markdown or triple backticks.
Respond in this strict JSON format:

{
  "prediction": "The name of the object",
  "confidence": "Confidence score as a percentage",
  "alternatives": ["Alternative 1", "Alternative 2", "Alternative 3"],
  "summary": "A short, friendly explanation of the object (no more than 80 words)"
}
`;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      fs.unlinkSync(req.file.path);

      const content = JSON.parse(response.data.choices[0].message.content);

      res.json(content);
    } catch (error: any) {
      console.error("Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to process image" });
    }
  })();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
