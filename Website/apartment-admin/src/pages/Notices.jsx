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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button
} from "@mui/material";
import { Search as SearchIcon, Announcement as AnnouncementIcon, Print as PrintIcon } from "@mui/icons-material";

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  useEffect(() => {
    const ref = collection(db, "admin_notices");
    const q = query(ref);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotices(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const s = search.trim().toLowerCase();
      let okSearch = true;
      if (s) {
        okSearch =
          (n.title || "").toLowerCase().includes(s) ||
          (n.message || "").toLowerCase().includes(s) ||
          (n.postedBy || "").toLowerCase().includes(s);
      }
      let okDate = true;
      if (dateRange.startDate || dateRange.endDate) {
        const ts = n.timestamp?.toDate ? n.timestamp.toDate() : n.timestamp ? new Date(n.timestamp) : null;
        if (ts) {
          const startOk = !dateRange.startDate || ts >= new Date(dateRange.startDate);
          const endOk = !dateRange.endDate || ts <= new Date(dateRange.endDate + "T23:59:59");
          okDate = startOk && endOk;
        }
      }
      return okSearch && okDate;
    });
  }, [notices, search, dateRange]);

  const columns = [
    { id: "timestamp", label: "Date", minWidth: 140 },
    { id: "title", label: "Title", minWidth: 200 },
    { id: "message", label: "Message", minWidth: 300 },
    { id: "postedBy", label: "Posted By", minWidth: 120 },
    { id: "target", label: "Targets", minWidth: 140 }
  ];

  const renderCell = (row, col) => {
    const v = row[col.id];
    switch (col.id) {
      case "timestamp": {
        const d = row.timestamp?.toDate ? row.timestamp.toDate() : row.timestamp ? new Date(row.timestamp) : null;
        return d ? format(d, "MMM dd, yyyy HH:mm") : "N/A";
      }
      case "message": {
        const text = row.message || "";
        return <span style={{ display: 'inline-block', maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>;
      }
      case "target": {
        const t = row.targetApartments;
        if (t === "All") return <Chip size="small" color="primary" variant="outlined" label="All Apartments" />;
        if (Array.isArray(t) && t.length > 0) return <Chip size="small" variant="outlined" label={`${t.length} apartments`} />;
        return "N/A";
      }
      default:
        return v || "N/A";
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnnouncementIcon color="primary" />
          <Typography variant="h4">Notices</Typography>
        </Box>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                size="small"
                label="Search (title, message, posted by)"
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
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '75vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.id} style={{ minWidth: c.minWidth }}>{c.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2">Loading notices...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2">No notices found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((n) => (
                    <TableRow key={n.id} hover>
                      {columns.map((c) => (
                        <TableCell key={c.id}>{renderCell(n, c)}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ p: 2, textAlign: 'right' }}>
            <Typography variant="caption">Showing {filtered.length} notices</Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
