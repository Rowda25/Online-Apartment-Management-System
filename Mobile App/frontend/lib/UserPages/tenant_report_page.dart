import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:frontend/services/pdf_rental_invoice_service.dart';
import 'package:pdf/pdf.dart' as pdfx;
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

class TenantReportPage extends StatefulWidget {
  const TenantReportPage({super.key});

  @override
  State<TenantReportPage> createState() => _TenantReportPageState();
}

class _RentalsReportTable extends StatelessWidget {
  final String userId;
  final NumberFormat currency;
  final bool Function(dynamic ts) inRange;
  final String searchQuery;

  const _RentalsReportTable({
    required this.userId,
    required this.currency,
    required this.inRange,
    required this.searchQuery,
  });

  List<Map<String, dynamic>> _applySearch(List<Map<String, dynamic>> items) {
    final q = searchQuery.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((m) {
      final apt = (m['apartmentName'] ?? '').toString().toLowerCase();
      final tenant = (m['userName'] ?? '').toString().toLowerCase();
      final numbr = (m['paymentNumber'] ?? '').toString().toLowerCase();
      final ref = (m['paymentReference'] ?? '').toString().toLowerCase();
      return apt.contains(q) || tenant.contains(q) || numbr.contains(q) || ref.contains(q);
    }).toList();
  }

  String _fmtDate(dynamic ts) {
    if (ts is Timestamp) return DateFormat('MMM d, yyyy').format(ts.toDate());
    if (ts is DateTime) return DateFormat('MMM d, yyyy').format(ts);
    return '-';
  }

