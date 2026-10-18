import { Routes, Route, Navigate, Link } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { PatientDashboard } from "./pages/PatientDashboard";
import { BookTest } from "./pages/BookTest";
import { ReportView } from "./pages/ReportView";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { LabDashboard } from "./pages/LabDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Activity, ShieldCheck, PhoneCall, Mail, Heart, HeartPulse } from "lucide-react";

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "patient") return <Navigate to="/patient" replace />;
  if (user.role === "doctor") return <Navigate to="/doctor" replace />;
  if (["lab_staff", "pathologist"].includes(user.role)) return <Navigate to="/lab" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />

          <Route
            path="/patient"
            element={
              <ProtectedRoute allow={["patient"]}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-test"
            element={
              <ProtectedRoute allow={["patient"]}>
                <BookTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allow={["doctor"]}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab"
            element={
              <ProtectedRoute allow={["lab_staff", "pathologist"]}>
                <LabDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <ReportView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Production-grade Healthcare Footer (hidden on print) */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <span className="font-bold text-base tracking-tight">ApexCare Hospital</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Accredited clinical medicine & reference pathology delivering sample chain-of-custody tracking, voice biometrics security, and certified digital diagnostics.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Hospital Accreditations</h4>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  NABH & JCI Accredited Hospital
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  NABL Certificate: MC-4921
                </li>
                <li>CAP & ISO 15189:2022 Certified</li>
                <li>ICMR Certified Molecular Pathology</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Emergency & Hotlines</h4>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex items-center gap-1.5 text-slate-300">
                  <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                  1800-APEX-CARE (Toll-Free 24x7)
                </li>
                <li className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  support@apexcare.org
                </li>
                <li>24/7 Trauma Emergency: Ext. 108</li>
                <li>Home Sample Phlebotomy: 06:00 AM - 08:00 PM</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Regulatory & Trust</h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Patient diagnostic data and voice biometrics are encrypted under AES-256 and transmitted with patient-authorized electronic consent complying with DISHA, HIPAA, and Indian Medical Guidelines.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <div>
              © 2026 ApexCare Super-Speciality Hospital & Diagnostics Institute. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-300 cursor-pointer">Privacy Charter</span>
              <span>·</span>
              <span className="hover:text-slate-300 cursor-pointer">Quality Manual</span>
              <span>·</span>
              <span className="hover:text-slate-300 cursor-pointer">Critical Value Protocols</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
