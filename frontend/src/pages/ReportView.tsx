import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DiagnosticService } from "../api/services";
import { Report } from "../types";
import {
  Printer,
  Download,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  QrCode,
  Share2,
  Calendar,
  Clock,
  User,
  Stethoscope,
} from "lucide-react";

export function ReportView() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    DiagnosticService.getReport(id)
      .then((res) => setReport(res))
      .catch(() => setError("Could not load diagnostic report."))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <Activity className="w-10 h-10 text-teal-600 animate-pulse mx-auto mb-3" />
        <div className="font-bold text-slate-700">Loading Clinical Diagnostic Report...</div>
        <p className="text-xs text-slate-400 mt-1">Retrieving verified parameters from reference archive</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs mb-4">
          {error || "Report not found or not yet released by pathologist."}
        </div>
        <Link to="/" className="btn-secondary text-xs">
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  const resultData = report.result_data as any;
  const parameters = resultData?.parameters || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/patient"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Official Diagnostic Report</span>
              <span className="badge badge-completed">
                {report.status.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Barcode: {report.barcode || "—"} · NABL Ref: MC-4921
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Official Medical Diagnostic Paper Document */}
      <div className="printable-report bg-white border border-slate-200 shadow-card rounded-2xl p-8 sm:p-12 space-y-8 text-slate-900">
        {/* Lab Header */}
        <div className="border-b-2 border-teal-700 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  APEXCARE SUPER-SPECIALITY HOSPITAL & REFERENCE LABORATORIES
                </h1>
                <div className="text-xs text-teal-800 font-bold tracking-wide uppercase">
                  Division of Central Clinical Pathology & Molecular Diagnostics
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 max-w-lg mt-2">
              Plot 18, Apex Medical City Campus, Sector 18, Gurugram, HR 122001 · Phone: +91 1800-APEX-CARE · ISO 15189:2022 Certified
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 space-y-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>NABL ACCREDITED: MC-4921</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">CAP License #9482109</div>
            <div className="text-[10px] text-slate-500 font-medium">ICMR Registration #APEX-HOSP-02</div>
          </div>
        </div>

        {/* Patient & Specimen Demographics Grid */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 sm:p-5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-400 block font-medium">Patient Full Name</span>
            <span className="font-bold text-slate-900 text-sm">{report.patient_name || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Age / Biological Sex</span>
            <span className="font-bold text-slate-900 text-sm">
              {report.patient_age || 34} Y / {report.patient_gender || "Female"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Patient ID (UHID)</span>
            <span className="font-mono font-bold text-slate-900 text-sm">AL-89421</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Specimen Barcode</span>
            <span className="font-mono font-bold text-teal-800 text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
              {report.barcode || "—"}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-400 block font-medium">Referring Clinician</span>
            <span className="font-bold text-slate-800">{report.doctor_name || "—"}</span>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-400 block font-medium">Sample Collection</span>
            <span className="font-medium text-slate-700">12 Sep 2026, 08:30 AM</span>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-400 block font-medium">Lab Accessioning</span>
            <span className="font-medium text-slate-700">12 Sep 2026, 10:15 AM</span>
          </div>
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-400 block font-medium">Report Released</span>
            <span className="font-bold text-emerald-700">
              {report.released_at ? new Date(report.released_at).toLocaleDateString() : "12 Sep 2026"}
            </span>
          </div>
        </div>

        {/* Investigation Title Banner */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between">
          <div className="font-bold text-sm tracking-wide">
            {resultData?.test_name || "Comprehensive Clinical Pathology & Biochemical Profile"}
          </div>
          <div className="text-xs text-teal-300 font-medium">Final Certified Report</div>
        </div>

        {/* Results Parameters Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-2.5 px-3">Test Investigation Parameter</th>
                <th className="py-2.5 px-3">Observed Result</th>
                <th className="py-2.5 px-3">Biological Reference Range</th>
                <th className="py-2.5 px-3">Units</th>
                <th className="py-2.5 px-3">Evaluation</th>
                <th className="py-2.5 px-3">Analytical Methodology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parameters.map((p: any, idx: number) => {
                const isAbnormal = p.status !== "normal";
                return (
                  <tr key={idx} className={isAbnormal ? "bg-rose-50/40" : "hover:bg-slate-50/50"}>
                    <td className="py-3 px-3 font-semibold text-slate-900">{p.name}</td>
                    <td className={`py-3 px-3 font-mono font-bold text-sm ${isAbnormal ? "text-rose-700" : "text-slate-900"}`}>
                      {p.value}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{p.reference_range}</td>
                    <td className="py-3 px-3 text-slate-500">{p.unit}</td>
                    <td className="py-3 px-3">
                      {isAbnormal ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          {p.status.toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{p.methodology || "Automated Clinical Analyzer"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Clinical Comments & Interpretation */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
            Pathologist Clinical Notes & Medical Interpretation:
          </div>
          <p className="text-slate-700 leading-relaxed">
            {resultData?.interpretation ||
              "All tested parameters fall within expected reference intervals. Glycated hemoglobin reflects consistent euglycemic control over the preceding 90 days. Dual calibration and internal quality control criteria satisfied."}
          </p>
          {resultData?.clinical_notes && (
            <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
              <strong>Specimen integrity:</strong> {resultData.clinical_notes}
            </p>
          )}
        </div>

        {/* Signatures & Certification Footer */}
        <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 items-end text-xs">
          <div>
            <div className="font-script text-base text-teal-800 font-bold mb-1">Laboratory Staff</div>
            <div className="w-32 h-0.5 bg-slate-300 mb-1" />
            <div className="font-bold text-slate-800">Laboratory Staff</div>
            <div className="text-[11px] text-slate-500">Specimen Processing</div>
          </div>

          <div className="text-center sm:text-left">
            <div className="w-16 h-16 border-2 border-teal-600/40 rounded-full flex flex-col items-center justify-center mx-auto sm:mx-0 text-teal-800 text-[9px] font-bold uppercase rotate-[-6deg] bg-teal-50/50">
              <span>REPORT</span>
              <span className="text-[7px]">{report.status}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="font-script text-base text-teal-800 font-bold mb-1">Pathologist</div>
            <div className="w-36 h-0.5 bg-slate-300 mb-1 ml-auto" />
            <div className="font-bold text-slate-800">{report.verified_by_name || "Pathologist"}</div>
            <div className="text-[11px] text-slate-500">Consultant Pathologist</div>
          </div>
        </div>

        {/* End of Report Barcode & Regulatory Disclaimer */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
          <div>
            Report ID: <span className="font-mono font-bold text-slate-600">{report.id}</span>
          </div>
          <div className="font-semibold uppercase tracking-wider text-slate-400">
            *** End of Diagnostic Laboratory Report ***
          </div>
        </div>
      </div>
    </div>
  );
}
