import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:7000/process";

export default function App() {
  const [caseId, setCaseId] = useState("demo-ui-1");
  const [age, setAge] = useState(24);
  const [obs, setObs] = useState("Limited pincer grasp; few words");
  const [result, setResult] = useState(null);
  const [noteEdit, setNoteEdit] = useState("");

  async function submit() {
    setResult(null);
    try {
        const payload = { case_id: caseId, age_months: Number(age), observations: obs };
        const r = await axios.post(API, payload);
        setResult(r.data);
        setNoteEdit(JSON.stringify(r.data.medgemma, null, 2));
    } catch (err) {
        console.error(err);
        alert("Error calling orchestrator. Is it running at localhost:7000?");
    }
  }

  return (
    <div style={{padding:20,fontFamily:"Arial"}}>
      <h2>PediScreen Clinician UI (Demo)</h2>

      <div style={{display:"flex", gap:20}}>
        <div style={{flex:1}}>
          <label>Case ID<br/><input value={caseId} onChange={e=>setCaseId(e.target.value)} /></label><br/>
          <label>Age months<br/><input value={age} onChange={e=>setAge(e.target.value)} /></label><br/>
          <label>Observations<br/>
            <textarea rows={3} style={{width:"100%"}} value={obs} onChange={e=>setObs(e.target.value)} />
          </label><br/>
          <button onClick={submit}>Process Case</button>
        </div>

        <div style={{flex:2}}>
          <h3>Result</h3>
          {result ? (
            <div>
              <strong>MedGemma Output:</strong>
              <pre style={{background:"#f5f5f5", padding:10}}>{JSON.stringify(result.medgemma, null, 2)}</pre>

              <strong>Safety:</strong>
              <pre style={{background:"#fffbe6", padding:10}}>{JSON.stringify(result.safety, null, 2)}</pre>

              <strong>Side-by-side images (mock):</strong>
              <div style={{display:"flex", gap:10, marginTop:8}}>
                <div style={{width: 200, height: 150, background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center"}}>Sample 1</div>
                <div style={{width: 200, height: 150, background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center"}}>Sample 2</div>
                <div style={{width: 200, height: 150, background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center"}}>Sample 3</div>
              </div>

              <h4>Editable Note</h4>
              <textarea rows={8} style={{width:"100%"}} value={noteEdit} onChange={e=>setNoteEdit(e.target.value)} />
              <div style={{marginTop:8}}>
                <button onClick={()=>alert("Signed off (demo).")}>Sign off & save</button>
              </div>
            </div>
          ) : <div>No result yet</div>}
        </div>
      </div>
    </div>
  );
}
