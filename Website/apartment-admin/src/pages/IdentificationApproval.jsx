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
  Chip,
  Paper
} from "@mui/material";
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  HourglassEmpty as PendingIcon
} from "@mui/icons-material";
import Loader from "../components/Loader.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { useToast } from "../hooks/useToast";

export default function IdentificationApproval() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState({});
  const { showToast } = useToast();

  useEffect(()=>{
    const q = query(collection(db, "identifications"), orderBy("submittedAt","desc"));
    const unsub = onSnapshot(q, (snap)=>{
      setItems(snap.docs.map(d=>({ id: d.id, ...d.data() })));
    });
    return ()=>unsub();
  },[]);

  const setStatus = async (id, status) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(db, "identifications", id), { 
        status,
        reviewedAt: new Date().toISOString()
      });
      showToast(`Tenant ${status.toLowerCase()} successfully`, "success");
    } catch {
      showToast(`Failed to ${status.toLowerCase()} tenant`, "error");
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
          No Pending Tenants
        </Typography>
        <Typography color="text.secondary">
          All tenant approval requests will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tenant Approvals
        </Typography>
        <Typography color="text.secondary">
          Review and manage tenant approval requests ({items.length} total)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {items.map(item => {
          const isPending = item.status === 'Pending' || !item.status;
          const isLoading = loading[item.id];
          
          return (
            <Box key={item.id} sx={{ width: 'calc(25% - 12px)', minWidth: '280px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  borderLeft: `4px solid ${isPending ? '#ff9800' : item.status === 'Approved' ? '#4caf50' : '#f44336'}`,
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
                        <BadgeIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="h3">
                          {item.responsibleName || 'Unnamed Tenant'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StatusChip status={item.status} />
                          {item.submittedAt && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(item.submittedAt.seconds ? item.submittedAt.seconds * 1000 : item.submittedAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Divider />

                    {/* Details */}
                    <Stack spacing={1}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <HomeIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                          <strong>Apartment:</strong> {item.apartmentName || 'Not specified'}
                        </Typography>
                      </Stack>
                      
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PersonIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                          <strong>ID:</strong> {item.responsibleIdNumber || 'Not provided'}
                        </Typography>
                      </Stack>
                      
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PhoneIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                          <strong>Phone:</strong> {item.responsiblePhone || 'Not provided'}
                        </Typography>
                      </Stack>
                      
                      {item.responsibleWorkPlace && (
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <WorkIcon color="action" fontSize="small" sx={{ mt: 0.5 }} />
                          <Typography variant="body2">
                            <strong>Workplace:</strong> {item.responsibleWorkPlace}
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
                        onClick={() => setStatus(item.id, "Approved")}
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
                        onClick={() => setStatus(item.id, "Rejected")}
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
