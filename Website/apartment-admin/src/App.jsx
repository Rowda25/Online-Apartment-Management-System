import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ApartmentsList from "./pages/ApartmentsList.jsx";
import AddApartment from "./pages/AddApartment.jsx";
import EditApartment from "./pages/EditApartment.jsx";
import IdentificationApproval from "./pages/IdentificationApproval.jsx";
import VisitorsApproval from "./pages/VisitorsApproval.jsx";
import MaterialApproval from "./pages/MaterialApproval.jsx";
import PostNotice from "./pages/PostNotice.jsx";
import Notices from "./pages/Notices.jsx";
import Rentals from "./pages/Rentals.jsx";
import RequireAdmin from "./auth/RequireAdmin.jsx";
import Sidebar from "./components/Sidebar.jsx";
import { ToastContext } from "./contexts/ToastContext.jsx";
import { Box, Container, Snackbar, Alert } from "@mui/material";



export default function App() {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status on app load
    const checkAuth = () => {
      const isLoggedIn = sessionStorage.getItem("adminLoggedIn") === "true";
      setIsAuthenticated(isLoggedIn);
    };
    
    checkAuth();
    
    // Listen for storage changes (for logout from other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const hideToast = () => {
    setToast({ ...toast, open: false });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    showToast("Logged out successfully", "info");
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // If not authenticated, show only login page
  if (!isAuthenticated) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Box>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={hideToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={hideToast} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </ToastContext.Provider>
    );
  }

  // If authenticated, show app with sidebar
  return (
    <ToastContext.Provider value={{ showToast }}>
      <Box sx={{ display: 'flex' }}>
        <Sidebar onLogout={handleLogout} />
        
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            
            <Route element={<RequireAdmin />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/apartments" element={<ApartmentsList />} />
              <Route path="/apartments/add" element={<AddApartment />} />
              <Route path="/apartments/:id/edit" element={<EditApartment />} />
              <Route path="/approvals/identifications" element={<IdentificationApproval />} />
              <Route path="/approvals/visitors" element={<VisitorsApproval />} />
              <Route path="/approvals/materials" element={<MaterialApproval />} />
              <Route path="/notice" element={<PostNotice />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/rentals" element={<Rentals />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={hideToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={hideToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
