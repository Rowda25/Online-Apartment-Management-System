import React, { useEffect, useState } from "react";
import { Box, Grid, Card, CardContent, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [noticesCount, setNoticesCount] = useState(0);

  useEffect(() => {
    const ref = collection(db, "admin_notices");
    const unsub = onSnapshot(ref, (snap) => setNoticesCount(snap.size));
    return () => unsub();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Top Banner */}
      <Box
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: 3,
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1568605114967-8130f3a36994"
          alt="Apartment"
          style={{ width: "100%", height: "350px", objectFit: "cover" }}
        />
        <Box sx={{ p: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Family Comfort Space
          </Typography>
          <Typography color="text.secondary">
            Spacious, safe, and perfect for your family
          </Typography>
        </Box>
      </Box>

      {/* Dashboard Overview */}
      <Typography variant="h6" gutterBottom fontWeight="bold" color="purple">
        Dashboard Overview
      </Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#e3f2fd", borderRadius: 3 }}>
            <CardContent>
              <HomeIcon fontSize="large" color="primary" />
              <Typography variant="h5" fontWeight="bold">
                4
              </Typography>
              <Typography color="text.secondary">Apartments</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#e8f5e9", borderRadius: 3 }}>
            <CardContent>
              <MeetingRoomIcon fontSize="large" color="success" />
              <Typography variant="h5" fontWeight="bold">
                2
              </Typography>
              <Typography color="text.secondary">Rented</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#fff8e1", borderRadius: 3 }}>
            <CardContent>
              <PendingActionsIcon fontSize="large" color="warning" />
              <Typography variant="h5" fontWeight="bold">
                1
              </Typography>
              <Typography color="text.secondary">Pending Material</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: "#f1f8e9", borderRadius: 3 }}>
            <CardContent>
              <AssignmentTurnedInIcon fontSize="large" color="success" />
              <Typography variant="h5" fontWeight="bold">
                10
              </Typography>
              <Typography color="text.secondary">Approved Material</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Notices */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ bgcolor: "#e3f2fd", borderRadius: 3, cursor: 'pointer' }}
            onClick={() => navigate('/notices')}
          >
            <CardContent>
              <AnnouncementIcon fontSize="large" color="primary" />
              <Typography variant="h5" fontWeight="bold">
                {noticesCount}
              </Typography>
              <Typography color="text.secondary">Notices</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Identification Status */}
      <Typography variant="h6" gutterBottom fontWeight="bold" color="purple">
        Identification Status
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#e8f5e9", borderRadius: 3 }}>
            <CardContent>
              <CheckCircleIcon fontSize="large" color="success" />
              <Typography variant="h5" fontWeight="bold">
                23
              </Typography>
              <Typography color="text.secondary">Approved</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: "#fff3e0", borderRadius: 3 }}>
            <CardContent>
              <PendingActionsIcon fontSize="large" color="warning" />
              <Typography variant="h5" fontWeight="bold">
                3
              </Typography>
              <Typography color="text.secondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
