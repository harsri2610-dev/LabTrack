import { useState, FormEvent, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Scan,
  Camera,
  X,
  Loader2,
} from "lucide-react";
import { startWebcam, stopWebcam, extractFaceDescriptor } from "../utils/faceBiometrics";

export function Login() {
  const { login, loginWithFace } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Patient Face ID State
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceEmail, setFaceEmail] = useState("");
  const [faceError, setFaceError] = useState<string | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  };

  const handleOpenFaceModal = async () => {
    setShowFaceModal(true);
    setFaceError(null);
    setFaceEmail(email);
    const res = await startWebcam();
    if (res.error) {
      setFaceError(res.error);
      setCameraActive(false);
    } else {
      setStream(res.stream);
      setCameraActive(true);
    }
  };

  const handleCloseFaceModal = () => {
    stopWebcam(stream);
    setStream(null);
    setCameraActive(false);
    setShowFaceModal(false);
    setFaceError(null);
  };

  useEffect(() => {
    return () => {
      stopWebcam(stream);
    };
  }, [stream]);

  const handleFaceAuthenticate = async () => {
    if (!videoRef.current) return;
    setFaceError(null);
    setFaceLoading(true);

    const extraction = extractFaceDescriptor(videoRef.current);
    if (extraction.error || !extraction.descriptor) {
      setFaceError(extraction.error || "Unable to capture clear face scan. Ensure your face is centered in the oval guide.");
      setFaceLoading(false);
      return;
    }

    try {
      await loginWithFace(extraction.descriptor, faceEmail || undefined);
      handleCloseFaceModal();
      navigate("/");
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Face recognition failed. Biometric signature did not match any enrolled patient profile.";
      setFaceError(msg);
    } finally {
      setFaceLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-elevated border border-slate-200/80 overflow-hidden grid lg:grid-cols-12">
        {/* Left Hospital Brand Showcase Column */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg text-slate-950 font-bold">
                <HeartPulse className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  ApexCare <span className="text-teal-400 font-medium text-xs px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-500/30">HOSPITAL</span>
                </div>
                <div className="text-xs text-teal-300 font-medium">Super-Speciality & Diagnostics</div>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Clinical Medical Portal
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Secure access for patients and clinicians to diagnostic tests, sample chain-of-custody, and multi-speciality consultations.
            </p>

            <div className="space-y-3.5 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-teal-500/20 text-teal-300 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-200">
                  <strong className="text-white block font-semibold">Secure Account Access</strong>
                  Sign in using your registered email and password.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-teal-500/20 text-teal-300 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-200">
                  <strong className="text-white block font-semibold">Cold-Chain Specimen Tracking</strong>
                  Barcode tracking from hospital phlebotomy to analyzer release.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-teal-500/20 text-teal-300 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-200">
                  <strong className="text-white block font-semibold">NABH & CAP Reference Quality</strong>
                  Automated critical alerts with consultant pathologist certification.
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              NABH & JCI Accredited
            </span>
            <span>Emergency 24x7: 1800-APEX-CARE</span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
              <p className="text-sm text-slate-500 mt-1">
                Sign in with the email and password for your registered account.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Authentication Notice</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter account password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {submitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2.5 bg-white text-slate-400 font-medium">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenFaceModal}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 group shadow-2xs"
              >
                <Scan className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                <span>Sign in with Patient Face ID</span>
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              New patient at ApexCare Hospital?{" "}
              <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Face ID Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-elevated border border-slate-200 max-w-md w-full p-6 relative overflow-hidden animate-in fade-in duration-200">
            <button
              type="button"
              onClick={handleCloseFaceModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Patient Face ID Sign-In</h3>
                <p className="text-xs text-slate-500">Biometric access for enrolled patient accounts</p>
              </div>
            </div>

            {faceError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Authentication Notice</div>
                  <div>{faceError}</div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Patient Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={faceEmail}
                  onChange={(e) => setFaceEmail(e.target.value)}
                  placeholder="Enter email to speed up biometric match"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
                />
              </div>

              {/* Viewfinder */}
              <div className="relative w-64 h-64 mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 border-teal-500/80 shadow-inner flex items-center justify-center">
                {cameraActive ? (
                  <>
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    {/* Oval Guide & Scanning line */}
                    <div className="absolute inset-4 border-2 border-dashed border-teal-400/90 rounded-full pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] font-medium text-teal-200 bg-slate-900/80 px-2 py-0.5 rounded-full mb-auto mt-2">
                        Center Face Inside Oval
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Camera inactive</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={faceLoading || !cameraActive}
                  onClick={handleFaceAuthenticate}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {faceLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Biometric Signature...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4" />
                      <span>Scan & Verify Identity</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCloseFaceModal}
                  className="w-full py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Use Password Instead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
