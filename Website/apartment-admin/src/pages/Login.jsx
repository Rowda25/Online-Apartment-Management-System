import React, { useState } from "react";
import { 
  TextField, 
  Button, 
  Paper, 
  Stack, 
  Typography, 
  Box,
  Card,
  CardContent,
  Avatar,
  InputAdornment,
  IconButton,
  Divider
} from "@mui/material";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
  AdminPanelSettings as AdminIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast.js";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123"; // sida Flutter-ka looga gudbayo

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const nav = useNavigate();
  const { showToast } = useToast();

  const doLogin = async () => {
    setErr("");
    setLoading(true);
    
    try {
      // Check if credentials match admin constants
      if (email.trim() === ADMIN_EMAIL && pass.trim() === ADMIN_PASSWORD) {
        // Set session storage to mark user as logged in
        sessionStorage.setItem("adminLoggedIn", "true");
        // Show success toast and notify parent component
        showToast("Login successful! Welcome to Admin Dashboard", "success");
        setTimeout(() => {
          onLoginSuccess();
          nav("/dashboard", { replace: true });
          setLoading(false);
        }, 1000); // Small delay to show toast before redirect
        return;
      }
      
      // Check if user entered something but it's not the correct admin credentials
      if (email.trim() !== "" && pass.trim() !== "") {
        setErr("Invalid email or password");
        return;
      }
      
      // If fields are empty
      if (email.trim() === "" || pass.trim() === "") {
        setErr("Please enter email and password");
        return;
      }
      
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 50%, #d5d5d5 100%)',
        p: 2,
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'auto'
      }}
    >
      <Card 
        elevation={24}
        sx={{ 
          maxWidth: 450, 
          width: '100%',
          borderRadius: 4,
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center">
            {/* Header with Avatar */}
            <Box sx={{ textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'primary.main',
                  mb: 2,
                  mx: 'auto'
                }}
              >
                <AdminIcon fontSize="large" />
              </Avatar>
              <Typography variant="h4" component="h1" gutterBottom>
                Admin Portal
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Sign in to access the management dashboard
              </Typography>
            </Box>

            <Divider sx={{ width: '100%' }} />

            {/* Login Form */}
            <Stack spacing={3} sx={{ width: '100%' }}>
              <TextField 
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && doLogin()}
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter your admin email"
                error={!!err}
              />
              
              <TextField 
                label="Password"
                type={showPassword ? "text" : "password"}
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && doLogin()}
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter your password"
                error={!!err}
              />

              {err && (
                <Typography color="error" variant="body2" sx={{ textAlign: 'center' }}>
                  {err}
                </Typography>
              )}

              <Button
                variant="contained"
                onClick={doLogin}
                disabled={loading}
                startIcon={<LoginIcon />}
                size="large"
                fullWidth
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem'
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Stack>

            {/* Demo Credentials Info */}
            <Box 
              sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 2, 
                width: '100%',
                textAlign: 'center'
              }}
            >
            
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
