import React from "react";
import { CircularProgress, Box } from "@mui/material";
export default function Loader() {
  return (
    <Box sx={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:300 }}>
      <CircularProgress />
    </Box>
  );
}
