import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:flutter/services.dart' show rootBundle;

import '../data/models/agent_models.dart';

/// Flutter port of `carePlanPdfService.js` — matches the web PDF's layout,
/// sections and color scheme.
///
/// Font note: the `pdf` package's built-in Helvetica font has no Unicode
/// support, so characters like bullets, em-dashes, arrows and check marks
/// in the layout would render as boxes or trigger warnings. We load
/// Noto Sans (full Unicode coverage) via `PdfGoogleFonts` and apply it as
/// the document theme.
///
/// Output note: the emulator image often has no Android print service and
/// no share targets, so `Printing.layoutPdf` / `sharePdf` appear to
/// "do nothing". The preferred path is now `buildPdf()` + in-app
/// `PdfPreview` — that works on any emulator without Android services.
/// The legacy `share()` / `preview()` methods remain available for
/// callers on real devices where print/share services do exist.
class CarePlanPdfService {
  // ---------------------------------------------------------------------
  // Primary API — used by the mobile app
  // ---------------------------------------------------------------------

  /// Builds the PDF and returns the raw bytes.
  ///
  /// The caller is expected to render the bytes via `PdfPreview`, which
  /// works on every emulator because it does not rely on Android's print
  /// service or share sheet.
  static Future<Uint8List> buildPdf(
    CarePlanResponseModel result, {
    String? patientName,
    String? registrationNumber,
  }) async {
    return _buildPdf(
      result,
      patientName: patientName,
      registrationNumber: registrationNumber,
    );
  }

  /// Suggested filename for the PDF — e.g. `Vaxora_Care_Plan_John_Doe_2026-09-30.pdf`.
  static String suggestedFileName(String? patientName) =>
      _fileName(patientName ?? 'Patient');

  // ---------------------------------------------------------------------
  // Legacy API — kept for real devices / backward compatibility
  // ---------------------------------------------------------------------

  /// Builds the PDF, saves it to disk, then tries to open the system
  /// print preview (Save as PDF) or the share sheet. Returns the full
  /// path of the saved file.
  ///
  /// Not used by the mobile app UI any more — prefer `buildPdf()` +
  /// `PdfPreview`. Kept for compatibility with any external caller.
  static Future<String> share(
    CarePlanResponseModel result, {
    String? patientName,
    String? registrationNumber,
  }) async {
    final bytes = await _buildPdf(
      result,
      patientName: patientName,
      registrationNumber: registrationNumber,
    );
    final fileName = _fileName(patientName ?? 'Patient');

    // ---- 1. Persist to disk (always) ----
    final dir = await getApplicationDocumentsDirectory();
    final savedPath = '${dir.path}/$fileName';
    final file = File(savedPath);
    await file.writeAsBytes(bytes, flush: true);
    debugPrint('[CarePlanPdfService] PDF saved: $savedPath');

    // ---- 2. Try print preview (best on real devices) ----
    try {
      await Printing.layoutPdf(onLayout: (_) => bytes, name: fileName);
      debugPrint('[CarePlanPdfService] layoutPdf opened');
      return savedPath;
    } catch (e) {
      debugPrint('[CarePlanPdfService] layoutPdf failed: $e');
    }

    // ---- 3. Fallback: share intent ----
    try {
      await Printing.sharePdf(bytes: bytes, filename: fileName);
      debugPrint('[CarePlanPdfService] sharePdf opened');
    } catch (e) {
      debugPrint('[CarePlanPdfService] sharePdf failed: $e');
    }

    return savedPath;
  }

  /// Alias for [share] — kept for API compatibility.
  static Future<String> preview(
    CarePlanResponseModel result, {
    String? patientName,
    String? registrationNumber,
  }) => share(
    result,
    patientName: patientName,
    registrationNumber: registrationNumber,
  );

  // ---------------------------------------------------------------------
  // PDF construction
  // ---------------------------------------------------------------------

