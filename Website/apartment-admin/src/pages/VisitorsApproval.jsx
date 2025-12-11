import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Card, 
  CardContent, 
  CardActions,
  Typography, 
  Box, 
  Stack, 
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from "@mui/material";
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Cancel as RejectIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import Loader from "../components/Loader.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { useToast } from "../hooks/useToast.js";

export default function VisitorsApproval() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, visitor: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"visitors"), (snap)=>{
      setItems(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    return ()=>unsub();
  },[]);

  const setStatus = async (id, status) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(db, "visitors", id), { status });
      showToast(`Visitor ${status} successfully`, "success");
    } catch {
      showToast(`Failed to ${status.toLowerCase()} visitor`, "error");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteClick = (visitor) => {
    setDeleteDialog({ open: true, visitor });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.visitor) return;
    
    setDeleteLoading(true);
    try {
      await deleteDoc(doc(db, "visitors", deleteDialog.visitor.id));
      showToast(`Visitor record for "${deleteDialog.visitor.name || 'Unknown'}" deleted successfully`, "success");
    } catch {
      showToast("Failed to delete visitor record. Please try again.", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteDialog({ open: false, visitor: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, visitor: null });
  };

  if (!items) return <Loader />;

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          No Visitor Requests
        </Typography>
        <Typography color="text.secondary">
          All visitor approval requests will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Visitor Approvals
        </Typography>
        <Typography color="text.secondary">
          Review and manage visitor access requests ({items.length} total)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {items.map(v => {
          const isPending = String(v.status || "").toLowerCase() === "pending";
          const isLoading = loading[v.id];
          
          return (
            <Box key={v.id} sx={{ width: 'calc(33.33% - 16px)', minWidth: '320px' }}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    elevation: 8,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Stack spacing={2}>
                    {/* Header with visitor name and status */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="h3">
                            {v.visitor_name || "Unknown Visitor"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {v.id.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Stack>
                      <StatusChip status={v.status} />
                    </Stack>

                    <Divider />

                    {/* Visitor details */}
                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <HomeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Apartment:</strong> {v.apartment_name || "Not specified"}
                        </Typography>
                      </Stack>
                      
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          <strong>Visit Reason:</strong> {v.visit_reason || "Not specified"}
                        </Typography>
                      </Stack>
                      
                      {(v.check_in || v.check_out) && (
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <TimeIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            <strong>Schedule:</strong> 
                            {v.check_in && ` In: ${v.check_in}`}
                            {v.check_out && ` | Out: ${v.check_out}`}
                            {!v.check_in && !v.check_out && " Not specified"}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
                
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                    {isPending ? (
                      <>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => setStatus(v.id, "approved")}
                          disabled={isLoading}
                          sx={{ flex: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<RejectIcon />}
                          onClick={() => setStatus(v.id, "rejected")}
                          disabled={isLoading}
                          sx={{ flex: 1 }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Chip 
                        label={`Status: ${v.status}`}
                        color={v.status === 'approved' ? 'success' : 'error'}
                        sx={{ flex: 1, justifyContent: 'center' }}
                      />
                    )}
                    
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(v)}
                      disabled={isLoading}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: 'error.50',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardActions>
              </Card>
            </Box>
          );
        })}
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
            <Typography variant="h6">Delete Visitor Record</Typography>
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete the visitor record for{' '}
            <strong>"{deleteDialog.visitor?.name || 'Unknown Visitor'}"</strong>?
          </DialogContentText>
          
          {deleteDialog.visitor && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Visitor:</strong> {deleteDialog.visitor.name || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Apartment:</strong> {deleteDialog.visitor.apartmentName || 'Not specified'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Visit Reason:</strong> {deleteDialog.visitor.visitReason || 'Not specified'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {deleteDialog.visitor.status || 'Pending'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteLoading}
            startIcon={<DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
