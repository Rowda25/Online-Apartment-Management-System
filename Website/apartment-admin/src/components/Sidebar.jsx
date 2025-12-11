import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Button
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  Add as AddIcon,
  CheckCircle as ApprovalIcon,
  People as VisitorsIcon,
  Build as MaterialIcon,
  Announcement as NoticeIcon,
  Assessment as ReportIcon,
  Logout as LogoutIcon
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { title: "Apartments", path: "/apartments", icon: <HomeIcon /> },
  { title: "Add Apartment", path: "/apartments/add", icon: <AddIcon /> },
  { title: "ID Approvals", path: "/approvals/identifications", icon: <ApprovalIcon /> },
  { title: "Visitor Approvals", path: "/approvals/visitors", icon: <VisitorsIcon /> },
  { title: "Material Requests", path: "/approvals/materials", icon: <MaterialIcon /> },
  { title: "Post Notice", path: "/notice", icon: <NoticeIcon /> },
  { title: "Notices", path: "/notices", icon: <NoticeIcon /> },
  { title: "Rentals", path: "/rentals", icon: <ReportIcon /> }
];

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: 'primary.main',
          color: 'white'
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Apartment Admin
        </Typography>
      </Box>
      
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
      
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  }
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.title}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
      
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          Logout
        </Button>
      </Box>
    </Drawer>
  );
}
