import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Container,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import "./App.css";
type Details = {
  scientific_name?: string;
  species?: string;
  location?: string;
  creator_or_origin?: string;
  historical_info?: string;
  usage?: string;
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState<Details>({});
  const [summary, setSummary] = useState("");

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
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

  const identifyImage = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("image", dataURLtoBlob(image));

    try {
      const response = await fetch("http://localhost:5001/api/identify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setPrediction(data.prediction || "");
      setConfidence(data.confidence || "");
      setAlternatives(data.alternatives || []);
      setCategory(data.category || "");
      setDetails(data.details || {});
      setSummary(data.summary || "");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card
        sx={{
          p: 4,
          maxWidth: 800,
          margin: "auto",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <CardContent>
          <Typography variant="h4" gutterBottom>
            🧠 AI Object Analyzer
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

          <Box
            mt={3}
            sx={{
              display: "flex",
              justifyContent: "center",
              borderRadius: "12px",
              // border: "2px dashed #ccc",
              // p: 2,
              // backgroundColor: "#fafafa",
            }}
          >
            {image && (
              <img
                src={image}
                alt="Uploaded"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "8px",
                }}
              />
            )}
          </Box>

          {image && (
            <Button
              onClick={identifyImage}
              variant="contained"
              sx={{
                mt: 3,
                backgroundColor: "#e74c3c",
                "&:hover": {
                  backgroundColor: "#c0392b",
                  transform: "scale(1.03)",
                  transition: "all 0.2s ease-in-out",
                },
              }}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={24} /> : <SearchIcon />
              }
            >
              {loading ? "Analyzing..." : "Identify Image"}
            </Button>
          )}

          {prediction && (
            <Typography variant="h6" sx={{ mt: 3, color: "#6C63FF" }}>
              Prediction: {prediction}
            </Typography>
          )}

          {confidence && (
            <Typography variant="body2" sx={{ color: "#00b894" }}>
              Confidence: {confidence}
            </Typography>
          )}

          {alternatives.length > 0 && (
            <Typography variant="body1">
              Alternatives: {alternatives.join(", ")}
            </Typography>
          )}

          {/* {category && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              📦 Category: {category}
            </Typography>
          )} */}

          {summary && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              {summary}
            </Typography>
          )}

          {/* {details &&
            Object.keys(details).some(
              (key) => details[key as keyof Details]
            ) && (
              <Box mt={3}>
                <Typography variant="h6">More Information:</Typography>
                {details.scientific_name && (
                  <Typography>
                    🔬 Scientific Name: {details.scientific_name}
                  </Typography>
                )}
                {details.species && (
                  <Typography>🧬 Species: {details.species}</Typography>
                )}
                {details.location && (
                  <Typography>📍 Location: {details.location}</Typography>
                )}
                {details.creator_or_origin && (
                  <Typography>
                    🎨 Origin: {details.creator_or_origin}
                  </Typography>
                )}
                {details.historical_info && (
                  <Typography>🏛️ History: {details.historical_info}</Typography>
                )}
                {details.usage && (
                  <Typography>🛠️ Usage: {details.usage}</Typography>
                )}
              </Box>
            )} */}
        </CardContent>
      </Card>
    </Container>
  );
}

export default App;
