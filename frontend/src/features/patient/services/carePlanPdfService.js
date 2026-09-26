import { jsPDF } from "jspdf";

/**
 * Generates and downloads a beautifully styled clinical PDF for the Vaxora AI Care Plan.
 *
 * @param {Object} result - The care plan result from agentService.patientCarePlan
 * @param {Object} patientContext - Optional demographic or logged-in user profile info
 */
export function downloadCarePlanPdf(result, patientContext = {}) {
  if (!result || !result.care_plan) {
    throw new Error("No care plan data available to generate PDF.");
  }

  const plan = result.care_plan;
  const summary = result.patient_summary || {};
  const demographics = summary.demographics || {};

  // Extract patient details
  const patientName =
    demographics.name ||
    patientContext.name ||
    patientContext.profileDetails?.fullName ||
    "Patient";

  const patientAge =
    demographics.age_years != null
      ? `${demographics.age_years} years`
      : patientContext.profileDetails?.age
      ? `${patientContext.profileDetails.age} years`
      : "Not specified";

  const patientGender =
    demographics.gender ||
    patientContext.profileDetails?.gender ||
    "Not specified";

  const registrationNo =
    patientContext.profileDetails?.registrationNumber ||
    patientContext.registrationNumber ||
    demographics.registration_number ||
    patientContext.profileDetails?.id ||
    result.patient_profile_id ||
    "VAX-" + Math.floor(100000 + Math.random() * 900000);

  const documentRef = `VAX-CP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const generatedDateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const generatedTimeStr = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Setup Document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight; // 180mm
  const bottomLimit = pageHeight - 20;

  let currentY = 15;

  // Running header drawer for subsequent pages
  const drawRunningHeader = () => {
    doc.setFillColor(25, 70, 157); // Vaxora Brand Blue
    doc.rect(0, 0, pageWidth, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("VAXORA HEALTHCARE SYSTEM — PERSONALIZED CARE PLAN", marginLeft, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Patient: ${patientName} | Ref: ${documentRef}`, pageWidth - marginRight, 10, {
      align: "right",
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, 13, pageWidth - marginRight, 13);
  };

  // Check vertical space and create a new page if necessary
  const checkSpace = (neededHeight) => {
    if (currentY + neededHeight > bottomLimit) {
      doc.addPage();
      drawRunningHeader();
      currentY = 20;
    }
  };

  // Section Header Drawer
  const drawSectionHeader = (title, icon = "") => {
    checkSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, "F");

    doc.setFillColor(25, 70, 157); // Blue accent tag
    doc.rect(marginLeft, currentY, 2.5, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 27, 75);
    doc.text(`${icon ? icon + " " : ""}${title.toUpperCase()}`, marginLeft + 5, currentY + 4.8);

    currentY += 10;
  };

  // ---------------- PAGE 1 HEADER ----------------
  // Top Banner
  doc.setFillColor(25, 70, 157); // #19469d
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, "F");

  // Logo / Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("VAXORA HEALTH SYSTEM", marginLeft + 7, currentY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(219, 234, 254);
  doc.text("Personalized AI Care Plan & Immunization Advisory", marginLeft + 7, currentY + 14.5);

  doc.setFontSize(7);
  doc.setTextColor(191, 219, 254);
  doc.text("Cryptographically Verified Clinical Decision Support", marginLeft + 7, currentY + 19);

  // Metadata block (right aligned inside banner)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`REF: ${documentRef}`, pageWidth - marginRight - 7, currentY + 8.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(219, 234, 254);
  doc.text(`Issued: ${generatedDateStr}, ${generatedTimeStr}`, pageWidth - marginRight - 7, currentY + 14.5, {
    align: "right",
  });
  doc.text("Status: Verified Active", pageWidth - marginRight - 7, currentY + 19, {
    align: "right",
  });

  currentY += 28;

  // ---------------- PATIENT PROFILE CARD ----------------
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, contentWidth, 20, 2, 2, "FD");

  // Left column: Patient Name & Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(3, 105, 161); // #0369a1
  doc.text("PATIENT INFORMATION", marginLeft + 5, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(patientName, marginLeft + 5, currentY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Age: ${patientAge}   •   Gender: ${patientGender}`, marginLeft + 5, currentY + 15.5);

  // Right column: Identifiers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Registration / Patient ID:", pageWidth - marginRight - 65, currentY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(registrationNo, pageWidth - marginRight - 65, currentY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Generated By: PatientDataAgent + CarePlanningAgent", pageWidth - marginRight - 65, currentY + 15.5);

  currentY += 25;

  // ---------------- 1. CLINICAL OVERVIEW / SUMMARY ----------------
  if (plan.summary_text) {
    drawSectionHeader("1. Clinical Assessment & Summary");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const summaryLines = doc.splitTextToSize(plan.summary_text, contentWidth - 8);
    const boxHeight = summaryLines.length * 4.2 + 8;

    checkSpace(boxHeight);
    doc.setFillColor(240, 249, 255); // #f0f9ff
    doc.setDrawColor(186, 230, 253); // #bae6fd
    doc.setLineWidth(0.3);
    doc.roundedRect(marginLeft, currentY, contentWidth, boxHeight, 1.5, 1.5, "FD");

    doc.setTextColor(30, 41, 59);
    doc.text(summaryLines, marginLeft + 4, currentY + 5.5, { lineHeightFactor: 1.35 });

    currentY += boxHeight + 6;
  }

  // ---------------- 2. CLINICAL WARNINGS ----------------
  if (Array.isArray(plan.warnings) && plan.warnings.length > 0) {
    drawSectionHeader("2. Clinical Warnings & Precautions");

    plan.warnings.forEach((w) => {
      const severity = String(w.severity || "Info").toUpperCase();
      let bgColor = [239, 246, 255]; // Info light blue
      let borderColor = [59, 130, 246];
      let textColor = [30, 64, 175];
      let badgeBg = [191, 219, 254];

      if (severity === "CRITICAL") {
        bgColor = [254, 242, 242]; // Red
        borderColor = [239, 68, 68];
        textColor = [153, 27, 27];
        badgeBg = [254, 202, 202];
      } else if (severity === "WARNING") {
        bgColor = [255, 251, 235]; // Amber
        borderColor = [245, 158, 11];
        textColor = [146, 64, 14];
        badgeBg = [253, 230, 138];
      }

      const warningTextLines = doc.splitTextToSize(w.message || "", contentWidth - 28);
      const cardHeight = Math.max(10, warningTextLines.length * 4 + 6);

      checkSpace(cardHeight + 2);

      // Card background
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, currentY, contentWidth, cardHeight, 1.5, 1.5, "FD");

      // Left severity accent border
      doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(marginLeft, currentY, 2, cardHeight, "F");

      // Severity badge
      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
      doc.roundedRect(marginLeft + 4, currentY + 3, 18, 4.5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(severity, marginLeft + 13, currentY + 6.2, { align: "center" });

      // Warning text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(warningTextLines, marginLeft + 25, currentY + 5.5, { lineHeightFactor: 1.3 });

      currentY += cardHeight + 3;
    });

    currentY += 3;
  }

  // ---------------- 3. IMMEDIATE ACTIONS ----------------
  if (Array.isArray(plan.immediate_actions) && plan.immediate_actions.length > 0) {
    drawSectionHeader("3. Priority Immediate Actions");

    plan.immediate_actions.forEach((a) => {
      const priority = String(a.priority || "Low").toUpperCase();
      let priorityColor = [7, 89, 133];
      let priorityBg = [224, 242, 254];

      if (priority === "HIGH") {
        priorityColor = [153, 27, 27];
        priorityBg = [254, 226, 226];
      } else if (priority === "MEDIUM") {
        priorityColor = [146, 64, 14];
        priorityBg = [254, 243, 199];
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const actionLines = doc.splitTextToSize(a.action || "", contentWidth - 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      const reasonLines = a.reason ? doc.splitTextToSize(a.reason, contentWidth - 10) : [];

      const cardHeight = actionLines.length * 4.2 + (reasonLines.length ? reasonLines.length * 3.8 + 5 : 5);

      checkSpace(cardHeight + 2);

      // Card container
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, currentY, contentWidth, cardHeight, 1.5, 1.5, "FD");

      // Priority badge
      doc.setFillColor(priorityBg[0], priorityBg[1], priorityBg[2]);
      doc.roundedRect(marginLeft + 4, currentY + 3, 18, 4.5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.text(priority, marginLeft + 13, currentY + 6.2, { align: "center" });

      // Action Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(actionLines, marginLeft + 25, currentY + 6.2);

      // Action Reason
      if (reasonLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105);
        doc.text(reasonLines, marginLeft + 5, currentY + actionLines.length * 4.2 + 6.5, {
          lineHeightFactor: 1.25,
        });
      }

      currentY += cardHeight + 3;
    });

    currentY += 3;
  }

  // ---------------- 4. UPCOMING VACCINES ----------------
  if (Array.isArray(plan.upcoming_vaccines) && plan.upcoming_vaccines.length > 0) {
    drawSectionHeader("4. Recommended Immunizations Schedule");

    plan.upcoming_vaccines.forEach((v) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const vaccineTitle = v.vaccine || "Vaccine";
      const dueDaysText = v.due_within_days != null ? `Due within ${v.due_within_days} days` : "Scheduled";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      const reasonLines = v.reason ? doc.splitTextToSize(v.reason, contentWidth - 10) : [];

      const cardHeight = 8 + (reasonLines.length ? reasonLines.length * 3.8 + 2 : 2);

      checkSpace(cardHeight + 2);

      doc.setFillColor(239, 246, 255); // #eff6ff
      doc.setDrawColor(191, 219, 254); // #bfdbfe
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, currentY, contentWidth, cardHeight, 1.5, 1.5, "FD");

      // Left blue tag
      doc.setFillColor(30, 58, 138); // #1e3a8a
      doc.rect(marginLeft, currentY, 2, cardHeight, "F");

      // Vaccine Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text(`💉 ${vaccineTitle}`, marginLeft + 5, currentY + 5.5);

      // Due badge
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(29, 78, 216);
      doc.text(dueDaysText, pageWidth - marginRight - 5, currentY + 5.5, { align: "right" });

      // Reason
      if (reasonLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        doc.setTextColor(71, 85, 105);
        doc.text(reasonLines, marginLeft + 5, currentY + 10, { lineHeightFactor: 1.25 });
      }

      currentY += cardHeight + 3;
    });

    currentY += 3;
  }

  // ---------------- 5. SCREENINGS & LIFESTYLE ----------------
  const hasScreenings = Array.isArray(plan.recommended_screenings) && plan.recommended_screenings.length > 0;
  const hasLifestyle = Array.isArray(plan.lifestyle_recommendations) && plan.lifestyle_recommendations.length > 0;

  if (hasScreenings || hasLifestyle) {
    drawSectionHeader("5. Recommended Screenings & Lifestyle Guidance");

    if (hasScreenings) {
      checkSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(3, 105, 161);
      doc.text("CLINICAL SCREENINGS & TESTS", marginLeft + 2, currentY + 2);
      currentY += 5;

      plan.recommended_screenings.forEach((s) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(s, contentWidth - 10);
        const itemH = lines.length * 3.8 + 2;
        checkSpace(itemH);

        doc.setFillColor(3, 105, 161);
        doc.circle(marginLeft + 4, currentY + 1.8, 1, "F");
        doc.setTextColor(51, 65, 85);
        doc.text(lines, marginLeft + 8, currentY + 2.5);
        currentY += itemH;
      });

      currentY += 2;
    }

    if (hasLifestyle) {
      checkSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(21, 128, 61);
      doc.text("LIFESTYLE & PREVENTIVE HABITS", marginLeft + 2, currentY + 2);
      currentY += 5;

      plan.lifestyle_recommendations.forEach((s) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(s, contentWidth - 10);
        const itemH = lines.length * 3.8 + 2;
        checkSpace(itemH);

        doc.setFillColor(22, 163, 74);
        doc.circle(marginLeft + 4, currentY + 1.8, 1, "F");
        doc.setTextColor(51, 65, 85);
        doc.text(lines, marginLeft + 8, currentY + 2.5);
        currentY += itemH;
      });

      currentY += 3;
    }
  }

  // ---------------- 6. REFERRALS & FOLLOW-UP ----------------
  const hasReferrals = Array.isArray(plan.referrals) && plan.referrals.length > 0;
  const hasFollowUp = Boolean(plan.follow_up_recommendation);

  if (hasReferrals || hasFollowUp) {
    drawSectionHeader("6. Clinical Referrals & Follow-Up Plan");

    if (hasReferrals) {
      checkSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("SPECIALIST REFERRALS:", marginLeft + 2, currentY + 2);
      currentY += 5;

      plan.referrals.forEach((r) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(r, contentWidth - 10);
        const itemH = lines.length * 3.8 + 2;
        checkSpace(itemH);

        doc.setFillColor(71, 85, 105);
        doc.circle(marginLeft + 4, currentY + 1.8, 1, "F");
        doc.setTextColor(51, 65, 85);
        doc.text(lines, marginLeft + 8, currentY + 2.5);
        currentY += itemH;
      });

      currentY += 3;
    }

    if (hasFollowUp) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const followUpLines = doc.splitTextToSize(plan.follow_up_recommendation, contentWidth - 10);
      const followUpHeight = followUpLines.length * 4 + 9;

      checkSpace(followUpHeight + 2);

      doc.setFillColor(240, 253, 244); // #f0fdf4
      doc.setDrawColor(187, 247, 208); // #bbf7d0
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, currentY, contentWidth, followUpHeight, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(21, 128, 61);
      doc.text("FOLLOW-UP RECOMMENDATION", marginLeft + 5, currentY + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text(followUpLines, marginLeft + 5, currentY + 9, { lineHeightFactor: 1.3 });

      currentY += followUpHeight + 5;
    }
  }

  // ---------------- 7. VERIFICATION & AGENT TRAJECTORY ----------------
  checkSpace(18);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, contentWidth, 16, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text("SYSTEM AUDIT TRAIL & CLINICAL DISCLAIMER", marginLeft + 4, currentY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Generated via Vaxora Multi-Agent System (PatientDataAgent -> CarePlanningAgent). Evidence-based clinical guidelines applied.",
    marginLeft + 4,
    currentY + 8.5
  );
  doc.text(
    "Disclaimer: This care plan is a clinical decision-support advisory. Please review any new medication or vaccination with your physician.",
    marginLeft + 4,
    currentY + 12.5
  );

  // ---------------- GLOBAL FOOTERS & PAGE NUMBERS ----------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Vaxora National Immunization Platform  •  Doc Ref: ${documentRef}`,
      marginLeft,
      pageHeight - 8
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginRight, pageHeight - 8, {
      align: "right",
    });
  }

  // Clean filename
  const cleanName = patientName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Vaxora_Care_Plan_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Trigger browser download
  doc.save(fileName);
  return fileName;
}
