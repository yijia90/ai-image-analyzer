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
import { useDropzone } from "react-dropzone";

type Recipe = {
  name: string;
  ingredients: string[];
  instructions: string[];
  estimatedCalories?: number;
  video?: string;
};

// type HistoryEntry = {
//   image: string;
//   ingredients: string[];
//   cuisine: string;
//   recipes: Recipe[];
// };

function App() {
  const [image, setImage] = useState<string | null>(null);
  // const [loading, setLoading] = useState(false);
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingAnother, setLoadingAnother] = useState(false);

  const [cuisine, setCuisine] = useState("Italian");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [onDiet, setOnDiet] = useState(false);
  const [dishCount, setDishCount] = useState(1);

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

  // useEffect(() => {
  //   const stored = localStorage.getItem("recipe_history");
  //   if (stored) setHistory(JSON.parse(stored));
  // }, []);

  // const saveToHistory = (
  //   image: string,
  //   cuisine: string,
  //   ingredients: string[],
  //   newRecipes: Recipe[]
  // ) => {
  //   setHistory((prev) => {
  //     const existingIndex = prev.findIndex((h) => h.image === image);
  //     let updated: HistoryEntry[];

  //     if (existingIndex !== -1) {
  //       const existingEntry = prev[existingIndex];
  //       const existingRecipeNames = new Set(
  //         existingEntry.recipes.map((r) => r.name)
  //       );

  //       const uniqueNewRecipes = newRecipes.filter(
  //         (r) => !existingRecipeNames.has(r.name)
  //       );

  //       const updatedEntry = {
  //         ...existingEntry,
  //         recipes: [...existingEntry.recipes, ...uniqueNewRecipes],
  //       };

  //       updated = [...prev];
  //       updated[existingIndex] = updatedEntry;
  //     } else {
  //       updated = [
  //         { image, cuisine, ingredients, recipes: newRecipes },
  //         ...prev,
  //       ];
  //     }

  //     localStorage.setItem("recipe_history", JSON.stringify(updated));
  //     return updated;
  //   });
  // };
  const compressAndRead = async (file: File) => {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      useWebWorker: true,
    });
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(compressedFile);
  };

  const handleImageUploadFromDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) await compressAndRead(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    onDrop: handleImageUploadFromDrop,
  });

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
    setLoadingMain(true);

    setIngredients([]);
    setRecipes([]);

    const formData = new FormData();
    formData.append("image", dataURLtoBlob(image));
    formData.append("cuisine", cuisine);
    // formData.append("dishCount", "1");
    formData.append("onDiet", onDiet.toString());
    formData.append("dishCount", dishCount.toString());

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/recipes`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      setIngredients(data.ingredients || []);
      setRecipes(data.dishes || []);
      // saveToHistory(image, cuisine, data.ingredients, data.dishes);
    } catch (error) {
      console.error("Error generating recipes:", error);
    } finally {
      setLoadingMain(false);
    }
  };

  const generateAnotherRecipe = async () => {
    if (ingredients.length === 0) return;
    setLoadingAnother(true);

    // setRecipes([]);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/recipe-from-ingredients`,
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
      // setRecipes(data.dishes || []);
      setRecipes((prev) => [...prev, ...(data.dishes || [])]);

      // if (image) {
      //   saveToHistory(image, cuisine, ingredients, data.dishes);
      // }
    } catch (error) {
      console.error("Error generating another recipe:", error);
    } finally {
      setLoadingAnother(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, opacity: 0.97 }}>
      <Card sx={{ p: 4, mt: 4 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom align="center">
            🍳 AI-Powered Recipe Generator
          </Typography>
          {/* <Typography variant="subtitle1" align="center" sx={{ mb: 3 }}>
            Upload your ingredient photo and get a recipe in seconds!
          </Typography> */}

          <Box
            {...getRootProps()}
            sx={{
              p: 4,
              width: "60%",
              mx: "auto",
              border: "2px dashed #ccc",
              borderRadius: 2,
              textAlign: "center",
              cursor: "pointer",
              bgcolor: isDragActive ? "#f0f0f0" : "#fafafa",
            }}
          >
            <input {...getInputProps()} />
            <Typography>
              {isDragActive
                ? "Drop your image here..."
                : "Drag and drop an image or click to upload"}
            </Typography>
          </Box>

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

          <Box mt={3}>
            <TextField
              select
              fullWidth
              label="Number of Recipes"
              value={dishCount}
              onChange={(e) => setDishCount(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <MenuItem key={count} value={count}>
                  {count}
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
            disabled={loadingMain}
            startIcon={
              loadingMain ? (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "24px",
                    animation: "spin 1s linear infinite",
                  }}
                >
                  👨‍🍳
                </span>
              ) : (
                <SearchIcon />
              )
            }
            fullWidth
          >
            {loadingMain ? "Generating..." : "Generate Recipes"}
          </Button>

          {ingredients.length > 0 && (
            <Box mt={4}>
              <Typography variant="h6">Detected Ingredients:</Typography>
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
                          {Array.isArray(dish.ingredients)
                            ? dish.ingredients.join(", ")
                            : "N/A"}
                        </Typography>

                        <Typography>
                          <strong>Estimated Calories:</strong>{" "}
                          {dish.estimatedCalories} kcal
                        </Typography>

                        <Typography sx={{ mt: 1 }}>
                          <strong>Instructions:</strong>
                        </Typography>
                        <ul>
                          {Array.isArray(dish.instructions) ? (
                            dish.instructions.map((step, i) => (
                              <li key={i}>
                                <Typography>{step}</Typography>
                              </li>
                            ))
                          ) : (
                            <li>
                              <Typography>N/A</Typography>
                            </li>
                          )}
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
                disabled={loadingAnother}
                startIcon={
                  loadingAnother ? (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "24px",
                        animation: "spin 1s linear infinite",
                      }}
                    >
                      👨‍🍳
                    </span>
                  ) : (
                    <SearchIcon />
                  )
                }
              >
                {loadingAnother
                  ? "Generating..."
                  : "🔁 Generate Another Recipe"}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 🧾 HISTORY SECTION */}
      {/* {history.length > 0 && (
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
                  <strong>Ingredients:</strong>{" "}
                  {Array.isArray(entry.ingredients)
                    ? entry.ingredients.join(", ")
                    : "N/A"}
                </Typography>

                <Grid container spacing={3}>
                  {entry.recipes.map((dish, i) => (
                    <Grid item xs={12} key={i}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{dish.name}</Typography>
                          <Typography>
                            <strong>Ingredients:</strong>{" "}
                            {Array.isArray(dish.ingredients)
                              ? dish.ingredients.join(", ")
                              : "N/A"}
                          </Typography>
                          <Typography sx={{ mt: 1 }}>
                            <strong>Instructions:</strong>
                          </Typography>
                          <ul>
                            {Array.isArray(dish.instructions) ? (
                              dish.instructions.map((step, i) => (
                                <li key={i}>
                                  <Typography>{step}</Typography>
                                </li>
                              ))
                            ) : (
                              <li>
                                <Typography>N/A</Typography>
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )} */}
    </Container>
  );
}

export default App;
