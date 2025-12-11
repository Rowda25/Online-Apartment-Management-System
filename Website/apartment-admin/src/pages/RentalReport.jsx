import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Container,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { Home as HomeIcon } from "@mui/icons-material";
import { format, isAfter } from 'date-fns';

export default function ApartmentList() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState({});

  // Fetch rental information
  useEffect(() => {
    console.log('Setting up rentals listener...');
    const unsubRentals = onSnapshot(collection(db, 'rentals'), (snap) => {
      console.log('Received rentals data:', snap.docs.length, 'documents');
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

  // Fetch apartment data
  useEffect(() => {
    console.log('Setting up payments listener...');
    const unsub = onSnapshot(collection(db, 'payments'), (snap) => {
      console.log('Received payments data:', snap.docs.length, 'documents');
      const aptMap = new Map();
      
      snap.docs.forEach(doc => {
        const payment = doc.data();
        if (payment.apartment?.name) {
          const aptName = payment.apartment.name;
          if (!aptMap.has(aptName)) {
            aptMap.set(aptName, {
              name: aptName,
              number: payment.apartment.number || '',
              building: payment.apartment.building || '',
              id: payment.apartment.id || doc.id
            });
          }
        }
      });
      
      // Convert map to array and sort by name
      const sortedApts = Array.from(aptMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setApartments(sortedApts);
      setLoading(false);
    });
    
    return () => unsub();
  }, []);

  console.log('Rendering RentalReport with state:', { 
    loading, 
    apartmentsCount: apartments.length,
    rentalsCount: Object.keys(rentals).length 
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <HomeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Apartment List
        </Typography>
      </Box>
      
      {/* Debug Info - Will remove after fixing */}
      <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" color="textSecondary">
          Debug Info: {loading ? 'Loading...' : `${apartments.length} apartments, ${Object.keys(rentals).length} rentals`}
        </Typography>
      </Box>
      
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
            {loading ? 'Loading apartments...' : `Total Apartments: ${apartments.length}`}
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : apartments.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Apartment</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell>Lease Period</TableCell>
                    <TableCell>Rent</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apartments.map((apartment, index) => {
                    return (
                      <TableRow key={index} hover>
                        <TableCell>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>🏢</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{apartment.name}</div>
                              {apartment.id && (
                                <div style={{ fontSize: '0.8em', color: '#666' }}>
                                  ID: {apartment.id.substring(0, 8)}...
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rentals[apartment.name] ? (
                            <>
                              <div style={{ fontWeight: 500 }}>{rentals[apartment.name].tenantName}</div>
                              <div style={{ fontSize: '0.8em', color: '#666' }}>
                                {rentals[apartment.name].isActive ? 'Current Tenant' : 'Previous Tenant'}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#666', fontStyle: 'italic' }}>Vacant</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rentals[apartment.name] ? (
                            <>
                              <div>Start: {rentals[apartment.name].leaseStart}</div>
                              <div>End: {rentals[apartment.name].leaseEnd}</div>
                            </>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {rentals[apartment.name]?.rentAmount || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={rentals[apartment.name] ? 'Rented' : 'Available'}
                            color={rentals[apartment.name] ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
              No apartments found
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
