import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { Download, Filter, ExternalLink, ShieldCheck, Shield, FileText, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, ImageRun, Footer } from 'docx';
import dlitheLogoUrl from '../../styles/images.png';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../../lib/api';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

const normalizeBatchType = (type?: string) => {
  if (!type) return '';
  const normalized = type.trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (/^non[-_ ]*tech(nical)?$/.test(normalized) || normalized === 'nontechnical') return 'non-technical';
  if (/^tech(nical)?$/.test(normalized) || normalized === 'tech') return 'technical';
  return normalized;
};

type SubmissionType = {
  _id: string;
  trainerName: string;
  githubLink: string;
  batchName: string;
  classroom?: string;
  topicsCovered: string;
  assignmentLink: string;
  sessionDate: string;
  college?: string;
  assignmentName?: string;
};

type AssignmentType = {
  _id: string;
  name: string;
  college: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
};

type CollegeSummary = {
  activeBatches: number;
  technicalBatches: number;
  nonTechnicalBatches: number;
  trainers: number;
};

type BatchDashboard = {
  _id: string;
  name: string;
  college: string;
  assignmentName?: string;
  type: string;
  status: string;
};

type CollegeType = {
  _id: string;
  name: string;
  code: string;
  department?: string;
  location?: string;
  isActive: boolean;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
  const assignedCollege = isSuperAdmin ? null : (user?.allottedCollege ?? null);

  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionType[]>([]);
  const [summary, setSummary] = useState<Record<string, CollegeSummary>>({});
  const [allBatches, setAllBatches] = useState<BatchDashboard[]>([]);
  const [assignmentNames, setAssignmentNames] = useState<string[]>([]);
  const [assignmentNamesLoading, setAssignmentNamesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showReportMenu, setShowReportMenu] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  const [colleges, setColleges] = useState<CollegeType[]>([]);

  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${API_URL}/colleges`, { headers: authHeaders() });
      const data = await res.json();
      setColleges(Array.isArray(data) ? data : []);
    } catch {
      setColleges([]);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const collegeOptions = useMemo(
    () => isSuperAdmin ? colleges.map((c) => c.code) : (assignedCollege ? [assignedCollege] : []),
    [colleges, isSuperAdmin, assignedCollege]
  );

  useEffect(() => {
    if (collegeOptions.length > 0 && !selectedCollege) {
      setSelectedCollege(assignedCollege ?? collegeOptions[0]);
    }
  }, [collegeOptions]);

  useEffect(() => {
    if (selectedCollege) fetchSummary();
  }, [selectedCollege]);

  const getCollegeInfo = (code: string) => {
    const c = colleges.find((x) => x.code === code);
    return {
      tagline: c ? `${c.name}${c.department ? ` — ${c.department}` : ''}` : code,
      description: c?.location ? `${c.location}${c.department ? ` · ${c.department}` : ''}` : `Training programs for ${code}.`,
    };
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/summary`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summaries || {});
      }
    } catch {}
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const [submissionsResponse, summaryResponse, batchesResponse] = await Promise.all([
          fetch(`${API_URL}/submissions`, { headers }),
          fetch(`${API_URL}/summary`, { headers }),
          fetch(`${API_URL}/trainers/batches`, { headers }),
        ]);

        if (!submissionsResponse.ok) throw new Error('Unable to load submissions');
        if (!summaryResponse.ok) throw new Error('Unable to load summary data');

        const submissionsData = await submissionsResponse.json();
        const summaryData = await summaryResponse.json();
        const batchesData = batchesResponse.ok ? await batchesResponse.json() : [];

        setSubmissions(submissionsData);
        setSummary(summaryData.summaries || {});
        setAllBatches(Array.isArray(batchesData) ? batchesData : []);
        setError('');
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
        setError('Unable to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setSelectedAssignment('');

    const fetchAssignmentNames = async () => {
      try {
        setAssignmentNamesLoading(true);
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const [tocRes, assignmentsRes] = await Promise.all([
          fetch(`${API_URL}/toc/assignment-names?college=${encodeURIComponent(selectedCollege)}`, { headers }),
          fetch(`${API_URL}/assignments/all?college=${encodeURIComponent(selectedCollege)}`, { headers }),
        ]);

        let tocNames: string[] = [];
        if (tocRes.ok) tocNames = await tocRes.json();

        let assignmentNamesList: string[] = [];
        if (assignmentsRes.ok) {
          const data: AssignmentType[] = await assignmentsRes.json();
          assignmentNamesList = data.map((a) => a.name);
        }

        const submissionNames = submissions
          .filter((s) => s.college === selectedCollege && s.assignmentName)
          .map((s) => s.assignmentName as string);

        const merged = [...new Set([...assignmentNamesList, ...tocNames, ...submissionNames])].sort();
        setAssignmentNames(merged);
      } catch {
        const names = submissions
          .filter((s) => s.college === selectedCollege && s.assignmentName)
          .map((s) => s.assignmentName as string);
        setAssignmentNames([...new Set(names)].sort());
      } finally {
        setAssignmentNamesLoading(false);
      }
    };

    fetchAssignmentNames();
  }, [selectedCollege, submissions]);

  const collegeBatches = selectedCollege
    ? allBatches.filter((b) => b.college?.toLowerCase() === selectedCollege.toLowerCase())
    : [];
  const activeBatchCount = collegeBatches.filter(b => b.status?.toLowerCase() === 'active').length;
  const inactiveBatchCount = collegeBatches.filter(b => b.status?.toLowerCase() !== 'active').length;
  const technicalCount = collegeBatches.filter(b => normalizeBatchType(b.type) === 'technical').length;
  const nonTechnicalCount = collegeBatches.filter(b => normalizeBatchType(b.type) === 'non-technical').length;
  const unknownBatchCount = collegeBatches.filter((b) => {
    const normalized = normalizeBatchType(b.type);
    return normalized !== 'technical' && normalized !== 'non-technical';
  }).length;
  const totalBatchCount = collegeBatches.length;

  const assignmentBatches = selectedAssignment
    ? collegeBatches.filter(b => b.assignmentName === selectedAssignment)
    : collegeBatches;

  const batchNames = [...new Set(assignmentBatches.map(b => b.name))].sort();
  const assignmentTechnical = assignmentBatches.filter(b => normalizeBatchType(b.type) === 'technical').length;
  const assignmentNonTechnical = assignmentBatches.filter(b => normalizeBatchType(b.type) === 'non-technical').length;

  const filteredSubmissions = submissions.filter((submission) => {
    if (submission.college !== selectedCollege) return false;
    if (selectedAssignment && submission.assignmentName !== selectedAssignment) return false;
    if (selectedBatch && submission.batchName !== selectedBatch) return false;

    if (!startDate && !endDate) return true;

    const submissionDate = new Date(submission.sessionDate);

    if (startDate && !endDate) return submissionDate >= new Date(startDate);
    if (!startDate && endDate) return submissionDate <= new Date(endDate);

    return submissionDate >= new Date(startDate) && submissionDate <= new Date(endDate);
  });

  const reportSubmittedTo = 'Principal, Head of the Departments, Placements Training and Industry Relations, NMAM Institute Of Technology (NMAMIT), Nitte';
  const reportSubmittedBy = 'DLithe Consultancy Services Pvt. Ltd. Bengaluru';

  const handleExport = () => {
    const byBatch = filteredSubmissions.reduce<Record<string, SubmissionType[]>>((acc, s) => {
      const key = s.batchName || 'Unknown Batch';
      (acc[key] ??= []).push(s);
      return acc;
    }, {});

    const workbook = XLSX.utils.book_new();

    const sanitizeSheetName = (name: string) =>
      name.replace(/[\\/?*[\]]/g, '-').slice(0, 31);

    const usedNames = new Set<string>();

    for (const [batchName, rows] of Object.entries(byBatch)) {
      let sheetName = sanitizeSheetName(batchName);
      if (usedNames.has(sheetName)) {
        sheetName = sanitizeSheetName(batchName).slice(0, 28) + `_${usedNames.size}`;
      }
      usedNames.add(sheetName);

      const sheetData = rows.map((s) => ({
        'Trainer Name': s.trainerName,
        'Assignment Name': s.assignmentName || '-',
        'Batch Name': s.batchName,
        Classroom: s.classroom || '-',
        College: s.college || selectedCollege,
        'Topics Covered': s.topicsCovered,
        'Session Date': new Date(s.sessionDate).toLocaleDateString(),
        'GitHub Link': s.githubLink,
        'Assignment Link': s.assignmentLink,
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);

      const colWidths = Object.keys(sheetData[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...sheetData.map((r) => String((r as any)[key] ?? '').length)),
      }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    XLSX.writeFile(workbook, `submissions-${selectedCollege}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/submissions/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      toast.success('Submission deleted');
    } catch {
      toast.error('Failed to delete submission');
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedAssignment('');
    setSelectedBatch('');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node)) {
        setShowReportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasMultipleDays = () => {
    const dates = new Set(filteredSubmissions.map(s => new Date(s.sessionDate).toDateString()));
    return dates.size > 1;
  };

  const getAttendanceByDay = () => {
    const map: Record<string, { date: Date; count: number }> = {};
    filteredSubmissions.forEach(s => {
      const d = new Date(s.sessionDate);
      const key = d.toDateString();
      if (!map[key]) map[key] = { date: d, count: 0 };
      map[key].count++;
    });
    return Object.values(map)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ date, count }) => ({
        label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        count,
      }));
  };

  const drawBarChart = (pdf: jsPDF, data: { label: string; count: number }[], x: number, y: number, w: number, h: number) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const slotW = w / data.length;
    const barW = Math.min(slotW * 0.65, 18);
    const barGap = (slotW - barW) / 2;

    pdf.setFillColor(248, 248, 248);
    pdf.rect(x, y, w, h, 'F');

    pdf.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (i / 4) * h;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(x, lineY, x + w, lineY);
      pdf.setFontSize(6);
      pdf.setTextColor(150, 150, 150);
      pdf.text(String(Math.round((i / 4) * maxCount)), x - 1, lineY + 1.5, { align: 'right' });
    }

    data.forEach((d, i) => {
      const barH = Math.max((d.count / maxCount) * h, 1);
      const bx = x + i * slotW + barGap;
      const by = y + h - barH;
      pdf.setFillColor(185, 28, 28);
      pdf.rect(bx, by, barW, barH, 'F');
      pdf.setFontSize(7);
      pdf.setTextColor(40, 40, 40);
      pdf.text(String(d.count), bx + barW / 2, by - 1.5, { align: 'center' });
      pdf.setFontSize(6);
      pdf.setTextColor(100, 100, 100);
      pdf.text(d.label, bx + barW / 2, y + h + 5, { align: 'center' });
    });

    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0, 0, 0);
    pdf.line(x, y, x, y + h);
    pdf.line(x, y + h, x + w, y + h);
  };

  const downloadPDF = async () => {
    const logoBase64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dlitheLogoUrl as string;
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = 210;
    const ml = 15;
    const mr = 15;
    const cw = pw - ml - mr;

    const secHead = (title: string, yPos: number) => {
      pdf.setFillColor(185, 28, 28);
      pdf.rect(ml, yPos, cw, 8, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, ml + 4, yPos + 5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
    };

    const totalDays = new Set(filteredSubmissions.map(s => new Date(s.sessionDate).toDateString())).size;
    const trainers = [...new Set(filteredSubmissions.map(s => s.trainerName))];
    const classrooms = [...new Set(filteredSubmissions.map(s => s.classroom).filter(Boolean))];
    const uniqueTopics = [...new Set(
      filteredSubmissions.flatMap(s => s.topicsCovered.split(',').map(t => t.trim()).filter(Boolean))
    )];
    const avgSessions = totalDays > 0 ? (filteredSubmissions.length / totalDays).toFixed(1) : '—';

    pdf.setFillColor(185, 28, 28);
    pdf.rect(0, 0, pw, 42, 'F');
    pdf.setFillColor(139, 18, 18);
    pdf.rect(0, 40, pw, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text('TRAINING COVERAGE &', pw / 2, 14, { align: 'center' });
    pdf.text('ATTENDANCE SUMMARY REPORT', pw / 2, 24, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      `${selectedCollege}  ·  ${selectedBatch || selectedAssignment || 'All Batches'}`,
      pw / 2, 34, { align: 'center' }
    );

    pdf.addImage(logoBase64, 'PNG', pw / 2 - 19, 44, 38, 14);

    let y = 64;

    secHead('1.  Report Information', y);
    y += 10;
    autoTable(pdf, {
      startY: y,
      body: [
        ['College Name', selectedCollege],
        ['Batch / Assignment', selectedBatch || selectedAssignment || '—'],
        ['Submitted To', reportSubmittedTo],
        ['Submitted By', reportSubmittedBy],
        ['Report Period', `${startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All'}  →  ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All'}`],
        ['Prepared By', '_______________________________'],
        ['Generated On', new Date().toLocaleString('en-IN')],
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, fillColor: [254, 242, 242] },
        1: { cellWidth: cw - 55 },
      },
      styles: { fontSize: 9, cellPadding: 3.5 },
      theme: 'grid',
      margin: { left: ml, right: mr },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;

    secHead('2.  Executive Summary', y);
    y += 10;
    autoTable(pdf, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sessions Conducted', String(filteredSubmissions.length)],
        ['Total Training Days', String(totalDays)],
        ['Average Sessions / Day', avgSessions],
        ['Total Students Attended', '—  (not recorded in system)'],
        ['Trainers Involved', `${trainers.length}  (${trainers.join(', ')})`],
        ['Classrooms Utilized', classrooms.length > 0 ? `${classrooms.length}  (${classrooms.join(', ')})` : '—'],
        ['Unique Topics Covered', String(uniqueTopics.length)],
      ],
      headStyles: { fillColor: [185, 28, 28], fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      theme: 'striped',
      margin: { left: ml, right: mr },
    });

    pdf.addPage('a4', 'landscape');
    const lpw = 297;
    const lml = 12;
    const lmr = 12;
    pdf.setFillColor(185, 28, 28);
    pdf.rect(0, 0, lpw, 12, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text('3.  Detailed Session Coverage Report', lpw / 2, 8, { align: 'center' });
    autoTable(pdf, {
      startY: 15,
      head: [['Session Date', 'Trainer Name', 'Batch Name', 'Classroom', 'Topics Covered', 'Assignment', 'GitHub Link', 'Assignment Link']],
      body: filteredSubmissions.map(s => [
        new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        s.trainerName,
        s.batchName,
        s.classroom || '—',
        s.topicsCovered,
        s.assignmentName || '—',
        s.githubLink,
        s.assignmentLink,
      ]),
      headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: 22 }, 3: { cellWidth: 20 }, 4: { cellWidth: 52 }, 6: { cellWidth: 40 }, 7: { cellWidth: 40 } },
      theme: 'striped',
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: lml, right: lmr },
    });

    secHead('5.  Resource Links', y);
    y += 10;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40, 40, 40);
    pdf.text('A.  GitHub Repository Links', ml, y);
    y += 4;
    autoTable(pdf, {
      startY: y,
      head: [['Date', 'Trainer', 'GitHub Link']],
      body: filteredSubmissions.map(s => [
        new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        s.trainerName,
        s.githubLink,
      ]),
      headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { cellWidth: 100 } },
      theme: 'striped',
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: ml, right: mr },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
    if (y > 240) { pdf.addPage('a4', 'portrait'); y = 15; }
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40, 40, 40);
    pdf.text('B.  Assignment Links', ml, y);
    y += 4;
    autoTable(pdf, {
      startY: y,
      head: [['Date', 'Trainer', 'Assignment', 'Assignment Link']],
      body: filteredSubmissions.map(s => [
        new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        s.trainerName,
        s.assignmentName || '—',
        s.assignmentLink,
      ]),
      headStyles: { fillColor: [185, 28, 28], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 3: { cellWidth: 70 } },
      theme: 'striped',
      alternateRowStyles: { fillColor: [254, 242, 242] },
      margin: { left: ml, right: mr },
    });

    if (hasMultipleDays()) {
      pdf.addPage('a4', 'portrait');
      pdf.setFillColor(185, 28, 28);
      pdf.rect(0, 0, pw, 12, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('6.  Attendance Trend Analysis', pw / 2, 8, { align: 'center' });
      y = 17;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('A.  Daily Session Trend', ml, y);
      y += 4;
      const daily = getAttendanceByDay();
      drawBarChart(pdf, daily, ml, y, cw, 68);
      y += 82;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      pdf.text('B.  Trainer-wise Session Coverage', ml, y);
      y += 4;
      const trainerData = Object.entries(
        filteredSubmissions.reduce<Record<string, number>>((acc, s) => {
          acc[s.trainerName] = (acc[s.trainerName] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ label: name.split(' ')[0].slice(0, 12), count }));
      drawBarChart(pdf, trainerData, ml, y, cw, 55);
      y += 68;

      if (y > 230) { pdf.addPage('a4', 'portrait'); y = 15; }
      secHead('7.  Attendance Analytics', y);
      y += 10;
      const peakDay = daily.reduce((a, b) => b.count > a.count ? b : a);
      const minDay = daily.reduce((a, b) => b.count < a.count ? b : a);
      const consistency = peakDay.count > 0
        ? ((1 - (peakDay.count - minDay.count) / peakDay.count) * 100).toFixed(0)
        : '100';
      autoTable(pdf, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Highest Sessions Day', `${peakDay.label}  (${peakDay.count} sessions)`],
          ['Lowest Sessions Day', `${minDay.label}  (${minDay.count} sessions)`],
          ['Average Sessions / Day', (filteredSubmissions.length / daily.length).toFixed(1)],
          ['Average Morning Attendance', '—  (not recorded)'],
          ['Average Afternoon Attendance', '—  (not recorded)'],
          ['Attendance Consistency', `${consistency}%`],
        ],
        headStyles: { fillColor: [185, 28, 28], fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        theme: 'striped',
        margin: { left: ml, right: mr },
      });
      y = (pdf as any).lastAutoTable.finalY + 10;
    } else {
      y = (pdf as any).lastAutoTable.finalY + 10;
    }

    const secN = hasMultipleDays() ? 8 : 6;
    if (y > 245) { pdf.addPage('a4', 'portrait'); y = 15; }
    secHead(`${secN}.  Remarks / Notes`, y);
    y += 10;
    pdf.setFillColor(254, 242, 242);
    pdf.setDrawColor(185, 28, 28);
    pdf.setLineWidth(0.3);
    pdf.rect(ml, y, cw, 30, 'FD');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text('•  Sessions conducted as per schedule.', ml + 5, y + 9);
    pdf.text('•  Assignments shared after every session.', ml + 5, y + 17);
    pdf.text('•  Attendance maintained throughout the training period.', ml + 5, y + 25);
    y += 38;

    if (y > 255) { pdf.addPage('a4', 'portrait'); y = 15; }
    secHead(`${secN + 1}.  Signatures`, y);
    y += 10;
    const boxW = (cw - 4) / 2;
    (['Prepared By', 'College Coordinator'] as const).forEach((label, i) => {
      const bx = ml + i * (boxW + 4);
      pdf.setFillColor(254, 242, 242);
      pdf.setDrawColor(185, 28, 28);
      pdf.setLineWidth(0.3);
      pdf.rect(bx, y, boxW, 24, 'FD');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(185, 28, 28);
      pdf.text(label, bx + boxW / 2, y + 7, { align: 'center' });
      pdf.setDrawColor(160, 160, 160);
      pdf.setLineWidth(0.2);
      pdf.line(bx + 6, y + 20, bx + boxW - 6, y + 20);
    });

    const totalPages = pdf.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      pdf.setPage(pg);
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(254, 242, 242);
      pdf.rect(0, pH - 11, pW, 11, 'F');
      pdf.setDrawColor(185, 28, 28);
      pdf.setLineWidth(0.3);
      pdf.line(0, pH - 11, pW, pH - 11);
      pdf.addImage(logoBase64, 'PNG', ml, pH - 10.5, 22, 8);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Training Coverage & Attendance Summary Report  ·  ${selectedCollege}  ·  Generated: ${new Date().toLocaleDateString()}`,
        pW / 2, pH - 3.5, { align: 'center' }
      );
      pdf.text(`Page ${pg} of ${totalPages}`, pW - mr, pH - 3.5, { align: 'right' });
    }

    const slug = (selectedBatch || selectedAssignment || selectedCollege).replace(/\s+/g, '_');
    const mon = new Date().toLocaleString('en-IN', { month: 'long' });
    const yr = new Date().getFullYear();
    pdf.save(`${slug}_Training_Coverage_Report_${mon}_${yr}.pdf`);
  };

  const downloadDOC = async () => {
    const logoArrayBuffer = await fetch(dlitheLogoUrl as string).then(r => r.arrayBuffer());

    const hCell = (text: string) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: 'B91C1C', fill: 'B91C1C' },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
      });

    const dCell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
      });

    const infoCell = (text: string, isLabel = false) =>
      new TableCell({
        ...(isLabel && { shading: { type: ShadingType.SOLID, color: 'FEF2F2', fill: 'FEF2F2' } }),
        children: [new Paragraph({ children: [new TextRun({ text, bold: isLabel, size: 18 })] })],
      });

    const H = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) => new Paragraph({ text, heading: level });
    const sp = () => new Paragraph({ text: '' });

    const totalDays = new Set(filteredSubmissions.map(s => new Date(s.sessionDate).toDateString())).size;
    const trainers = [...new Set(filteredSubmissions.map(s => s.trainerName))];
    const classrooms = [...new Set(filteredSubmissions.map(s => s.classroom).filter(Boolean))];
    const uniqueTopics = [...new Set(
      filteredSubmissions.flatMap(s => s.topicsCovered.split(',').map(t => t.trim()).filter(Boolean))
    )];
    const avgSessions = totalDays > 0 ? (filteredSubmissions.length / totalDays).toFixed(1) : '—';

    const docChildren: (Paragraph | Table)[] = [
      new Paragraph({
        text: 'TRAINING COVERAGE & ATTENDANCE SUMMARY REPORT',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: `${selectedCollege}  ·  ${selectedBatch || selectedAssignment || 'All Batches'}`, size: 24, color: 'B91C1C', bold: true })],
        alignment: AlignmentType.CENTER,
      }),
      sp(),

      H('1.  Report Information', HeadingLevel.HEADING_1),
      new Table({
        rows: [
          new TableRow({ children: [infoCell('College Name', true), infoCell(selectedCollege)] }),
          new TableRow({ children: [infoCell('Batch / Assignment', true), infoCell(selectedBatch || selectedAssignment || '—')] }),
          new TableRow({ children: [infoCell('Submitted To', true), infoCell(reportSubmittedTo)] }),
          new TableRow({ children: [infoCell('Submitted By', true), infoCell(reportSubmittedBy)] }),
          new TableRow({ children: [infoCell('Report Period', true), infoCell(`${startDate ? new Date(startDate).toLocaleDateString() : 'All'}  →  ${endDate ? new Date(endDate).toLocaleDateString() : 'All'}`)] }),
          new TableRow({ children: [infoCell('Prepared By', true), infoCell('___________________________')] }),
          new TableRow({ children: [infoCell('Generated On', true), infoCell(new Date().toLocaleString('en-IN'))] }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      sp(),

      H('2.  Executive Summary', HeadingLevel.HEADING_1),
      new Table({
        rows: [
          new TableRow({ tableHeader: true, children: ['Metric', 'Value'].map(hCell) }),
          ...([
            ['Total Sessions Conducted', String(filteredSubmissions.length)],
            ['Total Training Days', String(totalDays)],
            ['Average Sessions / Day', avgSessions],
            ['Total Students Attended', '—  (not recorded in system)'],
            ['Trainers Involved', `${trainers.length}  (${trainers.join(', ')})`],
            ['Classrooms Utilized', classrooms.length > 0 ? `${classrooms.length}  (${classrooms.join(', ')})` : '—'],
            ['Unique Topics Covered', String(uniqueTopics.length)],
          ] as [string, string][]).map(([k, v]) => new TableRow({ children: [dCell(k), dCell(v)] })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      sp(),

      H('3.  Detailed Session Coverage', HeadingLevel.HEADING_1),
      new Table({
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['Session Date', 'Trainer Name', 'Batch Name', 'Classroom', 'Topics Covered', 'Assignment'].map(hCell),
          }),
          ...filteredSubmissions.map(s =>
            new TableRow({
              children: [
                new Date(s.sessionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                s.trainerName,
                s.batchName,
                s.classroom || '—',
                s.topicsCovered,
                s.assignmentName || '—',
              ].map(dCell),
            })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      sp(),

      H('5.  Resource Links', HeadingLevel.HEADING_1),
      new Paragraph({ children: [new TextRun({ text: 'A.  GitHub Repository Links', bold: true, size: 20 })] }),
      new Table({
        rows: [
          new TableRow({ tableHeader: true, children: ['Date', 'Trainer', 'GitHub Link'].map(hCell) }),
          ...filteredSubmissions.map(s =>
            new TableRow({
              children: [
                new Date(s.sessionDate).toLocaleDateString(),
                s.trainerName,
                s.githubLink,
              ].map(dCell),
            })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      sp(),
      new Paragraph({ children: [new TextRun({ text: 'B.  Assignment Links', bold: true, size: 20 })] }),
      new Table({
        rows: [
          new TableRow({ tableHeader: true, children: ['Date', 'Trainer', 'Assignment', 'Assignment Link'].map(hCell) }),
          ...filteredSubmissions.map(s =>
            new TableRow({
              children: [
                new Date(s.sessionDate).toLocaleDateString(),
                s.trainerName,
                s.assignmentName || '—',
                s.assignmentLink,
              ].map(dCell),
            })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      sp(),
    ];

    if (hasMultipleDays()) {
      const daily = getAttendanceByDay();
      const peakDay = daily.reduce((a, b) => b.count > a.count ? b : a);
      const minDay = daily.reduce((a, b) => b.count < a.count ? b : a);
      const consistency = peakDay.count > 0
        ? ((1 - (peakDay.count - minDay.count) / peakDay.count) * 100).toFixed(0)
        : '100';
      const avgPerDay = (filteredSubmissions.length / daily.length).toFixed(1);

      docChildren.push(H('6.  Attendance Trend Data', HeadingLevel.HEADING_1));
      docChildren.push(new Paragraph({ children: [new TextRun({ text: 'Daily Session Count', bold: true, size: 20 })] }));
      docChildren.push(new Table({
        rows: [
          new TableRow({ tableHeader: true, children: ['Date', 'Sessions'].map(hCell) }),
          ...daily.map(d => new TableRow({ children: [d.label, String(d.count)].map(dCell) })),
        ],
        width: { size: 40, type: WidthType.PERCENTAGE },
      }));
      docChildren.push(sp());

      docChildren.push(H('7.  Attendance Analytics', HeadingLevel.HEADING_1));
      docChildren.push(new Table({
        rows: [
          new TableRow({ tableHeader: true, children: ['Metric', 'Value'].map(hCell) }),
          ...([
            ['Highest Sessions Day', `${peakDay.label}  (${peakDay.count} sessions)`],
            ['Lowest Sessions Day', `${minDay.label}  (${minDay.count} sessions)`],
            ['Average Sessions / Day', avgPerDay],
            ['Average Morning Attendance', '—  (not recorded)'],
            ['Average Afternoon Attendance', '—  (not recorded)'],
            ['Attendance Consistency', `${consistency}%`],
          ] as [string, string][]).map(([k, v]) => new TableRow({ children: [dCell(k), dCell(v)] })),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      docChildren.push(sp());
    }

    const secN = hasMultipleDays() ? 8 : 6;
    docChildren.push(H(`${secN}.  Remarks / Notes`, HeadingLevel.HEADING_1));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: '•  Sessions conducted as per schedule.', size: 20 })] }));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: '•  Assignments shared after every session.', size: 20 })] }));
    docChildren.push(new Paragraph({ children: [new TextRun({ text: '•  Attendance maintained throughout the training period.', size: 20 })] }));
    docChildren.push(sp());

    docChildren.push(H(`${secN + 1}.  Signatures`, HeadingLevel.HEADING_1));
    docChildren.push(new Table({
      rows: [
        new TableRow({
          children: ['Prepared By', 'College Coordinator'].map(label =>
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'B91C1C', size: 20 })] }),
                sp(),
                sp(),
                new Paragraph({ children: [new TextRun({ text: '____________________________', size: 20 })] }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
            })
          ),
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));

    const doc = new Document({
      sections: [{
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                new ImageRun({ data: logoArrayBuffer, transformation: { width: 60, height: 21 }, type: 'png' }),
                new TextRun({ text: `  ©${new Date().getFullYear()} DLithe. All rights reserved.  |  Training Coverage & Attendance Summary Report`, size: 14, color: '888888' }),
              ],
            })],
          }),
        },
        children: docChildren,
      }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (selectedBatch || selectedAssignment || selectedCollege).replace(/\s+/g, '_');
    const mon = new Date().toLocaleString('en-IN', { month: 'long' });
    const yr = new Date().getFullYear();
    a.download = `${slug}_Training_Coverage_Report_${mon}_${yr}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAttendanceSummary = async () => {
    setAttendanceSummaryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/sessions/attendance-summary`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch attendance summary');
      const records: any[] = await res.json();
      if (records.length === 0) {
        toast.info('No attendance summary records found');
        return;
      }
      const rows = records.map((r) => ({
        'Student Name': r.studentName,
        USN: r.usn,
        'Clean Key': r.cleanKey,
        Date: r.date,
        Time: r.time,
        Session: r.session || '—',
        'Batch Name': r.batchName || '—',
        College: r.college || '—',
        Latitude: r.latitude ?? '—',
        Longitude: r.longitude ?? '—',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map((k) => ({
        wch: Math.max(k.length, ...rows.map((r) => String((r as any)[k] ?? '').length)),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
      XLSX.writeFile(wb, `attendance-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Downloaded ${records.length} records`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download attendance summary');
    } finally {
      setAttendanceSummaryLoading(false);
    }
  };

  const collegeSummary = summary[selectedCollege];

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-red-700 text-card-foreground mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage submissions and assignments</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 text-sm border ${isSuperAdmin ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'}`}>
          {isSuperAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          {isSuperAdmin ? 'Super Admin' : `Admin — ${assignedCollege}`}
        </div>
      </div>

      {/* Attendance Summary Download — super admin only */}
      {isSuperAdmin && (
        <div className="bg-card border border-border p-5 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-card-foreground">Attendance Summary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All verified attendance records (USN + clean key validated)
            </p>
          </div>
          <button
            onClick={downloadAttendanceSummary}
            disabled={attendanceSummaryLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white text-sm hover:bg-red-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {attendanceSummaryLoading ? 'Downloading…' : 'Download Excel'}
          </button>
        </div>
      )}

      {/* College selector + summary card */}
      <div className="bg-card border border-border p-6 mb-6">
        <div className="grid gap-4 md:grid-cols-2 items-end">
          <div>
            <label className="block text-sm text-foreground mb-2">
              Select College / Execution Name
              {!isSuperAdmin && <span className="ml-2 text-xs text-muted-foreground">(restricted to your college)</span>}
            </label>
            {collegeOptions.length > 0 ? (
              <select
                value={selectedCollege}
                onChange={(e) => { setSelectedCollege(e.target.value); setSelectedBatch(''); setSelectedAssignment(''); }}
                className="w-full px-4 py-2 border border-border text-foreground focus:outline-none focus:border-border"
                disabled={!isSuperAdmin && collegeOptions.length === 1}
              >
                {collegeOptions.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-4 py-2 border border-border text-foreground bg-muted/30 cursor-not-allowed">
                No college assigned
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Selected:</p>
            <p className="text-xl font-semibold text-card-foreground">{getCollegeInfo(selectedCollege).tagline}</p>
            <p className="text-sm text-card-foreground mt-2">{getCollegeInfo(selectedCollege).description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Active Batches</p>
                <p className="text-card-foreground font-semibold">{activeBatchCount}</p>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Inactive Batches</p>
                <p className="text-card-foreground font-semibold">{inactiveBatchCount}</p>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Technical Batches</p>
                <p className="text-card-foreground font-semibold">{technicalCount}</p>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Non-Technical Batches</p>
                <p className="text-card-foreground font-semibold">{collegeSummary?.nonTechnicalBatches ?? nonTechnicalCount}</p>
              </div>
              {unknownBatchCount > 0 && (
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-muted-foreground">Unknown Batch Type</p>
                  <p className="text-card-foreground font-semibold">{unknownBatchCount}</p>
                </div>
              )}
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Trainers</p>
                <p className="text-card-foreground font-semibold">{collegeSummary?.trainers ?? 0}</p>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-muted-foreground">Total Batches</p>
                <p className="text-card-foreground font-semibold">{totalBatchCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-foreground" />
          <h2 className="text-card-foreground">Filters</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm text-foreground mb-2">Assignment Name</label>
            <select
              value={selectedAssignment}
              onChange={(e) => { setSelectedAssignment(e.target.value); setSelectedBatch(''); }}
              disabled={assignmentNamesLoading}
              className="w-full px-4 py-2 border border-border text-foreground focus:outline-none focus:border-border disabled:opacity-60"
            >
              <option value="">
                {assignmentNamesLoading ? 'Loading assignments...' : assignmentNames.length === 0 ? 'No assignments found' : 'All Assignments'}
              </option>
              {assignmentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {selectedAssignment && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Batch Breakdown — <span className="font-medium text-card-foreground">{selectedAssignment}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-muted-foreground">Technical</p>
                  <p className="text-card-foreground font-semibold">{assignmentTechnical}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                  <p className="text-muted-foreground">Non-Technical</p>
                  <p className="text-card-foreground font-semibold">{assignmentNonTechnical}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm text-foreground mb-2">Batch Name</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-4 py-2 border border-border text-foreground focus:outline-none focus:border-border"
            >
              <option value="">{batchNames.length === 0 ? 'No batches found' : 'All Batches'}</option>
              {batchNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-foreground mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-border text-foreground focus:outline-none focus:border-border"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm text-foreground mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-border text-foreground focus:outline-none focus:border-border"
            />
          </div>

          <button
            onClick={clearFilters}
            className="px-6 py-2 border border-border text-foreground hover:bg-card transition-colors"
          >
            Clear
          </button>

          <button
            onClick={handleExport}
            disabled={filteredSubmissions.length === 0}
            className="px-6 py-2 bg-red-700 text-primary-foreground hover:bg-red-900/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-red-900-foreground" />
            Export Excel
          </button>

          <div className="relative" ref={reportMenuRef}>
            <button
              onClick={() => setShowReportMenu(v => !v)}
              disabled={filteredSubmissions.length === 0}
              className="px-6 py-2 border border-red-700 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Summary Report
              <ChevronDown className="w-3 h-3" />
            </button>
            {showReportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border shadow-lg z-10 min-w-[160px]">
                <button
                  onClick={() => { void downloadPDF(); setShowReportMenu(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-red-700" />
                  Download PDF
                </button>
                <button
                  onClick={() => { downloadDOC(); setShowReportMenu(false); }}
                  className="w-full px-4 py-2.5 text-sm text-left text-foreground hover:bg-muted flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-700" />
                  Download DOC
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submissions table */}
      <div className="bg-card border border-border">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
            {selectedAssignment && (
              <span className="ml-1">
                for <span className="font-medium text-card-foreground">{selectedAssignment}</span>
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="px-6 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-6 py-3 text-left text-sm text-foreground">Trainer Name</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Assignment</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Batch Name</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Classroom</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Topics Covered</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Session Date</th>
                <th className="px-6 py-3 text-left text-sm text-foreground">Links</th>
                <th className="px-6 py-3 text-right text-sm text-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No submissions found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => (
                  <tr key={submission._id} className="border-b border-border hover:bg-card">
                    <td className="px-6 py-4 text-sm text-card-foreground">{submission.trainerName}</td>
                    <td className="px-6 py-4 text-sm text-card-foreground">{submission.assignmentName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-card-foreground">{submission.batchName}</td>
                    <td className="px-6 py-4 text-sm text-card-foreground">{submission.classroom || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs">
                      <div className="line-clamp-2">{submission.topicsCovered}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground">
                      {new Date(submission.sessionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a
                          href={submission.githubLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:text-card-foreground flex items-center gap-1"
                        >
                          GitHub
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a
                          href={submission.assignmentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:text-card-foreground flex items-center gap-1"
                        >
                          Assignment
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(submission._id)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Delete submission"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
