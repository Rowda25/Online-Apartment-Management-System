import React from "react";
import { Chip } from "@mui/material";

export default function StatusChip({ status }) {
  const s = (status || "").toLowerCase();
  const color =
    s === "approved" ? "success" :
    s === "rejected" ? "error" :
    s === "pending" ? "warning" : "default";
  const label = s ? s[0].toUpperCase() + s.slice(1) : "Pending";
  return <Chip color={color} label={label} />;
}
