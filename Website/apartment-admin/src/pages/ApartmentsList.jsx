import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  Typography, 
  IconButton, 
  Grid, 
  Stack, 
  Button, 
  Chip,
  Box,
  Avatar,
  CardActions,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import Loader from "../components/Loader.jsx";
import { useToast } from "../hooks/useToast";

export default function ApartmentsList() {
  const [items, setItems] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, apartment: null });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { showToast } = useToast();

  useEffect(()=>{
    const q = query(collection(db, "apartments"), orderBy("name"));
    const unsub = onSnapshot(q, (snap)=>{
      setItems(snap.docs.map(d=>({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  },[]);

  const handleDeleteClick = (apartment) => {
    setDeleteDialog({ open: true, apartment });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.apartment) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "apartments", deleteDialog.apartment.id));
      showToast(`Apartment "${deleteDialog.apartment.name}" deleted successfully`, "success");
    } catch {
      showToast("Failed to delete apartment. Please try again.", "error");
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, apartment: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, apartment: null });
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'available': return 'success';
      case 'occupied': return 'error';
      case 'maintenance': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'available': return '🟢';
      case 'occupied': return '🔴';
      case 'maintenance': return '🟡';
      default: return '⚪';
    }
  };

  if (!items) return <Loader />;

  if (!items.length) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <HomeIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" color="text.secondary" gutterBottom>
        No apartments found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Start by adding your first apartment to the system
      </Typography>
      <Button 
        variant="contained" 
        size="large"
        startIcon={<HomeIcon />}
        onClick={()=>nav("/apartments/add")}
      >
        Add First Apartment
      </Button>
    </Box>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Apartments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your property listings ({items.length} total)
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          size="large"
          startIcon={<HomeIcon />}
          onClick={()=>nav("/apartments/add")}
          sx={{ px: 3 }}
        >
          Add Apartment
        </Button>
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {items.map(apt=>(
          <Box key={apt.id} sx={{ width: 'calc(25% - 18px)', minWidth: '280px' }}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  elevation: 8,
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <HomeIcon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>
                      {apt.name || "Unnamed Apartment"}
                    </Typography>
                    <Chip 
                      label={apt.status || "Unknown"}
                      color={getStatusColor(apt.status)}
                      size="small"
                      icon={<span>{getStatusIcon(apt.status)}</span>}
                    />
                  </Box>
                </Stack>

                <Stack spacing={1.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      {apt.location || "Location not specified"}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <MoneyIcon color="action" fontSize="small" />
                    <Typography variant="h6" color="primary.main" fontWeight="bold">
                      ${Number(apt.price||0).toLocaleString()}/month
                    </Typography>
                  </Box>

                  {apt.details && (
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <InfoIcon color="action" fontSize="small" sx={{ mt: 0.2 }} />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {apt.details}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>

              <Divider />
              
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  ID: {apt.id.slice(-6)}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton 
                    size="small"
                    color="primary"
                    onClick={()=>nav(`/apartments/${apt.id}/edit`)}
                    sx={{ '&:hover': { bgcolor: 'primary.50' } }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick(apt)}
                    sx={{ '&:hover': { bgcolor: 'error.50' } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'error.main' }}>
            <WarningIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">Delete Apartment</Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete the apartment{' '}
            <strong>"{deleteDialog.apartment?.name || 'Unnamed Apartment'}"</strong>?
          </DialogContentText>
          
          {deleteDialog.apartment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Location:</strong> {deleteDialog.apartment.location || 'Not specified'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Price:</strong> ${Number(deleteDialog.apartment.price || 0).toLocaleString()}/month
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {deleteDialog.apartment.status || 'Unknown'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={<DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete Apartment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
