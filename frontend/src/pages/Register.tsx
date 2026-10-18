import { useState, FormEvent, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HeartPulse,
  User,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building,
  Award,
  Camera,
  CameraOff,
  Scan,
  RefreshCw,
} from "lucide-react";
import { startWebcam, stopWebcam, extractFaceDescriptor } from "../utils/faceBiometrics";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    registrationNo: "",
    clinicName: "",
    specialization: "",
  });

  const [enableFaceId, setEnableFaceId] = useState(false);
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam(stream);
    };
  }, [stream]);

  const handleStartCamera = async () => {
    setCameraError(null);
    const res = await startWebcam();
    if (res.error) {
      setCameraError(res.error);
      setCameraActive(false);
      return;
    }
    setStream(res.stream);
    setCameraActive(true);
  };

  const handleStopCamera = () => {
    stopWebcam(stream);
    setStream(null);
    setCameraActive(false);
  };

  const handleCaptureFace = () => {
    if (!videoRef.current) return;
    setCameraError(null);
    const result = extractFaceDescriptor(videoRef.current);
    if (result.error) {
      setCameraError(result.error);
      return;
    }
    setCapturedDescriptor(result.descriptor);
    handleStopCamera();
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === "patient" && enableFaceId) {
      if (!biometricConsent) {
        setError("Explicit consent is required to enroll in Face ID.");
        return;
      }
      if (!capturedDescriptor) {
        setError("Please capture your Face ID biometric scan or uncheck the Face ID option.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await register({
        role,
        ...form,
        ...(role === "patient" && enableFaceId && capturedDescriptor
          ? { faceDescriptor: capturedDescriptor, biometricConsent: true }
          : {}),
      });

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Registration failed. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-elevated border border-slate-200/80 p-8 sm:p-10">
        <div className="text-center max-w-md mx-auto mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 mb-3 border border-teal-100 shadow-xs">
            <HeartPulse className="w-6 h-6 text-teal-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            ApexCare Hospital Registration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Super-Speciality Healthcare and Diagnostic Records.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Registration Issue</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Patient Account Successfully Registered!</div>
              <div className="text-emerald-700 mt-0.5">Redirecting to sign-in portal... You can sign in with your registered email and password.</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  role === "patient"
                    ? "border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    role === "patient" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Patient</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Book tests and view clinical health records
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  role === "doctor"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    role === "doctor" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900">Attending Doctor</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Clinical patient evaluation & verified pathology
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Core User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={update("fullName")}
                required
                placeholder={role === "doctor" ? "Dr. Full Name" : "e.g. John Doe"}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder="name@domain.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                required
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
              />
            </div>
          </div>

          {/* Optional Patient Biometric Face ID Enrollment */}
          {role === "patient" && (
            <div className="pt-4 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
                    <Scan className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Register with Face ID (Optional)</div>
                    <div className="text-xs text-slate-500">Enable camera-based biometric sign-in for your patient account</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableFaceId}
                    onChange={(e) => {
                      setEnableFaceId(e.target.checked);
                      if (!e.target.checked) {
                        handleStopCamera();
                        setCapturedDescriptor(null);
                        setBiometricConsent(false);
                        setCameraError(null);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {enableFaceId && (
                <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-4">
                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-teal-100">
                    <input
                      type="checkbox"
                      id="biometricConsent"
                      checked={biometricConsent}
                      onChange={(e) => setBiometricConsent(e.target.checked)}
                      required={enableFaceId}
                      className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="biometricConsent" className="text-xs text-slate-600 leading-normal">
                      <strong className="text-slate-800 block">Biometric Data Processing Consent (Required)</strong>
                      I explicitly consent to the collection and cryptographic hashing of my facial geometry template solely for diagnostic portal authentication at ApexCare Hospital in compliance with medical data privacy guidelines.
                    </label>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>{cameraError}</div>
                    </div>
                  )}

                  {/* Camera Viewfinder */}
                  {cameraActive && (
                    <div className="relative w-full max-w-xs mx-auto aspect-square bg-slate-900 rounded-2xl overflow-hidden border-2 border-teal-500 shadow-inner flex items-center justify-center">
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {/* Oval Face Guide */}
                      <div className="absolute inset-4 border-2 border-dashed border-teal-400/80 rounded-full pointer-events-none flex items-center justify-center">
                        <span className="text-[10px] font-medium text-teal-200 bg-slate-900/70 px-2 py-0.5 rounded-full mb-auto mt-2">
                          Align Face Inside Oval
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Captured Success State */}
                  {capturedDescriptor && !cameraActive && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Face biometric template ready (64-point normalized facial descriptor captured)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartCamera}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Rescan
                      </button>
                    </div>
                  )}

                  {/* Camera Control Buttons */}
                  <div className="flex gap-2 justify-center">
                    {!cameraActive ? (
                      <button
                        type="button"
                        disabled={!biometricConsent}
                        onClick={handleStartCamera}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
                      >
                        <Camera className="w-4 h-4" />
                        {capturedDescriptor ? "Retake Face Scan" : "Open Camera for Face Scan"}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCaptureFace}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                        >
                          <Scan className="w-4 h-4" />
                          Capture Face Template
                        </button>
                        <button
                          type="button"
                          onClick={handleStopCamera}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                        >
                          <CameraOff className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conditional Doctor Verification Fields */}
          {role === "doctor" && (
            <div className="pt-4 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <Award className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Doctor accounts require medical council license registration for compliance.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medical Council Registration Number
                  </label>
                  <input
                    type="text"
                    value={form.registrationNo}
                    onChange={update("registrationNo")}
                    required
                    placeholder="e.g. MCI-2019-94821"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={form.specialization}
                    onChange={update("specialization")}
                    placeholder="e.g. Cardiology, Internal Medicine"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hospital Department / Unit
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={form.clinicName}
                      onChange={update("clinicName")}
                      placeholder="e.g. ApexCare Department of Cardiology / Outpatient Clinic"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="terms"
              required
              defaultChecked
              className="mt-1 rounded text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="terms" className="text-xs text-slate-500 leading-normal">
              I agree to the ApexCare Hospital <span className="text-teal-600 underline cursor-pointer">Terms of Service</span>, <span className="text-teal-600 underline cursor-pointer">Patient Charter</span>, and consent to digital medical records transmission.
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {submitting ? (
              <span>Creating your hospital account...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered at ApexCare?{" "}
          <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
