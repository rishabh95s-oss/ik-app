import React, { useState, useEffect, useMemo, useRef } from "react";
import { IMPORTED_DATA } from "./importedData.js";

function getFYStart(dateStr) {
  return new Date(2026, 3, 1);
}

function calcTDS(form, allRecords) {
  const partyName = form.partyName?.trim();
  const billDate = form.billDate;
  const billNo = form.billNo?.trim();
  const editingRefNo = form.refNo?.trim();

  if (!partyName || !billDate) return 0;

  const fyStart = getFYStart(billDate);
  const thisDate = new Date(billDate);
  const thisGross = Math.round((parseFloat(form.billQty) || 0) * (parseFloat(form.rate) || 0));

  const seen = new Set();
  let cumulative = 0;

  const sorted = [...allRecords]
    .filter(r => {
      if (!r.partyName || !r.billDate) return false;
      if (r.partyName.trim() !== partyName) return false;
      if (r.refNo?.trim() === editingRefNo) return false;
      const d = new Date(r.billDate);
      return d >= fyStart && d <= thisDate;
    })
    .sort((a, b) => {
      const da = new Date(a.billDate), db = new Date(b.billDate);
      if (da - db !== 0) return da - db;
      return (parseInt(a.billNo) || 0) - (parseInt(b.billNo) || 0);
    });

  for (const r of sorted) {
    const key = `${r.partyName?.trim()}__${r.billNo?.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rGross = Math.round((parseFloat(r.billQty) || 0) * (parseFloat(r.rate) || 0));
    cumulative += rGross;
  }

  const AR = cumulative + thisGross;
  const TDS_THRESHOLD = 5000000;
  const BE = AR - TDS_THRESHOLD;
  const AP = thisGross;

  let tdsBase = 0;
  if (BE <= 0) {
    tdsBase = 0;
  } else if (AP < BE) {
    tdsBase = AP;
  } else {
    tdsBase = BE;
  }

  return tdsBase <= 0 ? 0 : Math.round(tdsBase * 0.1 / 100);
}

function calcAll(f, autoTDS = 0) {
  const H = parseFloat(f.rate) || 0;
  const I = parseFloat(f.billQty) || 0;
  const J = parseFloat(f.receiveQty) || 0;
  const L = parseFloat(f.halfKgValue) || 0;
  const P = parseFloat(f.cdPct) || 0;
  const R = parseFloat(f.qualityClaim) || 0;
  const S = parseFloat(f.hammali) || 0;
  const T = parseFloat(f.freight) || 0;
  const U = parseFloat(f.others) || 0;
  const W = parseFloat(f.brokerageRate) || 0;
  const Y = autoTDS;
  const AA = parseFloat(f.bankAmt1) || 0;
  const AD = parseFloat(f.bankAmt2) || 0;
  const AG = parseFloat(f.bankAmt3) || 0;

  const K = Math.round((I - J) * 100) / 100;
  const M = Math.round((L * J / 100) * 100) / 100;
  const N = Math.round((J - M) * 100) / 100;
  const O = Math.round(N * H);
  const Q = Math.round(P * J * H / 100);
  const V = Math.round(O - Q - R - S - T + U);
  const X = f.brokerageAmt ? (parseFloat(f.brokerageAmt) || 0) : Math.round(W * J);
  const Z = Math.round(V - X - Y);
  const AJ = Z - AA - AD - AG;
  const AK = Math.round(I * H);

  return { shortage: K, halfKgQty: M, netQty: N, netAmt1: O, cdAmt: Q, netAmt: V, brokerageAmt: X, tds: Y, finalAmt: Z, balance: AJ, partyBillAmt: AK };
}

const EMPTY = {
  refNo:"", deliveryAt:"", truckNo:"", partyName:"", brokerName:"",
  billDate:"", billNo:"", rate:"", billQty:"", receiveQty:"",
  halfKgValue:"", cdPct:"", qualityClaim:"", hammali:"", freight:"",
  others:"", brokerageRate:"", brokerageAmt:"", tcs:"", note:"",
  bankAmt1:"", bankDate1:"", bankName1:"",
  bankAmt2:"", bankDate2:"", bankName2:"",
  bankAmt3:"", bankDate3:"", bankName3:"",
  refA:"", refB:""
};

function AutoComplete({ name, value, onChange, options, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  const ref = useRef();

  useEffect(() => { setQ(value || ""); }, [value]);

  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 10);
    return options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  }, [q, options]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); onChange({ target:{ name, value:e.target.value } }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a2236", border:"1px solid #2a3a50", borderRadius:8, zIndex:1000, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => { setQ(o); onChange({ target:{ name, value:o } }); setOpen(false); }}
              style={{ padding:"9px 14px", cursor:"pointer", fontSize:13, color:"#cbd5e1", borderBottom:"1px solid #0f1117" }}
              onMouseEnter={e => e.target.style.background="#2a3a50"}
              onMouseLeave={e => e.target.style.background="transparent"}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HisabPana({ records, calcAll, fmt }) {
  const [hisabRef, setHisabRef] = useState("");
  const [hisabRec, setHisabRec] = useState(null);
  const [hisabErr, setHisabErr] = useState("");

  const loadHisab = () => {
    const ref = hisabRef.trim();
    if (!ref) { setHisabErr("Please enter a Ref No"); return; }
    const found = records.find(r => r.refNo.trim().toUpperCase() === ref.toUpperCase());
    if (!found) { setHisabErr("Ref No not found!"); setHisabRec(null); return; }
    setHisabErr("");
    setHisabRec(found);
  };

  const c = hisabRec ? calcAll(hisabRec, hisabRec._tds || 0) : null;

  const h = (n) => n !== undefined && n !== null && !isNaN(n) ? Math.round(Number(n)).toString() : "0";
  const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
  const rh = (pt) => ({ height: Math.round(pt * 0.74)+"px" });
  const fs = (pt) => Math.round(pt * 0.72)+"px";

  const thin = "1px solid #000";
  const hair = "1px solid #aaa";
  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:200 };

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:28, alignItems:"center" }}>
        <input value={hisabRef} onChange={e => setHisabRef(e.target.value)} onKeyDown={e => e.key==="Enter" && loadHisab()}
          placeholder="Enter Ref No..." style={inp} />
        <button onClick={loadHisab} style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:8, padding:"10px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>Load</button>
        {hisabRec && <button onClick={() => window.print()} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:8, padding:"10px 24px", color:"#38bdf8", fontWeight:700, fontSize:14, cursor:"pointer" }}>🖨 Print</button>}
        {hisabErr && <span style={{ color:"#ef4444", fontWeight:600 }}>{hisabErr}</span>}
      </div>

      {hisabRec && c && (
        <div style={{ background:"#e0e0e0", padding:"30px", borderRadius:8 }}>
        <div id="hisab-print" style={{ background:"#fff", color:"#000", width:496, margin:"0 auto", fontFamily:"Arial,sans-serif" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <colgroup>
              <col style={{ width:"12.8%" }} />
              <col style={{ width:"15.7%" }} />
              <col style={{ width:"13.5%" }} />
              <col style={{ width:"18.1%" }} />
              <col style={{ width:"23.4%" }} />
              <col style={{ width:"16.5%" }} />
            </colgroup>
            <tbody>

            <tr style={rh(33.6)}>
              <td colSpan={6} style={{ fontSize:fs(19), fontWeight:"bold", textAlign:"center", verticalAlign:"middle", padding:"2px 4px", borderTop:thin, borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#1F497D" }}>I K ENTERPRISES</td>
            </tr>
            <tr style={rh(22.2)}>
              <td colSpan={6} style={{ fontSize:fs(12), textAlign:"center", verticalAlign:"middle", padding:"1px", letterSpacing:"1px", borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#1F497D" }}>GENRAL MERCHANT AND COMMISION AGENT</td>
            </tr>
            <tr style={rh(21.6)}>
              <td colSpan={6} style={{ fontSize:fs(12), textAlign:"center", verticalAlign:"middle", padding:"1px 0 3px", borderLeft:thin, borderRight:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#1F497D" }}>18,NEW ANAJ MANDI,SANYOGITAGANJ,INDORE, 452001</td>
            </tr>
            <tr style={rh(43.2)}>
              <td colSpan={6} style={{ fontSize:fs(19), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"4px", borderTop:thin, borderBottom:thin, borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.partyName || "—"}</td>
            </tr>
            <tr style={rh(36)}>
              <td colSpan={2} style={{ fontSize:fs(16), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>DELIVERY AT-</td>
              <td colSpan={4} style={{ fontSize:fs(18), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.deliveryAt || "—"}</td>
            </tr>
            <tr style={rh(60)}>
              <td style={{ fontSize:fs(16), fontWeight:"bold", textAlign:"left", verticalAlign:"bottom", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>REF NO-{hisabRec.refNo}</td>
              <td style={{ fontSize:fs(16), textAlign:"right", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>BROKER-</td>
              <td colSpan={2} style={{ fontSize:fs(16), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.brokerName || "—"}</td>
              <td style={{ fontSize:fs(16), textAlign:"right", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}>TRUCK NO.</td>
              <td style={{ fontSize:fs(14), fontWeight:"bold", textAlign:"left", verticalAlign:"bottom", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.truckNo || "—"}</td>
            </tr>
            <tr style={rh(24.6)}>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 6px", borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>BILL NO.</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>BILL DATE</td>
              <td colSpan={2} style={{ fontSize:fs(16), textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>QTY<em style={{ fontWeight:400 }}>(in Qts.)</em></td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>RATE <em style={{ fontWeight:400 }}>(per Qt)</em></td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>AMT</td>
            </tr>
            <tr style={rh(8)}>
              <td style={{ borderTop:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.billNo || "—"}</td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"1px 4px", whiteSpace:"nowrap" }}>{fmtDate(hisabRec.billDate)}</td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.billQty || "—"}</td>
              <td colSpan={2} style={{ fontSize:fs(14), fontStyle:"italic", textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>PARTY BILL AMT.</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.partyBillAmt)}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", verticalAlign:"top", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.shortage > 0 ? (-c.shortage).toFixed(2) : ""}</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.shortage > 0 ? "SHTG" : ""}</td>
              <td colSpan={2} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px", whiteSpace:"nowrap", overflow:"hidden" }}>{c.halfKgQty > 0 ? (-c.halfKgQty).toFixed(2) : ""}</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.halfKgQty > 0 ? "("+parseFloat(hisabRec.halfKgValue||0)+" KG)" : ""}</td>
              <td colSpan={2} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px", borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}>{c.netQty}</td>
              <td style={{ borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 4px", borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.rate ? Math.round(parseFloat(hisabRec.rate)) : "—"}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderTop:hair, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.netAmt1)}</td>
            </tr>
            <tr style={rh(38.4)}>
              <td style={{ borderTop:hair, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px", borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}>{c.cdAmt > 0 ? "CD   "+hisabRec.cdPct+"%" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderTop:hair, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{c.cdAmt > 0 ? "-"+h(c.cdAmt) : ""}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={3} style={{ borderLeft:thin, padding:"2px 6px" , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.qualityClaim) > 0 ? "QUALITY CLAIM" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.qualityClaim) > 0 ? "-"+h(parseFloat(hisabRec.qualityClaim)) : ""}</td>
            </tr>
            <tr style={rh(25.95)}>
              <td rowSpan={6} colSpan={3} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.freight) > 0 ? "FREIGHT" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.freight) > 0 ? "-"+h(parseFloat(hisabRec.freight)) : ""}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.hammali) > 0 ? "HAMMALI" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.hammali) > 0 ? "-"+h(parseFloat(hisabRec.hammali)) : ""}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"right", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.others) > 0 ? "OTHERS" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.others) > 0 ? "+"+h(parseFloat(hisabRec.others)) : ""}</td>
            </tr>
            <tr style={rh(25.8)}><td colSpan={3} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td></tr>
            <tr style={rh(25.8)}><td colSpan={3} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td></tr>
            <tr style={rh(27.6)}>
              <td colSpan={3} style={{ fontSize:fs(16), textAlign:"center", padding:"2px 4px", color:"#555", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>
                {(c.brokerageAmt > 0 || (hisabRec._tds||0) > 0) ? "BROKERAGE & TDS DETAILS" : ""}
              </td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td><td></td><td></td>
              <td style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"left", padding:"2px 4px", fontWeight:"normal" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.brokerageAmt > 0 ? "BROKERAGE" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", fontWeight:"normal", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{c.brokerageAmt > 0 ? "-"+h(c.brokerageAmt) : ""}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td colSpan={2} style={{ fontSize:fs(20), textAlign:"left", padding:"2px 4px", fontWeight:"normal" , whiteSpace:"nowrap", overflow:"hidden" }}>{(hisabRec._tds||0) > 0 ? "TDS" : ""}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{(hisabRec._tds||0) > 0 ? "-"+h(hisabRec._tds||0) : ""}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td><td></td><td></td>
              <td style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td colSpan={2} style={{ fontSize:fs(20), fontWeight:"bold", textAlign:"left", padding:"4px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}>NET AMT</td>
              <td style={{ fontSize:fs(20), fontWeight:"bold", textAlign:"left", padding:"4px 6px", borderTop:thin, borderBottom:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.finalAmt)}</td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td><td></td><td></td>
              <td style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(25.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td colSpan={2} style={{ fontSize:fs(16), textAlign:"center", padding:"2px 6px", color:"#555" , whiteSpace:"nowrap", overflow:"hidden" }}>PMT DETAILS</td>
              <td style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(28.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{fmtDate(hisabRec.bankDate1)}</td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt1) > 0 ? "PAID FROM  "+(hisabRec.bankName1||"") : ""}</td>
              <td style={{ fontSize:fs(22), textAlign:"left", padding:"2px 6px", color:"red", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt1) > 0 ? h(parseFloat(hisabRec.bankAmt1)) : ""}</td>
            </tr>
            <tr style={rh(28.8)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{fmtDate(hisabRec.bankDate2)}</td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt2) > 0 ? "PAID FROM  "+(hisabRec.bankName2||"") : ""}</td>
              <td style={{ fontSize:fs(22), textAlign:"left", padding:"2px 6px", color:"red", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt2) > 0 ? h(parseFloat(hisabRec.bankAmt2)) : ""}</td>
            </tr>
            <tr style={rh(28.95)}>
              <td style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td><td></td><td></td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{fmtDate(hisabRec.bankDate3)}</td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"2px 4px", color:"red" , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt3) > 0 ? "PAID FROM  "+(hisabRec.bankName3||"") : ""}</td>
              <td style={{ fontSize:fs(22), textAlign:"left", padding:"2px 6px", color:"red", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{parseFloat(hisabRec.bankAmt3) > 0 ? h(parseFloat(hisabRec.bankAmt3)) : ""}</td>
            </tr>
            <tr style={rh(28.95)}>
              <td style={{ borderBottom:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td colSpan={2} style={{ fontSize:fs(20), fontWeight:"bold", textAlign:"left", padding:"4px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}>BAL</td>
              <td style={{ fontSize:fs(20), fontWeight:"bold", textAlign:"left", padding:"4px 6px", borderTop:thin, borderBottom:thin, borderRight:thin, color: c.balance === 0 ? "green" : c.balance > 0 ? "red" : "green" , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.balance)}</td>
            </tr>

            {hisabRec.note && <tr>
              <td colSpan={6} style={{ padding:"5px 6px", fontSize:fs(12), color:"#555", fontStyle:"italic" , whiteSpace:"nowrap", overflow:"hidden" }}>Note: {hisabRec.note}</td>
            </tr>}

            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
 const [records, setRecords] = useState(() => {
  try {
    const s = localStorage.getItem("ik_v2");
    let data;
    if (s) {
      const parsed = JSON.parse(s);
      data = parsed.length > 0 ? parsed : IMPORTED_DATA;
    } else {
      data = IMPORTED_DATA;
    }
    // Ensure all records have _balance calculated
    return data.map(r => {
      if (r._balance === undefined) {
        const tds = r._tds || 0;
        const c = calcAll(r, tds);
        return { ...r, _balance: c.balance };
      }
      return r;
    });
  } catch { return IMPORTED_DATA; }
});

  const [parties, setParties] = useState(() => {
    try {
      const s = localStorage.getItem("ik_parties");
      if (s) return JSON.parse(s);
      return [...new Set(IMPORTED_DATA.map(r => r.partyName).filter(Boolean))].sort();
    } catch { return []; }
  });

  const [brokers, setBrokers] = useState(() => {
    try {
      const s = localStorage.getItem("ik_brokers");
      if (s) return JSON.parse(s);
      return [...new Set(IMPORTED_DATA.map(r => r.brokerName).filter(Boolean))].sort();
    } catch { return []; }
  });

  const [deliveries, setDeliveries] = useState(() => {
    try {
      const s = localStorage.getItem("ik_deliveries");
      if (s) return JSON.parse(s);
      return [...new Set(IMPORTED_DATA.map(r => r.deliveryAt).filter(Boolean))].sort();
    } catch { return []; }
  });

  const [banks, setBanks] = useState(() => {
    try {
      const s = localStorage.getItem("ik_banks");
      return s ? JSON.parse(s) : ["SBI", "HDFC", "VASB"];
    } catch { return ["SBI", "HDFC", "VASB"]; }
  });

  const [view, setView] = useState("entry");
  const [form, setForm] = useState({ ...EMPTY });
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterBroker, setFilterBroker] = useState("");
  const [toast, setToast] = useState(null);
  const [newParty, setNewParty] = useState("");
  const [newBroker, setNewBroker] = useState("");
  const [newDelivery, setNewDelivery] = useState("");
  const [newBank, setNewBank] = useState("");
  const [summaryType, setSummaryType] = useState("none");

  useEffect(() => {
    try { localStorage.setItem("ik_v2", JSON.stringify(records)); } catch {}
  }, [records]);

  useEffect(() => {
    try { localStorage.setItem("ik_parties", JSON.stringify(parties)); } catch {}
  }, [parties]);

  useEffect(() => {
    try { localStorage.setItem("ik_brokers", JSON.stringify(brokers)); } catch {}
  }, [brokers]);

  useEffect(() => {
    try { localStorage.setItem("ik_deliveries", JSON.stringify(deliveries)); } catch {}
  }, [deliveries]);

  useEffect(() => {
    try { localStorage.setItem("ik_banks", JSON.stringify(banks)); } catch {}
  }, [banks]);

  const autoTDS = useMemo(() => calcTDS(form, records), [form, records]);
  const calc = useMemo(() => calcAll(form, autoTDS), [form, autoTDS]);

  const filteredParties = useMemo(() => {
    if (filterBroker) {
      return parties.filter(p => records.some(r => r.brokerName === filterBroker && r.partyName === p));
    }
    return parties;
  }, [parties, records, filterBroker]);

  const filteredBrokers = useMemo(() => {
    if (filterParty) {
      return brokers.filter(b => records.some(r => r.partyName === filterParty && r.brokerName === b));
    }
    return brokers;
  }, [brokers, records, filterParty]);

  const handleBrokerChange = (e) => {
    setFilterBroker(e.target.value);
    if (!e.target.value) setFilterParty("");
  };

  const handlePartyChange = (e) => {
    setFilterParty(e.target.value);
    if (!e.target.value) setFilterBroker("");
  };

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    const refNo = form.refNo.trim();
    if (!refNo) { showToast("PLEASE ENTER REF NO", "error"); return; }

    const exists = records.find(r => r.refNo.trim().toUpperCase() === refNo.toUpperCase());

    if (!editMode && exists) {
      showToast("REF NO ALREADY EXISTS!", "error"); return;
    }

    const tds = calcTDS(form, records);
    const c = calcAll(form, tds);
    const record = { ...form, _tds: tds, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt, _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance };

    let newRecords = [...records];

    if (editMode) {
      newRecords = newRecords.map(r => r.refNo.trim().toUpperCase() === refNo.toUpperCase() ? record : r);
      showToast("RECORD UPDATED!");
    } else {
      newRecords.push(record);
      showToast("FORM SUBMITTED!");
    }

    setRecords(newRecords);
    setForm({ ...EMPTY });
    setEditMode(false);
  };

  const handleEditByRef = () => {
    const refNo = form.refNo.trim();
    if (!refNo) { showToast("ENTER REF NO FIRST", "error"); return; }
    const found = records.find(r => r.refNo.trim().toUpperCase() === refNo.toUpperCase());
    if (!found) { showToast("REF NO NOT FOUND!", "error"); return; }
    setForm({ ...EMPTY, ...found });
    setEditMode(true);
    showToast("DATA LOADED FOR EDITING");
  };

  const handleNew = () => { setForm({ ...EMPTY }); setEditMode(false); };

  const filtered = useMemo(() => records.filter(r => {
    const s = search.toLowerCase();
    const matchSearch = !s || Object.values(r).some(v => String(v).toLowerCase().includes(s));
    const matchParty = !filterParty || r.partyName === filterParty;
    const matchBroker = !filterBroker || r.brokerName === filterBroker;
    return matchSearch && matchParty && matchBroker;
  }), [records, search, filterParty, filterBroker]);

  const fmt = (n) => n !== undefined && n !== null && !isNaN(n) ? Number(n).toLocaleString("en-IN") : "—";
  const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";

  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", transition:"border-color .15s" };
  const lbl = { fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:5 };
  const sec = { background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:14, padding:"20px 22px", marginBottom:20 };
  const stitle = { fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#f59e0b", marginBottom:16 };
  const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#0f1117", minHeight:"100vh", color:"#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus{border-color:#f59e0b!important}
        input::placeholder{color:#334155}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#0f1117}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:4px}
      `}</style>

      <header style={{ background:"linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%)", borderBottom:"1px solid #1e2a3a", padding:"0 24px" }}>
        <div style={{ maxWidth:1500, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, background:"linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#fff" }}>IK</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:"#f1f5f9", letterSpacing:"-0.3px" }}>I K Enterprises v3</div>
              <div style={{ fontSize:10, color:"#64748b", letterSpacing:"0.5px" }}>GENERAL MERCHANT & COMMISSION AGENT · INDORE</div>
            </div>
          </div>
          <nav style={{ display:"flex", gap:4 }}>
            {[["entry", "+ New Entry"], ["data","☰ Data"], ["pmt","💳 Payment"], ["hisab","📋 Hisab"], ["manage","⚙ Manage"]].map(([v,label]) => (
              <button key={v} onClick={() => { setView(v); if(v==="entry") handleNew(); }}
                style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background: view===v ? "#f59e0b" : "transparent", color: view===v ? "#0f1117" : "#94a3b8", transition:"all .15s" }}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div style={{ maxWidth:1500, margin:"0 auto", padding:"28px 24px" }}>

        {view === "entry" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:24, alignItems:"start" }}>
            <div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>NEW TRANSACTION ENTRY</h2>

              <div style={sec}>
                <div style={stitle}>Transaction Details</div>
                <div style={grid}>
                  <div><label style={lbl}>Ref No *</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input name="refNo" value={form.refNo} onChange={handleChange} style={{ ...inp, flex:1 }} placeholder="Ref No" />
                      <button onClick={handleEditByRef} style={{ background:"#38bdf8", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>✏ EDIT</button>
                    </div>
                  </div>
                  <div><label style={lbl}>Bill No</label><input name="billNo" value={form.billNo} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Bill Date</label><input type="date" name="billDate" value={form.billDate} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Truck No</label><input name="truckNo" value={form.truckNo} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Party Name</label><AutoComplete name="partyName" value={form.partyName} onChange={handleChange} options={parties} placeholder="Party..." style={inp} /></div>
                  <div><label style={lbl}>Broker Name</label><AutoComplete name="brokerName" value={form.brokerName} onChange={handleChange} options={brokers} placeholder="Broker..." style={inp} /></div>
                  <div style={{ gridColumn:"span 2" }}><label style={lbl}>Delivery At</label><AutoComplete name="deliveryAt" value={form.deliveryAt} onChange={handleChange} options={deliveries} placeholder="Delivery..." style={inp} /></div>
                </div>
              </div>

              <div style={sec}>
                <div style={stitle}>Qty, Rate & Deductions</div>
                <div style={grid}>
                  <div><label style={lbl}>Rate (per Qt) ₹</label><input type="number" name="rate" value={form.rate} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Bill Qty (Qt)</label><input type="number" name="billQty" value={form.billQty} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Receive Qty (Qt)</label><input type="number" name="receiveQty" value={form.receiveQty} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>0.5 KG Value</label><input type="number" name="halfKgValue" value={form.halfKgValue} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>CD %</label><input type="number" name="cdPct" value={form.cdPct} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Quality Claim ₹</label><input type="number" name="qualityClaim" value={form.qualityClaim} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Hammali ₹</label><input type="number" name="hammali" value={form.hammali} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Freight ₹</label><input type="number" name="freight" value={form.freight} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Others ₹</label><input type="number" name="others" value={form.others} onChange={handleChange} style={inp} /></div>
                  <div><label style={lbl}>Brokerage Rate</label><input type="number" name="brokerageRate" value={form.brokerageRate} onChange={handleChange} style={inp} /></div>
                </div>
              </div>

              <div style={sec}>
                <div style={stitle}>Bank Payments</div>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
                    <div><label style={lbl}>Amount {i}</label><input type="number" name={`bankAmt${i}`} value={form[`bankAmt${i}`]} onChange={handleChange} style={inp} /></div>
                    <div><label style={lbl}>Date {i}</label><input type="date" name={`bankDate${i}`} value={form[`bankDate${i}`]} onChange={handleChange} style={inp} /></div>
                    <div><label style={lbl}>Bank {i}</label><select name={`bankName${i}`} value={form[`bankName${i}`]} onChange={handleChange} style={inp}><option value="">Select</option>{banks.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                  </div>
                ))}
              </div>

              <button onClick={handleSubmit} style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:10, padding:"13px 32px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", width:"100%" }}>
                {editMode ? "✔ UPDATE" : "✔ SUBMIT"}
              </button>
            </div>

            <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:14, padding:"16px", position:"sticky", top:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#f59e0b", marginBottom:12, textTransform:"uppercase" }}>⚡ CALC</div>
              {[["Shortage", calc.shortage + " Qt"], ["Net Qty", calc.netQty + " Qt"], ["Gross", "₹ " + fmt(calc.netAmt1)], ["CD", "₹ " + fmt(calc.cdAmt)], ["Brokerage", "₹ " + fmt(calc.brokerageAmt)], ["TDS", "₹ " + fmt(autoTDS)], ["FINAL", "₹ " + fmt(calc.finalAmt)]].map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e2a3a", fontSize:12 }}>
                  <span style={{ color:"#64748b" }}>{l}</span>
                  <span style={{ fontWeight:600, color:"#e2e8f0" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "data" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>DATA REGISTER</h2>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
              <input style={inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <select style={inp} value={filterBroker} onChange={handleBrokerChange}><option value="">All Brokers</option>{filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}</select>
              <select style={inp} value={filterParty} onChange={handlePartyChange}><option value="">All Parties</option>{filteredParties.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setSummaryType(summaryType === "party" ? "none" : "party")} style={{ background: summaryType === "party" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                  👥 Party Summary
                </button>
                <button onClick={() => setSummaryType(summaryType === "broker" ? "none" : "broker")} style={{ background: summaryType === "broker" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                  🏢 Broker Summary
                </button>
              </div>
            </div>
            <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e2a3a", maxHeight:"600px" }}>
              {filtered.length > 0 && (() => {
                const allKeys = [...new Set(filtered.flatMap(r => Object.keys(r)))];
                const alwaysShow = ["_balance"];
                const partyBaseColumns = ["refNo", "deliveryAt", "truckNo", "partyName", "billDate", "billNo", "rate", "billQty", "_shortage", "_halfKgQty", "_netQty", "_netAmt1", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "_tds", "_brokerageAmt","_finalAmt"];
                const brokerBaseColumns = ["refNo", "deliveryAt", "truckNo", "brokerName", "billDate", "billNo", "rate", "billQty", "_shortage", "_halfKgQty", "_netQty", "_netAmt1", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "_tds", "_brokerageAmt","_finalAmt"];
                const summaryColumns = summaryType === "party" ? partyBaseColumns : summaryType === "broker" ? brokerBaseColumns : [];
                const isSummaryMode = summaryType !== "none";
                const columnsToUse = isSummaryMode ? summaryColumns : allKeys.filter(key => filtered.some(r => r[key] && String(r[key]).trim()) || alwaysShow.includes(key));
                const visibleKeys = isSummaryMode 
                  ? summaryColumns.filter(key => filtered.some(r => r[key] && String(r[key]).trim() && String(r[key]).trim() !== "0"))
                  : columnsToUse.filter(key => filtered.some(r => r[key] && String(r[key]).trim()));
                const columnOrder = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "rate", "billQty", "receiveQty", "_shortage", "halfKgValue", "_halfKgQty", "_netQty", "_netAmt1", "cdPct", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "brokerageRate","_brokerageAmt", "_tds", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance", "note"];
                const sortedVisibleKeys = visibleKeys.sort((a, b) => {
                  const aIdx = columnOrder.indexOf(a);
                  const bIdx = columnOrder.indexOf(b);
                  const aSort = aIdx === -1 ? 999 : aIdx;
                  const bSort = bIdx === -1 ? 999 : bIdx;
                  return aSort - bSort;
                });
                
                return (
                  <table style={{ width:"100%", fontSize:10, minWidth:"100%" }}>
                    <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                      {sortedVisibleKeys.map(k => (
                        <th key={k} style={{ padding:"8px 6px", textAlign:"left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap" }}>
                          {k.replace(/([A-Z])/g, ' $1').toUpperCase()}
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {filtered.map(rec => (
                        <tr key={rec.refNo} style={{ borderBottom:"1px solid #1e2a3a" }}>
                          {sortedVisibleKeys.map(k => (
                            <td key={k} style={{ padding:"6px 6px", color:"#cbd5e1", textAlign: k.includes("Qty") || k.includes("Rate") || k.includes("Amt") || k.includes("Balance") || k.includes("TDS") ? "right" : "left", whiteSpace:"nowrap" }}>
                             {k.includes("Amt") || k.includes("Balance") || k.includes("TDS") ? "₹" : ""}{k.includes("Amt") || k.includes("Balance") || k.includes("TDS") ? (k === "_balance" ? (rec[k] !== undefined && rec[k] !== "" ? fmt(rec[k]) : "0") : fmt(rec[k])) : k.includes("Date") ? fmtDate(rec[k]) : (rec[k] || "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {filtered.length === 0 && <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>NO RECORDS</div>}
            </div>
          </div>
        )}

        {view === "hisab" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>HISAB PANA (RECEIPT)</h2>
            <HisabPana records={records} calcAll={calcAll} fmt={fmt} />
          </div>
        )}

        {view === "pmt" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>PAYMENT SUMMARY</h2>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <input style={inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <select style={inp} value={filterBroker} onChange={handleBrokerChange}><option value="">All Brokers</option>{filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}</select>
              <select style={inp} value={filterParty} onChange={handlePartyChange}><option value="">All Parties</option>{filteredParties.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setSummaryType(summaryType === "party" ? "none" : "party")} style={{ background: summaryType === "party" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                  👥 Party Summary
                </button>
                <button onClick={() => setSummaryType(summaryType === "broker" ? "none" : "broker")} style={{ background: summaryType === "broker" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                  🏢 Broker Summary
                </button>
                <button onClick={() => {
                  const header1Key = summaryType === "party" ? "partyName" : summaryType === "broker" ? "brokerName" : "partyName";
                  const header2Key = summaryType === "party" ? "brokerName" : summaryType === "broker" ? "partyName" : "brokerName";
                  const pmtColumns = ["refNo", "deliveryAt", "billNo", "truckNo", "billDate", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "_balance"];
                  
                  const grouped = {};
                  filtered.forEach(rec => {
                    const h1 = rec[header1Key] || "";
                    const h2 = rec[header2Key] || "";
                    if (!grouped[h1]) grouped[h1] = {};
                    if (!grouped[h1][h2]) grouped[h1][h2] = [];
                    grouped[h1][h2].push(rec);
                  });

                  const visibleColumns = pmtColumns.filter(col => 
                    filtered.some(r => r[col] && String(r[col]).trim()) || col === "_finalAmt" || col === "_balance"
                  );

                  let html = '<html><head><title>Payment Summary</title><style>body{font-family:Arial;margin:0;color:#000;}table{width:100%;border-collapse:collapse;}.header-company{text-align:center;font-weight:bold;font-size:14px;padding:8px;border:1px solid #000;}.header-party{text-align:center;font-weight:bold;font-size:12px;padding:6px;border:1px solid #000;background:#d3d3d3;}.header-broker{text-align:center;font-weight:bold;font-size:11px;padding:4px;border:1px solid #000;background:#e8e8e8;}.col-header{background:#999;color:#fff;padding:4px;border:1px solid #000;text-align:left;font-weight:bold;font-size:10px;}.data-row td{border:1px solid #000;padding:4px;font-size:9px;}.amt{text-align:right;}</style></head><body>';
                  
                  html += '<table><tr><td class="header-company" colspan="' + visibleColumns.length + '">I K ENTERPRISES, INDORE</td></tr></table>';

                  Object.keys(grouped).forEach(h1 => {
                    Object.keys(grouped[h1]).forEach(h2 => {
                      html += '<table style="margin-top:10px;">';
                      html += `<tr><td class="header-party" colspan="${visibleColumns.length}">${h1}</td></tr>`;
                      html += `<tr><td class="header-broker" colspan="${visibleColumns.length}">${h2}</td></tr>`;
                      html += '<tr>';
                      visibleColumns.forEach(col => {
                        const colName = col === "refNo" ? "REF NO" : col === "deliveryAt" ? "DELIVERY AT" : col === "billNo" ? "B.NO" : col === "truckNo" ? "TRUCK NO" : col === "billDate" ? "BILL DATE" : col === "_finalAmt" ? "FINAL AMT" : col === "bankAmt1" ? "BANK PMT" : col === "bankDate1" ? "BANK DATE" : col === "bankName1" ? "BANK PMT" : col === "bankAmt2" ? "BANK DATE" : col === "bankDate2" ? "BANK PMT" : col === "bankName2" ? "BANK DATE" : col === "bankAmt3" ? "BANK DATE" : col === "bankDate3" ? "BAL" : col;
                        html += `<th class="col-header">${colName}</th>`;
                      });
                      html += '</tr>';
                      
                      grouped[h1][h2].forEach(rec => {
                        html += '<tr class="data-row">';
                        visibleColumns.forEach(col => {
                          const val = col === "_balance" ? (rec[col] || 0) : rec[col];
                          const isAmt = col.includes("Amt") || col.includes("Balance");
                          const display = isAmt ? `₹${Math.round(val)}` : (val || "");
                          html += `<td class="${isAmt ? 'amt' : ''}">${display}</td>`;
                        });
                        html += '</tr>';
                      });
                      
                      html += '</table>';
                    });
                  });

                  html += '</body></html>';
                  const printWindow = window.open('', '', 'height=600,width=1400');
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.print();
                }} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:8, padding:"9px 24px", color:"#38bdf8", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                  🖨 Print
                </button>
              </div>
            </div>
            <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e2a3a", maxHeight:"600px" }}>
              {filtered.length > 0 && (() => {
                const pmtColumns = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];
                const partyBasePmt = ["refNo", "deliveryAt", "truckNo", "partyName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];
                const brokerBasePmt = ["refNo", "deliveryAt", "truckNo", "brokerName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];
                
                const columnsToUse = summaryType === "party" ? partyBasePmt : summaryType === "broker" ? brokerBasePmt : pmtColumns;
                const visibleKeys = columnsToUse.filter(key => filtered.some(r => r[key] && String(r[key]).trim()) || key === "_finalAmt" || key === "_balance");
                
                return (
                  <table style={{ width:"100%", fontSize:10, minWidth:"100%" }}>
                    <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                      {visibleKeys.map(k => (
                        <th key={k} style={{ padding:"8px 6px", textAlign:"left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap" }}>
                          {k.replace(/([A-Z])/g, ' $1').toUpperCase()}
                        </th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {filtered.map(rec => (
                        <tr key={rec.refNo} style={{ borderBottom:"1px solid #1e2a3a" }}>
                          {visibleKeys.map(k => (
                            <td key={k} style={{ padding:"6px 6px", color:"#cbd5e1", textAlign: k.includes("Amt") || k.includes("Balance") ? "right" : "left", whiteSpace:"nowrap" }}>
                       {k.includes("Amt") || k.includes("Balance") ? "₹ " + (k === "_balance" ? "0" : fmt(rec[k])) : k.includes("Date") ? fmtDate(rec[k]) : (rec[k] || "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
              {filtered.length === 0 && <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>NO RECORDS</div>}
            </div>
          </div>
        )}

        {view === "manage" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>MANAGE LISTS</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20 }}>
              {[
                { title: "PARTIES", list: parties, setList: setParties, newItem: newParty, setNewItem: setNewParty },
                { title: "BROKERS", list: brokers, setList: setBrokers, newItem: newBroker, setNewItem: setNewBroker },
                { title: "DELIVERIES", list: deliveries, setList: setDeliveries, newItem: newDelivery, setNewItem: setNewDelivery },
                { title: "BANKS", list: banks, setList: setBanks, newItem: newBank, setNewItem: setNewBank }
              ].map(({ title, list, setList, newItem, setNewItem }) => {
                const trimmedInput = newItem.trim();
                const exists = list.some(item => item.toLowerCase() === trimmedInput.toLowerCase());
                const suggestions = trimmedInput ? list.filter(item => item.toLowerCase().includes(trimmedInput.toLowerCase())).slice(0, 5) : [];
                const canAdd = trimmedInput && !exists;

                const handleAdd = () => {
                  if (!canAdd) {
                    showToast(exists ? title.slice(0,-1) + " already exists!" : "Enter a value", "error");
                    return;
                  }
                  setList([...list, trimmedInput]);
                  setNewItem("");
                  showToast(title.slice(0,-1) + " ADDED!");
                };

                return (
                  <div key={title} style={sec}>
                    <div style={stitle}>{title}</div>
                    <div style={{ display:"flex", gap:8, marginBottom:15, position:"relative" }}>
                      <div style={{ flex:1, position:"relative" }}>
                        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => {
                          if (e.key === "Enter") handleAdd();
                        }} style={inp} placeholder={"Add " + title.toLowerCase() + "..."} />
                        {suggestions.length > 0 && (
                          <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a2236", border:"1px solid #2a3a50", borderRadius:8, zIndex:1000, maxHeight:150, overflowY:"auto", marginTop:4, boxShadow:"0 4px 12px rgba(0,0,0,.3)" }}>
                            {suggestions.map(sugg => (
                              <div key={sugg} onMouseDown={() => { setNewItem(sugg); }}
                                style={{ padding:"8px 12px", cursor:"pointer", fontSize:12, color:"#cbd5e1", borderBottom:"1px solid #0f1117", transition:"background .1s" }}
                                onMouseEnter={e => e.target.style.background="#2a3a50"}
                                onMouseLeave={e => e.target.style.background="transparent"}>
                                {sugg}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={handleAdd} style={{ background: canAdd ? "#22c55e" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor: canAdd ? "pointer" : "not-allowed", whiteSpace:"nowrap", transition:"background .15s" }}>+ ADD</button>
                    </div>
                    <div style={{ maxHeight:250, overflowY:"auto" }}>
                      {list.map(item => (
                        <div key={item} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"#0f1117", borderRadius:6, marginBottom:6 }}>
                          <span style={{ fontSize:12, color:"#e2e8f0" }}>{item}</span>
                          <button onClick={() => {
                            setList(list.filter(x => x !== item));
                            showToast(title.slice(0,-1) + " DELETED!", "error");
                          }} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"3px 8px", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer" }}>DEL</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:28, right:28, background:toast.type==="error"?"#ef4444":"#22c55e", color:"#fff", padding:"12px 18px", borderRadius:10, fontWeight:600, fontSize:13, zIndex:9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}