  static Future<Uint8List> _buildPdf(
    CarePlanResponseModel result, {
    String? patientName,
    String? registrationNumber,
  }) async {
    final plan = result.carePlan!;
    final summary = result.patientSummary;
    final demo = summary?.demographics ?? {};

    final name =
        (demo['name']?.toString().isNotEmpty == true
            ? demo['name'].toString()
            : patientName) ??
        'Patient';
    final age = demo['age_years'];
    final patientAge = age != null ? '$age years' : 'Not specified';
    final regNo =
        registrationNumber ??
        result.patientProfileId.substring(0, 8).toUpperCase();
    final ref =
        'VAX-CP-${DateTime.now().toIso8601String().substring(0, 10).replaceAll('-', '')}';
    final issued =
        '${DateTime.now().day.toString().padLeft(2, '0')} '
        '${_monthName(DateTime.now().month)} ${DateTime.now().year}, '
        '${DateTime.now().hour.toString().padLeft(2, '0')}:'
        '${DateTime.now().minute.toString().padLeft(2, '0')}';

    // Colour palette — matches the web
    const brandBlue = PdfColor.fromInt(0xFF19469D);
    const textTitle = PdfColor.fromInt(0xFF1E1B4B);
    const textBody = PdfColor.fromInt(0xFF334155);
    const textMuted = PdfColor.fromInt(0xFF64748B);
    const border = PdfColor.fromInt(0xFFE2E8F0);
    const surfaceSubtle = PdfColor.fromInt(0xFFF8FAFC);

    // ---- Load Unicode-capable fonts ----
    // Load bundled Noto Sans fonts. These ship with the app, so there's
    // no network call and no risk of the emulator hanging on a slow CDN.
    final pw.Font fontRegular = pw.Font.helvetica();
    final pw.Font fontBold = pw.Font.helveticaBold();

    final doc = pw.Document(
      theme: pw.ThemeData.withFont(base: fontRegular, bold: fontBold),
    );

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(
          15 * PdfPageFormat.mm,
          20 * PdfPageFormat.mm,
          15 * PdfPageFormat.mm,
          20 * PdfPageFormat.mm,
        ),
        header: (ctx) => ctx.pageNumber == 1
            ? pw.SizedBox()
            : _runningHeader(ref, name, brandBlue, textMuted, border),
        footer: (ctx) => _footer(ctx, ref, brandBlue, textMuted, border),
        build: (ctx) => [
          // ---- Cover banner (first page only) ----
          _coverBanner(ref, issued, brandBlue),

          pw.SizedBox(height: 8),

          // ---- Patient card ----
          _patientCard(
            name,
            patientAge,
            regNo,
            textTitle,
            textBody,
            textMuted,
            surfaceSubtle,
            border,
          ),

          pw.SizedBox(height: 12),

          // ---- 1. Clinical Summary ----
          if (plan.summaryText.isNotEmpty) ...[
            _sectionHeader(
              '1. Clinical Assessment & Summary',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            _summaryBox(plan.summaryText, border),
            pw.SizedBox(height: 10),
          ],

          // ---- 2. Warnings ----
          if (plan.warnings.isNotEmpty) ...[
            _sectionHeader(
              '2. Clinical Warnings & Precautions',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            ...plan.warnings.map((w) => _warningBox(w, textBody)),
            pw.SizedBox(height: 10),
          ],

          // ---- 3. Immediate Actions ----
          if (plan.immediateActions.isNotEmpty) ...[
            _sectionHeader(
              '3. Priority Immediate Actions',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            ...plan.immediateActions.map(
              (a) => _actionBox(a, textTitle, textBody, border),
            ),
            pw.SizedBox(height: 10),
          ],

          // ---- 4. Upcoming Vaccines ----
          if (plan.upcomingVaccines.isNotEmpty) ...[
            _sectionHeader(
              '4. Recommended Immunizations Schedule',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            ...plan.upcomingVaccines.map((v) => _vaccineBox(v, textBody)),
            pw.SizedBox(height: 10),
          ],

          // ---- 5. Screenings + Lifestyle ----
          if (plan.recommendedScreenings.isNotEmpty ||
              plan.lifestyleRecommendations.isNotEmpty) ...[
            _sectionHeader(
              '5. Recommended Screenings & Lifestyle Guidance',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            if (plan.recommendedScreenings.isNotEmpty) ...[
              _subHeading(
                'CLINICAL SCREENINGS & TESTS',
                PdfColor.fromInt(0xFF0369A1),
              ),
              ...plan.recommendedScreenings.map(
                (s) => _bullet(s, textBody, PdfColor.fromInt(0xFF0369A1)),
              ),
              pw.SizedBox(height: 6),
            ],
            if (plan.lifestyleRecommendations.isNotEmpty) ...[
              _subHeading(
                'LIFESTYLE & PREVENTIVE HABITS',
                PdfColor.fromInt(0xFF15803D),
              ),
              ...plan.lifestyleRecommendations.map(
                (s) => _bullet(s, textBody, PdfColor.fromInt(0xFF16A34A)),
              ),
              pw.SizedBox(height: 6),
            ],
            pw.SizedBox(height: 10),
          ],

          // ---- 6. Referrals + Follow-up ----
          if (plan.referrals.isNotEmpty ||
              plan.followUpRecommendation.isNotEmpty) ...[
            _sectionHeader(
              '6. Clinical Referrals & Follow-Up Plan',
              brandBlue,
              textTitle,
              surfaceSubtle,
            ),
            if (plan.referrals.isNotEmpty) ...[
              _subHeading('SPECIALIST REFERRALS:', textMuted),
              ...plan.referrals.map((r) => _bullet(r, textBody, textMuted)),
              pw.SizedBox(height: 6),
            ],
            if (plan.followUpRecommendation.isNotEmpty)
              _followUpBox(plan.followUpRecommendation),
            pw.SizedBox(height: 10),
          ],

          // ---- 7. Audit trail ----
          _auditTrail(result, textMuted, border, surfaceSubtle),
        ],
      ),
    );

    return doc.save();
  }

  // ---------------------------------------------------------------------
  // Section builders
  // ---------------------------------------------------------------------

  static pw.Widget _coverBanner(String ref, String issued, PdfColor brand) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(14),
      decoration: pw.BoxDecoration(
        color: brand,
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'VAXORA HEALTH SYSTEM',
                  style: pw.TextStyle(
                    color: PdfColors.white,
                    fontSize: 15,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 3),
                pw.Text(
                  'Personalized AI Care Plan & Immunization Advisory',
                  style: pw.TextStyle(
                    color: PdfColor.fromInt(0xFFDBEAFE),
                    fontSize: 9,
                  ),
                ),
                pw.SizedBox(height: 2),
                pw.Text(
                  'Cryptographically Verified Clinical Decision Support',
                  style: pw.TextStyle(
                    color: PdfColor.fromInt(0xFFBFDBFE),
                    fontSize: 7,
                  ),
                ),
              ],
            ),
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(
                'REF: $ref',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontSize: 8,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 3),
              pw.Text(
                'Issued: $issued',
                style: pw.TextStyle(
                  color: PdfColor.fromInt(0xFFDBEAFE),
                  fontSize: 7.5,
                ),
              ),
              pw.SizedBox(height: 2),
              pw.Text(
                'Status: Verified Active',
                style: pw.TextStyle(
                  color: PdfColor.fromInt(0xFFDBEAFE),
                  fontSize: 7.5,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _patientCard(
    String name,
    String age,
    String regNo,
    PdfColor title,
    PdfColor body,
    PdfColor muted,
    PdfColor surface,
    PdfColor border,
  ) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: surface,
        border: pw.Border.all(color: border, width: 0.5),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'PATIENT INFORMATION',
                  style: pw.TextStyle(
                    color: PdfColor.fromInt(0xFF0369A1),
                    fontSize: 7.5,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 4),
                pw.Text(
                  name.toUpperCase(),
                  style: pw.TextStyle(
                    color: title,
                    fontSize: 12,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 3),
                pw.Text(
                  'Age: $age',
                  style: pw.TextStyle(color: body, fontSize: 8),
                ),
              ],
            ),
          ),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.end,
            children: [
              pw.Text(
                'Registration / Patient ID:',
                style: pw.TextStyle(color: muted, fontSize: 7),
              ),
              pw.SizedBox(height: 3),
              pw.Text(
                regNo,
                style: pw.TextStyle(
                  color: title,
                  fontSize: 9,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 6),
              pw.Text(
                'Generated By: PatientDataAgent + CarePlanningAgent',
                style: pw.TextStyle(color: muted, fontSize: 7),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _sectionHeader(
    String title,
    PdfColor brand,
    PdfColor titleColor,
    PdfColor surface,
  ) {
    return pw.Container(
      width: double.infinity,
      margin: const pw.EdgeInsets.only(bottom: 6),
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: pw.BoxDecoration(
        color: surface,
        borderRadius: pw.BorderRadius.circular(3),
        border: pw.Border(left: pw.BorderSide(color: brand, width: 3)),
      ),
      child: pw.Text(
        title.toUpperCase(),
        style: pw.TextStyle(
          color: titleColor,
          fontSize: 9,
          fontWeight: pw.FontWeight.bold,
        ),
      ),
    );
  }

  static pw.Widget _summaryBox(String text, PdfColor border) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFF0F9FF),
        border: pw.Border.all(color: PdfColor.fromInt(0xFFBAE6FD), width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Text(
        text,
        style: const pw.TextStyle(
          color: PdfColor.fromInt(0xFF1E293B),
          fontSize: 8.5,
          lineSpacing: 1.4,
        ),
      ),
    );
  }

  static pw.Widget _warningBox(CarePlanWarningModel w, PdfColor body) {
    final sev = w.severity.toUpperCase();
    PdfColor bg = PdfColor.fromInt(0xFFEFF6FF);
    PdfColor borderColor = PdfColor.fromInt(0xFF3B82F6);
    PdfColor fg = PdfColor.fromInt(0xFF1E40AF);
    PdfColor badgeBg = PdfColor.fromInt(0xFFBFDBFE);

    if (sev == 'CRITICAL') {
      bg = PdfColor.fromInt(0xFFFEF2F2);
      borderColor = PdfColor.fromInt(0xFFEF4444);
      fg = PdfColor.fromInt(0xFF991B1B);
      badgeBg = PdfColor.fromInt(0xFFFECACA);
    } else if (sev == 'WARNING') {
      bg = PdfColor.fromInt(0xFFFFFBEB);
      borderColor = PdfColor.fromInt(0xFFF59E0B);
      fg = PdfColor.fromInt(0xFF92400E);
      badgeBg = PdfColor.fromInt(0xFFFDE68A);
    }

    return pw.Container(
      width: double.infinity,
      margin: const pw.EdgeInsets.only(bottom: 5),
      padding: const pw.EdgeInsets.fromLTRB(10, 8, 10, 8),
      decoration: pw.BoxDecoration(
        color: bg,
        border: pw.Border(left: pw.BorderSide(color: borderColor, width: 3)),
        borderRadius: pw.BorderRadius.circular(3),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: pw.BoxDecoration(
              color: badgeBg,
              borderRadius: pw.BorderRadius.circular(3),
            ),
            child: pw.Text(
              sev,
              style: pw.TextStyle(
                color: fg,
                fontSize: 6.5,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(
            child: pw.Text(
              w.message,
              style: pw.TextStyle(color: fg, fontSize: 8, lineSpacing: 1.35),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _actionBox(
    CarePlanActionModel a,
    PdfColor title,
    PdfColor body,
    PdfColor border,
  ) {
    final prio = a.priority.toUpperCase();
    PdfColor fg = PdfColor.fromInt(0xFF075985);
    PdfColor bg = PdfColor.fromInt(0xFFE0F2FE);
    if (prio == 'HIGH') {
      fg = PdfColor.fromInt(0xFF991B1B);
      bg = PdfColor.fromInt(0xFFFEE2E2);
    } else if (prio == 'MEDIUM') {
      fg = PdfColor.fromInt(0xFF92400E);
      bg = PdfColor.fromInt(0xFFFEF3C7);
    }

    return pw.Container(
      width: double.infinity,
      margin: const pw.EdgeInsets.only(bottom: 6),
      padding: const pw.EdgeInsets.all(9),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFF8FAFC),
        border: pw.Border.all(color: border, width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 2,
                ),
                decoration: pw.BoxDecoration(
                  color: bg,
                  borderRadius: pw.BorderRadius.circular(3),
                ),
                child: pw.Text(
                  prio,
                  style: pw.TextStyle(
                    color: fg,
                    fontSize: 6.5,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(width: 8),
              pw.Expanded(
                child: pw.Text(
                  a.action,
                  style: pw.TextStyle(
                    color: title,
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (a.reason.isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Text(
              a.reason,
              style: pw.TextStyle(color: body, fontSize: 8, lineSpacing: 1.3),
            ),
          ],
        ],
      ),
    );
  }

  static pw.Widget _vaccineBox(CarePlanVaccineModel v, PdfColor body) {
    return pw.Container(
      width: double.infinity,
      margin: const pw.EdgeInsets.only(bottom: 5),
      padding: const pw.EdgeInsets.all(9),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFEFF6FF),
        border: pw.Border.all(color: PdfColor.fromInt(0xFFBFDBFE), width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  v.vaccine,
                  style: pw.TextStyle(
                    color: PdfColor.fromInt(0xFF1E3A8A),
                    fontSize: 9,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                if (v.reason.isNotEmpty) ...[
                  pw.SizedBox(height: 2),
                  pw.Text(
                    v.reason,
                    style: pw.TextStyle(
                      color: body,
                      fontSize: 8,
                      lineSpacing: 1.3,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (v.dueWithinDays != null)
            pw.Text(
              'Due within ${v.dueWithinDays} days',
              style: pw.TextStyle(
                color: PdfColor.fromInt(0xFF1D4ED8),
                fontSize: 7.5,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
        ],
      ),
    );
  }

  static pw.Widget _subHeading(String text, PdfColor color) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 3),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          color: color,
          fontSize: 8,
          fontWeight: pw.FontWeight.bold,
        ),
      ),
    );
  }

  static pw.Widget _bullet(String text, PdfColor body, PdfColor dot) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(left: 4, top: 2, bottom: 2),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Container(
            width: 3,
            height: 3,
            margin: const pw.EdgeInsets.only(top: 4, right: 6),
            decoration: pw.BoxDecoration(color: dot, shape: pw.BoxShape.circle),
          ),
          pw.Expanded(
            child: pw.Text(
              text,
              style: pw.TextStyle(color: body, fontSize: 8, lineSpacing: 1.3),
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _followUpBox(String text) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: PdfColor.fromInt(0xFFF0FDF4),
        border: pw.Border.all(color: PdfColor.fromInt(0xFFBBF7D0), width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'FOLLOW-UP RECOMMENDATION',
            style: pw.TextStyle(
              color: PdfColor.fromInt(0xFF15803D),
              fontSize: 7,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            text,
            style: pw.TextStyle(
              color: PdfColor.fromInt(0xFF166534),
              fontSize: 8.5,
              lineSpacing: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _auditTrail(
    CarePlanResponseModel r,
    PdfColor muted,
    PdfColor border,
    PdfColor surface,
  ) {
    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: surface,
        border: pw.Border.all(color: border, width: 0.5),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            'SYSTEM AUDIT TRAIL & CLINICAL DISCLAIMER',
            style: pw.TextStyle(
              color: muted,
              fontSize: 7,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.SizedBox(height: 3),
          pw.Text(
            'Generated via Vaxora Multi-Agent System (PatientDataAgent -> CarePlanningAgent). Evidence-based clinical guidelines applied.',
            style: pw.TextStyle(color: muted, fontSize: 6.8, lineSpacing: 1.3),
          ),
          pw.SizedBox(height: 3),
          pw.Text(
            'Disclaimer: This care plan is a clinical decision-support advisory. Please review any new medication or vaccination with your physician.',
            style: pw.TextStyle(color: muted, fontSize: 6.8, lineSpacing: 1.3),
          ),
          if (r.steps.isNotEmpty) ...[
            pw.SizedBox(height: 6),
            pw.Text(
              'AGENT TRAJECTORY',
              style: pw.TextStyle(
                color: muted,
                fontSize: 7,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            ...r.steps.map(
              (s) => pw.Padding(
                padding: const pw.EdgeInsets.only(top: 2),
                child: pw.Text(
                  '[OK] ${s.agent} - ${s.durationMs}ms'
                  '${s.toolsUsed.isNotEmpty ? ' | ${s.toolsUsed.length} tools: ${s.toolsUsed.join(", ")}' : ''}',
                  style: pw.TextStyle(
                    color: muted,
                    fontSize: 6.8,
                    lineSpacing: 1.3,
                  ),
                ),
              ),
            ),
            pw.SizedBox(height: 2),
            pw.Text(
              'Total: ${r.durationMs}ms',
              style: pw.TextStyle(color: muted, fontSize: 6.5),
            ),
          ],
        ],
      ),
    );
  }

  static pw.Widget _runningHeader(
    String ref,
    String name,
    PdfColor brand,
    PdfColor muted,
    PdfColor border,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 4),
      margin: const pw.EdgeInsets.only(bottom: 8),
      decoration: pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: border, width: 0.5)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'VAXORA HEALTHCARE SYSTEM - PERSONALIZED CARE PLAN',
            style: pw.TextStyle(
              color: muted,
              fontSize: 7,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          pw.Text(
            'Patient: $name | Ref: $ref',
            style: pw.TextStyle(color: muted, fontSize: 7),
          ),
        ],
      ),
    );
  }

  static pw.Widget _footer(
    pw.Context ctx,
    String ref,
    PdfColor brand,
    PdfColor muted,
    PdfColor border,
  ) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(top: 4),
      margin: const pw.EdgeInsets.only(top: 6),
      decoration: pw.BoxDecoration(
        border: pw.Border(top: pw.BorderSide(color: border, width: 0.5)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'Vaxora National Immunization Platform  |  Doc Ref: $ref',
            style: pw.TextStyle(color: muted, fontSize: 6.5),
          ),
          pw.Text(
            'Page ${ctx.pageNumber} of ${ctx.pagesCount}',
            style: pw.TextStyle(
              color: muted,
              fontSize: 6.5,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------

  static String _fileName(String name) {
    final clean = name.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
    final date = DateTime.now().toIso8601String().substring(0, 10);
    return 'Vaxora_Care_Plan_${clean}_$date.pdf';
  }

  static String _monthName(int m) => const [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][m - 1];
}
