import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DiagnosticService } from "../api/services";
import { Booking, SampleStatusLog } from "../types";
import {
  Calendar,
  Clock,
  Home,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Truck,
  Plus,
  Stethoscope,
  ShieldCheck,
  ChevronRight,
  Download,
  Eye,
  Info,
  QrCode,
  MapPin,
  RefreshCw,
} from "lucide-react";

export function PatientDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedSampleTracking, setSelectedSampleTracking] = useState<{
    booking: Booking;
    history: SampleStatusLog[];
  } | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [newDoctorId, setNewDoctorId] = useState("");
  const [consentSuccess, setConsentSuccess] = useState<string | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    setBookingError(null);
    try {
      const data = await DiagnosticService.getMyBookings();
      setBookings(data);
    } catch (err: any) {
      setBookingError(err.response?.data?.error || err.message || "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(id);
    setBookingError(null);
    try {
      await DiagnosticService.cancelBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
      );
    } catch (err: any) {
      setBookingError(err.response?.data?.error || err.message || "Could not cancel this booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const openSampleTracker = async (booking: Booking) => {
    if (!booking.sample_id) {
      setBookingError("No specimen is linked to this booking yet.");
      return;
    }
    setTrackingLoading(true);
    try {
      const history = await DiagnosticService.getSampleHistory(booking.sample_id);
      setSelectedSampleTracking({ booking, history });
    } catch (err: any) {
      setBookingError(err.response?.data?.error || err.message || "Could not load specimen history.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    if (!newDoctorId) return;
    setBookingError(null);
    try {
      await DiagnosticService.grantDoctorConsent(newDoctorId);
      setConsentSuccess(`Electronic report access granted successfully to ${newDoctorId}`);
      setTimeout(() => {
        setConsentSuccess(null);
        setConsentModalOpen(false);
        setNewDoctorId("");
      }, 1800);
    } catch (err: any) {
      setBookingError(err.response?.data?.error || err.message || "Could not grant doctor access.");
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "confirmed", "sample_collected", "in_lab"].includes(b.status);
    if (filter === "completed") return b.status === "completed";
    if (filter === "cancelled") return b.status === "cancelled";
    return true;
  });

  const activeCount = bookings.filter((b) => ["pending", "confirmed", "sample_collected", "in_lab"].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const getStatusBadge = (status: string, reportStatus?: string | null) => {
    switch (status) {
      case "completed":
        if (reportStatus === "released" || reportStatus === "finalized") {
          return <span className="badge badge-completed">Report Ready</span>;
        }
        return <span className="badge badge-verified">Reviewing in Pathology</span>;
      case "confirmed":
        return <span className="badge badge-confirmed">Confirmed</span>;
      case "sample_collected":
        return <span className="badge badge-sample_collected">Sample Collected</span>;
      case "in_lab":
        return <span className="badge badge-in_lab">Processing in Lab</span>;
      case "cancelled":
        return <span className="badge badge-cancelled">Cancelled</span>;
      default:
        return <span className="badge badge-pending">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold tracking-wider uppercase">
            <span>ApexCare Patient Portal</span>
            <span>·</span>
            <span className="font-mono bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/40">
              UHID: {user?.uhid || "Not assigned"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.fullName || user?.email?.split("@")[0] || "Patient"}
          </h1>
          <p className="text-sm text-teal-100 max-w-xl">
            Track your specimen journey in real time, review verified clinical pathology reports, and manage doctor access consents.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setConsentModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold backdrop-blur-sm border border-white/20 transition-all flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4 text-teal-300" />
            <span>Doctor Access</span>
          </button>
          <Link
            to="/book-test"
            className="px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Test</span>
          </Link>
        </div>
      </div>

      {bookingError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm" role="alert">
          {bookingError}
        </div>
      )}

      {/* Metric Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Bookings</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</div>
            <div className="text-xs text-teal-600 font-medium mt-0.5">Upcoming sample collections</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports Ready</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{completedCount}</div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">Verified by Pathologist</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Home Pickups</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {bookings.filter((b) => b.collection_type === "home").length}
            </div>
            <div className="text-xs text-blue-600 font-medium mt-0.5">Cold-chain phlebotomy</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Home className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doctor Consents</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">1 Active</div>
            <div className="text-xs text-purple-600 font-medium mt-0.5">Authorized clinicians</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Bookings & Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Diagnostic Orders</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review appointment schedules, sample custody status, and downloadable test results.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "active" ? "bg-white text-teal-800 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === "completed" ? "bg-white text-emerald-800 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-700">Loading your health records...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-base font-bold text-slate-800">No bookings in this view</div>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Book tests online with certified home sample collection or convenient walk-ins.
            </p>
            <Link
              to="/book-test"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Browse Test Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Booking Details & Tests</th>
                  <th className="py-3.5 px-4">Scheduled Slot</th>
                  <th className="py-3.5 px-4">Collection Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900 font-mono text-xs text-teal-700">
                        {b.barcode || b.id}
                      </div>
                      <div className="mt-1 font-medium text-slate-800 text-xs sm:text-sm">
                        {b.tests && b.tests.length > 0 ? (
                          b.tests.map((t) => t.name).join(" + ")
                        ) : (
                          "Diagnostic Pathology Panel"
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Booked on {new Date(b.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(b.scheduled_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(b.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {b.collection_type === "home" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          <Home className="w-3.5 h-3.5" />
                          <span>Home Collection</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Lab Walk-in</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {getStatusBadge(b.status, b.report_status)}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900 text-sm">
                      ₹{b.total_amount}
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Sample Tracking Button */}
                        <button
                          onClick={() => openSampleTracker(b)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors flex items-center gap-1"
                          title="Track Specimen Custody"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Track</span>
                        </button>

                        {/* View Report if completed and released */}
                        {b.status === "completed" && (b.report_status === "released" || b.report_status === "finalized") ? (
                          <Link
                            to={`/reports/${b.report_id || b.id}`}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Report</span>
                          </Link>
                        ) : b.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Awaiting Release</span>
                          </span>
                        ) : ["pending", "confirmed"].includes(b.status) ? (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancellingId === b.id}
                            className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                          >
                            {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Specimen Chain of Custody Tracker Modal */}
      {selectedSampleTracking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-teal-300 font-semibold tracking-wider uppercase">
                  Specimen Chain of Custody
                </div>
                <div className="text-base font-bold font-mono mt-0.5">
                  Barcode: {selectedSampleTracking.booking.barcode || "—"}
                </div>
              </div>
              <button
                onClick={() => setSelectedSampleTracking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <strong>Scheduled For:</strong>{" "}
                  {new Date(selectedSampleTracking.booking.scheduled_at).toLocaleString()}
                </div>
                <div>
                  <strong>Type:</strong> {selectedSampleTracking.booking.collection_type === "home" ? "Home Collection" : "Walk-in Center"}
                </div>
              </div>

              {trackingLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                </div>
              ) : selectedSampleTracking.history.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Phlebotomist assignment pending for this booking.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-200">
                  {selectedSampleTracking.history.map((step, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                            {step.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(step.changed_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">
                          By: {step.changed_by_name || "Diagnostic Personnel"}
                        </div>
                        {step.location && (
                          <div className="text-[11px] text-teal-700 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-teal-500" />
                            {step.location}
                          </div>
                        )}
                        {step.note && (
                          <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                            {step.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedSampleTracking(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Doctor Access Modal */}
      {consentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base">Grant Doctor Access</h3>
              </div>
              <button onClick={() => setConsentModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                By granting access, your selected clinician will be able to securely view and download your verified laboratory results for medical evaluation.
              </p>

              {consentSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                  {consentSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select or Enter Doctor ID
                </label>
                <input
                  type="text"
                  value={newDoctorId}
                  onChange={(e) => setNewDoctorId(e.target.value.trim())}
                  placeholder="Enter doctor's account ID"
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-teal-50 text-teal-800 text-[11px] rounded-lg border border-teal-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>You maintain complete control and can revoke doctor permissions at any time from this dashboard.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setConsentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantConsent}
                  disabled={!newDoctorId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
                >
                  Authorize Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Health Guidelines Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">Preparing for Fasting Tests (Lipid, Glucose, Thyroid)</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain a 10 to 12 hour overnight fast before morning blood draws. Drinking plain water is encouraged to keep veins well hydrated.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer flex items-center gap-1 shrink-0">
          <span>Read Test Guidelines</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
