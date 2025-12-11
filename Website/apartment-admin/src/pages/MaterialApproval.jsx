import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Card, 
  CardContent, 
  CardActions,
  Typography, 
  Box, 
  Stack, 
  Button,
  Avatar,
  Divider,
  Chip
} from "@mui/material";
import {
  Build as BuildIcon,
  Description as DescriptionIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  HourglassEmpty as PendingIcon
} from "@mui/icons-material";
import Loader from "../components/Loader.jsx";
import { useToast } from "../hooks/useToast";
import { format } from "date-fns";

export default function MaterialApproval() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState({});
  const { showToast } = useToast();

  useEffect(()=>{
    const q = query(collection(db,"material_requests"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, (snap)=>{
      setItems(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    return ()=>unsub();
  },[]);

  const setStatus = async (id, status) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(db, "material_requests", id), { 
        status,
        reviewedAt: new Date().toISOString()
      });
      showToast(`Material request ${status} successfully`, "success");
    } catch {
      showToast(`Failed to ${status} material request`, "error");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (!items) return <Loader />;

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <PendingIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Material Requests
        </Typography>
        <Typography color="text.secondary">
          All material approval requests will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Material Approvals
        </Typography>
        <Typography color="text.secondary">
          Review and manage material requests ({items.length} total)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {items.map(item => {
          const isPending = (item.status || "pending") === "pending";
          const isLoading = loading[item.id];
          const ts = item.createdAt?.toDate?.() || null;
          const date = ts ? format(ts, "MMM d, yyyy HH:mm") : null;
          
          return (
            <Box key={item.id} sx={{ width: 'calc(25% - 12px)', minWidth: '280px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  borderLeft: `4px solid ${isPending ? '#ff9800' : item.status === 'approved' ? '#4caf50' : '#f44336'}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <BuildIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="h3">
                          {item.name || 'Unnamed Request'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip 
                            label={item.status || 'pending'}
                            color={isPending ? 'warning' : item.status === 'approved' ? 'success' : 'error'}
                            size="small"
                          />
                          {date && (
                            <Typography variant="caption" color="text.secondary">
                              {date}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Divider />

                    {/* Details */}
                    <Stack spacing={1}>
                      {item.description && (
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <DescriptionIcon color="action" fontSize="small" sx={{ mt: 0.5 }} />
                          <Typography variant="body2">
                            <strong>Description:</strong> {item.description}
                          </Typography>
                        </Stack>
                      )}
                      
                      {date && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ScheduleIcon color="action" fontSize="small" />
                          <Typography variant="body2">
                            <strong>Requested:</strong> {date}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
                
                {/* Action Buttons */}
                {isPending && (
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        onClick={() => setStatus(item.id, "approved")}
                        disabled={isLoading}
                        fullWidth
                        size="small"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => setStatus(item.id, "rejected")}
                        disabled={isLoading}
                        fullWidth
                        size="small"
                      >
                        Reject
                      </Button>
                    </Stack>
                  </CardActions>
                )}
              </Card>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
