import { useEffect, useState } from "react";
import { DiagnosticService } from "../api/services";
import { TestCatalogItem, DoctorVerificationItem, AuditLogItem, Role, AdminUserItem, AdminStats } from "../types";
import {
  ShieldCheck,
  Activity,
  Users,
  FileText,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  Database,
  Lock,
  Layers,
  Building2,
  Stethoscope,
  Filter,
} from "lucide-react";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"catalog" | "doctors" | "users" | "audit">("catalog");
  const [catalog, setCatalog] = useState<TestCatalogItem[]>([]);
  const [doctorVerifications, setDoctorVerifications] = useState<DoctorVerificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // New test modal state
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    category: "Biochemistry",
    description: "",
    price: "",
    sample_type: "Serum (SST Gel)",
    turnaround_hours: 12,
    fasting_required: false,
    preparation: "Standard overnight fasting recommended.",
  });
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cat, docs, logs, userList, adminStats] = await Promise.all([
        DiagnosticService.getCatalog(),
        DiagnosticService.getDoctorVerifications(),
        DiagnosticService.getAuditLogs(),
        DiagnosticService.getAdminUsers(),
        DiagnosticService.getAdminStats(),
      ]);
      setCatalog(cat);
      setDoctorVerifications(docs);
      setAuditLogs(logs);
      setUsers(userList);
      setStats(adminStats);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || "Could not load administration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTest.name || !newTest.price) return;
    try {
      await DiagnosticService.addCatalogItem(newTest);
      setShowAddTestModal(false);
      setNewTest({
        name: "",
        category: "Biochemistry",
        description: "",
        price: "",
        sample_type: "Serum (SST Gel)",
        turnaround_hours: 12,
        fasting_required: false,
        preparation: "Standard overnight fasting recommended.",
      });
      setActionNotice("New investigation successfully added to active clinical catalog.");
      await loadAdminData();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || "Could not save the catalog item.");
    }
  };

  const handleVerifyDoctor = async (id: string, approve: boolean) => {
    try {
      await DiagnosticService.verifyDoctor(id, approve);
      setDoctorVerifications((prev) =>
        prev.map((d) => (d.id === id ? { ...d, verified: approve } : d))
      );
      setActionNotice(
        approve
          ? "Doctor license credentials verified. Access granted to patient consent module."
          : "Doctor application rejected."
      );
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      setLoadError(err.response?.data?.error || err.message || "Could not update doctor verification.");
    }
  };

  const pendingDoctors = doctorVerifications.filter((d) => !d.verified);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Platform Governance & Compliance</span>
            <span>·</span>
            <span className="font-mono bg-amber-900/60 px-2 py-0.5 rounded border border-amber-500/30">
              Admin Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            ApexCare Hospital & Diagnostic Administration
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Test catalog configuration, clinician verification credentials, user access policies, and regulatory audit compliance logs.
          </p>
        </div>

        {/* Top Metric Snapshots */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">
              {stats ? `₹${Number(stats.totalRevenue).toLocaleString("en-IN")}` : "—"}
            </div>
            <div className="text-[11px] text-amber-200 uppercase font-semibold">Total Revenue</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-amber-300">{pendingDoctors.length}</div>
            <div className="text-[11px] text-amber-200 uppercase font-semibold">Pending Verifications</div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
      {loadError && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          {loadError}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "catalog"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Test Catalog ({catalog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("doctors")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "doctors"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Doctor Verification Queue</span>
          {pendingDoctors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-900 font-bold">
              {pendingDoctors.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "users"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Staff Directory</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "audit"
              ? "border-amber-600 text-amber-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Regulatory Audit Logs</span>
        </button>
      </div>

      {/* Tab 1: Test Catalog Management */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Clinical Test Catalog</h3>
              <p className="text-xs text-slate-500">Configure pricing, turnaround times, and sample protocols.</p>
            </div>
            <button
              onClick={() => setShowAddTestModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Investigation</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Investigation Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Specimen Type</th>
                    <th className="py-3 px-4">TAT</th>
                    <th className="py-3 px-4">Fasting</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalog.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.description}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{item.sample_type}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{item.turnaround_hours}h</td>
                      <td className="py-3.5 px-4">
                        {item.fasting_required ? (
                          <span className="text-amber-700 font-semibold">10-12h</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">₹{item.price}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Doctor Verification Queue */}
      {activeTab === "doctors" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Physician License Verification Queue</h3>
            <p className="text-xs text-slate-500">
              Regulatory requirement: verify medical registration numbers with National Medical Commission prior to enabling patient data access.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {doctorVerifications.map((doc) => (
              <div
                key={doc.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">{doc.full_name}</span>
                    {doc.verified ? (
                      <span className="badge badge-completed">Verified & Approved</span>
                    ) : (
                      <span className="badge badge-pending">Pending Verification</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    <span>
                      <strong>Council Reg:</strong>{" "}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                        {doc.registration_no}
                      </span>
                    </span>
                    <span>·</span>
                    <span><strong>Specialization:</strong> {doc.specialization}</span>
                    <span>·</span>
                    <span><strong>Clinic:</strong> {doc.clinic_name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Contact: {doc.email} · {doc.phone} · Registered {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!doc.verified ? (
                    <>
                      <button
                        onClick={() => handleVerifyDoctor(doc.id, true)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve License</span>
                      </button>
                      <button
                        onClick={() => handleVerifyDoctor(doc.id, false)}
                        className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleVerifyDoctor(doc.id, false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg"
                    >
                      Revoke Verification
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users Directory */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">User Identity & Access Management</h3>
              <p className="text-xs text-slate-500">Overview of configured system accounts and RBAC assignments.</p>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No MongoDB user accounts were returned.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{item.full_name}</span>
                    <span className={`badge ${item.is_active ? "badge-completed" : "badge-pending"}`}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{item.email}</div>
                  <div className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">
                    Role: {item.role.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Regulatory Audit Log */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Immutable Regulatory Audit Trail</h3>
              <p className="text-xs text-slate-500">
                Cryptographic timestamped log conforming to DISHA, HIPAA, and ISO 15189 compliance guidelines.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
              <Lock className="w-3.5 h-3.5" />
              <span>Tamper Evident</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource Target</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {log.actor_name}
                      <span className="ml-1.5 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-teal-700">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-sans">
                      {log.resource} <span className="text-slate-400">({log.resource_id})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Test Modal */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Add Investigation to Test Catalog</h3>
              <button onClick={() => setShowAddTestModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Serum Ferritin & Iron Panel"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newTest.category}
                    onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500.00"
                    value={newTest.price}
                    onChange={(e) => setNewTest({ ...newTest, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Serum (SST Gel)"
                    value={newTest.sample_type}
                    onChange={(e) => setNewTest({ ...newTest, sample_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Turnaround (Hours)</label>
                  <input
                    type="number"
                    required
                    value={newTest.turnaround_hours}
                    onChange={(e) => setNewTest({ ...newTest, turnaround_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Description</label>
                <textarea
                  rows={2}
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  placeholder="Medical scope and indications for this diagnostic test..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fasting"
                  checked={newTest.fasting_required}
                  onChange={(e) => setNewTest({ ...newTest, fasting_required: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="fasting" className="text-xs text-slate-700 font-medium">
                  Mandatory 10-12 hour fasting required for this test
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
                >
                  Publish to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
