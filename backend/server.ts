import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import type { Request, Response } from "express";
import { google } from "googleapis";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

app.use(cors());
app.use(express.json());

// For uploading image + fields
const upload = multer({ dest: "uploads/" });

async function getYouTubeVideoLink(query: string): Promise<string | null> {
  try {
    const youtube = google.youtube({
      version: "v3",
      auth: YOUTUBE_API_KEY,
    });

    const res = await youtube.search.list({
      part: ["snippet"],
      q: `${query} recipe`,
      type: ["video"],
      maxResults: 1,
    });

    const items = res.data.items;
    if (items && items.length > 0 && items[0].id?.videoId) {
      return `https://www.youtube.com/watch?v=${items[0].id.videoId}`;
    }

    return null;
  } catch (err) {
    console.error("YouTube API error:", err);
    return null;
  }
}

app.post("/api/recipes", upload.single("image"), (req, res) => {
  console.log("🍽 Recipe request received");
  (async () => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No image uploaded" });

      const cuisine = req.body.cuisine || "any";
      const dishCount = parseInt(req.body.dishCount) || 1;
      const onDiet = req.body.onDiet === "true";

      const dietPrompt = onDiet
        ? "Ensure all dishes are healthy and suitable for someone on a diet."
        : "";
      const imageBase64 = fs.readFileSync(req.file.path, {
        encoding: "base64",
      });

      const prompt = `
You are a world-class AI chef and food expert.

Step 1: Detect the ingredients in the image.

Step 2: Based on the ingredients, the user's selected cuisine (${cuisine}), and number of dishes (${dishCount}), suggest ${dishCount} dishes that could be made using those ingredients.

${dietPrompt}

Step 3: For each dish, return the following in a JSON array format:

[
  {
    "name": "Dish Name",
    "ingredients": ["ingredient1", "ingredient2", ...],
    "instructions": ["Step 1...", "Step 2...", ...],
    "estimatedCalories": number (approximate total calories for the dish)

  }
]

Also return the detected ingredients in a separate array:
{
  "ingredients": [...],
  "dishes": [...]
}

VERY IMPORTANT:
- Return only raw JSON, no \`\`\`json blocks.
- No markdown, no explanations, no extra text.
- Your response MUST start with: {
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
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1200,
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
      // Add video link to each dish
      for (const dish of content.dishes) {
        dish.video = await getYouTubeVideoLink(dish.name);
      }
      res.json(content);
    } catch (error: any) {
      console.error("❌ Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to generate recipes." });
    }
  })();
});

app.post("/api/recipe-from-ingredients", (req: Request, res: Response) => {
  (async () => {
    try {
      const { ingredients, cuisine, onDiet } = req.body;
      const dietPrompt = onDiet
        ? " Make sure the dish is healthy and diet-friendly."
        : "";
      if (
        !ingredients ||
        !Array.isArray(ingredients) ||
        ingredients.length === 0
      ) {
        return res.status(400).json({ error: "Ingredients are required" });
      }

      const prompt = `
You are an expert chef.

The user has the following ingredients: ${ingredients.join(", ")}
Cuisine preference: ${cuisine}.${dietPrompt}

Suggest one creative dish using these ingredients and cuisine.

Respond with strict JSON:
{
  "dishes": [
    {
        "name": "Dish Name",
        "ingredients": [...],
        "instructions": ["Step 1...", "Step 2...", ...],
        "estimatedCalories": number (approximate total calories for the whole dish)

    }
  ]
}
No markdown. No commentary. No formatting. JSON only. Start with {
`;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const content = JSON.parse(response.data.choices[0].message.content);
      // Add video link to each dish
      for (const dish of content.dishes) {
        dish.video = await getYouTubeVideoLink(dish.name);
      }
      res.json(content);
    } catch (error: any) {
      console.error(
        "❌ Recipe-from-ingredients error:",
        error.response?.data || error.message
      );
      res.status(500).json({ error: "Failed to generate new recipe." });
    }
  })();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
