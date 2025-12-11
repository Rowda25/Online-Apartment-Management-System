import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { format } from 'date-fns';
import { CopyAll as CopyIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  CircularProgress,
  Tabs,
  Tab,
  Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Email as EmailIcon
} from '@mui/icons-material';

export default function PaymentReport() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [rentals, setRentals] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  // Fetch rental information
  useEffect(() => {
    const unsubRentals = onSnapshot(collection(db, 'rentals'), (snap) => {
      const rentalData = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.apartmentName) {
          rentalData[data.apartmentName] = {
            tenantName: data.tenantName || 'Vacant',
            rentAmount: data.rentAmount ? `$${parseFloat(data.rentAmount).toFixed(2)}` : 'N/A',
            leaseStart: data.leaseStart ? format(data.leaseStart.toDate(), 'MMM d, yyyy') : 'N/A',
            leaseEnd: data.leaseEnd ? format(data.leaseEnd.toDate(), 'MMM d, yyyy') : 'Month-to-Month',
            isActive: data.isActive || false
          };
        }
      });
      setRentals(rentalData);
    });
    return () => unsubRentals();
  }, []);

  // Real-time data fetching with tenant & apartment names
  useEffect(() => {
    setLoading(true);
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const paymentPromises = querySnapshot.docs.map(async (docSnap) => {
        const paymentData = { id: docSnap.id, ...docSnap.data() };

        try {
          // Fetch tenant (user) details
          if (paymentData.userId) {
            const userRef = doc(db, 'users', paymentData.userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              paymentData.tenant = {
                id: userSnap.id,
                name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
                phone: userData.phone || '',
                email: userData.email || ''
              };
            }
          }

          // Fetch apartment details
          if (paymentData.apartmentId) {
            const aptRef = doc(db, 'apartments', paymentData.apartmentId);
            const aptSnap = await getDoc(aptRef);
            if (aptSnap.exists()) {
              const aptData = aptSnap.data();
              paymentData.apartment = {
                id: aptSnap.id,
                name: aptData.name || 'Unknown Apartment',
                number: aptData.number || '',
                building: aptData.building || ''
              };
            }
          }

          return paymentData;
        } catch (error) {
          console.error("Error fetching related data:", error);
          return paymentData;
        }
      });

      const processedPayments = await Promise.all(paymentPromises);
      console.log('Processed Payments:', processedPayments);
      setPayments(processedPayments);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching payments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = () => {
    setPage(0);
  };

  // Format currency function - single implementation
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // If no search term, show all payments
      if (!searchTerm && !dateRange.startDate && !dateRange.endDate) {
        return true;
      }

      let matchesSearch = true;
      let matchesDate = true;

      // Only apply search filter if there's a search term
      if (searchTerm) {
        matchesSearch = 
          (payment.apartment?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (payment.tenant?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (payment.tenant?.phone?.includes(searchTerm) || false) ||
          (payment.tenant?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      }

      // Only apply date filter if dates are selected
      if (dateRange.startDate || dateRange.endDate) {
        const paymentDate = payment.createdAt?.toDate();
        matchesDate = !paymentDate || // Show if no date
          (!dateRange.startDate || paymentDate >= new Date(dateRange.startDate)) && 
          (!dateRange.endDate || paymentDate <= new Date(dateRange.endDate + 'T23:59:59'));
      }

      return matchesSearch && matchesDate;
    });
  }, [payments, searchTerm, dateRange]);

  // Show all filtered payments without pagination
  const paginatedPayments = useMemo(() => {
    return [...filteredPayments]; // Return a copy of the filtered array
  }, [filteredPayments]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce(
      (sum, payment) => sum + (parseFloat(payment.amount) || 0),
      0
    );
  }, [filteredPayments]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, 'MMM dd, yyyy');
  };
  
  // Group payments by tenant for contacts report
  const contactsReport = useMemo(() => {
    const contactsMap = new Map();
    
    filteredPayments.forEach(payment => {
      const tenantId = payment.tenant?.id || payment.userId;
      if (!tenantId) return;
      
      if (!contactsMap.has(tenantId)) {
        contactsMap.set(tenantId, {
          id: tenantId,
          name: payment.tenant?.name || payment.fullName || 'Unknown Tenant',
          phone: payment.tenant?.phone || payment.phone || '',
          email: payment.tenant?.email || payment.email || '',
          totalPaid: 0,
          lastPayment: null,
          paymentCount: 0,
          apartments: new Set(),
          leaseInfo: {}
        });
      }
      
      const contact = contactsMap.get(tenantId);
      contact.totalPaid += parseFloat(payment.amount) || 0;
      contact.paymentCount += 1;
      
      // Track apartments
      if (payment.apartment?.name) {
        contact.apartments.add(payment.apartment.name);
        const rentalInfo = rentals[payment.apartment.name];
        if (rentalInfo) {
          contact.leaseInfo = {
            rentAmount: rentalInfo.rentAmount,
            leaseStart: rentalInfo.leaseStart,
            leaseEnd: rentalInfo.leaseEnd,
            isActive: rentalInfo.isActive
          };
        }
      }
      
      // Update last payment date
      const paymentDate = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
      if (!contact.lastPayment || paymentDate > contact.lastPayment) {
        contact.lastPayment = paymentDate;
      }
    });
    
    // Convert to array and sort by last payment date (newest first)
    return Array.from(contactsMap.values()).sort((a, b) => {
      if (!a.lastPayment) return 1;
      if (!b.lastPayment) return -1;
      return b.lastPayment - a.lastPayment;
    });
  }, [filteredPayments, rentals]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const columns = [
    { id: 'date', label: 'Date', minWidth: 100 },
    { id: 'tenant', label: 'Tenant', minWidth: 200 },
    { id: 'apartment', label: 'Apartment', minWidth: 180 },
    { id: 'lease', label: 'Lease Info', minWidth: 200 },
    { id: 'amount', label: 'Amount', minWidth: 100, align: 'right' },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'method', label: 'Payment Method', minWidth: 120 },
    { id: 'actions', label: 'Actions', minWidth: 100 }
  ];

  const renderCell = (row, column) => {
    const value = row[column.id];
    const rentalInfo = row.apartment?.name ? rentals[row.apartment.name] : null;
    
    switch (column.id) {
      case 'tenant':
        if (!value?.name) return 'N/A';
        
        return (
          <Box>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#555'
              }}>
                {value.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{value.name}</div>
                {value.phone && (
                  <div style={{ 
                    fontSize: '0.8em', 
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>{value.phone}</span>
                    <Tooltip title="Copy phone number">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(value.phone);
                        }}
                        sx={{ p: 0, ml: 0.5 }}
                      >
                        <CopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
            {rentalInfo && (
              <Chip 
                label={rentalInfo.isActive ? 'Current Tenant' : 'Previous Tenant'}
                size="small"
                color={rentalInfo.isActive ? 'success' : 'default'}
                variant="outlined"
                sx={{ mt: 0.5, fontSize: '0.7em' }}
              />
            )}
          </Box>
        );
        
      case 'apartment':
        if (!value?.name) return 'N/A';
        
        return (
          <Box>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{ fontSize: '1.2em' }}>🏢</span>
              <div>
                <div style={{ fontWeight: 600 }}>{value.name}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                  {value.number && (
                    <Chip 
                      size="small" 
                      label={`#${value.number}`}
                      variant="outlined"
                      sx={{ height: '20px', fontSize: '0.7em' }}
                    />
                  )}
                  {value.building && (
                    <Chip 
                      size="small" 
                      label={value.building}
                      color="primary"
                      variant="outlined"
                      sx={{ height: '20px', fontSize: '0.7em' }}
                    />
                  )}
                </div>
              </div>
            </div>
            {value.id && (
              <div style={{ 
                fontSize: '0.7em', 
                color: '#666',
                marginTop: '2px',
                fontFamily: 'monospace'
              }}>
                ID: {value.id.substring(0, 8)}...
              </div>
            )}
          </Box>
        );

      case 'lease':
        return rentalInfo ? (
          <Box>
            <div style={{ fontSize: '0.9em' }}>
              <div>Rent: <strong>{rentalInfo.rentAmount}</strong></div>
              <div>Start: {rentalInfo.leaseStart}</div>
              <div>End: {rentalInfo.leaseEnd}</div>
            </div>
          </Box>
        ) : 'N/A';
        
      case 'amount':
        return `$${parseFloat(value || 0).toFixed(2)}`;
        
      case 'status':
        return (
          <Chip 
            label={value || 'Unknown'} 
            color={
              value === 'completed' ? 'success' : 
              value === 'pending' ? 'warning' : 
              value === 'failed' ? 'error' : 'default'
            }
            size="small"
            variant="outlined"
          />
        );
        
      case 'date':
        return value ? format(new Date(value.seconds * 1000), 'MMM d, yyyy') : 'N/A';
        
      default:
        return value || 'N/A';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {activeTab === 0 ? 'Payment Report' : 'Contacts Report'}
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EmailIcon />}
            onClick={() => console.log('Email report')}
          >
            Email
          </Button>
        </Box>
      </Box>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search payments"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                placeholder="Search by tenant, apartment, or reference..."
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="From"
                variant="outlined"
                size="small"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="To"
                variant="outlined"
                size="small"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
              >
                Filter
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Tooltip title="Export to PDF">
                  <IconButton>
                    <PdfIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Print">
                  <IconButton>
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Email Report">
                  <IconButton>
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 3,
              pt: 1
            }}
          >
            <Tab label="Payment History" />
            <Tab label="Contacts Report" />
          </Tabs>
          
          {activeTab === 0 ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 3, pt: 2 }}>
                <Typography variant="h6">Payment History</Typography>
                <Chip
                  label={`Total: ${formatCurrency(totalAmount)}`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.align} style={{ minWidth: column.minWidth }}>
                          {column.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                          <Typography variant="body2" sx={{ mt: 1 }}>Loading payments...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="textSecondary">
                            No payment records found
                          </Typography>
                          {(searchTerm || dateRange.startDate || dateRange.endDate) && (
                            <Button 
                              variant="text" 
                              color="primary" 
                              onClick={() => {
                                setSearchTerm('');
                                setDateRange({ startDate: '', endDate: '' });
                              }}
                              sx={{ mt: 1 }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPayments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          {columns.map((column) => (
                            <TableCell key={column.id} align={column.align}>
                              {renderCell(payment, column)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, px: 3, pb: 2, textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredPayments.length} payments
                </Typography>
              </Box>
            </>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Apartments</TableCell>
                      <TableCell align="right">Total Paid</TableCell>
                      <TableCell>Payments</TableCell>
                      <TableCell>Last Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contactsReport.length > 0 ? (
                      contactsReport.map((contact) => (
                        <TableRow key={contact.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                {contact.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                  {contact.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  ID: {contact.id.substring(0, 8)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {contact.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <span style={{ opacity: 0.7 }}>📞</span>
                                <Typography variant="body2">{contact.phone}</Typography>
                              </Box>
                            )}
                            {contact.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span style={{ opacity: 0.7 }}>✉️</span>
                                <Typography variant="body2" sx={{ fontSize: '0.85em' }}>
                                  {contact.email}
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {Array.from(contact.apartments).map((apt, idx) => (
                              <Chip 
                                key={idx} 
                                label={apt} 
                                size="small" 
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(contact.totalPaid)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={contact.paymentCount} 
                              color="primary" 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {contact.lastPayment ? format(contact.lastPayment, 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="textSecondary">
                            No contact records found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, px: 3, pb: 2, textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {contactsReport.length} contacts
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
