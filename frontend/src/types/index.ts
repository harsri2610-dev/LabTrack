export type Role = "patient" | "doctor" | "lab_staff" | "pathologist" | "admin";

export interface AuthUser {
  id?: string;
  sub: string;
  role: Role;
  email: string;
  fullName?: string;
  phone?: string;
  uhid?: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalLabStaff: number;
  totalPathologists: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalSamples: number;
  totalReports: number;
  totalCatalog: number;
  totalRevenue: string;
}

export interface TestCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  sample_type: string;
  turnaround_hours: number;
  is_active?: boolean;
  fasting_required?: boolean;
  preparation?: string;
}

export interface BookingTestItem {
  id: string;
  name: string;
  price: string;
  category?: string;
  sample_type?: string;
}

export interface Booking {
  id: string;
  patient_id?: string;
  patient_email?: string;
  patient_name?: string;
  scheduled_at: string;
  collection_type: "home" | "walk_in";
  status: "pending" | "confirmed" | "sample_collected" | "in_lab" | "completed" | "cancelled" | string;
  total_amount: string;
  created_at: string;
  address?: string;
  sample_id?: string;
  barcode?: string;
  tests?: BookingTestItem[];
  report_id?: string | null;
  report_status?: string | null;
}

export interface TestParameterResult {
  name: string;
  value: string | number;
  unit: string;
  reference_range: string;
  status: "normal" | "high" | "low" | "critical";
  methodology?: string;
}

export interface ReportResultData {
  test_name?: string;
  category?: string;
  clinical_notes?: string;
  interpretation?: string;
  parameters: TestParameterResult[];
}

export interface Report {
  id: string;
  booking_id?: string;
  sample_id?: string;
  status: "draft" | "pending_verification" | "verified" | "released" | string;
  result_data: ReportResultData | Record<string, unknown>;
  pdf_url?: string;
  released_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
  verification_notes?: string;
  patient_name?: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_name?: string;
  barcode?: string;
  tests?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DoctorPatient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  granted_at: string;
  expires_at: string | null;
}

export interface SampleStatusLog {
  id?: string;
  sample_id?: string;
  status: string;
  changed_by_name?: string;
  note?: string;
  changed_at: string;
  location?: string;
  temperature_celsius?: number;
}

export interface Sample {
  id: string;
  booking_id: string;
  patient_id?: string;
  barcode: string;
  status: "collected" | "in_transit" | "received_at_lab" | "processing" | "completed" | "rejected" | string;
  collected_by_name?: string;
  collected_at?: string;
  created_at: string;
  patient_name?: string;
  tests?: string[];
  tube_type?: string;
  sample_type?: string;
  collection_type?: string;
  temperature_celsius?: number;
  rack_location?: string;
}

export interface DoctorVerificationItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  registration_no: string;
  clinic_name: string;
  specialization: string;
  verified: boolean;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_name: string;
  actor_role: Role;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}
