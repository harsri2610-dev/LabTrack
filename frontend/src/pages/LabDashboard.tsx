import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { DiagnosticService } from "../api/services";
import { Sample, SampleStatusLog, Report } from "../types";
import {
  FlaskConical,
  Activity,
  QrCode,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  FileCheck,
  AlertCircle,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  Sparkles,
  MapPin,
  Send,
  UserCheck,
} from "lucide-react";

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  collected: ["in_transit", "rejected"],
  in_transit: ["received_at_lab", "rejected"],
  received_at_lab: ["processing", "rejected"],
  processing: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(error)) {
    const apiMessage = error.response?.data?.error;
    if (typeof apiMessage === "string") return apiMessage;
  }
  return error instanceof Error ? error.message : fallback;
}

export function LabDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"custody" | "pathologist">("custody");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sample accessioning state
  const [newBookingId, setNewBookingId] = useState("");
  const [selectedSampleForUpdate, setSelectedSampleForUpdate] = useState<Sample | null>(null);
  const [newStatus, setNewStatus] = useState("in_transit");
  const [custodyNote, setCustodyNote] = useState("");
  const [historySampleId, setHistorySampleId] = useState<string | null>(null);
  const [sampleHistory, setSampleHistory] = useState<SampleStatusLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Reports & Pathologist verification state
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [reportFilter, setReportFilter] = useState<"all" | "draft" | "verified" | "released">("all");
  const [editableParameters, setEditableParameters] = useState<any[]>([]);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null);

  const selectReport = (r: Report | null) => {
    setReport(r);
    setSelectedReportId(r?.id || "");
    setVerificationNotes(r?.verification_notes || "");
    const params = (r?.result_data as any)?.parameters;
    setEditableParameters(Array.isArray(params) ? JSON.parse(JSON.stringify(params)) : []);
  };

  const loadData = async (preferredReportId?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sampleList, reportList] = await Promise.all([
        DiagnosticService.getSamples(),
        DiagnosticService.getReports(),
      ]);
      setSamples(sampleList);
      setReports(reportList);

      if (sampleList.length > 0 && !historySampleId) {
        setHistorySampleId(sampleList[0].id);
        const hist = await DiagnosticService.getSampleHistory(sampleList[0].id);
        setSampleHistory(hist);
      }

      const repId = preferredReportId || selectedReportId;
      const targetReport =
        (repId ? reportList.find((item) => item.id === repId) : null) ||
        reportList.find((item) => item.status === "draft") ||
        reportList.find((item) => item.status === "pending_verification") ||
        reportList.find((item) => item.status === "verified") ||
        reportList[0] ||
        null;

      selectReport(targetReport);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to load laboratory data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterSample = async () => {
    if (!newBookingId) return;
    setLoadError(null);
    try {
      const s = await DiagnosticService.registerSample(newBookingId);
      setActionMessage(`Specimen registered successfully! Barcode assigned: ${s.barcode}`);
      setNewBookingId("");
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to register the specimen."));
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedSampleForUpdate) return;
    setLoadError(null);
    try {
      await DiagnosticService.updateSampleStatus(selectedSampleForUpdate.id, newStatus, custodyNote);
      setActionMessage(`Specimen ${selectedSampleForUpdate.barcode} updated to "${newStatus.replace(/_/g, " ")}"`);
      setSelectedSampleForUpdate(null);
      setCustodyNote("");
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to update specimen status."));
    }
  };

  const handleCreateDraftReport = async (bookingId?: string, sampleId?: string, barcode?: string) => {
    if (!bookingId) return;
    setDraftLoadingId(bookingId);
    setLoadError(null);
    try {
      const created = await DiagnosticService.createDraftReport(bookingId, sampleId);
      setActionMessage(`Draft report successfully ready for specimen ${barcode || bookingId.slice(0, 8)}`);
      await loadData(created.id);
      setActiveTab("pathologist");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to create draft report."));
    } finally {
      setDraftLoadingId(null);
    }
  };

  const handleParameterChange = (index: number, field: string, value: string) => {
    setEditableParameters((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const viewHistory = async (sampleId: string) => {
    setHistorySampleId(sampleId);
    setHistoryLoading(true);
    try {
      setLoadError(null);
      const hist = await DiagnosticService.getSampleHistory(sampleId);
      setSampleHistory(hist);
    } catch (error) {
      setSampleHistory([]);
      setLoadError(getErrorMessage(error, "Unable to load specimen history."));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!report) return;
    setVerifying(true);
    setLoadError(null);
    try {
      const updatedResultData = {
        ...(typeof report.result_data === "object" ? report.result_data : {}),
        parameters: editableParameters,
      };
      const updated = await DiagnosticService.verifyReport(report.id, verificationNotes, updatedResultData);
      setReport(updated);
      await loadData(updated.id);
      setActionMessage("Report verified and digitally stamped by Consultant Pathologist!");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to verify the report."));
    } finally {
      setVerifying(false);
    }
  };

  const handleRelease = async () => {
    if (!report) return;
    setReleasing(true);
    setLoadError(null);
    try {
      const updated = await DiagnosticService.releaseReport(report.id);
      setReport(updated);
      await loadData(updated.id);
      setActionMessage("Report released to patient portal and attending physician!");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to release the report."));
    } finally {
      setReleasing(false);
    }
  };

  const isPathologist = user?.role === "pathologist" || user?.role === "admin";
  const availableStatusTransitions = selectedSampleForUpdate
    ? ALLOWED_STATUS_TRANSITIONS[selectedSampleForUpdate.status] ?? []
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Workstation Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Central Laboratory Operations Console</span>
            <span>·</span>
            <span className="font-mono bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/30">
              Station ID: CL-DECK-02
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Specimen Custody & Pathology Workstation
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Audit-grade sample custody tracking, real-time analyzer interfaces, and pathologist diagnostic release.
          </p>
        </div>

        {/* Operational Metrics */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">{samples.length}</div>
            <div className="text-[11px] text-purple-200 uppercase font-semibold">Active Tubes</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-emerald-400">{samples.length}</div>
            <div className="text-[11px] text-purple-200 uppercase font-semibold">MongoDB Samples</div>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}
      {loadError && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {loadError}
        </div>
      )}

      {/* Primary Workstation Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("custody")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "custody"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Specimen Registration & Chain-of-Custody</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
            {samples.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pathologist")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "pathologist"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Pathologist Verification & Sign-off</span>
          {isPathologist && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-800 font-semibold">
              Ready
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Chain of Custody */}
      {activeTab === "custody" && (
        <div className="space-y-6">
          {/* Quick Accessioning Action Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              <span>Specimen Accessioning & Barcode Tagging</span>
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newBookingId}
                onChange={(e) => setNewBookingId(e.target.value)}
                placeholder="Enter booking ID (UUID)"
                className="w-full sm:flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
              <button
                onClick={handleRegisterSample}
                disabled={!newBookingId}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                <span>Register & Print Barcode</span>
              </button>
            </div>
          </div>

          {/* Two-Column: Sample Queue on Left, Chain-of-Custody Timeline on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Active Samples Table */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight">Active Specimens</h4>
                  <p className="text-xs text-slate-500">
                    Click any tube to inspect complete custody log or transition status.
                  </p>
                </div>
                <button
                  onClick={() => loadData()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading specimens...</div>
                ) : samples.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">No specimen records are available.</div>
                ) : samples.map((s) => {
                  const isInspecting = historySampleId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => viewHistory(s.id)}
                      className={`p-4 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isInspecting ? "bg-purple-50/60 border-l-4 border-purple-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {s.barcode}
                          </span>
                          <span className={`badge badge-${s.status}`}>
                            {s.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800">
                          {s.patient_name || "Patient Sample"} · {s.tube_type || "EDTA Lavender"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Booking Ref: <span className="font-mono">{s.booking_id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.status === "completed" && (
                          (() => {
                            const linkedReport = reports.find(
                              (r) => r.booking_id === s.booking_id || r.sample_id === s.id
                            );
                            if (linkedReport) {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectReport(linkedReport);
                                    setActiveTab("pathologist");
                                  }}
                                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                                  title="Review this report in Pathologist tab"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Review Report ({linkedReport.status})</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateDraftReport(s.booking_id, s.id, s.barcode);
                                }}
                                disabled={draftLoadingId === s.booking_id}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                title="Generate Draft Report for Pathologist Review"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{draftLoadingId === s.booking_id ? "Generating..." : "Create Draft Report"}</span>
                              </button>
                            );
                          })()
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSampleForUpdate(s);
                            setNewStatus(ALLOWED_STATUS_TRANSITIONS[s.status]?.[0] ?? s.status);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Chain-of-Custody Timeline Log */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Chain-of-Custody Audit Trail</span>
                </h4>
                <span className="font-mono text-xs text-purple-700 font-bold">
                  {historySampleId}
                </span>
              </div>

              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : sampleHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Select a specimen to view custody log.
                </div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200">
                  {sampleHistory.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 uppercase">
                            {step.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(step.changed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          Personnel: {step.changed_by_name || "Lab Staff"}
                        </div>
                        {step.location && (
                          <div className="text-[11px] text-purple-700 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-purple-500" />
                            <span>{step.location}</span>
                          </div>
                        )}
                        {step.note && (
                          <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-normal">
                            {step.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pathologist Verification & Release */}
      {activeTab === "pathologist" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 tracking-tight">
                  Clinical Pathology Report Verification & Sign-off
                </h3>
                <span className="badge badge-verified">
                  {reports.filter((r) => r.status === "draft" || r.status === "pending_verification").length} Drafts Awaiting Sign-off
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review automated analyzer values, compare against biological reference intervals, and apply electronic consultant signature.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData()}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Reports"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                to={selectedReportId ? `/reports/${selectedReportId}` : "#"}
                target="_blank"
                aria-disabled={!report}
                onClick={(event) => {
                  if (!report) event.preventDefault();
                }}
                className={`px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors ${!report ? "pointer-events-none opacity-50" : ""}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Print Report</span>
              </Link>
            </div>
          </div>

          {/* Report Queue Filter & Selection Carousel/Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  onClick={() => setReportFilter("all")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    reportFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  All ({reports.length})
                </button>
                <button
                  onClick={() => setReportFilter("draft")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    reportFilter === "draft" ? "bg-white text-amber-800 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Drafts ({reports.filter((r) => r.status === "draft" || r.status === "pending_verification").length})
                </button>
                <button
                  onClick={() => setReportFilter("verified")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    reportFilter === "verified" ? "bg-white text-teal-800 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Verified ({reports.filter((r) => r.status === "verified").length})
                </button>
                <button
                  onClick={() => setReportFilter("released")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    reportFilter === "released" ? "bg-white text-emerald-800 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Released ({reports.filter((r) => r.status === "released" || r.status === "finalized").length})
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Click any report below to inspect and sign off
              </div>
            </div>

            {(() => {
              const filteredReports = reports.filter((r) => {
                if (reportFilter === "all") return true;
                if (reportFilter === "draft") return r.status === "draft" || r.status === "pending_verification";
                if (reportFilter === "verified") return r.status === "verified";
                if (reportFilter === "released") return r.status === "released" || r.status === "finalized";
                return true;
              });

              if (filteredReports.length === 0) {
                return (
                  <div className="py-10 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
                    <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-slate-700">No Diagnostic Reports in Queue</div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Completed specimens in Chain-of-Custody will automatically generate draft reports here for clinical verification.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredReports.map((r) => {
                    const isSelected = selectedReportId === r.id;
                    const isDraft = r.status === "draft" || r.status === "pending_verification";
                    const isVerified = r.status === "verified";
                    const isReleased = r.status === "released" || r.status === "finalized";

                    return (
                      <div
                        key={r.id}
                        onClick={() => selectReport(r)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? "bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {r.barcode || "N/A"}
                          </span>
                          <span
                            className={`badge ${
                              isReleased
                                ? "badge-completed"
                                : isVerified
                                ? "badge-verified"
                                : "badge-in_lab"
                            }`}
                          >
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {r.patient_name || "Patient Record"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {Array.isArray(r.tests) && r.tests.length > 0
                              ? r.tests.join(", ")
                              : (r.result_data as any)?.test_name || "Diagnostic Panel"}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                          <span>Ref: {r.id.slice(0, 8)}...</span>
                          <span>{isSelected ? "● Selected" : "Click to review"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Selected Report Inspection & Verification Workspace */}
          {report ? (
            <div className="space-y-6 pt-4 border-t border-slate-200">
              {/* Patient & Specimen Info Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name</span>
                  <span className="font-bold text-slate-900 text-sm">{report.patient_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Report Status</span>
                  <span className="font-bold text-slate-900 text-sm capitalize">{report.status.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Specimen Barcode</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{report.barcode || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Referring Clinician</span>
                  <span className="font-bold text-slate-900 text-sm">{report.doctor_name || "—"}</span>
                </div>
              </div>

              {/* Clinical Parameter Values Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Test Parameter</th>
                      <th className="py-3 px-4">Measured Value</th>
                      <th className="py-3 px-4">Reference Range</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Evaluation</th>
                      <th className="py-3 px-4">Analytical Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* If draft / unverified, allow editing parameters */}
                    {report.status === "draft" || report.status === "pending_verification" ? (
                      editableParameters.length > 0 ? (
                        editableParameters.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={p.value ?? ""}
                                onChange={(e) => handleParameterChange(idx, "value", e.target.value)}
                                placeholder="Enter value..."
                                className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={p.reference_range ?? ""}
                                onChange={(e) => handleParameterChange(idx, "reference_range", e.target.value)}
                                className="w-28 px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={p.unit ?? ""}
                                onChange={(e) => handleParameterChange(idx, "unit", e.target.value)}
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-xs"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={p.status || "normal"}
                                onChange={(e) => handleParameterChange(idx, "status", e.target.value)}
                                className={`px-2 py-1 border rounded text-xs font-semibold ${
                                  p.status === "normal"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-rose-300 bg-rose-50 text-rose-800"
                                }`}
                              >
                                <option value="normal">NORMAL</option>
                                <option value="high">HIGH</option>
                                <option value="low">LOW</option>
                                <option value="critical">CRITICAL</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {p.methodology || "Automated Clinical Analyzer"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No parameter array loaded.
                          </td>
                        </tr>
                      )
                    ) : (
                      /* Read-only rendering for verified / released reports */
                      "parameters" in (report.result_data || {}) && Array.isArray((report.result_data as any).parameters) ? (
                        (report.result_data as any).parameters.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">{p.value}</td>
                            <td className="py-3 px-4 text-slate-600">{p.reference_range}</td>
                            <td className="py-3 px-4 text-slate-500">{p.unit}</td>
                            <td className="py-3 px-4">
                              {p.status === "normal" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  Normal
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Abnormal ({String(p.status).toUpperCase()})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{p.methodology || "Automated Clinical Analyzer"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400">
                            No parameter array loaded.
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pathologist Clinical Interpretation & Sign-off Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pathologist Clinical Interpretation
                  </label>
                  <textarea
                    rows={3}
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    disabled={report.status === "released"}
                    placeholder="Enter diagnostic impressions, microscopic findings, or clinical recommendations..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Consultant Sign-off & Electronic Release
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      Verification creates an immutable cryptographic audit record (`audit_logs`) and certifies sample results according to ISO 15189 regulations.
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 flex-wrap">
                    {/* Digitally Verify Button */}
                    <button
                      onClick={handleVerify}
                      disabled={verifying || (report.status !== "draft" && report.status !== "pending_verification")}
                      className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                        report.status === "draft" || report.status === "pending_verification"
                          ? "bg-teal-600 hover:bg-teal-700"
                          : "bg-slate-400 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {verifying
                          ? "Signing..."
                          : report.status === "verified" || report.status === "released"
                          ? "Report Verified ✓"
                          : "Digitally Verify Report"}
                      </span>
                    </button>

                    {/* Release Button */}
                    <button
                      onClick={handleRelease}
                      disabled={releasing || report.status !== "verified"}
                      className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 ${
                        report.status === "verified"
                          ? "bg-slate-900 hover:bg-slate-800 text-white"
                          : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 text-teal-400" />
                      <span>
                        {releasing
                          ? "Releasing..."
                          : report.status === "released"
                          ? "Released to Patient ✓"
                          : "Release to Patient & Doctor"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No report selected. Select a report from the queue above to review and sign off.
            </div>
          )}
        </div>
      )}

      {/* Custody Transition Modal */}
      {selectedSampleForUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-300 font-semibold uppercase">Update Chain of Custody</div>
                <div className="text-sm font-bold font-mono mt-0.5">{selectedSampleForUpdate.barcode}</div>
              </div>
              <button onClick={() => setSelectedSampleForUpdate(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Custody Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  disabled={availableStatusTransitions.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {availableStatusTransitions.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
                  ))}
                </select>
                {availableStatusTransitions.length === 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">This specimen has no further allowed status transitions.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Custody Log Notes (Location, Temp, Seal)</label>
                <input
                  type="text"
                  value={custodyNote}
                  onChange={(e) => setCustodyNote(e.target.value)}
                  placeholder="e.g. Centrifuged at 3000 RPM, loaded into Cobas Track"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedSampleForUpdate(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!availableStatusTransitions.includes(newStatus)}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
                >
                  Confirm Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
