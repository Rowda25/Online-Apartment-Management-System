import React, { useState } from "react";
import { 
  TextField, 
  Button, 
  Stack, 
  Typography, 
  MenuItem, 
  Grid,
  Box,
  Card,
  CardContent,
  InputAdornment,
  Chip,
  IconButton
} from "@mui/material";
import {
  Home as HomeIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  Hotel as BedroomIcon,
  Bathtub as BathroomIcon,
  Straighten as SizeIcon,
  PhotoCamera as CameraIcon
} from "@mui/icons-material";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast.js";

export default function AddApartment() {
  const [form, setForm] = useState({
    name: "", 
    location: "", 
    price: "", 
    bedrooms: "",
    bathrooms: "",
    size: "",
    status: "available", 
    details: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [image, setImage] = useState(null); 
  const nav = useNavigate();
  const { showToast } = useToast();

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Apartment name is required";
    if (!form.location.trim()) newErrors.location = "Location is required";
    if (!form.price || Number(form.price) <= 0) newErrors.price = "Valid price is required";
    if (!form.bedrooms || Number(form.bedrooms) < 0) newErrors.bedrooms = "Enter bedrooms";
    if (!form.bathrooms || Number(form.bathrooms) < 0) newErrors.bathrooms = "Enter bathrooms";
    if (!form.size || Number(form.size) <= 0) newErrors.size = "Enter apartment size";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async() => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, "apartments"), {
        ...form,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        size: Number(form.size),
        createdAt: serverTimestamp(),
        image: image || null
      });
      showToast("Apartment added successfully!", "success");
      nav("/apartments");
    } catch {
      showToast("Failed to add apartment", "error");
    } finally { 
      setLoading(false); 
    }
  };

  const set = (k) => (e) => {
    setForm(s => ({...s, [k]: e.target.value}));
    if (errors[k]) {
      setErrors(prev => ({...prev, [k]: ""}));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const statusOptions = [
    { value: "available", label: "Available", color: "success" },
    { value: "occupied", label: "Occupied", color: "error" },
    { value: "maintenance", label: "Maintenance", color: "warning" }
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Add New Apartment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Fill in the details to add a new apartment to your listings
          </Typography>
        </Box>
      </Stack>

      {/* ====== IMAGE UPLOAD PLACEHOLDER ====== */}
      <Box
        sx={{
          height: 200,
          bgcolor: "grey.200",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          mb: 3,
          position: "relative"
        }}
      >
        {image ? (
          <Box
            component="img"
            src={image}
            alt="apartment"
            sx={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 2 }}
          />
        ) : (
          <CameraIcon sx={{ fontSize: 50, color: "grey.700" }} />
        )}
        <IconButton
          component="label"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            bgcolor: "white",
            "&:hover": { bgcolor: "grey.100" }
          }}
        >
          <CameraIcon />
          <input type="file" hidden accept="image/*" onChange={handleImageChange} />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* Form Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <TextField
                  label="Apartment Name"
                  value={form.name}
                  onChange={set("name")}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <HomeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., Sunset View Apartment 2A"
                />

                <TextField
                  label="Location"
                  value={form.location}
                  onChange={set("location")}
                  error={!!errors.location}
                  helperText={errors.location}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., Mogadishu, KM4"
                />

                <TextField
                  label="Price (USD)"
                  value={form.price}
                  onChange={set("price")}
                  error={!!errors.price}
                  helperText={errors.price}
                  fullWidth
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., 500"
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Bedrooms"
                    value={form.bedrooms}
                    onChange={set("bedrooms")}
                    error={!!errors.bedrooms}
                    helperText={errors.bedrooms}
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BedroomIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    label="Bathrooms"
                    value={form.bathrooms}
                    onChange={set("bathrooms")}
                    error={!!errors.bathrooms}
                    helperText={errors.bathrooms}
                    type="number"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BathroomIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                <TextField
                  label="Size (m²)"
                  value={form.size}
                  onChange={set("size")}
                  error={!!errors.size}
                  helperText={errors.size}
                  fullWidth
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SizeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={set("status")}
                  fullWidth
                >
                  {statusOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Additional Details"
                  value={form.details}
                  onChange={set("details")}
                  fullWidth
                  multiline
                  rows={3}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InfoIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="e.g., Close to market, sea view..."
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Preview</Typography>
              {image && (
                <Box
                  component="img"
                  src={image}
                  alt="preview"
                  sx={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 2, mb: 2 }}
                />
              )}
              <Typography variant="h5">{form.name || "Apartment Name"}</Typography>
              <Typography color="text.secondary" mb={1}>
                {form.location || "Location"}
              </Typography>
              <Chip
                label={statusOptions.find(s => s.value === form.status)?.label}
                color={statusOptions.find(s => s.value === form.status)?.color}
                size="small"
                sx={{ mb: 2 }}
              />
              <Typography variant="body1" fontWeight="bold">
                ${form.price || "0"} / month
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {form.bedrooms || "0"} bd • {form.bathrooms || "0"} ba • {form.size || "0"} m²
              </Typography>
              <Typography variant="body2" mt={2}>
                {form.details || "No additional details"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end">
        <Button
          onClick={() => nav("/apartments")}
          variant="outlined"
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={save}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Apartment"}
        </Button>
      </Stack>
    </Box>
  );
}
