import React, { useEffect, useState } from "react";
import { 
  TextField, 
  Button, 
  Paper, 
  Stack, 
  Typography, 
  MenuItem, 
  Grid,
  Box,
  Card,
  CardContent,
  InputAdornment,
  Chip
} from "@mui/material";
import {
  Home as HomeIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon
} from "@mui/icons-material";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../hooks/useToast.js";
import Loader from "../components/Loader.jsx";

export default function EditApartment() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const nav = useNavigate();
  const { showToast } = useToast();

  useEffect(()=>{
    (async()=>{
      const snap = await getDoc(doc(db,"apartments", id));
      setForm({ id, ...snap.data() });
    })();
  },[id]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.name?.trim()) newErrors.name = "Apartment name is required";
    if (!form.location?.trim()) newErrors.location = "Location is required";
    if (!form.price || Number(form.price) <= 0) newErrors.price = "Valid price is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async() => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "apartments", id), {
        name: form.name,
        location: form.location,
        price: Number(form.price || 0),
        details: form.details || "",
        status: form.status || "available",
      });
      showToast("Apartment updated successfully!", "success");
      nav("/apartments");
    } catch {
      showToast("Failed to update apartment", "error");
    } finally { 
      setSaving(false); 
    }
  };

  const set = (k) => (e) => {
    setForm(s => ({...s, [k]: e.target.value}));
    if (errors[k]) {
      setErrors(prev => ({...prev, [k]: ""}));
    }
  };

  const statusOptions = [
    { value: "available", label: "Available", color: "success" },
    { value: "occupied", label: "Occupied", color: "error" },
    { value: "maintenance", label: "Maintenance", color: "warning" }
  ];

  if (!form) return <Loader />;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => nav("/apartments")}
          color="inherit"
        >
          Back to Apartments
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            Edit Apartment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Update the apartment details below
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* Form Card */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent sx={{ p: 4 }}>
              <Stack spacing={3}>
                <TextField
                  label="Apartment Name"
                  value={form.name || ""}
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
                />

                <TextField
                  label="Location"
                  value={form.location || ""}
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
                />

                <TextField
                  label="Monthly Rent"
                  type="number"
                  value={form.price || ""}
                  onChange={set("price")}
                  error={!!errors.price}
                  helperText={errors.price || "Enter monthly rent amount"}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  select
                  label="Status"
                  value={form.status || "available"}
                  onChange={set("status")}
                  fullWidth
                  helperText="Current availability status"
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          size="small"
                          label={option.label}
                          color={option.color}
                        />
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Additional Details"
                  value={form.details || ""}
                  onChange={set("details")}
                  multiline
                  minRows={4}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <InfoIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Optional: Add any additional information about the apartment"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={1} sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">
                    {form.name || "Apartment name"}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {form.location || "Location"}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Monthly Rent
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    ${Number(form.price || 0).toLocaleString()}/month
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={(form.status || "available").charAt(0).toUpperCase() + (form.status || "available").slice(1)}
                    color={statusOptions.find(s => s.value === (form.status || "available"))?.color || "default"}
                    size="small"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => nav("/apartments")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={save}
          disabled={saving}
          size="large"
        >
          {saving ? "Updating..." : "Update Apartment"}
        </Button>
      </Stack>
    </Box>
  );
}
