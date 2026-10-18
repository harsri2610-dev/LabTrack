import { apiClient } from "./client";
import {
  TestCatalogItem,
  Booking,
  Report,
  DoctorPatient,
  Sample,
  SampleStatusLog,
  DoctorVerificationItem,
  AuditLogItem,
  AdminUserItem,
  AdminStats,
} from "../types";

type BookingInput = {
  testIds: string[];
  scheduledAt: string;
  collectionType: "home" | "walk_in";
  address?: string;
  referringDoctorId?: string;
};

export const DiagnosticService = {
  async getCatalog(): Promise<TestCatalogItem[]> {
    const res = await apiClient.get("/catalog");
    if (!Array.isArray(res.data?.tests)) {
      throw new Error("The catalog service returned an invalid response.");
    }
    return res.data.tests;
  },

  async addCatalogItem(item: Omit<TestCatalogItem, "id">): Promise<TestCatalogItem> {
    const res = await apiClient.post("/catalog", item);
    if (!res.data?.test) {
      throw new Error("The catalog service did not confirm the test was saved.");
    }
    return res.data.test;
  },

  async toggleCatalogItem(id: string, active: boolean): Promise<void> {
    await apiClient.patch(`/catalog/${id}`, { is_active: active });
  },

  async getMyBookings(): Promise<Booking[]> {
    const res = await apiClient.get("/bookings/mine");
    if (!Array.isArray(res.data?.bookings)) {
      throw new Error("The booking service returned an invalid response.");
    }
    return res.data.bookings;
  },

  async createBooking(payload: BookingInput): Promise<Booking> {
    const res = await apiClient.post("/bookings", payload);
    if (!res.data?.booking) {
      throw new Error("The booking service did not confirm that the booking was saved.");
    }
    return res.data.booking;
  },

  async cancelBooking(id: string): Promise<void> {
    await apiClient.patch(`/bookings/${id}/cancel`);
  },

  async getReport(id: string): Promise<Report> {
    const res = await apiClient.get(`/reports/${id}`);
    if (!res.data?.report) {
      throw new Error("The report service returned an invalid response.");
    }
    return res.data.report;
  },

  async getReports(): Promise<Report[]> {
    const res = await apiClient.get("/reports");
    if (!Array.isArray(res.data?.reports)) {
      throw new Error("The report service returned an invalid report list.");
    }
    return res.data.reports;
  },

  async createDraftReport(bookingId: string, sampleId?: string, resultData?: Record<string, unknown>): Promise<Report> {
    const res = await apiClient.post("/reports", { bookingId, sampleId, resultData: resultData || {} });
    if (!res.data?.report) {
      throw new Error("The report service did not confirm draft report creation.");
    }
    return res.data.report;
  },

  async verifyReport(id: string, notes?: string, resultData?: Record<string, unknown>): Promise<Report> {
    const payload: Record<string, unknown> = {};
    if (notes) payload.notes = notes;
    if (resultData) payload.resultData = resultData;
    const res = await apiClient.patch(`/reports/${id}/verify`, payload);
    if (!res.data?.report) {
      throw new Error("The report service did not confirm verification.");
    }
    return res.data.report;
  },

  async releaseReport(id: string): Promise<Report> {
    const res = await apiClient.patch(`/reports/${id}/release`);
    if (!res.data?.report) {
      throw new Error("The report service did not confirm release.");
    }
    return res.data.report;
  },

  async getDoctorPatients(): Promise<DoctorPatient[]> {
    const res = await apiClient.get("/doctors/patients");
    if (!Array.isArray(res.data?.patients)) {
      throw new Error("The doctor service returned an invalid patient list.");
    }
    return res.data.patients;
  },

  async getDoctorPatientReports(patientId: string): Promise<Report[]> {
    const res = await apiClient.get(`/doctors/patients/${patientId}/reports`);
    if (!Array.isArray(res.data?.reports)) {
      throw new Error("The doctor service returned an invalid report list.");
    }
    return res.data.reports;
  },

  async grantDoctorConsent(doctorId: string): Promise<void> {
    await apiClient.post("/doctors/access", { doctorId });
  },

  async revokeDoctorConsent(doctorId: string): Promise<void> {
    await apiClient.delete(`/doctors/access/${doctorId}`);
  },

  async getSamples(): Promise<Sample[]> {
    const res = await apiClient.get("/samples");
    if (!Array.isArray(res.data?.samples)) {
      throw new Error("The sample service returned an invalid response.");
    }
    return res.data.samples;
  },

  async registerSample(bookingId: string): Promise<Sample> {
    const res = await apiClient.post("/samples", { bookingId });
    if (!res.data?.sample) {
      throw new Error("The sample service did not confirm registration.");
    }
    return res.data.sample;
  },

  async updateSampleStatus(sampleId: string, status: string, note?: string): Promise<void> {
    await apiClient.patch(`/samples/${sampleId}/status`, { status, note });
  },

  async getSampleHistory(sampleId: string): Promise<SampleStatusLog[]> {
    const res = await apiClient.get(`/samples/${sampleId}/history`);
    if (!Array.isArray(res.data?.history)) {
      throw new Error("The sample history service returned an invalid response.");
    }
    return res.data.history;
  },

  async getDoctorVerifications(): Promise<DoctorVerificationItem[]> {
    const res = await apiClient.get("/admin/doctors");
    if (!Array.isArray(res.data?.doctors)) {
      throw new Error("The admin service returned an invalid doctor list.");
    }
    return res.data.doctors;
  },

  async verifyDoctor(id: string, approve: boolean): Promise<void> {
    await apiClient.patch(`/admin/doctors/${id}/verify`, { verified: approve });
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await apiClient.get("/admin/audit-logs");
    if (!Array.isArray(res.data?.auditLogs)) {
      throw new Error("The audit service returned an invalid log list.");
    }
    return res.data.auditLogs;
  },

  async getAdminUsers(): Promise<AdminUserItem[]> {
    const res = await apiClient.get("/admin/users");
    if (!Array.isArray(res.data?.users)) {
      throw new Error("The admin service returned an invalid user list.");
    }
    return res.data.users;
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await apiClient.get("/admin/stats");
    if (!res.data?.stats) {
      throw new Error("The admin service returned invalid statistics.");
    }
    return res.data.stats;
  },
};
