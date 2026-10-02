"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API = "/api/v1";

type Workspace = {
  type: "INDIVIDUAL" | "INSTITUTION";
  application: any;
  correctionRequirement?: string;
  payment: { required: boolean; amount: number; currency: string; status: string; nextAction: string };
};

const individualFields = [
  ["firstName", "First name"], ["middleName", "Middle name"], ["lastName", "Last name"], ["birthDate", "Birth date"],
  ["gender", "Gender"], ["maritalStatus", "Marital status"], ["phone", "Phone number"], ["email", "Email address"],
  ["educationLevel", "Education level"], ["fieldOfStudy", "Field of study"], ["employmentStatus", "Employment status"],
  ["careerRole", "Career role"], ["currentAddress", "Current address"], ["nationalIdentity", "National identity"],
  ["familyRelationship", "Family relationship"], ["familyMemberName", "Family member name"], ["familyMemberPhone", "Family member phone"],
] as const;

const institutionFields = [
  ["institutionName", "Institution name"], ["alternativeName", "Alternative name"], ["establishmentDate", "Establishment date"],
  ["phone", "Institution phone"], ["email", "Institution email"], ["secondaryPhone", "Secondary phone"], ["website", "Website"],
  ["address", "Address"], ["mission", "Mission"], ["description", "Description"], ["services", "Services"],
  ["communityActivities", "Community activities"], ["applicantName", "Applicant full name"], ["applicantPhone", "Applicant phone"],
  ["applicantEmail", "Applicant email"],
] as const;

function fieldType(name: string) {
  if (name === "birthDate" || name === "establishmentDate") return "date";
  if (["mission", "description", "services", "communityActivities", "currentAddress", "address"].includes(name)) return "textarea";
  return "text";
}

