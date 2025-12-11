import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Stack,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  InputAdornment,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput
} from "@mui/material";
import {
  Announcement as AnnouncementIcon,
  Title as TitleIcon,
  Message as MessageIcon,
  Send as SendIcon
} from "@mui/icons-material";
import { addDoc, collection, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../hooks/useToast";

export default function PostNotice() {
  const [title, setTitle] = useState("");
  const [message, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const [allApartments, setAllApartments] = useState([]);
  const [selectedApartments, setSelectedApartments] = useState([]);

  const fetchApartments = async () => {
    try {
      const snapshot = await getDocs(collection(db, "apartments"));
      const apts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllApartments(apts);
    } catch (error) {
      showToast("Failed to load apartments", "error");
    }
  };

  useEffect(() => {
    fetchApartments();
  }, []);

  const handleSelectChange = (event) => {
    const value = event.target.value;

    if (value.includes("ALL")) {
      if (selectedApartments.length === allApartments.length) {
        setSelectedApartments([]);
      } else {
        setSelectedApartments(allApartments.map((apt) => apt.id));
      }
    } else {
      setSelectedApartments(value);
    }
  };

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      showToast("Please fill in both title and message fields", "error");
      return;
    }

    if (selectedApartments.length === 0) {
      showToast("Please select at least one apartment", "error");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "admin_notices"), {
        title: title.trim(),
        message: message.trim(),
        timestamp: serverTimestamp(),
        postedBy: "Admin",
        targetApartments: selectedApartments.length === allApartments.length ? "All" : selectedApartments
      });
      setTitle("");
      setMsg("");
      setSelectedApartments([]);
      showToast("Notice posted successfully!", "success");
    } catch {
      showToast("Failed to post notice. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Post Notice
        </Typography>
        <Typography color="text.secondary">
          Create and publish announcements for all residents
        </Typography>
      </Box>

      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>
                <AnnouncementIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" component="h2">
                  Admin Notice
                </Typography>
                <Typography color="text.secondary">
                  Fill in the details below to post a new notice
                </Typography>
              </Box>
            </Stack>

            <TextField
              label="Notice Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TitleIcon color="action" />
                  </InputAdornment>
                ),
              }}
              placeholder="Enter a clear, descriptive title"
              helperText="Keep the title concise and informative"
            />

            <TextField
              label="Notice Message"
              value={message}
              onChange={(e) => setMsg(e.target.value)}
              multiline
              minRows={6}
              maxRows={12}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 2 }}>
                    <MessageIcon color="action" />
                  </InputAdornment>
                ),
              }}
              placeholder="Write your message here. Be clear and provide all necessary details..."
              helperText={`${message.length} characters`}
            />

            {/* Select Recipients Dropdown */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Select Recipients
              </Typography>

              <Select
                multiple
                fullWidth
                value={selectedApartments}
                onChange={handleSelectChange}
                input={<OutlinedInput placeholder="Choose apartment(s)" />}
                renderValue={(selected) => {
                  if (selected.length === allApartments.length) return "All Apartments";
                  return allApartments
                    .filter((apt) => selected.includes(apt.id))
                    .map((apt) => apt.name || apt.id)
                    .join(", ");
                }}
              >
                <MenuItem value="ALL">
                  <Checkbox checked={selectedApartments.length === allApartments.length} />
                  <ListItemText primary="All Apartments" />
                </MenuItem>

                {allApartments.map((apt) => (
                  <MenuItem key={apt.id} value={apt.id}>
                    <Checkbox checked={selectedApartments.includes(apt.id)} />
                    <ListItemText primary={apt.name || apt.id} />
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* Buttons */}
            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setTitle("");
                  setMsg("");
                  setSelectedApartments([]);
                }}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                Clear Form
              </Button>
              <Button
                variant="contained"
                onClick={submit}
                disabled={loading || !title.trim() || !message.trim()}
                startIcon={<SendIcon />}
                sx={{ flex: 2 }}
                size="large"
              >
                {loading ? "Posting Notice..." : "Post Notice"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