  @override
  Widget build(BuildContext context) {
    final rentalsStream = FirebaseFirestore.instance
        .collection('rentals')
        .where('userId', isEqualTo: userId)
        .snapshots();


    return StreamBuilder<QuerySnapshot>(
      stream: rentalsStream,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
        }
        if (snap.hasError) return Center(child: Text('Error: ${snap.error}'));

        final current = (snap.data?.docs ?? [])
            .map((d) => d.data() as Map<String, dynamic>)
            .where((m) => inRange(m['startDate']))
            .map((m) => {
                  'createdAt': m['createdAt'] ?? Timestamp.now(),
                  'apartmentName': m['apartmentName'] ?? '-',
                  'userName': m['userName'] ?? '-',
                  'totalAmount': m['totalAmount'] ?? m['totalPrice'] ?? 0,
                  'paymentMethod': m['paymentMethod'] ?? '-',
                  'paymentNumber': m['paymentNumber'] ?? '-',
                  'paymentReference': m['paymentReference'] ?? '-',
                  'status': (m['status'] ?? '-').toString(),
                  'startDate': m['startDate'],
                  'endDate': m['endDate'],
                })
            .toList();

        return _buildTable(context, current);
      },
    );
  }

  Widget _buildTable(BuildContext context, List<Map<String, dynamic>> items) {
    // Sort and filter
    items.sort((a, b) {
      final aTs = a['createdAt'];
      final bTs = b['createdAt'];
      final aDate = aTs is Timestamp ? aTs.toDate() : DateTime(0);
      final bDate = bTs is Timestamp ? bTs.toDate() : DateTime(0);
      return bDate.compareTo(aDate);
    });
    final filtered = _applySearch(items);

    final totalPaid = filtered.fold<double>(0, (sum, m) {
      final v = m['totalAmount'];
      return sum + (v is num ? v.toDouble() : double.tryParse('$v') ?? 0);
    });

    Color _statusColor(String s) {
      final v = s.toLowerCase();
      if (v.contains('active') || v.contains('completed') || v.contains('paid')) return Colors.green;
      if (v.contains('pending') || v.contains('processing')) return Colors.orange;
      if (v.contains('cancel') || v.contains('failed') || v.contains('declined')) return Colors.red;
      return Colors.grey;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Chip(
                label: Text('Total Amount: ${currency.format(totalPaid)}'),
                backgroundColor: Colors.deepPurple.shade50,
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 900),
              child: DataTable(
                headingRowColor: MaterialStatePropertyAll(Colors.deepPurple.shade50),
                columns: const [
                  DataColumn(label: Text('Created')),
                  DataColumn(label: Text('Apartment')),
                  DataColumn(label: Text('Tenant')),
                  DataColumn(label: Text('Total Amount')),
                  DataColumn(label: Text('Method')),
                  DataColumn(label: Text('Number')),
                  DataColumn(label: Text('Reference')),
                  DataColumn(label: Text('Status')),
                  DataColumn(label: Text('Start')),
                  DataColumn(label: Text('End')),
                ],
                rows: filtered.map((m) {
                  final amount = m['totalAmount'] ?? 0;
                  final status = (m['status'] ?? '-').toString();
                  final statusCap = status.isNotEmpty ? status[0].toUpperCase() + status.substring(1) : '-';
                  return DataRow(cells: [
                    DataCell(Text(_fmtDate(m['createdAt']))),
                    DataCell(Text(m['apartmentName'] ?? '-')),
                    DataCell(Text(m['userName'] ?? '-')),
                    DataCell(Text(currency.format((amount is num) ? amount : double.tryParse('$amount') ?? 0))),
                    DataCell(Text(m['paymentMethod'] ?? '-')),
                    DataCell(Text(m['paymentNumber'] ?? '-')),
                    DataCell(Text(m['paymentReference'] ?? '-')),
                    DataCell(Chip(
                      label: Text(statusCap),
                      labelStyle: const TextStyle(color: Colors.white),
                      backgroundColor: _statusColor(status),
                      visualDensity: VisualDensity.compact,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    )),
                    DataCell(Text(_fmtDate(m['startDate']))),
                    DataCell(Text(_fmtDate(m['endDate']))),
                  ]);
                }).toList(),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _UnifiedReportList extends StatelessWidget {
  final String userId;
  final NumberFormat currency;
  final bool Function(dynamic ts) inRange;
  final String legacyPhone;
  final String searchQuery;

  const _UnifiedReportList({
    required this.userId,
    required this.currency,
    required this.inRange,
    required this.legacyPhone,
    required this.searchQuery,
  });

  List<Map<String, dynamic>> _applySearch(List<Map<String, dynamic>> items) {
    final q = searchQuery.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((m) {
      final apt = (m['apartmentName'] ?? '').toString().toLowerCase();
      final ref = (m['paymentReference'] ?? m['ref'] ?? '').toString().toLowerCase();
      return apt.contains(q) || ref.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    // Rentals stream (current)
    final rentalsStream = FirebaseFirestore.instance
        .collection('rentals')
        .where('userId', isEqualTo: userId)
        .snapshots();

    // Payments stream
    final paymentsStream = FirebaseFirestore.instance
        .collection('payments')
        .where('userId', isEqualTo: userId)
        .snapshots();

    // Legacy rentals stream (optional)
    final legacyStream = legacyPhone.trim().isEmpty
        ? null
        : FirebaseFirestore.instance
            .collection('apartment_rentals')
            .where('customer_phone', isEqualTo: legacyPhone.trim())
            .snapshots();

    return StreamBuilder<QuerySnapshot>(
      stream: rentalsStream,
      builder: (context, rentalsSnap) {
        if (rentalsSnap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
        }
        if (rentalsSnap.hasError) {
          return Center(child: Text('Error: ${rentalsSnap.error}'));
        }

        final rentals = (rentalsSnap.data?.docs ?? [])
            .map((d) => d.data() as Map<String, dynamic>)
            .where((m) => inRange(m['startDate']))
            .map((m) => {
                  ...m,
                  'type': 'rental',
                  'createdAt': m['createdAt'] ?? Timestamp.now(),
                })
            .toList();

        return StreamBuilder<QuerySnapshot>(
          stream: paymentsStream,
          builder: (context, paymentsSnap) {
            if (paymentsSnap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
            }
            if (paymentsSnap.hasError) {
              return Center(child: Text('Error: ${paymentsSnap.error}'));
            }

            final payments = (paymentsSnap.data?.docs ?? [])
                .map((d) => d.data() as Map<String, dynamic>)
                .map((m) => {
                      'type': 'payment',
                      'amount': m['amount'],
                      'paymentMethod': m['paymentMethod'],
                      'paymentReference': m['paymentReference'],
                      'createdAt': m['createdAt'] ?? Timestamp.now(),
                    })
                .toList();

            if (legacyStream == null) {
              return _buildUnifiedList(context, rentals, payments);
            }

            return StreamBuilder<QuerySnapshot>(
              stream: legacyStream,
              builder: (context, legacySnap) {
                if (legacySnap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
                }
                if (legacySnap.hasError) {
                  return Center(child: Text('Error: ${legacySnap.error}'));
                }

                final legacy = (legacySnap.data?.docs ?? [])
                    .map((d) => d.data() as Map<String, dynamic>)
                    .where((m) => inRange(m['start_date']))
                    .map((m) => {
                          'type': 'rental',
                          'apartmentName': m['apartment_name'],
                          'startDate': m['start_date'],
                          'endDate': m['end_date'],
                          'rentalDays': m['days'],
                          'totalAmount': m['total_price'],
                          'paymentReference': m['invoice_ref'],
                          'paymentNumber': m['payment_account'],
                          'createdAt': m['timestamp'] ?? Timestamp.now(),
                          'status': 'completed',
                        })
                    .toList();

                return _buildUnifiedList(context, [...rentals, ...legacy], payments);
              },
            );
          },
        );
      },
    );
  }

  Widget _buildUnifiedList(BuildContext context, List<Map<String, dynamic>> rentals, List<Map<String, dynamic>> payments) {
    // Merge and sort by createdAt desc
    final combined = <Map<String, dynamic>>[...rentals, ...payments];

    combined.sort((a, b) {
      final aTs = a['createdAt'];
      final bTs = b['createdAt'];
      final aDate = aTs is Timestamp ? aTs.toDate() : DateTime(0);
      final bDate = bTs is Timestamp ? bTs.toDate() : DateTime(0);
      return bDate.compareTo(aDate);
    });

    final searched = _applySearch(combined);

    // Summary chips
    final totalRentals = searched.where((e) => e['type'] == 'rental').length;
    final totalPayments = searched.where((e) => e['type'] == 'payment').length;
    final totalPaid = searched
        .where((e) => e['type'] == 'rental')
        .fold<double>(0, (sum, m) {
      final val = m['totalAmount'] ?? m['totalPrice'] ?? 0;
      return sum + (val is num ? val.toDouble() : double.tryParse('$val') ?? 0);
    });

    if (searched.isEmpty) {
      return const Center(child: Text('No report records found'));
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text('Rentals: $totalRentals'), backgroundColor: Colors.deepPurple.shade50),
              Chip(label: Text('Payments: $totalPayments'), backgroundColor: Colors.deepPurple.shade50),
              Chip(
                avatar: const Icon(Icons.summarize, size: 18, color: Colors.white),
                label: Text('Total Paid: ${currency.format(totalPaid)}'),
                backgroundColor: Colors.deepPurple,
                labelStyle: const TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: searched.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            padding: const EdgeInsets.all(12),
            itemBuilder: (context, index) {
              final item = searched[index];
              final type = item['type'];

              if (type == 'payment') {
                final amount = item['amount'] ?? 0;
                final method = item['paymentMethod'] ?? 'Mobile Money';
                final ref = item['paymentReference'] ?? '-';
                final createdAt = item['createdAt'];
                return Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                  child: ListTile(
                    leading: CircleAvatar(backgroundColor: Colors.green.shade100, child: const Icon(Icons.payments, color: Colors.green)),
                    title: Text('${currency.format((amount is num) ? amount : double.tryParse('$amount') ?? 0)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Reference: $ref'),
                      Text('Method: $method'),
                      Text('Date: ${createdAt is Timestamp ? DateFormat('yyyy-MM-dd HH:mm').format(createdAt.toDate()) : '-'}'),
                    ]),
                  ),
                );
              }

              // rental item
              final apartmentName = item['apartmentName'] ?? 'Apartment';
              final status = (item['status'] ?? 'active').toString();
              final startDate = item['startDate'];
              final endDate = item['endDate'];
              final days = (item['rentalDays'] ?? item['days'] ?? 0).toString();
              final totalAmount = item['totalAmount'] ?? item['totalPrice'] ?? 0;

              String _fmtDate(dynamic ts) {
                if (ts is Timestamp) return DateFormat('yyyy-MM-dd').format(ts.toDate());
                if (ts is DateTime) return DateFormat('yyyy-MM-dd').format(ts);
                return '-';
              }

              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
                child: ListTile(
                  leading: CircleAvatar(backgroundColor: Colors.deepPurple.shade100, child: const Icon(Icons.home, color: Colors.deepPurple)),
                  title: Text(apartmentName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Period: ${_fmtDate(startDate)} - ${_fmtDate(endDate)} ($days days)'),
                    Text('Amount: ${currency.format((totalAmount is num) ? totalAmount : double.tryParse('$totalAmount') ?? 0)}'),
                    Text('Status: ${status[0].toUpperCase()}${status.substring(1)}'),
                  ]),
                  trailing: IconButton(
                    icon: const Icon(Icons.picture_as_pdf, color: Colors.deepPurple),
                    tooltip: 'Invoice PDF',
                    onPressed: () async {
                      final mapped = {
                        'apartmentName': item['apartmentName'],
                        'totalPrice': item['totalAmount'] ?? item['totalPrice'],
                        'days': item['rentalDays'] ?? item['days'],
                        'customerName': item['userName'] ?? '-',
                        'customerContact': item['userPhone'] ?? '-',
                        'paymentNumber': item['paymentNumber'] ?? '-',
                        'paymentReference': item['paymentReference'] ?? '-',
                        'startDate': item['startDate'],
                        'endDate': item['endDate'],
                        'rentPrice': item['rentPrice'] ?? 0,
                        'createdAt': item['createdAt'] ?? Timestamp.now(),
                      };
                      try {
                        await PdfRentalInvoiceService.generateRentalInvoicePdf(mapped);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Invoice generated (print/share dialog will open if supported).')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to generate invoice: $e')),
                          );
                        }
                      }
                    },
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TenantReportPageState extends State<TenantReportPage> {
  final DateFormat _dateFmt = DateFormat('yyyy-MM-dd');
  final NumberFormat _currency = NumberFormat.simpleCurrency(name: 'USD');

  DateTime? _startDate;
  DateTime? _endDate;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  bool _inRange(dynamic ts) {
    DateTime? d;
    if (ts is Timestamp) d = ts.toDate();
    if (ts is DateTime) d = ts;
    if (d == null) return true;
    if (_startDate != null && d.isBefore(_startDate!)) return false;
    if (_endDate != null && d.isAfter(_endDate!)) return false;
    return true;
  }

  Future<void> _pickDate(bool isStart) async {
    final init = isStart ? (_startDate ?? DateTime.now()) : (_endDate ?? DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _exportRentalsPdf(List<Map<String, dynamic>> rentals) async {
    final doc = pw.Document();
    final pdfDate = DateFormat('d/M/yyyy');

    doc.addPage(
      pw.Page(
        build: (ctx) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('My Rentals Report', style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: pdfx.PdfColors.purple)),
                pw.Text('Date: ${pdfDate.format(DateTime.now())}', style: const pw.TextStyle(fontSize: 12)),
              ],
            ),
            pw.SizedBox(height: 12),
            pw.Text('Range: '
                '${_startDate != null ? pdfDate.format(_startDate!) : 'All'} - '
                '${_endDate != null ? pdfDate.format(_endDate!) : 'All'}'),
            pw.SizedBox(height: 12),
            pw.Table.fromTextArray(
              headerDecoration: const pw.BoxDecoration(color: pdfx.PdfColors.purple),
              headerStyle: pw.TextStyle(color: pdfx.PdfColors.white, fontWeight: pw.FontWeight.bold),
              headers: ['Apartment', 'Days', 'Total', 'Start', 'End', 'Ref'],
              data: rentals.map((r) => [
                r['apartmentName'] ?? '-',
                '${r['rentalDays'] ?? r['days'] ?? 0}',
                (_currency.format(((r['totalAmount'] ?? r['totalPrice']) as num?) ?? 0)),
                if (r['startDate'] is Timestamp) pdfDate.format((r['startDate'] as Timestamp).toDate()) else '-',
                if (r['endDate'] is Timestamp) pdfDate.format((r['endDate'] as Timestamp).toDate()) else '-',
                r['paymentReference'] ?? '-',
              ]).toList(),
              border: pw.TableBorder.all(color: pdfx.PdfColors.purple),
              cellStyle: const pw.TextStyle(fontSize: 10),
            ),
            pw.SizedBox(height: 10),
            pw.Align(
              alignment: pw.Alignment.centerRight,
              child: pw.Text('Total Records: ${rentals.length}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            ),
          ],
        ),
      ),
    );

    await Printing.layoutPdf(onLayout: (format) async => doc.save());
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Please login to view your report.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rentals Report'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        centerTitle: true,
        actions: [
          Builder(
            builder: (context) {
              return IconButton(
                tooltip: 'Export Rentals PDF',
                icon: const Icon(Icons.print),
                onPressed: () async {
                  // Gather current combined rentals with filters
                  final rentals = await _collectFilteredCombinedRentals(user.uid);
                  await _exportRentalsPdf(rentals);
                },
              );
            },
          )
        ],
      ),
      body: Column(
        children: [
          const SizedBox(height: 8),
          // Filters row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.date_range),
                    label: Text(_startDate != null ? _dateFmt.format(_startDate!) : 'Start Date'),
                    onPressed: () => _pickDate(true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.date_range),
                    label: Text(_endDate != null ? _dateFmt.format(_endDate!) : 'End Date'),
                    onPressed: () => _pickDate(false),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: const InputDecoration(
                labelText: 'Search (apartment or reference)',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _RentalsReportTable(
              userId: user.uid,
              currency: _currency,
              inRange: _inRange,
              searchQuery: _searchCtrl.text.trim(),
            ),
          ),
        ],
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _collectFilteredCombinedRentals(String userId) async {
    final rentalsSnap = await FirebaseFirestore.instance
        .collection('rentals')
        .where('userId', isEqualTo: userId)
        .get();

    final List<Map<String, dynamic>> normalized = rentalsSnap.docs
        .map((d) => d.data() as Map<String, dynamic>)
        .where((r) => _inRange(r['startDate']))
        .toList();

    // Apply search filter if provided
    final q = _searchCtrl.text.trim().toLowerCase();
    if (q.isEmpty) {
      // Sort client-side by createdAt desc (avoid composite index)
      normalized.sort((a, b) {
        final aTs = a['createdAt'];
        final bTs = b['createdAt'];
        final aDate = aTs is Timestamp ? aTs.toDate() : DateTime(0);
        final bDate = bTs is Timestamp ? bTs.toDate() : DateTime(0);
        return bDate.compareTo(aDate);
      });
      return normalized;
    }
    return normalized.where((m) {
      final apt = (m['apartmentName'] ?? '').toString().toLowerCase();
      final ref = (m['paymentReference'] ?? '').toString().toLowerCase();
      return apt.contains(q) || ref.contains(q);
    }).toList();
  }
}

class _CombinedUserRentalsList extends StatelessWidget {
  final String userId;
  final NumberFormat currency;
  final bool Function(dynamic ts) inRange;
  final String legacyPhone;
  final String searchQuery;

  const _CombinedUserRentalsList({
    required this.userId,
    required this.currency,
    required this.inRange,
    required this.legacyPhone,
    required this.searchQuery,
  });

  String _fmtDate(dynamic ts) {
    if (ts is Timestamp) return DateFormat('yyyy-MM-dd').format(ts.toDate());
    if (ts is DateTime) return DateFormat('yyyy-MM-dd').format(ts);
    return '-';
  }

  List<Map<String, dynamic>> _applySearch(List<Map<String, dynamic>> items) {
    final q = searchQuery.trim().toLowerCase();
    if (q.isEmpty) return items;
    return items.where((m) {
      final apt = (m['apartmentName'] ?? '').toString().toLowerCase();
      final ref = (m['paymentReference'] ?? '').toString().toLowerCase();
      return apt.contains(q) || ref.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('rentals')
          .where('userId', isEqualTo: userId)
          // Avoid composite index requirement; we'll sort client-side
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }
        final docs = snapshot.data?.docs ?? [];
        if (docs.isEmpty) {
          return const Center(child: Text('No rentals yet'));
        }

        final base = docs
            .map((d) => d.data() as Map<String, dynamic>)
            .where((r) => inRange(r['startDate']))
            .toList();

        // Sort by createdAt desc client-side
        base.sort((a, b) {
          final aTs = a['createdAt'];
          final bTs = b['createdAt'];
          final aDate = aTs is Timestamp ? aTs.toDate() : DateTime(0);
          final bDate = bTs is Timestamp ? bTs.toDate() : DateTime(0);
          return bDate.compareTo(aDate);
        });
        // Apply search filter to base
        final baseFiltered = _applySearch(base);

        if (legacyPhone.trim().isEmpty) {
          return _buildList(context, baseFiltered);
        }

        return StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('apartment_rentals')
              .where('customer_phone', isEqualTo: legacyPhone)
              .snapshots(),
          builder: (context, legacySnap) {
            if (legacySnap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
            }
            if (legacySnap.hasError) {
              return Center(child: Text('Error: ${legacySnap.error}'));
            }

            final combined = [...baseFiltered];
            for (final doc in legacySnap.data?.docs ?? []) {
              final m = doc.data() as Map<String, dynamic>;
              if (!inRange(m['start_date'])) continue;
              combined.add({
                'apartmentName': m['apartment_name'],
                'startDate': m['start_date'],
                'endDate': m['end_date'],
                'rentalDays': m['days'] ?? ((m['end_date'] is Timestamp && m['start_date'] is Timestamp)
                    ? (m['end_date'] as Timestamp).toDate().difference((m['start_date'] as Timestamp).toDate()).inDays
                    : 0),
                'totalAmount': m['total_price'],
                'paymentReference': m['invoice_ref'],
                'paymentNumber': m['payment_account'],
                'createdAt': m['timestamp'],
                'status': 'completed',
              });
            }

            // Apply search on combined
            final searched = _applySearch(combined);

            searched.sort((a, b) {
              final aTs = a['createdAt'];
              final bTs = b['createdAt'];
              final aDate = aTs is Timestamp ? aTs.toDate() : DateTime(0);
              final bDate = bTs is Timestamp ? bTs.toDate() : DateTime(0);
              return bDate.compareTo(aDate);
            });

            return _buildList(context, searched);
          },
        );
      },
    );
  }

  Widget _buildList(BuildContext context, List<Map<String, dynamic>> items) {
    final total = items.fold<double>(0, (sum, d) {
      final val = d['totalAmount'];
      return sum + (val is num ? val.toDouble() : double.tryParse('$val') ?? 0);
    });

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Row(
            children: [
              Chip(
                label: Text('Rentals: ${items.length}'),
                backgroundColor: Colors.deepPurple.shade50,
              ),
              const SizedBox(width: 8),
              Chip(
                avatar: const Icon(Icons.summarize, size: 18, color: Colors.white),
                label: Text('Total Paid: ${currency.format(total)}'),
                backgroundColor: Colors.deepPurple,
                labelStyle: const TextStyle(color: Colors.white),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            padding: const EdgeInsets.all(12),
            itemBuilder: (context, index) {
              final data = items[index];
              final apartmentName = data['apartmentName'] ?? 'Apartment';
              final status = (data['status'] ?? 'active').toString();
              final startDate = data['startDate'];
              final endDate = data['endDate'];
              final days = (data['rentalDays'] ?? data['days'] ?? 0).toString();
              final totalAmount = data['totalAmount'] ?? data['totalPrice'] ?? 0;

              return Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.deepPurple.shade100,
                    child: const Icon(Icons.home, color: Colors.deepPurple),
                  ),
                  title: Text(apartmentName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Period: ${_fmtDate(startDate)} - ${_fmtDate(endDate)} ($days days)'),
                      Text('Amount: ${currency.format((totalAmount is num) ? totalAmount : double.tryParse('$totalAmount') ?? 0)}'),
                      Text('Status: ${status[0].toUpperCase()}${status.substring(1)}'),
                    ],
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.picture_as_pdf, color: Colors.deepPurple),
                    tooltip: 'Invoice PDF',
                    onPressed: () async {
                      // Map fields to expected PDF service keys
                      final mapped = {
                        'apartmentName': data['apartmentName'],
                        'totalPrice': data['totalAmount'] ?? data['totalPrice'],
                        'days': data['rentalDays'] ?? data['days'],
                        'customerName': data['userName'] ?? '-',
                        'customerContact': data['userPhone'] ?? '-',
                        'paymentNumber': data['paymentNumber'] ?? '-',
                        'paymentReference': data['paymentReference'] ?? '-',
                        'startDate': data['startDate'],
                        'endDate': data['endDate'],
                        'rentPrice': data['rentPrice'] ?? 0,
                        'createdAt': data['createdAt'] ?? Timestamp.now(),
                      };
                      try {
                        await PdfRentalInvoiceService.generateRentalInvoicePdf(mapped);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Invoice generated (print/share dialog will open if supported).')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Failed to generate invoice: $e')),
                          );
                        }
                      }
                    },
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _UserPaymentsList extends StatelessWidget {
  final String userId;
  final NumberFormat currency;

  const _UserPaymentsList({required this.userId, required this.currency});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('payments')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }
        final docs = snapshot.data?.docs ?? [];
        if (docs.isEmpty) {
          return const Center(child: Text('No payments yet'));
        }

        final total = docs.fold<double>(0, (sum, d) {
          final data = d.data() as Map<String, dynamic>;
          final val = data['amount'];
          return sum + (val is num ? val.toDouble() : double.tryParse('$val') ?? 0);
        });

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Row(
                children: [
                  Chip(
                    label: Text('Payments: ${docs.length}'),
                    backgroundColor: Colors.deepPurple.shade50,
                  ),
                  const SizedBox(width: 8),
                  Chip(
                    avatar: const Icon(Icons.summarize, size: 18, color: Colors.white),
                    label: Text('Total: ${currency.format(total)}'),
                    backgroundColor: Colors.deepPurple,
                    labelStyle: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.separated(
                itemCount: docs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                padding: const EdgeInsets.all(12),
                itemBuilder: (context, index) {
                  final data = docs[index].data() as Map<String, dynamic>;
                  final amount = data['amount'] ?? 0;
                  final ref = data['paymentReference'] ?? '-';
                  final method = data['paymentMethod'] ?? 'Mobile Money';
                  final createdAt = data['createdAt'];

                  return Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.green.shade100,
                        child: const Icon(Icons.payments, color: Colors.green),
                      ),
                      title: Text('${currency.format((amount is num) ? amount : double.tryParse('$amount') ?? 0)}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Reference: $ref'),
                          Text('Method: $method'),
                          Text('Date: ${createdAt is Timestamp ? DateFormat('yyyy-MM-dd HH:mm').format(createdAt.toDate()) : '-'}'),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
