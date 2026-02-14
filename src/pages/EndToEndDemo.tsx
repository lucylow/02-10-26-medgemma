import React, { useState } from "react";
import {
  generateDraftEnd2End,
  patchReportEnd2End,
  finalizeReportEnd2End,
} from "@/api/technicalWriter";

export default function EndToEndDemo() {
  const [screeningId, setScreeningId] = useState("s-demo-1");
  const [age, setAge] = useState(24);
  const [scores, setScores] = useState('{"communication":0.3,"motor":0.8}');
  const [obs, setObs] = useState(
    "He only says about 10 words and points rather than using words."
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clinicianNote, setClinicianNote] = useState("");

  async function handleGenerate() {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("screening_id", screeningId);
      fd.append("age_months", String(age));
      fd.append("scores_json", scores);
      fd.append("observations", obs);
      if (imageFile) fd.append("image", imageFile, imageFile.name);

      const res = await generateDraftEnd2End(fd);
      setDraft(res);
      alert("Draft generated: " + res.report_id);
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePatch() {
    if (!draft) return;
    try {
      const patch = {
        clinical_summary:
          draft.clinical_summary + "\n\n(Edited by clinician.)",
      };
      const res = await patchReportEnd2End(draft.report_id, patch);
      setDraft(res.updated_draft);
      alert("Saved edits.");
    } catch (err: any) {
      alert("Patch failed: " + err.message);
    }
  }

  async function handleFinalize() {
    if (!draft) return;
    try {
      const res = await finalizeReportEnd2End(draft.report_id, clinicianNote);
      if (res.ok && res.pdf_base64) {
        const link = document.createElement("a");
        link.href = "data:application/pdf;base64," + res.pdf_base64;
        link.download = `${draft.report_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert("Finalized & PDF downloaded.");
      } else {
        alert("Finalize failed.");
      }
    } catch (err: any) {
      alert("Finalize failed: " + err.message);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">End-to-End MedGemma Demo</h1>

      <div className="mt-4 space-y-2">
        <label>Screening ID</label>
        <input
          value={screeningId}
          onChange={(e) => setScreeningId(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <label>Age (months)</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          className="w-full border p-2 rounded"
        />
        <label>Scores JSON</label>
        <textarea
          value={scores}
          onChange={(e) => setScores(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <label>Observations</label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <label>Image (optional)</label>
        <input
          type="file"
          accept="image/*,.dcm"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleGenerate}
            className="bg-primary text-white px-3 py-2 rounded"
            disabled={loading}
          >
            Generate Draft
          </button>
          <button
            onClick={handlePatch}
            className="bg-yellow-500 text-white px-3 py-2 rounded"
            disabled={!draft}
          >
            Edit & Save
          </button>
          <button
            onClick={handleFinalize}
            className="bg-green-600 text-white px-3 py-2 rounded"
            disabled={!draft}
          >
            Finalize & Download PDF
          </button>
        </div>
      </div>

      {draft && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Draft Preview</h3>
          <div className="mt-2">
            <strong>Clinical summary:</strong>
            <p>{draft.clinical_summary}</p>
          </div>
          <div>
            <strong>Technical summary:</strong>
            <p>{draft.technical_summary}</p>
          </div>
          <div>
            <strong>Recommendations:</strong>
            <ul>
              {draft.recommendations?.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <label className="mt-2">Clinician Note</label>
          <input
            value={clinicianNote}
            onChange={(e) => setClinicianNote(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
      )}
    </div>
  );
}
