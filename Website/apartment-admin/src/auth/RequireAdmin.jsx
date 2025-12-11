import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Loader from "../components/Loader.jsx";

/**
 * Guard: Allow access to admin routes based on session storage
 * Since we're using client-side authentication without Firebase
 */

export default function RequireAdmin() {
  const [state, setState] = useState({ loading: true, allow: false });

  useEffect(() => {
    // Check if user is logged in via session storage
    const isLoggedIn = sessionStorage.getItem("adminLoggedIn") === "true";
    setState({ loading: false, allow: isLoggedIn });
  }, []);

  if (state.loading) return <Loader />;
  return state.allow ? <Outlet /> : <Navigate to="/login" replace />;
}
