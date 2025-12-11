import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Button
} from "@mui/material";
import { Search as SearchIcon, Print as PrintIcon } from "@mui/icons-material";

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    const rentalsRef = collection(db, "rentals");
    // If your rentals documents have createdAt timestamp, we can sort by it
    const q = query(rentalsRef);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRentals(items);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to read rentals:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return rentals.filter((r) => {
      const s = search.trim().toLowerCase();
      let matchesSearch = true;
      if (s) {
        matchesSearch =
          (r.apartmentName || "").toLowerCase().includes(s) ||
          (r.userName || "").toLowerCase().includes(s) ||
          (r.userId || "").toLowerCase().includes(s) ||
          (r.paymentNumber || "").toLowerCase().includes(s) ||
          (r.paymentReference || "").toLowerCase().includes(s);
      }

      let matchesDate = true;
      if (dateRange.startDate || dateRange.endDate) {
        const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt ? new Date(r.createdAt) : null;
        if (createdAt) {
          const startOk = !dateRange.startDate || createdAt >= new Date(dateRange.startDate);
          const endOk = !dateRange.endDate || createdAt <= new Date(dateRange.endDate + "T23:59:59");
          matchesDate = startOk && endOk;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [rentals, search, dateRange]);

  const totalPaid = useMemo(() => {
    return filtered.reduce((sum, r) => sum + (parseFloat(r.totalAmount) || 0), 0);
  }, [filtered]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);

  const columns = [
    { id: "createdAt", label: "Created", minWidth: 120 },
    { id: "apartmentName", label: "Apartment", minWidth: 160 },
    { id: "userName", label: "Tenant", minWidth: 160 },
    { id: "amount", label: "Total Amount", minWidth: 100, align: "right" },
    { id: "paymentMethod", label: "Method", minWidth: 120 },
    { id: "paymentNumber", label: "Number", minWidth: 140 },
    { id: "paymentReference", label: "Reference", minWidth: 160 },
    { id: "startDate", label: "Start", minWidth: 120 },
    { id: "endDate", label: "End", minWidth: 120 },
    { id: "rentalDays", label: "Days", minWidth: 80, align: "right" },
    { id: "status", label: "Status", minWidth: 100 }
  ];

  const renderCell = (row, col) => {
    const v = row[col.id];
    switch (col.id) {
      case "createdAt":
      case "startDate":
      case "endDate": {
        if (!v) return "N/A";
        const d = v.toDate ? v.toDate() : new Date(v);
        return isNaN(d) ? "N/A" : format(d, "MMM dd, yyyy");
      }
      case "amount": {
        const amt = row.totalAmount;
        return typeof amt === "number" ? `$${amt.toFixed(2)}` : amt ? `$${parseFloat(amt).toFixed(2)}` : "$0.00";
      }
      case "status":
        return (
          <Chip
            size="small"
            label={v || "unknown"}
            color={v === "active" ? "success" : v === "pending" ? "warning" : v === "cancelled" ? "default" : "default"}
            variant="outlined"
          />
        );
      default:
        return v || "N/A";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Rentals Report</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip label={`Total Amount: ${formatCurrency(totalPaid)}`} color="primary" variant="outlined" />
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
        </Box>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Search (apartment, tenant, id, number, reference)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
              />
            </Grid>
            <Grid item xs={6} md={3} lg={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={3} lg={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "75vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.id} align={c.align} style={{ minWidth: c.minWidth }}>{c.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2">Loading rentals...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2">No rentals found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} hover>
                      {columns.map((c) => (
                        <TableCell key={c.id} align={c.align}>{renderCell(r, c)}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2, textAlign: "right" }}>
            <Typography variant="caption">Showing {filtered.length} rentals</Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