export default function AmendApplicationPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [form, setForm] = useState<any>({});
  const [leaders, setLeaders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any>({});
  const [education, setEducation] = useState<any>({ educationLevels: [] });
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"TELEBIRR" | "BANK_TRANSFER">("TELEBIRR");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  const isInstitution = workspace?.type === "INSTITUTION";
  const needsPayment = !!workspace?.payment?.required && workspace.payment.status !== "PAID";

  function setField(key: string, value: string) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  async function loadApplication(event?: FormEvent) {
    event?.preventDefault();
    setError(""); setMessage(""); setWorkspace(null); setLoading(true);
    try {
      const normalized = code.trim().toUpperCase();
      const params = new URLSearchParams();
      if (phone.trim()) params.set("phone", phone.trim());
      if (firstName.trim()) params.set("firstName", firstName.trim());
      const query = params.toString();
      const endpoint = normalized.startsWith("EIASC-I-")
        ? API + "/registrations/institution/" + encodeURIComponent(normalized) + "/amend"
        : API + "/registrations/" + encodeURIComponent(normalized) + "/amend";
      const response = await fetch(endpoint + (query ? "?" + query : ""));
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Application could not be opened for amendment.");
      setWorkspace(data);
      setForm(data.application || {});
      setLeaders(data.application?.leaders || []);
      setStaff(data.application?.staffSummary || {});
      setEducation(data.application?.education || { educationLevels: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open the application.");
    } finally {
      setLoading(false);
    }
  }

  function addLeader() {
    setLeaders((items) => [...items, { fullName: "", role: "", phone: "", email: "" }]);
  }

  function updateLeader(index: number, key: string, value: string) {
    setLeaders((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }

  function removeLeader(index: number) {
    setLeaders((items) => items.filter((_, i) => i !== index));
  }

  async function resubmit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setError(""); setMessage(""); setLoading(true);
    try {
      const application = isInstitution
        ? {
            institutionName: form.institutionName, alternativeName: form.alternativeName, institutionTypeId: form.institutionTypeId,
            establishmentDate: form.establishmentDate, phone: form.phone, email: form.email, secondaryPhone: form.secondaryPhone,
            website: form.website, regionId: form.regionId, zoneId: form.zoneId, subcityId: form.subcityId || undefined,
            districtId: form.districtId || undefined, address: form.address, mission: form.mission, description: form.description,
            services: form.services, communityActivities: form.communityActivities, latitude: form.latitude, longitude: form.longitude,
            applicantName: form.applicantName, applicantPhone: form.applicantPhone, applicantEmail: form.applicantEmail,
            leaders, staff, education,
          }
        : {
            firstName: form.firstName, middleName: form.middleName, lastName: form.lastName, birthDate: form.birthDate,
            gender: form.gender, maritalStatus: form.maritalStatus, phone: form.phone, email: form.email,
            educationLevel: form.educationLevel, fieldOfStudy: form.fieldOfStudy, employmentStatus: form.employmentStatus,
            careerRole: form.careerRole, regionId: form.regionId, zoneId: form.zoneId, subcityId: form.subcityId || undefined,
            districtId: form.districtId || undefined, currentAddress: form.currentAddress, nationalIdentity: form.nationalIdentity,
            institutionId: form.institutionId || undefined, familyRelationship: form.familyRelationship,
            familyMemberName: form.familyMemberName, familyMemberPhone: form.familyMemberPhone, declarationAccepted: true,
          };

      const body: any = { ...application, accessPhone: phone.trim() || undefined, accessFirstName: firstName.trim() || undefined };
      if (needsPayment) {
        if (!paymentReference.trim()) throw new Error("Payment reference is required before resubmission.");
        body.payment = { method: paymentMethod, referenceNumber: paymentReference.trim(), receiptUrl: receiptUrl.trim() || undefined };
      }

      const endpoint = isInstitution
        ? API + "/registrations/institution/" + encodeURIComponent(code.trim().toUpperCase()) + "/resubmit"
        : API + "/registrations/individual/" + encodeURIComponent(code.trim().toUpperCase()) + "/resubmit";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Application could not be resubmitted.");
      setMessage("Your amended application has been resubmitted. EIASC will review the new version.");
      setWorkspace(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resubmit the application.");
    } finally {
      setLoading(false);
    }
  }

  const fields = useMemo(() => isInstitution ? institutionFields : individualFields, [isInstitution]);

  return (
    <main className="shell" style={{ maxWidth: 1000 }}>
      <div className="hero">
        <p className="eyebrow">EIASC · APPLICATION AMENDMENT</p>
        <h1>Review, amend and resubmit</h1>
        <p className="lead">Use the tracking number and your registered phone number or first name to retrieve the submitted application. You can correct missing information while it is under review or correction is requested.</p>
      </div>

      {!workspace && (
        <section className="workflow-panel">
          <form className="form-grid" onSubmit={loadApplication}>
            <div className="field"><label>Tracking number</label><input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EIASC-..." /></div>
            <div className="field"><label>Registered phone number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251..." /></div>
            <div className="field"><label>First name <span>(use instead of phone if needed)</span></label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="field field-action"><button className="button button-primary" disabled={loading || (!phone.trim() && !firstName.trim())}>{loading ? "Opening application…" : "Open application"}</button></div>
          </form>
        </section>
      )}

      {error && <section className="error-reason" role="alert"><strong>Could not continue</strong><span>{error}</span></section>}
      {message && <section className="workflow-panel" role="status"><strong>{message}</strong><p>Keep your tracking number for future status checks.</p></section>}

      {workspace && (
        <form onSubmit={resubmit}>
          <section className="workflow-panel">
            <div className="table-heading"><div><p className="eyebrow">CURRENT SUBMITTED VERSION</p><h2>{workspace.application.trackingCode}</h2></div><span className="status-badge">{workspace.application.status}</span></div>
            {workspace.correctionRequirement && <div className="error-reason"><strong>EIASC requested correction</strong><span>{workspace.correctionRequirement}</span></div>}
            <p>Review every field below. The system preserves the previous submitted version before saving your amendment.</p>
          </section>

          <section className="workflow-panel" style={{ marginTop: 18 }}>
            <h2>{isInstitution ? "Institution information" : "Individual information"}</h2>
            <div className="grid">
              {fields.map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{label}</label>
                  {fieldType(key) === "textarea"
                    ? <textarea id={key} value={form[key] ?? ""} onChange={(e) => setField(key, e.target.value)} rows={4} />
                    : <input id={key} type={fieldType(key)} value={form[key] ?? ""} onChange={(e) => setField(key, e.target.value)} />}
                </div>
              ))}
            </div>
            <div className="grid">
              <div className="field"><label>Region ID</label><input value={form.regionId ?? ""} onChange={(e) => setField("regionId", e.target.value)} /></div>
              <div className="field"><label>Zone / City ID</label><input value={form.zoneId ?? ""} onChange={(e) => setField("zoneId", e.target.value)} /></div>
              <div className="field"><label>Sub-city / Town ID</label><input value={form.subcityId ?? ""} onChange={(e) => setField("subcityId", e.target.value)} /></div>
              <div className="field"><label>District / Woreda ID</label><input value={form.districtId ?? ""} onChange={(e) => setField("districtId", e.target.value)} /></div>
            </div>
          </section>

          {isInstitution && (
            <>
              <section className="workflow-panel" style={{ marginTop: 18 }}>
                <div className="table-heading"><h2>Institution leadership</h2><button type="button" className="button button-secondary" onClick={addLeader}>Add leader</button></div>
                {leaders.map((leader, index) => (
                  <div className="grid" key={index} style={{ marginBottom: 16 }}>
                    {(["fullName","role","phone","email"] as const).map((key) => <div className="field" key={key}><label>{key}</label><input value={leader[key] ?? ""} onChange={(e) => updateLeader(index, key, e.target.value)} /></div>)}
                    <button type="button" className="button button-secondary" onClick={() => removeLeader(index)}>Remove leader</button>
                  </div>
                ))}
              </section>
              <section className="workflow-panel" style={{ marginTop: 18 }}>
                <h2>Staff and education</h2>
                <div className="grid">
                  {(["imamCount","teacherCount","administrativeStaffCount","otherStaffCount"] as const).map((key) => <div className="field" key={key}><label>{key}</label><input type="number" min="0" value={staff[key] ?? 0} onChange={(e) => setStaff((x: any) => ({ ...x, [key]: Number(e.target.value) }))} /></div>)}
                  <div className="field"><label>Student count</label><input type="number" min="0" value={education.studentCount ?? 0} onChange={(e) => setEducation((x: any) => ({ ...x, studentCount: Number(e.target.value) }))} /></div>
                  <div className="field"><label>Teacher count</label><input type="number" min="0" value={education.teacherCount ?? 0} onChange={(e) => setEducation((x: any) => ({ ...x, teacherCount: Number(e.target.value) }))} /></div>
                  <div className="field"><label>Education levels (comma separated)</label><input value={(education.educationLevels || []).join(",")} onChange={(e) => setEducation((x: any) => ({ ...x, educationLevels: e.target.value.split(",").map((v: string) => v.trim()).filter(Boolean) }))} /></div>
                </div>
              </section>
            </>
          )}

          <section className="workflow-panel" style={{ marginTop: 18 }}>
            <p className="eyebrow">PAYMENT</p>
            {needsPayment ? <>
              <h2>Payment required</h2><p>{workspace.payment.currency} {workspace.payment.amount.toFixed(2)} · {workspace.payment.nextAction}</p>
              <div className="grid">
                <div className="field"><label>Payment method</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "TELEBIRR" | "BANK_TRANSFER")}><option value="TELEBIRR">Telebirr</option><option value="BANK_TRANSFER">Bank transfer</option></select></div>
                <div className="field"><label>Payment reference</label><input required value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} /></div>
                <div className="field"><label>Receipt URL (optional)</label><input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} /></div>
              </div>
            </> : <p>Payment is already verified. No new payment is required for this amendment.</p>}
          </section>

          <section className="workflow-panel" style={{ marginTop: 18 }}>
            <div className="action-row"><button className="button button-primary" disabled={loading}>{loading ? "Resubmitting…" : "Save amendment & resubmit"}</button><button type="button" className="button button-secondary" onClick={() => setWorkspace(null)}>Cancel</button></div>
          </section>
        </form>
      )}
    </main>
  );
}
