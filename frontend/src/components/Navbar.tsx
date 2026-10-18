import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";
import {
  HeartPulse,
  Activity,
  FlaskConical,
  Stethoscope,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  Calendar,
  FileText,
  Sliders,
  PhoneCall,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case "doctor":
        return { label: "Attending Doctor", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: Stethoscope };
      case "lab_staff":
        return { label: "Laboratory Staff", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: FlaskConical };
      case "pathologist":
        return { label: "Consultant Pathologist", bg: "bg-teal-50 text-teal-700 border-teal-200", icon: Activity };
      case "admin":
        return { label: "Medical Administrator", bg: "bg-amber-50 text-amber-800 border-amber-200", icon: ShieldCheck };
      default:
        return { label: "Patient", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: User };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Hospital Accreditation & Emergency Helpline Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-teal-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              ApexCare Super-Speciality Hospital · NABH & JCI Accredited
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-400">CAP & NABL Certified Central Diagnostics</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5 hover:text-white transition-colors">
              <PhoneCall className="w-3 h-3 text-teal-400" />
              <span className="font-medium text-slate-200">24/7 Helpline:</span> 1800-APEX-CARE (1800-273-9227)
            </div>

          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md group-hover:shadow-glow transition-all">
                  <HeartPulse className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-lg tracking-tight text-slate-900 font-sans">
                      ApexCare <span className="text-teal-600">Hospital</span>
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                      SUPER-SPECIALITY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
                    Center for Advanced Medicine & Central Diagnostics
                  </p>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              {user && (
                <div className="hidden md:flex items-center gap-1">
                  {user.role === "patient" && (
                    <>
                      <Link
                        to="/patient"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive("/patient")
                            ? "bg-teal-50 text-teal-800 font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                        }`}
                      >
                        My Bookings & Records
                      </Link>
                      <Link
                        to="/book-test"
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive("/book-test")
                            ? "bg-teal-50 text-teal-800 font-semibold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                        }`}
                      >
                        Book Diagnostic Test
                      </Link>
                    </>
                  )}

                  {user.role === "doctor" && (
                    <Link
                      to="/doctor"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive("/doctor")
                          ? "bg-teal-50 text-teal-800 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      Patient Records & Reports
                    </Link>
                  )}

                  {["lab_staff", "pathologist"].includes(user.role) && (
                    <Link
                      to="/lab"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive("/lab")
                          ? "bg-teal-50 text-teal-800 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      Laboratory Workstation
                    </Link>
                  )}

                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive("/admin")
                          ? "bg-teal-50 text-teal-800 font-semibold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      Hospital Governance
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Right Side User Profile & Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                    <div className="flex flex-col items-end">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{user.fullName || user.email}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.bg}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </span>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all"
                  >
                    Patient Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2">
            {user ? (
              <>
                <div className="pb-3 border-b border-slate-100">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{user.fullName || user.email}</span>
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.bg}`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.label}
                  </span>
                </div>

                {user.role === "patient" && (
                  <>
                    <Link
                      to="/patient"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      My Bookings & Records
                    </Link>
                    <Link
                      to="/book-test"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Book a Test
                    </Link>
                  </>
                )}

                {user.role === "doctor" && (
                  <Link
                    to="/doctor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Doctor Dashboard
                  </Link>
                )}

                {["lab_staff", "pathologist"].includes(user.role) && (
                  <Link
                    to="/lab"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Lab Workstation
                  </Link>
                )}

                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Hospital Governance
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-white bg-teal-600 rounded-lg"
                >
                  Patient Register
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
