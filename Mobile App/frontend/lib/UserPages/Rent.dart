import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:frontend/utils/payment.dart';
import 'package:intl/intl.dart';

class RentNowPage extends StatefulWidget {
  final String apartmentId;
  final String apartmentName;

  const RentNowPage({
    Key? key,
    required this.apartmentId,
    required this.apartmentName,
  }) : super(key: key);

  @override
  _RentNowPageState createState() => _RentNowPageState();
}

class _RentNowPageState extends State<RentNowPage> {
  // ===== Config =====
  static const int _minRentalDays = 30; // Minimum rental length in days (inclusive)

  // ===== Form & State =====
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _paymentNumberController = TextEditingController();
  final _paymentAmountController = TextEditingController();

  DateTime? _startDate;
  DateTime? _endDate;
  double? _rentPrice;
  double? _totalPrice;
  bool _isProcessing = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchApartmentDetails();
  }

  // ===== Firestore load =====
  Future<void> _fetchApartmentDetails() async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('apartments')
          .doc(widget.apartmentId)
          .get();

      if (doc.exists) {
        setState(() {
          _rentPrice = (doc.data()?['rent'] as num?)?.toDouble() ?? 0.0;
          _isLoading = false;
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Apartment not found')),
        );
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
      if (mounted) Navigator.pop(context);
    }
  }

  // ===== Helpers =====
  DateTime _now() => DateTime.now();

  DateTime _minEndDateForStart(DateTime start) =>
      start.add(Duration(days: _minRentalDays - 1));

  void _calculateTotalPrice() {
    if (_startDate != null && _endDate != null && _rentPrice != null) {
      final days = _endDate!.difference(_startDate!).inDays + 1;
      if (days >= _minRentalDays) {
        setState(() {
          _totalPrice = _rentPrice! * days;
          _paymentAmountController.text = _totalPrice!.toStringAsFixed(2);
        });
      } else {
        // Shouldn't happen due to picker constraints, but keep as a guard.
        setState(() {
          _totalPrice = null;
          _paymentAmountController.clear();
        });
      }
    } else {
      setState(() {
        _totalPrice = null;
        _paymentAmountController.clear();
      });
    }
  }

  // ===== Date Picking with Min 30 Days =====
  Future<void> _pickDate(BuildContext context, bool isStartDate) async {
    if (isStartDate) {
      final pickedStart = await showDatePicker(
        context: context,
        initialDate: _startDate ?? _now(),
        firstDate: _now(),
        lastDate: _now().add(const Duration(days: 365 * 5)),
      );

      if (pickedStart != null) {
        setState(() {
          _startDate = pickedStart;

          // If end date is missing or now too early, snap it to min end date.
          final minEnd = _minEndDateForStart(_startDate!);
          if (_endDate == null || _endDate!.isBefore(minEnd)) {
            _endDate = minEnd;
          }
        });
        _calculateTotalPrice();
      }
    } else {
      if (_startDate == null) return; // button is disabled anyway

      final minEnd = _minEndDateForStart(_startDate!);
      final pickedEnd = await showDatePicker(
        context: context,
        initialDate: (_endDate == null || _endDate!.isBefore(minEnd)) ? minEnd : _endDate!,
        firstDate: minEnd, // Enforce minimum 30-day span
        lastDate: _startDate!.add(const Duration(days: 365 * 5)),
      );

      if (pickedEnd != null) {
        setState(() {
          _endDate = pickedEnd;
        });
        _calculateTotalPrice();
      }
    }
  }

  // ===== Input Normalization & Validation =====
  // Normalize Somali MSISDN to 2526XXXXXXXX format
  String _normalizeSomaliMsisdn(String raw) {
    String digits = raw.replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.startsWith('+')) {
      digits = digits.substring(1);
    }
    if (digits.startsWith('252')) {
      return digits; // already with country code
    }
    if (digits.startsWith('0') && digits.length >= 9) {
      // remove leading 0 and prepend 252
      return '252${digits.substring(1)}';
    }
    // As a fallback, if length looks like 8-9 local digits, prepend 252
    if (digits.length >= 8 && digits.length <= 9) {
      return '252$digits';
    }
    return digits;
  }

  bool _amountBelowProviderMinimum(double amount) {
    // Waafi and wallets often reject very small amounts; enforce >= 0.10
    return amount < 0.10;
  }

  // ===== Payment =====
  Future<void> _processPayment() async {
    if (!_formKey.currentState!.validate()) return;

    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select start and end dates')),
      );
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End date cannot be before start date')),
      );
      return;
    }

    final rentalDays = _endDate!.difference(_startDate!).inDays + 1;
    if (rentalDays < _minRentalDays) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Minimum rental is $_minRentalDays days.')),
      );
      return;
    }

    if (_totalPrice == null || _totalPrice == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Total amount is invalid')),
      );
      return;
    }

    // Provider minimum guard
    if (_amountBelowProviderMinimum(_totalPrice!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Amount too small for the payment provider. Please increase the rental period or amount (>= 0.10).'),
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      final refId = 'REF-${DateTime.now().millisecondsSinceEpoch}';

      // ✅ Waafi API Payment Call
      final normalizedAccount = _normalizeSomaliMsisdn(_paymentNumberController.text.trim());
      final paymentResponse = await Payment.paymentProcessing(
        phoneNumber: normalizedAccount,
        amount: _totalPrice!.toStringAsFixed(2),
        referenceId: refId,
        description: 'Apartment Rent Payment for ${widget.apartmentName}',
      );

      if (!(paymentResponse['success'] == true)) {
        throw Exception(paymentResponse['message'] ?? 'Payment failed');
      }

      final invoiceId = paymentResponse['invoiceRef'];

      // ✅ Save rental & payment info in Firestore
      final batch = FirebaseFirestore.instance.batch();
      final rentalRef = FirebaseFirestore.instance.collection('rentals').doc();
      final paymentRef = FirebaseFirestore.instance.collection('payments').doc();
      final apartmentRef = FirebaseFirestore.instance
          .collection('apartments')
          .doc(widget.apartmentId);

      final rentalData = {
        'apartmentId': widget.apartmentId,
        'apartmentName': widget.apartmentName,
        'userId': user.uid,
        'userName': _nameController.text.trim(),
        'userPhone': _phoneController.text.trim(),
        'startDate': Timestamp.fromDate(_startDate!),
        'endDate': Timestamp.fromDate(_endDate!),
        'rentPrice': _rentPrice,
        'totalAmount': _totalPrice,
        'rentalDays': rentalDays,
        'paymentMethod': 'Mobile Money',
        'paymentNumber': _paymentNumberController.text.trim(),
        'paymentReference': invoiceId,
        'status': 'active',
        'createdAt': Timestamp.now(),
      };

      final paymentData = {
        'userId': user.uid,
        'apartmentId': widget.apartmentId,
        'amount': _totalPrice,
        'paymentMethod': 'Mobile Money',
        'paymentNumber': _paymentNumberController.text.trim(),
        'paymentReference': invoiceId,
        'status': 'completed',
        'createdAt': Timestamp.now(),
      };

      batch.set(rentalRef, rentalData);
      batch.set(paymentRef, paymentData);
      batch.update(apartmentRef, {'status': 'rented'});

      await batch.commit();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment successful! Invoice: $invoiceId'),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ===== UI =====
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rent Apartment'),
        backgroundColor: Colors.deepPurple,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Text(
                widget.apartmentName,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Text('Rent: \$${_rentPrice?.toStringAsFixed(2)} per day'),
              const SizedBox(height: 8),
              const Text(
                'Minimum rental: 30 days',
                style: TextStyle(color: Colors.deepPurple, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Enter your name' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Phone',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value == null || value.isEmpty ? 'Enter phone' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _paymentNumberController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Payment Number',
                  helperText: 'Use Somali format: 2526XXXXXXXX or 6XXXXXXXX',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Enter payment number';
                  }
                  final raw = value.trim();
                  final normalized = _normalizeSomaliMsisdn(raw);
                  // Basic sanity: must be digits, start with 2526 or local 6/7, and length >= 9 local
                  final digitsOnly = normalized.replaceAll(RegExp(r'[^0-9]'), '');
                  if (!digitsOnly.startsWith('252') && !(raw.startsWith('6') || raw.startsWith('7'))) {
                    return 'Invalid number. Start with 6/7 or country code 252';
                  }
                  // Expect 252 + 9 local digits (total 12 or 13 if leading zero existed)
                  if (digitsOnly.length < 12) {
                    return 'Number too short. Expected 252 followed by 9 digits';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _paymentAmountController,
                enabled: false,
                decoration: const InputDecoration(
                  labelText: 'Total Amount',
                  border: OutlineInputBorder(),
                ),
              ),

              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.date_range),
                      label: Text(
                        _startDate == null
                            ? 'Start Date'
                            : DateFormat('yyyy-MM-dd').format(_startDate!),
                      ),
                      onPressed: () => _pickDate(context, true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.date_range),
                      label: Text(
                        _endDate == null
                            ? 'End Date'
                            : DateFormat('yyyy-MM-dd').format(_endDate!),
                      ),
                      onPressed:
                          _startDate == null ? null : () => _pickDate(context, false),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isProcessing ? null : _processPayment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepPurple,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isProcessing
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('CONFIRM PAYMENT'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
