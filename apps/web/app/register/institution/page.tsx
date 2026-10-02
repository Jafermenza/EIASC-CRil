"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../components/ui/toast-provider";
import { extractErrorMessage, isValidEmail, isValidPhone } from "../../../lib/validation";

const MapLocationPicker = dynamic(() => import("../../../components/ui/map-location-picker"), { ssr: false });

type Location = { id: string; name: string };
type Type = { id: string; code: string; name: string; description?: string };
type Bank = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};
type Fees = {
  currency: string;
  institution: number;
  methods: string[];
  telebirr?: { accountName: string; accountNumber: string };
  banks: Bank[];
};
const API = "/api/v1";
const inputStyle = { width: "100%", boxSizing: "border-box" as const };

export default function InstitutionRegistrationPage() {
  const { push } = useToast();
  const [step, setStep] = useState(1);
  const [regions, setRegions] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [subcities, setSubcities] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [fees, setFees] = useState<Fees | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ trackingCode: string; phone: string } | null>(null);
  const [application, setApplication] = useState<{ trackingCode: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);\n  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);\n  const [otherAttachments, setOtherAttachments] = useState<File[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    institutionName: "",
    institutionTypeId: "",
    establishmentDate: "",
    phone: "",
    email: "",
    alternativeName: "",
    website: "",
    secondaryPhone: "",
    regionId: "",
    zoneId: "",
    subcityId: "",
    districtId: "",
    address: "",
    latitude: "",
    longitude: "",
    mission: "",
    description: "",
    services: "",
    communityActivities: "",
    applicantName: "",
    applicantPhone: "",
    applicantEmail: "",
    leaderName: "",
    leaderRole: "",
    leaderPhone: "",
    leaderEmail: "",
    imamCount: "0",
    teacherCount: "0",
    administrativeStaffCount: "0",
    otherStaffCount: "0",
    studentCount: "0",
    educationTeacherCount: "0",
    educationLevels: "",
    paymentMethod: "",
    bankId: "",
    paymentReference: "",
    receiptUrl: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const progress = useMemo(() => Math.round((step / 3) * 100), [step]);
  const selectedBank = fees?.banks.find((bank) => bank.id === form.bankId);
  const subcityRequired = subcities.length > 0;
  const districtRequired = districts.length > 0;
  function reportError(message: string) {
    setError(message);
    push({ type: "error", title: "Registration needs attention", message });
  }
  useEffect(() => {
    Promise.all([
      fetch(`${API}/locations/regions`),
      fetch(`${API}/institution-types`),
      fetch(`${API}/payments/fees`),
    ])
      .then(async ([a, b, c]) => {
        if (!a.ok || !b.ok || !c.ok)
          throw new Error("Required registration data could not be loaded.");
        const regionData = await a.json();
        const typeData = await b.json();
        const feeData = await c.json();
        if (!typeData.length)
          throw new Error("No active institution types are configured.");
        if (!feeData.methods?.length)
          throw new Error(
            "No registration payment method is currently configured.",
          );
        setRegions(regionData);
        setTypes(typeData);
        setFees(feeData);
        setForm((f) => ({
          ...f,
          paymentMethod:
            f.paymentMethod && feeData.methods.includes(f.paymentMethod)
              ? f.paymentMethod
              : feeData.methods[0],
        }));
      })
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "Required registration data could not be loaded.",
        ),
      );
  }, []);
  useEffect(() => {
    setZones([]);
    setSubcities([]);
    setDistricts([]);
    setForm((f) => ({ ...f, zoneId: "", subcityId: "", districtId: "" }));
    if (form.regionId)
      fetch(
        `${API}/locations/zones?regionId=${encodeURIComponent(form.regionId)}`,
      )
        .then(async (r) => {
          if (!r.ok) throw new Error("Unable to load zones.");
          return r.json();
        })
        .then(setZones)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Unable to load zones."),
        );
  }, [form.regionId]);
  useEffect(() => {
    setSubcities([]);
    setDistricts([]);
    setForm((f) => ({ ...f, subcityId: "", districtId: "" }));
    if (!form.zoneId) return;
    fetch(
      `${API}/locations/subcities?zoneId=${encodeURIComponent(form.zoneId)}`,
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error("Unable to load sub-cities.");
        setSubcities(data);
        if (!data.length) {
          const d = await fetch(
            `${API}/locations/districts?zoneId=${encodeURIComponent(form.zoneId)}`,
          ).then(async (x) => {
            if (!x.ok) throw new Error("Unable to load districts.");
            return x.json();
          });
          setDistricts(d);
        }
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load location data.",
        ),
      );
  }, [form.zoneId]);
  useEffect(() => {
    if (!form.subcityId) return;
    setDistricts([]);
    fetch(
      `${API}/locations/districts?parentId=${encodeURIComponent(form.subcityId)}`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load districts.");
        return r.json();
      })
      .then(setDistricts)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load districts."),
      );
  }, [form.subcityId]);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("payment_ref");
    if (ref) {
      const saved = sessionStorage.getItem("institution-registration-application");
      if (saved) {
        try {
          setApplication(JSON.parse(saved));
        } catch {
          sessionStorage.removeItem("institution-registration-application");
        }
      }
      set("paymentMethod", "CHAPA");
      set("paymentReference", ref);
      setStep(3);
    }
  }, []);
  const step1Valid = () =>
    Boolean(
      form.institutionName &&
      form.institutionTypeId &&
      form.establishmentDate &&
      isValidPhone(form.phone) &&
      isValidEmail(form.email),
    );
  const step2Valid = () =>
    Boolean(
      form.regionId &&
      form.zoneId &&
      (!subcityRequired || form.subcityId) &&
      (!districtRequired || form.districtId) &&
      form.address &&
      form.leaderName &&
      form.leaderRole &&
      form.leaderPhone,
    );
  const paymentValid = () =>
    Boolean(
      form.paymentMethod &&
      form.paymentReference &&
      (form.paymentMethod !== "BANK_TRANSFER" || form.bankId),
    );
  const validationReason = () => {
    if (!form.institutionName || !form.institutionTypeId || !form.establishmentDate) return "Complete the institution name, type, and establishment date.";
    if (!isValidPhone(form.phone)) return "Enter a valid institution phone number, for example +251911234567.";
    if (!isValidEmail(form.email)) return "Enter a valid institution email address.";
    if (!step2Valid()) return "Complete the location and responsible-person details, including region, zone, address, leader name, role, and phone.";
    if (!paymentValid()) return form.paymentMethod === "BANK_TRANSFER" && !form.bankId ? "Select the bank used for the transfer." : "Choose a payment method and enter the transaction reference before submitting.";
    return "";
  };
  async function startChapa() {
    setError("");
    setPaying(true);
    try {
      const r = await fetch(`${API}/payments/chapa/initialize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "INSTITUTION",
          name: form.institutionName,
          email: form.email,
          phone: form.phone,
        }),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(extractErrorMessage(data, "Unable to start Chapa payment."));
      if (application) sessionStorage.setItem("institution-registration-application", JSON.stringify(application));
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Unable to start Chapa payment.");
    } finally {
      setPaying(false);
    }
  }
  async function uploadSupportingDocuments(trackingCode: string, phone: string, applicantName: string) {\n    const files: Array<{ file: File; type: string }> = [];\n    if (supportingDocument) files.push({ file: supportingDocument, type: "SUPPORTING_DOCUMENT" });\n    for (const file of otherAttachments) files.push({ file, type: "OTHER" });\n    for (const item of files) {\n      const body = new FormData();\n      body.append("file", item.file);\n      const response = await fetch(`${API}/registrations/institution/${encodeURIComponent(trackingCode)}/documents/${item.type}?phone=${encodeURIComponent(phone)}&firstName=${encodeURIComponent(applicantName)}`, { method: "POST", body });\n      const data = await response.json().catch(() => null);\n      if (!response.ok) throw new Error(extractErrorMessage(data, `Unable to upload ${item.file.name}.`));\n    }\n  }\n\n  async function saveApplication() {
    if (!step1Valid() || !step2Valid()) {
      reportError(validationReason());
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = applicationPayload();
      const r = await fetch(`${API}/registrations/institution`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(extractErrorMessage(data, "The institution application could not be saved."));
      await uploadSupportingDocuments(data.trackingCode, data.phone, form.applicantName || form.leaderName);\n      setApplication({ trackingCode: data.trackingCode, phone: data.phone });
      setLocationVerified(typeof data.locationVerified === "boolean" ? data.locationVerified : null);
      setStep(3);
    } catch (err) {
      reportError(err instanceof Error ? err.message : "The application service could not save your application.");
    } finally {
      setLoading(false);
    }
  }
  function applicationPayload() {
    return {
      institutionName: form.institutionName,
      institutionTypeId: form.institutionTypeId,
      establishmentDate: form.establishmentDate,
      phone: form.phone,
      email: form.email,
      alternativeName: form.alternativeName,
      website: form.website,
      secondaryPhone: form.secondaryPhone,
      regionId: form.regionId,
      zoneId: form.zoneId,
      subcityId: form.subcityId || undefined,
      districtId: form.districtId || undefined,
      address: form.address,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      mission: form.mission,
      description: form.description,
      services: form.services,
      communityActivities: form.communityActivities,
      applicantName: form.applicantName,
      applicantPhone: form.applicantPhone,
      applicantEmail: form.applicantEmail,
      leaders: [{ fullName: form.leaderName, role: form.leaderRole, phone: form.leaderPhone, email: form.leaderEmail }],
      staff: { imamCount: Number(form.imamCount), teacherCount: Number(form.teacherCount), administrativeStaffCount: Number(form.administrativeStaffCount), otherStaffCount: Number(form.otherStaffCount) },
      education: { studentCount: Number(form.studentCount), teacherCount: Number(form.educationTeacherCount), educationLevels: form.educationLevels.split(",").map((x) => x.trim()).filter(Boolean) },
    };
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!step1Valid()) {
      reportError(validationReason());
      setStep(1);
      return;
    }
    if (!step2Valid()) {
      reportError(validationReason());
      setStep(2);
      return;
    }
    if (!paymentValid()) {
      reportError(
        form.paymentMethod === "BANK_TRANSFER" && !form.bankId
          ? "Select the bank used for the transfer."
          : "Complete payment and enter the transaction reference before submitting.",
      );
      setStep(3);
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (!application) throw new Error("Save your application before submitting payment.");
      const payload = {
        payment: {
          method: form.paymentMethod,
          referenceNumber: form.paymentReference,
          receiptUrl: form.receiptUrl || undefined,
        },
      };
      const r = await fetch(`${API}/registrations/institution/${encodeURIComponent(application.trackingCode)}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          extractErrorMessage(data, "The institution application could not be submitted."),
        );
      setResult(data);
      sessionStorage.removeItem("institution-registration-application");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "The application service could not complete submission.");
    } finally {
      setLoading(false);
    }
  }
  if (result)
    return (
      <main className="shell hero">
        <p className="eyebrow">EIASC · INSTITUTION</p>
        <h1>Institution application submitted</h1>
        <p className="lead">
          Your payment reference has been recorded.
        </p>
        <section className="workflow-panel">
          <p className="eyebrow">TRACKING CODE</p>
          <h2>{result.trackingCode}</h2>
          <p>
            Status: <strong>SUBMITTED</strong>
          </p>
          <p>Registered phone: <strong>{result.phone}</strong></p>
          <p>Your registration remains incomplete until payment is received or approved by authorized EIASC authorities.</p>
          <div className="action-row">
            <Link
              className="button button-primary"
              href={`/track?code=${encodeURIComponent(result.trackingCode)}`}
            >
              Track application
            </Link>
            <Link className="button button-secondary" href="/">
              Return home
            </Link>
          </div>
        </section>
      </main>
    );
  return (
    <main className="shell" style={{ maxWidth: 1000 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · INSTITUTION REGISTRATION</p>
        <h1>Register an Islamic institution</h1>
        <p className="lead">
          Save your application before payment. Payment is required to complete
          registration.
        </p>
      </div>
      <section className="workflow-panel">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>Step {step} of 3</strong>
          <span>{progress}% complete</span>
        </div>
        <div
          style={{
            height: 8,
            background: "rgba(0,0,0,.1)",
            borderRadius: 99,
            overflow: "hidden",
            margin: "10px 0 16px",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "currentColor",
              transition: "width .2s",
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 8,
          }}
        >
          {[
            "Institution basics",
            "Location & responsible person",
            "Payment & submission",
          ].map((x, i) => (
            <button
              key={x}
              type="button"
              onClick={() => i + 1 < step && setStep(i + 1)}
              style={{
                border: 0,
                background: "transparent",
                textAlign: "left",
                opacity: i + 1 === step ? 1 : 0.65,
                cursor: i + 1 < step ? "pointer" : "default",
              }}
            >
              <strong>{String(i + 1).padStart(2, "0")}</strong>
              <br />
              {x}
            </button>
          ))}
        </div>
      </section>
      {error && (
        <section className="error-reason" role="alert">
          <strong>Registration needs attention</strong>
          <span>{error}</span>
        </section>
      )}
      <form onSubmit={submit} className="grid">
        {step === 1 && (
          <section>
            <p className="eyebrow">01 · BASIC INFORMATION</p>
            <h2>Institution information</h2>
            <p>
              <label>
                Institution name
                <input
                  style={inputStyle}
                  required
                  value={form.institutionName}
                  onChange={(e) => set("institutionName", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Institution type
                <select
                  style={inputStyle}
                  required
                  value={form.institutionTypeId}
                  onChange={(e) => set("institutionTypeId", e.target.value)}
                >
                  <option value="">Select institution type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>
                Establishment date
                <input
                  style={inputStyle}
                  required
                  type="date"
                  value={form.establishmentDate}
                  onChange={(e) => set("establishmentDate", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Phone
                <input
                  style={inputStyle}
                  required
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Email
                <input
                  style={inputStyle}
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Alternative name
                <input
                  style={inputStyle}
                  value={form.alternativeName}
                  onChange={(e) => set("alternativeName", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Website
                <input
                  style={inputStyle}
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://example.org"
                />
              </label>
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => { if (!step1Valid()) { reportError(validationReason()); return; } setError(""); setStep(2); }}
            >
              Continue to location
            </button>
          </section>
        )}
        {step === 2 && (
          <section>
            <p className="eyebrow">02 · LOCATION & RESPONSIBLE PERSON</p>
            <h2>Location and leadership</h2>
            <p>
              <label>
                Region
                <select
                  style={inputStyle}
                  required
                  value={form.regionId}
                  onChange={(e) => set("regionId", e.target.value)}
                >
                  <option value="">Select region</option>
                  {regions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>
                Zone / City
                <select
                  style={inputStyle}
                  required
                  value={form.zoneId}
                  disabled={!zones.length}
                  onChange={(e) => set("zoneId", e.target.value)}
                >
                  <option value="">Select zone / city</option>
                  {zones.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            {subcities.length > 0 && (
              <p>
                <label>
                  Sub-city / Town {subcityRequired ? "" : "(optional)"}
                  <select
                    style={inputStyle}
                    required={subcityRequired}
                    value={form.subcityId}
                    onChange={(e) => set("subcityId", e.target.value)}
                  >
                    <option value="">
                      {subcityRequired
                        ? "Select sub-city / town"
                        : "Not configured — optional"}
                    </option>
                    {subcities.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              </p>
            )}
            <p>
              <label>
                District / Woreda {districtRequired ? "" : "(optional)"}
                <select
                  style={inputStyle}
                  required={districtRequired}
                  value={form.districtId}
                  disabled={!districts.length}
                  onChange={(e) => set("districtId", e.target.value)}
                >
                  <option value="">
                    {districtRequired
                      ? "Select district / woreda"
                      : "Not configured — optional"}
                  </option>
                  {districts.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>
                Full address
                <textarea
                  style={inputStyle}
                  required
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </label>
            </p>
            <h3>Map location</h3>
            <p className="lead" style={{ fontSize: 14 }}>
              Enter the institution&apos;s coordinates manually, or use the map to pin the
              location. We compare the coordinates against the administrative geography
              database for the selected region/zone/sub-city/district; if a match is found
              nearby it is marked verified automatically, otherwise it is flagged for admin
              review.
            </p>
            <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ flex: "1 1 160px" }}>
                Latitude
                <input
                  style={inputStyle}
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="e.g. 9.0300"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                />
              </label>
              <label style={{ flex: "1 1 160px" }}>
                Longitude
                <input
                  style={inputStyle}
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="e.g. 38.7400"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                />
              </label>
            </p>
            <p>
              <button type="button" className="button button-secondary" onClick={() => setShowMap((v) => !v)}>
                {showMap ? "Hide map" : "Pin location on map"}
              </button>
            </p>
            {showMap && (
              <MapLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onPick={(lat, lng) => {
                  set("latitude", lat.toFixed(6));
                  set("longitude", lng.toFixed(6));
                }}
              />
            )}
            <h3>Responsible person</h3>
            <p>
              <label>
                Full name
                <input
                  style={inputStyle}
                  required
                  value={form.leaderName}
                  onChange={(e) => set("leaderName", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Role
                <input
                  style={inputStyle}
                  required
                  value={form.leaderRole}
                  onChange={(e) => set("leaderRole", e.target.value)}
                  placeholder="Imam, Director, Administrator…"
                />
              </label>
            </p>
            <p>
              <label>
                Phone
                <input
                  style={inputStyle}
                  required
                  value={form.leaderPhone}
                  onChange={(e) => set("leaderPhone", e.target.value)}
                />
              </label>
            </p>
            <p>
              <label>
                Email
                <input
                  style={inputStyle}
                  type="email"
                  value={form.leaderEmail}
                  onChange={(e) => set("leaderEmail", e.target.value)}
                />
              </label>
            </p>
            <div className="action-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={!step2Valid() || loading}
                onClick={saveApplication}
              >
            <section className="workflow-panel"><p className="eyebrow">SUPPORTING DOCUMENTS</p><h3>Attach supporting document</h3><p className="lead" style={{ fontSize: 14 }}>Optional. Upload one main supporting document and add other attachments if needed. PDF, JPEG, PNG or WebP; maximum 10 MB per file.</p><label>Supporting document<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setSupportingDocument(e.target.files?.[0] ?? null)} /></label>{supportingDocument && <p><small>{supportingDocument.name}</small></p>}<label>Other attachments (optional)<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setOtherAttachments(Array.from(e.target.files ?? []))} /></label>{otherAttachments.length > 0 && <ul>{otherAttachments.map((file) => <li key={file.name + file.size}>{file.name}</li>)}</ul>}</section>\n                {loading ? "Saving application…" : "Save application & continue to payment"}
              </button>
            </div>
          </section>
        )}
        {step === 3 && (
          <section>
            <p className="eyebrow">03 · PAYMENT & SUBMISSION</p>
            <h2>Pay the registration fee</h2>
            {application && (
              <section className="workflow-panel">
                <p><strong>Application saved</strong></p>
                <p>Tracking / application ID: <strong>{application.trackingCode}</strong></p>
                <p>Registered phone: <strong>{application.phone}</strong></p>
                {locationVerified !== null && (
                  <p>
                    Map location:{" "}
                    <strong>
                      {locationVerified
                        ? "Verified against geographic database"
                        : "Could not be auto-verified — flagged for admin review"}
                    </strong>
                  </p>
                )}
                <p>Your registration is incomplete until payment is received or approved by authorized EIASC authorities.</p>
              </section>
            )}
            <div className="workflow-panel">
              <strong>
                {fees
                  ? `${fees.institution.toFixed(2)} ${fees.currency}`
                  : "Registration fee"}
              </strong>
              <p>
                Payment is mandatory before the institution application can be
                submitted.
              </p>
            </div>
            <label>
              Payment method
              <select
                style={inputStyle}
                required
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={(e) => {
                  set("paymentMethod", e.target.value);
                  set("bankId", "");
                }}
              >
                <option value="">Select a payment method</option>
                {(fees?.methods ?? []).map((method) => (
                  <option key={method} value={method}>
                    {method === "BANK_TRANSFER" ? "Bank transfer" : method}
                  </option>
                ))}
              </select>
            </label>
            {form.paymentMethod === "TELEBIRR" && (
              <div className="workflow-panel">
                <p>
                  Send to{" "}
                  <strong>
                    {fees?.telebirr?.accountName ||
                      "configured Telebirr account"}
                  </strong>
                  {fees?.telebirr?.accountNumber && (
                    <>
                      {" "}
                      · <strong>{fees.telebirr.accountNumber}</strong>
                    </>
                  )}
                  .
                </p>
                <p>
                  <input
                    style={inputStyle}
                    required
                    placeholder="Telebirr transaction reference"
                    value={form.paymentReference}
                    onChange={(e) => set("paymentReference", e.target.value)}
                  />
                </p>
              </div>
            )}
            {form.paymentMethod === "BANK_TRANSFER" && (
              <div className="workflow-panel">
                <label>
                  Select bank
                  <select
                    style={inputStyle}
                    required
                    value={form.bankId}
                    onChange={(e) => set("bankId", e.target.value)}
                  >
                    <option value="">Select receiving bank</option>
                    {(fees?.banks ?? []).map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedBank && (
                  <div style={{ marginTop: 12 }}>
                    <p>
                      <strong>{selectedBank.bankName}</strong>
                    </p>
                    <p>
                      Account name: <strong>{selectedBank.accountName}</strong>
                      <br />
                      Account number:{" "}
                      <strong>{selectedBank.accountNumber}</strong>
                      {selectedBank.branch && (
                        <>
                          <br />
                          Branch: <strong>{selectedBank.branch}</strong>
                        </>
                      )}
                    </p>
                  </div>
                )}
                <p>
                  <input
                    style={inputStyle}
                    required
                    placeholder="Bank transaction reference number"
                    value={form.paymentReference}
                    onChange={(e) => set("paymentReference", e.target.value)}
                  />
                </p>
                <p className="lead" style={{ fontSize: 14 }}>
                  The transaction reference number is required for bank-transfer
                  verification.
                </p>
              </div>
            )}
            {form.paymentMethod === "CHAPA" && (
              <div>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={paying || !application}
                  onClick={startChapa}
                >
                  {paying ? "Opening secure checkout…" : "Pay with Chapa"}
                </button>
                <p className="lead" style={{ fontSize: 14 }}>
                  After payment, you return here with the Chapa reference.
                </p>
              </div>
            )}
            <p>
              {form.paymentMethod !== "CHAPA" && (
                <input
                  style={inputStyle}
                  placeholder="Receipt URL (optional)"
                  value={form.receiptUrl}
                  onChange={(e) => set("receiptUrl", e.target.value)}
                />
              )}
            </p>
            <div className="action-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                className="button button-primary"
                disabled={loading || !paymentValid()}
              >
                {loading
                  ? "Submitting application…"
                  : "Submit institution application"}
              </button>
            </div>
          </section>
        )}
      </form>
    </main>
  );
}
