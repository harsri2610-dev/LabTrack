import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DiagnosticService } from "../api/services";
import { TestCatalogItem } from "../types";
import {
  Search,
  Check,
  Calendar,
  Clock,
  Home,
  Building2,
  ShieldCheck,
  AlertCircle,
  Info,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
} from "lucide-react";

export function BookTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<TestCatalogItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<string>("07:30 AM - 09:30 AM");
  const [collectionType, setCollectionType] = useState<"home" | "walk_in">("home");
  const [address, setAddress] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Default scheduled date to tomorrow
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    setScheduledDate(tomorrow);

    DiagnosticService.getCatalog()
      .then((catalog) => {
        setTests(catalog);
        const paramTest = searchParams.get("test");
        if (paramTest) {
          setSelected(new Set([paramTest]));
        } else if (catalog.length > 0) {
          setSelected(new Set([catalog[0].id]));
        }
      })
      .catch((err: any) => {
        setError(err.response?.data?.error || err.message || "Could not load the test catalog.");
      });
  }, [searchParams]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const categories = ["All", "Hematology", "Biochemistry", "Endocrinology", "Pathology", "Microbiology"];

  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const selectedTestsList = tests.filter((t) => selected.has(t.id));
  const subtotal = selectedTestsList.reduce((sum, t) => sum + Number(t.price), 0);
  const homeCollectionFee = collectionType === "home" ? (subtotal >= 500 ? 0 : 100) : 0;
  const total = subtotal + homeCollectionFee;

  const handleSubmit = async () => {
    if (selected.size === 0) {
      setError("Please select at least one diagnostic test to proceed.");
      return;
    }
    if (!scheduledDate) {
      setError("Please select an appointment date.");
      return;
    }
    if (collectionType === "home" && !address.trim()) {
      setError("Please provide a home address for specimen collection.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const combinedDateTime = new Date(`${scheduledDate}T08:00:00Z`).toISOString();
      const bookingInput = {
        testIds: Array.from(selected),
        scheduledAt: combinedDateTime,
        collectionType,
        address: collectionType === "home" ? address : "ApexCare Super-Speciality Hospital — Central Diagnostics Wing",
      };
      await DiagnosticService.createBooking(bookingInput);
      navigate("/patient");
    } catch (err: any) {
      setError(
        err.response?.status === 401
          ? "Your backend session is missing or expired. Please sign in again to save this booking."
          : err.response?.data?.error || err.message || "Failed to create booking."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <span>ApexCare Hospital & Diagnostics</span>
          <span>·</span>
          <span>Online Scheduling</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Book Laboratory Investigations
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Select required test panels with standardized reference methodology and certified cold-chain phlebotomy.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Left Catalog, Right Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Search & Catalog */}
        <div className="lg:col-span-8 space-y-5">
          {/* Search & Category Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests e.g. CBC, Lipid Profile, Thyroid, Glucose, Urine..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? "bg-teal-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cards List */}
          <div className="space-y-3">
            {filteredTests.map((test) => {
              const isSelected = selected.has(test.id);
              return (
                <div
                  key={test.id}
                  onClick={() => toggle(test.id)}
                  className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                    isSelected
                      ? "bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                      : "bg-white border-slate-200/80 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center shrink-0 transition-colors border ${
                      isSelected
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  {/* Test Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                        {test.name}
                      </h3>
                      <div className="text-base sm:text-lg font-bold text-slate-900 font-sans">
                        ₹{test.price}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {test.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {test.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                        Sample: {test.sample_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {test.turnaround_hours}h TAT
                      </span>
                      {test.fasting_required ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          10-12h Fasting Mandatory
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          No Fasting Needed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Sticky Booking Configuration & Checkout */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base text-slate-900 tracking-tight">Order Summary</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                {selected.size} test{selected.size !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Selected items list */}
            {selectedTestsList.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedTestsList.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-slate-700 truncate pr-2">{t.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-900">₹{t.price}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(t.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                No investigations chosen yet
              </div>
            )}

            {/* Collection Mode Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Collection Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionType("home")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    collectionType === "home"
                      ? "bg-teal-50 border-teal-500 text-teal-800 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Home className="w-3.5 h-3.5 text-teal-600" />
                  <span>Home Pickup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionType("walk_in")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    collectionType === "walk_in"
                      ? "bg-teal-50 border-teal-500 text-teal-800 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Lab Walk-in</span>
                </button>
              </div>
            </div>

            {/* Home Address if applicable */}
            {collectionType === "home" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apartment, Street address, Landmark, City..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            {/* Scheduled Date & Time Slot */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Preferred Date & Time Slot
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {["07:00 AM - 09:00 AM", "09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM", "04:00 PM - 06:00 PM"].map(
                  (slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTimeSlot(slot)}
                      className={`p-1.5 rounded-md border text-center transition-all ${
                        timeSlot === slot
                          ? "bg-teal-600 text-white font-semibold border-teal-600"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {slot}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Bill Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Investigations Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Home Phlebotomy Fee:</span>
                <span className={homeCollectionFee === 0 ? "text-emerald-600 font-semibold" : ""}>
                  {collectionType === "home" ? (homeCollectionFee === 0 ? "FREE (Orders > ₹500)" : "₹100.00") : "₹0.00"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount:</span>
                <span className="text-teal-700 font-sans text-base">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {submitting ? (
                <span>Confirming Booking...</span>
              ) : (
                <>
                  <span>Schedule & Confirm</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>NABL Accredited · Pay Online or at Collection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
