import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Container,
  Box,
  MenuItem,
  TextField,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import imageCompression from "browser-image-compression";

type Recipe = {
  name: string;
  ingredients: string[];
  instructions: string[];
  estimatedCalories?: number;
  video?: string;
};

type HistoryEntry = {
  image: string;
  ingredients: string[];
  cuisine: string;
  recipes: Recipe[];
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cuisine, setCuisine] = useState("Italian");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [onDiet, setOnDiet] = useState(false);

  const cuisines = [
    "Any",
    "American",
    "Chinese",
    "French",
    "Indian",
    "Italian",
    "Japanese",
    "Korean",
    "Mexican",
    "Thai",
    "Vietnamese",
  ];

  useEffect(() => {
    const stored = localStorage.getItem("recipe_history");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const saveToHistory = (
    image: string,
    cuisine: string,
    ingredients: string[],
    newRecipes: Recipe[]
  ) => {
    setHistory((prev) => {
      const existingIndex = prev.findIndex((h) => h.image === image);
      let updated: HistoryEntry[];

      if (existingIndex !== -1) {
        const existingEntry = prev[existingIndex];
        const existingRecipeNames = new Set(
          existingEntry.recipes.map((r) => r.name)
        );

        const uniqueNewRecipes = newRecipes.filter(
          (r) => !existingRecipeNames.has(r.name)
        );

        const updatedEntry = {
          ...existingEntry,
          recipes: [...existingEntry.recipes, ...uniqueNewRecipes],
        };

        updated = [...prev];
        updated[existingIndex] = updatedEntry;
      } else {
        updated = [
          { image, cuisine, ingredients, recipes: newRecipes },
          ...prev,
        ];
      }

      localStorage.setItem("recipe_history", JSON.stringify(updated));
      return updated;
    });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Compress the image if it's too big
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1, // Limit size to under 1MB
        useWebWorker: true,
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Image compression failed:", error);
    }
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const generateRecipes = async () => {
    if (!image) return;
    setLoading(true);
    setIngredients([]);
    setRecipes([]);

    const formData = new FormData();
    formData.append("image", dataURLtoBlob(image));
    formData.append("cuisine", cuisine);
    formData.append("dishCount", "1");
    formData.append("onDiet", onDiet.toString());

    try {
      const res = await fetch("http://localhost:5001/api/recipes", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setIngredients(data.ingredients || []);
      setRecipes(data.dishes || []);
      saveToHistory(image, cuisine, data.ingredients, data.dishes);
    } catch (error) {
      console.error("Error generating recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnotherRecipe = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setRecipes([]);

    try {
      const res = await fetch(
        "http://localhost:5001/api/recipe-from-ingredients",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredients,
            cuisine,
            onDiet,
          }),
        }
      );
      const data = await res.json();
      setRecipes(data.dishes || []);
      if (image) {
        saveToHistory(image, cuisine, ingredients, data.dishes);
      }
    } catch (error) {
      console.error("Error generating another recipe:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card sx={{ p: 4 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            🍳 AI-Powered Recipe Generator
          </Typography>

          <input
            type="file"
            accept="image/*"
            hidden
            id="image-upload"
            onChange={handleImageUpload}
          />
          <label htmlFor="image-upload">
            <Button variant="contained" component="span">
              Upload Image
            </Button>
          </label>

          {image && (
            <Box mt={3} display="flex" justifyContent="center">
              <img
                src={image}
                alt="Uploaded"
                style={{ maxWidth: "100%", maxHeight: "300px" }}
              />
            </Box>
          )}

          <Box mt={3}>
            <TextField
              select
              fullWidth
              label="Select Cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
            >
              {cuisines.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box mt={2}>
            <label>
              <input
                type="checkbox"
                checked={onDiet}
                onChange={(e) => setOnDiet(e.target.checked)}
              />
              <Typography component="span" sx={{ ml: 1 }}>
                I’m on a diet
              </Typography>
            </label>
          </Box>

          <Button
            onClick={generateRecipes}
            variant="contained"
            sx={{ mt: 3 }}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={24} /> : <SearchIcon />
            }
            fullWidth
          >
            {loading ? "Generating..." : "Generate Recipes"}
          </Button>

          {ingredients.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6">🧄 Detected Ingredients:</Typography>
              <Typography>{ingredients.join(", ")}</Typography>
            </Box>
          )}

          {recipes.length > 0 && (
            <Box mt={4}>
              <Typography variant="h5" gutterBottom>
                🍽 Suggested Dish:
              </Typography>
              <Grid container spacing={3}>
                {recipes.map((dish, index) => (
                  <Grid item xs={12} key={index}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{dish.name}</Typography>
                        <Typography>
                          <strong>Ingredients:</strong>{" "}
                          {dish.ingredients.join(", ")}
                        </Typography>
                        <Typography>
                          <strong>Estimated Calories:</strong>{" "}
                          {dish.estimatedCalories} kcal
                        </Typography>

                        <Typography sx={{ mt: 1 }}>
                          <strong>Instructions:</strong>
                        </Typography>
                        <ul>
                          {dish.instructions.map((step, i) => (
                            <li key={i}>
                              <Typography>{step}</Typography>
                            </li>
                          ))}
                        </ul>
                        {dish.video && (
                          <>
                            <Typography sx={{ mt: 1 }}>
                              <a
                                href={dish.video}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                📺 Watch on YouTube
                              </a>
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Suggested YouTube video — steps and ingredients
                              may differ from recepie and instructions.
                            </Typography>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Button
                onClick={generateAnotherRecipe}
                variant="outlined"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                🔁 Generate Another Recipe
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 🧾 HISTORY SECTION */}
      {history.length > 0 && (
        <Box mt={5}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h5" gutterBottom>
              📜 History
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                localStorage.removeItem("recipe_history");
                setHistory([]);
              }}
            >
              🗑️
            </Button>
          </Box>

          {history.map((entry, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  🖼️ Image #{history.length - index} • {entry.cuisine} Cuisine
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box mb={2} display="flex" justifyContent="center">
                  <img
                    src={entry.image}
                    alt={`History ${index}`}
                    style={{ maxWidth: "100%", maxHeight: "200px" }}
                  />
                </Box>
                <Typography variant="body1" gutterBottom>
                  <strong>Ingredients:</strong> {entry.ingredients.join(", ")}
                </Typography>

                <Grid container spacing={3}>
                  {entry.recipes.map((dish, i) => (
                    <Grid item xs={12} key={i}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{dish.name}</Typography>
                          <Typography>
                            <strong>Ingredients:</strong>{" "}
                            {dish.ingredients.join(", ")}
                          </Typography>
                          <Typography sx={{ mt: 1 }}>
                            <strong>Instructions:</strong>
                          </Typography>
                          <ol>
                            {dish.instructions.map((step, j) => (
                              <li key={j}>
                                <Typography>{step}</Typography>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Container>
  );
}

export default App;
