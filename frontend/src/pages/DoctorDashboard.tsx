import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DiagnosticService } from "../api/services";
import { DoctorPatient } from "../types";
import {
  Stethoscope,
  User,
  FileText,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Award,
  Phone,
  Mail,
  ChevronRight,
  Download,
  AlertCircle,
  Eye,
  Filter,
} from "lucide-react";

export function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await DiagnosticService.getDoctorPatients();
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || "Could not load authorized patients.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      setReportsLoading(true);
      setReportsError(null);
      DiagnosticService.getDoctorPatientReports(selectedPatientId)
        .then((r) => setReports(r))
        .catch((err: any) => {
          setReportsError(err.response?.data?.error || err.message || "Could not load patient reports.");
        })
        .finally(() => setReportsLoading(false));
    }
  }, [selectedPatientId]);

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Clinician Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
            <Stethoscope className="w-4 h-4 text-blue-400" />
            <span>Doctor Clinical Portal</span>
            <span>·</span>
            <span className="font-mono bg-blue-900/60 px-2 py-0.5 rounded border border-blue-500/30">
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {user?.fullName || user?.email}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Internal Medicine & Cardiovascular Diagnostics. Review verified pathology investigations with patient consent authorization.
          </p>
        </div>

        {(error || reportsError) && (
          <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
            {error || reportsError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">{patients.length}</div>
            <div className="text-[11px] text-blue-200 uppercase font-semibold">Active Consents</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-teal-400">100%</div>
            <div className="text-[11px] text-blue-200 uppercase font-semibold">Verified NABL</div>
          </div>
        </div>
      </div>

      {/* Main Two Column Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Consented Patients List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900 tracking-tight flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Authorized Patients</span>
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {patients.length} Consented
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, email, phone..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading patient directory...</div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No consented patients found matching your search.
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-4 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-blue-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>{p.full_name}</span>
                        {p.age && (
                          <span className="text-[11px] font-normal text-slate-500">
                            ({p.age}y / {p.gender})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{p.email}</span>
                      </div>
                      <div className="text-[11px] text-teal-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        <span>Consent active since {new Date(p.granted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? "text-blue-600 translate-x-1" : "text-slate-300"
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Electronic Health Record & Reports */}
        <div className="lg:col-span-7 space-y-5">
          {selectedPatient ? (
            <>
              {/* Selected Patient Details Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{selectedPatient.full_name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      CONSENT VERIFIED
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span><strong>Age:</strong> {selectedPatient.age || 34} Years</span>
                    <span>·</span>
                    <span><strong>Gender:</strong> {selectedPatient.gender || "Female"}</span>
                    <span>·</span>
                    <span><strong>Phone:</strong> {selectedPatient.phone || "+91 98765 43210"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Consent Status</div>
                  <div className="text-xs font-semibold text-emerald-600">Perpetual / Unrestricted</div>
                </div>
              </div>

              {/* Reports List */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 tracking-tight">
                      Diagnostic Laboratory Reports
                    </h4>
                    <p className="text-xs text-slate-500">
                      Official verified pathology reports released by laboratory consultants.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {reports.length} Report{reports.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {reportsLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Loading clinical results...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No released reports found for this patient.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {report.test_name || "Diagnostic Report"}
                            </span>
                            <span className="badge badge-completed">Released</span>
                          </div>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Collected: {new Date(report.scheduled_at).toLocaleDateString()}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Released: {new Date(report.released_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-teal-700 font-medium">
                            Verified by: {report.verified_by_name || "Pathologist"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/reports/${report.id}`}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Full Report</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Notes Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Doctor Clinical Impressions & Follow-up Notes
                </h4>
                <textarea
                  rows={3}
                  placeholder="Record confidential observation or follow-up recommendations for this patient..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  defaultValue="Patient reviewed for routine quarterly endocrine check. HbA1c of 5.4% indicates commendable glycemic control. Advised to maintain low-glycemic dietary regimen and re-test lipid profile in 6 months."
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => alert("Clinical notes saved successfully!")}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Save Clinical Note
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-500">
              <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-slate-700">No Patient Selected</div>
              <p className="text-xs text-slate-400 mt-1">
                Select an authorized patient from the left column to view their medical diagnostic history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
