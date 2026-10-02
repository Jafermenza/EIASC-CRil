"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { extractErrorMessage, isValidEmail, isValidPhone } from "../../../lib/validation";
import { useToast } from "../../../components/ui/toast-provider";

type Location = { id: string; code?: string; name: string };
type Bank = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};
type Fees = {
  currency: string;
  individual: number;
  methods: string[];
  telebirr?: { accountName: string; accountNumber: string };
  banks: Bank[];
};
const API = "/api/v1";
const inputClass = { width: "100%", boxSizing: "border-box" as const };

export default function IndividualRegistrationPage() {
  const { push } = useToast();
  const [step, setStep] = useState(1);
  const [regions, setRegions] = useState<Location[]>([]);
  const [zones, setZones] = useState<Location[]>([]);
  const [subcities, setSubcities] = useState<Location[]>([]);
  const [districts, setDistricts] = useState<Location[]>([]);
  const [fees, setFees] = useState<Fees | null>(null);
  const [result, setResult] = useState<{ trackingCode: string; phone: string } | null>(null);
  const [application, setApplication] = useState<{ trackingCode: string; phone: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [otherAttachments, setOtherAttachments] = useState<File[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
    gender: "",
    maritalStatus: "",
    phone: "",
    email: "",
    educationLevel: "",
    fieldOfStudy: "",
    employmentStatus: "",
    careerRole: "",
    regionId: "",
    zoneId: "",
    subcityId: "",
    districtId: "",
    currentAddress: "",
    nationalIdentity: "",
    institutionId: "",
    familyRelationship: "",
    familyMemberName: "",
    familyMemberPhone: "",
    declarationAccepted: false,
    paymentMethod: "",
    bankId: "",
    paymentReference: "",
    receiptUrl: "",
  });
  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));
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
      fetch(`${API}/payments/fees`),
    ])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok)
          throw new Error("Required registration data could not be loaded.");
        const regionData = await a.json();
        const feeData = await b.json();
        if (!feeData.methods?.length)
          throw new Error(
            "No registration payment method is currently configured.",
          );
        setRegions(regionData);
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
          e instanceof Error ? e.message : "Unable to load registration data.",
        ),
      );
  }, []);
  useEffect(() => {
    setZones([]);
    setSubcities([]);
    setDistricts([]);
    setForm((f) => ({ ...f, zoneId: "", subcityId: "", districtId: "" }));
    if (!form.regionId) return;
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
      const saved = sessionStorage.getItem("individual-registration-application");
      if (saved) {
        try {
          setApplication(JSON.parse(saved));
        } catch {
          sessionStorage.removeItem("individual-registration-application");
        }
      }
      set("paymentMethod", "CHAPA");
      set("paymentReference", ref);
      setStep(3);
    }
  }, []);

  function stepOneValid() {
    return Boolean(
      form.firstName &&
      form.lastName &&
      form.birthDate &&
      form.gender &&
      form.maritalStatus &&
      form.phone && isValidPhone(form.phone) &&
      form.email && isValidEmail(form.email),
    );
  }
  function validationReason() {
    if (!form.firstName || !form.lastName || !form.birthDate || !form.gender || !form.maritalStatus) return "Complete all required personal information before continuing.";
    if (!isValidPhone(form.phone)) return "Enter a valid phone number, for example +251911234567.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (!stepTwoValid()) return "Select your region, zone, and any required sub-city or district before continuing.";
    if (!paymentValid()) return form.paymentMethod === "BANK_TRANSFER" && !form.bankId ? "Select the bank used for the transfer." : "Choose a payment method, enter the transaction reference, and accept the declaration before submitting.";
    return "";
  }
  function stepTwoValid() {
    return Boolean(
      form.regionId &&
      form.zoneId &&
      (!subcityRequired || form.subcityId) &&
      (!districtRequired || form.districtId),
    );
  }
  function paymentValid() {
    return Boolean(
      form.paymentMethod &&
      form.paymentReference &&
      form.declarationAccepted &&
      (form.paymentMethod !== "BANK_TRANSFER" || form.bankId),
    );
  }
  async function startChapa() {
    setError("");
    setPaying(true);
    try {
      const response = await fetch(`${API}/payments/chapa/initialize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "INDIVIDUAL",
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(extractErrorMessage(data, "Unable to start Chapa payment."));
      if (application) sessionStorage.setItem("individual-registration-application", JSON.stringify(application));
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Unable to start Chapa payment.");
    } finally {
      setPaying(false);
    }
  }
  async function uploadSupportingDocuments(trackingCode: string, phone: string) {
    const files: Array<{ file: File; type: string }> = [];
    if (supportingDocument) files.push({ file: supportingDocument, type: "SUPPORTING_DOCUMENT" });
    for (const file of otherAttachments) files.push({ file, type: "OTHER" });
    for (const item of files) {
      const body = new FormData();
      body.append("file", item.file);
      const response = await fetch(`${API}/registrations/individual/${encodeURIComponent(trackingCode)}/documents/${item.type}?phone=${encodeURIComponent(phone)}`, { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(extractErrorMessage(data, `Unable to upload ${item.file.name}.`));
    }
  }

  async function saveApplication() {
    if (application) { setLoading(true); try { await uploadSupportingDocuments(application.trackingCode, application.phone); setStep(3); } catch (e) { reportError(e instanceof Error ? e.message : "Unable to upload supporting documents."); } finally { setLoading(false); } return; }
    if (!stepOneValid() || !stepTwoValid()) {
      reportError(validationReason());
      return;
    }
    if (!form.declarationAccepted) {
      reportError("Please accept the declaration confirming the information provided is accurate before continuing.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload: any = { ...form };
      delete payload.paymentMethod;
      delete payload.paymentReference;
      delete payload.receiptUrl;
      delete payload.bankId;
      const response = await fetch(`${API}/registrations/individual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(data, "Registration could not be saved."));
      setApplication({ trackingCode: data.trackingCode, phone: data.phone });
      await uploadSupportingDocuments(data.trackingCode, data.phone);
      setStep(3);
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Registration could not be saved.");
    } finally {
      setLoading(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!stepOneValid()) {
      reportError(validationReason());
      setStep(1);
      return;
    }
    if (!stepTwoValid()) {
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
      const payload = {
        payment: {
          method: form.paymentMethod,
          referenceNumber: form.paymentReference,
          receiptUrl: form.receiptUrl || undefined,
        },
      };
      if (!application) throw new Error("Save your application before submitting payment.");
      const response = await fetch(`${API}/registrations/individual/${encodeURIComponent(application.trackingCode)}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          extractErrorMessage(data, "Registration could not be submitted."),
        );
      setResult(data);
      sessionStorage.removeItem("individual-registration-application");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      reportError(e instanceof Error ? e.message : "Registration could not be submitted.");
    } finally {
      setLoading(false);
    }
  }
  if (result)
    return (
      <main className="shell hero">
        <p className="eyebrow">EIASC · INDIVIDUAL REGISTRATION</p>
        <h1>Application submitted</h1>
        <p className="lead">
          Your payment reference has been recorded. Keep your tracking code safe.
        </p>
        <section className="workflow-panel">
          <p className="eyebrow">TRACKING CODE</p>
          <h2>{result.trackingCode}</h2>
          <p>
            Status: <strong>SUBMITTED</strong>
          </p>
          <p>Registered phone: <strong>{result.phone}</strong></p>
          <p>Your registration remains incomplete until payment is received or approved by authorized EIASC authorities.</p>
          <a
            className="button"
            href={`/track?code=${encodeURIComponent(result.trackingCode)}`}
          >
            Track application
          </a>
        </section>
      </main>
    );
  return (
    <main className="shell" style={{ maxWidth: 960 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · INDIVIDUAL REGISTRATION</p>
        <h1>Register as a member</h1>
        <p className="lead">
          Save your application before payment. Payment is required to complete
          registration.
        </p>
      </div>
      <section className="workflow-panel" aria-label="Registration progress">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 14,
          }}
        >
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
            "Personal information",
            "Location & affiliation",
            "Payment & submission",
          ].map((label, i) => (
            <button
              type="button"
              key={label}
              onClick={() => (i + 1 < step ? setStep(i + 1) : undefined)}
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
              <span>{label}</span>
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
            <p className="eyebrow">01 · PERSONAL INFORMATION</p>
            <h2>Tell us about yourself</h2>
            <p>
              <input
                style={inputClass}
                required
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </p>
            <p>
              <input
                style={inputClass}
                placeholder="Middle name"
                value={form.middleName}
                onChange={(e) => set("middleName", e.target.value)}
              />
            </p>
            <p>
              <input
                style={inputClass}
                required
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </p>
            <p>
              <input
                style={inputClass}
                required
                type="date"
                aria-label="Birth date"
                value={form.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </p>
            <p>
              <select
                style={inputClass}
                required
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
              >
                <option value="">Gender</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </p>
            <p>
              <select
                style={inputClass}
                required
                value={form.maritalStatus}
                onChange={(e) => set("maritalStatus", e.target.value)}
              >
                <option value="">Marital status</option>
                <option>Single</option>
                <option>Married</option>
                <option>Divorced</option>
                <option>Widowed</option>
              </select>
            </p>
            <p>
              <input
                style={inputClass}
                required
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </p>
            <p>
              <input
                style={inputClass}
                required
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
              <small>A unique, valid email is required and will be used for account sign-in and notifications.</small>
            </p>
            <p>
              <input
                style={inputClass}
                placeholder="National identity identifier"
                value={form.nationalIdentity}
                onChange={(e) => set("nationalIdentity", e.target.value)}
              />
            </p>
            <div className="action-row">
              <button
                type="button"
                className="button button-primary"
                onClick={() => { if (!stepOneValid()) { reportError(validationReason()); return; } setError(""); setStep(2); }}
              >
                Continue to location
              </button>
            </div>
          </section>
        )}
        {step === 2 && (
          <section>
            <p className="eyebrow">02 · LOCATION & AFFILIATION</p>
            <h2>Where are you registered?</h2>
            <p>
              <select
                style={inputClass}
                required
                value={form.regionId}
                onChange={(e) => set("regionId", e.target.value)}
              >
                <option value="">Region</option>
                {regions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </p>
            <p>
              <select
                style={inputClass}
                required
                value={form.zoneId}
                onChange={(e) => set("zoneId", e.target.value)}
                disabled={!zones.length}
              >
                <option value="">Zone / City</option>
                {zones.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </p>
            {subcities.length > 0 && (
              <p>
                <label>
                  Sub-city / Town
                  <select
                    style={inputClass}
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
                District / Woreda
                <select
                  style={inputClass}
                  required={districtRequired}
                  value={form.districtId}
                  onChange={(e) => set("districtId", e.target.value)}
                  disabled={!districts.length}
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
              <input
                style={inputClass}
                placeholder="Current address / street"
                value={form.currentAddress}
                onChange={(e) => set("currentAddress", e.target.value)}
              />
            </p>
            <p>
              <input
                style={inputClass}
                placeholder="Institution ID (optional)"
                value={form.institutionId}
                onChange={(e) => set("institutionId", e.target.value)}
              />
            </p>
            <p>
              <label>
                Education level
                <select style={inputClass} value={form.educationLevel} onChange={(e) => { set("educationLevel", e.target.value); if (!e.target.value) set("fieldOfStudy", ""); }}>
                  <option value="">Select education level</option>
                  {["Under High School", "High School", "Certificate", "Diploma or Level IV", "Bachelor Degree", "Master Degree", "Traditional Scholar Sanad", "PhD / Doctoral", "Assistant Professor", "Professor"].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
            </p>
            {form.educationLevel && <p><label>Field of study<input style={inputClass} placeholder="Field of study" value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} /></label></p>}
            <p>
              <label>
                Career level
                <select style={inputClass} value={form.employmentStatus} onChange={(e) => { set("employmentStatus", e.target.value); if (!e.target.value) set("careerRole", ""); }}>
                  <option value="">Select career level</option>
                  {["Self Employed", "Employed", "Entrepreneur", "Investor", "Retired", "Unemployed"].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
            </p>
            {form.employmentStatus && <p><label>Role / occupation<input style={inputClass} placeholder="Role or occupation" value={form.careerRole} onChange={(e) => set("careerRole", e.target.value)} /></label></p>}
            <p>
              <label>
                <input
                  required
                  type="checkbox"
                  checked={form.declarationAccepted}
                  onChange={(e) => set("declarationAccepted", e.target.checked)}
                />{" "}
                I confirm that the information provided is accurate.
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
                disabled={loading}
                onClick={saveApplication}
              >
            <section className="workflow-panel"><p className="eyebrow">SUPPORTING DOCUMENTS</p><h3>Attach supporting document</h3><p className="lead" style={{ fontSize: 14 }}>Optional. Upload one main supporting document and add other attachments if needed. PDF, JPEG, PNG or WebP; maximum 10 MB per file.</p><label>Supporting document<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setSupportingDocument(e.target.files?.[0] ?? null)} /></label>{supportingDocument && <p><small>{supportingDocument.name}</small></p>}<label>Other attachments (optional)<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setOtherAttachments(Array.from(e.target.files ?? []))} /></label>{otherAttachments.length > 0 && <ul>{otherAttachments.map((file) => <li key={file.name + file.size}>{file.name}</li>)}</ul>}</section>
                {loading ? "Saving application…" : "Save application & continue to payment"}
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
                <p>Your registration is incomplete until payment is received or approved by authorized EIASC authorities.</p>
              </section>
            )}
            <div className="workflow-panel">
              <strong>
                {fees
                  ? `${fees.individual.toFixed(2)} ${fees.currency}`
                  : "Registration fee"}
              </strong>
              <p>
                Payment is mandatory. Choose one of the currently configured
                payment methods.
              </p>
            </div>
            <label>
              Payment method
              <select
                style={inputClass}
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
                    style={inputClass}
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
                    style={inputClass}
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
                    style={inputClass}
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
                  After successful payment you will return here with the
                  verified Chapa reference.
                </p>
              </div>
            )}
            <p>
              {form.paymentMethod !== "CHAPA" && (
                <input
                  style={inputClass}
                  placeholder="Receipt URL (optional)"
                  value={form.receiptUrl}
                  onChange={(e) => set("receiptUrl", e.target.value)}
                />
              )}
            </p>
            <p>
              <label>
                <input
                  required
                  type="checkbox"
                  checked={form.declarationAccepted}
                  onChange={(e) => set("declarationAccepted", e.target.checked)}
                />{" "}
                I confirm that the information provided is accurate.
              </label>
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
                {loading ? "Submitting…" : "Submit registration"}
              </button>
            </div>
          </section>
        )}
      </form>
    </main>
  );
}
