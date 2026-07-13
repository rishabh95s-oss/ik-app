import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { IMPORTED_DATA } from "./importedData.js";
import { loadRecords, upsertRecord, deleteRecord, loadSalesFlash, replaceSalesFlash, loadPurchaseFlash, replacePurchaseFlash, loadSalesWorking, upsertWorkingRow, upsertWorkingBatch, deleteWorkingRow, loadParties, addParty, deleteParty, loadBrokers, addBroker, deleteBroker, loadDeliveries, addDelivery, deleteDelivery, loadClaimRules, upsertClaimRule, deleteClaimRule, loadAppUsers, upsertAppUser, deleteAppUser, loadBankTransactions, upsertBankTransactions, updateBankTransaction, deleteBankTransaction, renamePurchaseParty, renamePurchaseDeliveryAt, renameSalesWorkingParty, renameClaimRuleParty, countPurchasesByParty, countPurchasesByDeliveryAt, countSalesWorkingByParty, countClaimRulesByParty, loadPmtLinkedSlots, upsertPmtLinkedSlot, deletePmtLinkedSlot, loadPartyPans, updatePartyPan, updatePartyPanVerified, loadFinancialYears, createFinancialYear, loadLoanParties, addLoanParty, deleteLoanParty, updateLoanPartyPan, updateLoanPartyPanVerified, loadLoanBrokers, addLoanBroker, deleteLoanBroker, updateLoanBrokerPan, updateLoanBrokerPanVerified, createLoan, addLoanInterestEvent, addLoanBrokerageAccrual, loadLoanInterestEvents, loadActiveFixedLoans, updateLoanDueDate, loadLoanBrokerageAccruals, loadLoanBrokeragePayments, addLoanBrokeragePayment, deleteLoanTerm, loadLoansWithTerms, settleNonFixedLoan, deleteNonFixedLoan, loadBanks, addBank, deleteBank,  loadIgnoredSalesParties, addIgnoredSalesParty, deleteIgnoredSalesParty, deleteBankTransactionsByDate, countLinkedOnDate } from "./dataService.js";
import { TableVirtuoso } from "react-virtuoso";
import { supabase } from './supabaseClient.js';

function ClaimManagementTab({ claimRules: externalRules, setClaimRules: setExternalRules, activeFY }) {
  const [claims, setClaims] = useState([]);
  const [newParty, setNewParty] = useState('');
  const [newClaimRule, setNewClaimRule] = useState('copy');
  const [newRecWeightSource, setNewRecWeightSource] = useState('data');
  const [newCDRule, setNewCDRule] = useState("standard");
  const [salesParties, setSalesParties] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'success', 'error'
  const [saveMessage, setSaveMessage] = useState('');

useEffect(() => {
  (async () => {
    try {
      const loaded = await loadClaimRules();
      setClaims(loaded);
      console.log('✅ Loaded claims from Supabase:', loaded);
    } catch (e) {
      console.error('❌ Error loading claim management:', e);
      setSaveStatus('error');
      setSaveMessage('Failed to load saved rules');
    }

    try {
      const salesRows = await loadSalesWorking(activeFY);
      const uniqueParties = [...new Set(salesRows.map(s => s.partyName).filter(Boolean))].sort();
      setSalesParties(uniqueParties);
    } catch (e) {
      console.error('❌ Error loading sales parties:', e);
    }
  })();
}, [activeFY]);
  


useEffect(() => {
  if (claims.length === 0) return;

  (async () => {
    try {
      setSaveStatus('saving');

      for (const claim of claims) {
        const ok = await upsertClaimRule(claim);
        if (!ok) throw new Error(`Failed to save ${claim.partyName}`);
      }

      console.log('✅ Saved claims to Supabase:', claims);
      setSaveStatus('success');
      setSaveMessage(`✓ Saved ${claims.length} rule(s)`);

      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (e) {
      console.error('❌ Error saving claim management:', e);
      setSaveStatus('error');
      setSaveMessage(`❌ Failed to save: ${e.message}`);
    }
  })();
}, [claims]);
  
const addClaim = async () => {
  if (!newParty.trim()) {
    alert('Please select or enter a party name');
    return;
  }

  const exists = claims.some(c => c.partyName === newParty);
  if (exists) {
    alert('This party already has a rule defined');
    return;
  }

 const newEntry = {
  partyName: newParty,
  claimRule: newClaimRule,
  recWeightSource: newRecWeightSource,
  cdRule: newCDRule,
};

  const ok = await upsertClaimRule(newEntry);
  if (!ok) {
    setSaveStatus('error');
    setSaveMessage('❌ Failed to save — check connection');
    return;
  }

 const saved = await loadClaimRules();
setClaims(saved);
if (setExternalRules) setExternalRules(saved);

setNewParty('');
setNewClaimRule('copy');
setNewRecWeightSource('data');
setNewCDRule('standard');
};
 const deleteClaim = async (id) => {
  const claim = claims.find(c => c.id === id);
  if (!claim) return;

  const ok = await deleteClaimRule(claim.partyName);
  if (!ok) {
    setSaveStatus('error');
    setSaveMessage('❌ Failed to delete — check connection');
    return;
  }

  setClaims(prev => prev.filter(c => c.id !== id));
};

const updateClaim = async (id, field, value) => {
  const claim = claims.find(c => c.id === id);
  if (!claim) return;

  const updated = { ...claim, [field]: value };

  const ok = await upsertClaimRule(updated);
  if (!ok) {
    setSaveStatus('error');
    setSaveMessage('❌ Failed to save — check connection');
    return;
  }

  setClaims(prev => prev.map(c => c.id === id ? updated : c));
};

  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", transition:"border-color .15s" };
  const lbl = { fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:5 };
  const sec = { background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:14, padding:"20px 22px", marginBottom:20 };
  const stitle = { fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#f59e0b", marginBottom:16 };

  return (
    <div style={{ padding:"0" }}>
      {/* SAVE STATUS INDICATOR */}
      {saveStatus !== 'idle' && (
        <div style={{ 
          marginBottom:20, 
          padding:"12px 16px", 
          background: saveStatus === 'saving' ? "#1a3a5a" : saveStatus === 'success' ? "#1a3a1a" : "#3a1a1a",
          border: `1px solid ${saveStatus === 'saving' ? "#38bdf8" : saveStatus === 'success' ? "#22c55e" : "#ef4444"}`,
          borderRadius:8, 
          color: saveStatus === 'saving' ? "#38bdf8" : saveStatus === 'success' ? "#22c55e" : "#ef4444",
          fontSize:12,
          fontWeight:600
        }}>
          {saveStatus === 'saving' && '⏳ Saving...'}
          {saveStatus === 'success' && saveMessage}
          {saveStatus === 'error' && saveMessage}
        </div>
      )}

      {/* Add New Party */}
      <div style={sec}>
        <div style={stitle}>Add Party Rule</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:14, marginBottom:20 }}>
          <div>
            <label style={lbl}>Party Name</label>
            <input
              type="text"
              list="partiesList"
              value={newParty}
              onChange={(e) => setNewParty(e.target.value)}
              placeholder="Select or type party"
              style={inp}
            />
            <datalist id="partiesList">
              {salesParties.map((party) => (
                <option key={party} value={party} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={lbl}>Claim Rule</label>
            <select
              value={newClaimRule}
              onChange={(e) => setNewClaimRule(e.target.value)}
              style={inp}
            >
              <option value="nothing">Nothing (Skip)</option>
              <option value="copy">Copy as-is</option>
              <option value="ratio">Ratio</option>
            </select>
          </div>

          <div>
            <label style={lbl}>Rec Weight Source</label>
            <select
              value={newRecWeightSource}
              onChange={(e) => setNewRecWeightSource(e.target.value)}
              style={inp}
            >
              <option value="data">From Data</option>
              <option value="sales">From Sales Qty</option>
            </select>
          </div>
        </div>

       
<div>
  <label style={lbl}>CD Rule</label>
  <select value={newCDRule} onChange={e => setNewCDRule(e.target.value)} style={inp}>
    <option value="standard">Standard (Gross - Claim) × CD%</option>
    <option value="gross">Gross Only × CD%</option>
  </select>
</div>        <button
          onClick={addClaim}
          style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}
        >
          + Add Rule
        </button>
      </div>

      {/* Party Rules List */}
      <div style={{ background:"#151b2a", borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden" }}>
     <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 150px", gap:4, padding:"16px", background:"#0f1117", fontWeight:600, fontSize:12, borderBottom:"1px solid #1e2a3a" }}>
  <div>Party Name</div>
  <div>Claim Rule</div>
  <div>CD Rule</div>
  <div>Rec Weight Source</div>
  <div>Action</div>
</div>
        {claims.length === 0 ? (
          <div style={{ padding:"20px", textAlign:"center", color:"#64748b" }}>No party rules defined yet</div>
        ) : (
claims.map((claim) => (
  <div key={claim.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 150px", gap:4, padding:"12px 16px", borderBottom:"1px solid #1e2a3a", alignItems:"center", background:"#0f1117" }}>
    {/* Party Name */}
    <div style={{ fontSize:12, color:"#cbd5e1" }}>{claim.partyName}</div>

    {/* Claim Rule */}
    <div>
      <select
        value={claim.claimRule}
        onChange={(e) => updateClaim(claim.id, 'claimRule', e.target.value)}
        style={{ ...inp, padding:"6px 8px", fontSize:11 }}
      >
        <option value="nothing">Nothing (Skip)</option>
        <option value="copy">Copy as-is</option>
        <option value="ratio">Ratio</option>
      </select>
    </div>

    {/* CD Rule */}
    <div>
      <select
        value={claim.cdRule || "standard"}
        onChange={e => updateClaim(claim.id, 'cdRule', e.target.value)}
        style={{ ...inp, padding:"6px 8px", fontSize:11 }}
      >
        <option value="standard">Standard</option>
        <option value="gross">Gross Only</option>
      </select>
    </div>

    {/* Rec Weight Source */}
    <div>
      <select
        value={claim.recWeightSource}
        onChange={(e) => updateClaim(claim.id, 'recWeightSource', e.target.value)}
        style={{ ...inp, padding:"6px 8px", fontSize:11 }}
      >
        <option value="data">From Data</option>
        <option value="sales">From Sales Qty</option>
      </select>
    </div>

    {/* Action */}
    <div>
      <button
        onClick={() => deleteClaim(claim.id)}
        style={{ background:"#ef4444", border:"none", borderRadius:6, padding:"6px 12px", color:"#fff", fontWeight:600, fontSize:11, cursor:"pointer", width:"100%" }}
      >
        Delete
      </button>
    </div>
  </div>
))
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop:20, background:"#151b2a", padding:"16px", borderRadius:8, border:"1px solid #1e2a3a", fontSize:12, color:"#64748b" }}>
        <p style={{ marginBottom:8 }}><strong>Copy as-is:</strong> Sales Claim = Data Claim</p>
        <p style={{ marginBottom:8 }}><strong>Ratio:</strong> Sales Claim = Data Claim × (Sales Rate / Data Rate)</p>
        <p><strong>Total Rules:</strong> {claims.length} party rules saved</p>
      </div>
    </div>
  );
}
// Loan interest + brokerage calculation. All money rounded to whole rupees.
function calcLoan({ principal, interestRate, brokerageRate, loanType, months, days }) {
  const P = parseFloat(principal) || 0;
  const iRate = parseFloat(interestRate) || 0;
  const bRate = parseFloat(brokerageRate) || 0;

  // time factor: fixed = months; non-fixed = days/30
  const timeFactor = loanType === "fixed"
    ? (parseFloat(months) || 0)
    : ((parseFloat(days) || 0) / 30);

  // Interest (both types have 10% TDS)
  const interest = Math.round(P * (iRate / 100) * timeFactor);
  const interestTDS = Math.round(interest * 10 / 100);
  const netParty = interest - interestTDS;

  // Brokerage accrual (no TDS at accrual — TDS is at payment time)
  const brokerage = Math.round(P * (bRate / 100) * timeFactor);

  return { interest, interestTDS, netParty, brokerage, timeFactor };
}

function getFYStart(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0=Jan, 3=Apr
  const fyStartYear = month < 3 ? year - 1 : year; // Jan-Mar belong to previous year's FY
  return new Date(fyStartYear, 3, 1);
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

// Shared CSV downloader. headers = array of strings; rows = array of arrays (cells).
// Numbers export plain (no ₹/commas) so Excel can sum them.

function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(headers.map(esc).join(","));
  rows.forEach(r => lines.push(r.map(esc).join(",")));
  const csv = lines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function calcAll(f, autoTDS = 0, cdRule = "standard") {
  const H = parseFloat(f.rate) || 0;
  const I = parseFloat(f.billQty) || 0;
  const J = parseFloat(f.receiveQty) || 0;
  const L = parseFloat(f.halfKgValue) || 0;
  const G = Math.round((parseFloat(f.gunnyWeight) || 0) * 1000) / 1000;   // ← 1000 for 3 decimals
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
  const N = Math.round((J - M - G) * 100) / 100;
  const O = Math.round(N * H);
  const Q = cdRule === "gross"
    ? Math.round(P * J * H / 100)
    : Math.round(((J * H) - R) * P / 100);
  const V = Math.round(O - Q - R - S - T + U);
  const X = f.brokerageAmt ? (parseFloat(f.brokerageAmt) || 0) : Math.round(W * J);
  const Z = Math.round(V - X - Y);
  const AJ = Z - AA - AD - AG;
  const AK = Math.round(I * H);

 return { shortage: K, halfKgQty: M, gunnyDeduct: G, netQty: N, netAmt1: O, cdAmt: Q, netAmt: V, brokerageAmt: X, tds: Y, finalAmt: Z, balance: AJ, partyBillAmt: AK };
}

// Recompute purchase TDS + calcAll (with correct cdRule) for every bill of the
// affected parties, against the full record set. Persists per `mode`:
//   "all"     → save every affected bill
//   "changed" → save only bills whose _tds changed (fast, no lag)
// Returns { ok, records } — the updated full array so state stays in sync.
async function recomputePartiesTDS(affectedParties, fullRecords, claimRules, mode = "changed", financialYear) {
  const partySet = new Set((affectedParties || []).map(p => (p || "").trim()).filter(Boolean));
  if (partySet.size === 0) return { ok: true, records: fullRecords };

  const updated = [...fullRecords];

  for (let i = 0; i < updated.length; i++) {
    const bill = updated[i];
    if (!partySet.has((bill.partyName || "").trim())) continue;

    const tds = bill.partyName ? calcTDS(bill, updated) : 0;
    const cdRule = claimRules.find(r => r.partyName === bill.deliveryAt)?.cdRule || "standard";
    const c = calcAll(bill, tds, cdRule);
    const rec = {
      ...bill,
      _tds: tds, _cdRule: cdRule, _shortage: c.shortage, _halfKgQty: c.halfKgQty,
      _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt,
      _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance
    };

    const tdsChanged = Math.round(parseFloat(bill._tds) || 0) !== Math.round(tds);

    // Always update in-memory so the returned array is correct
    updated[i] = rec;

    // Persist based on mode
    if (mode === "all" || tdsChanged) {
  const ok = await upsertRecord(rec, financialYear);
      if (!ok) return { ok: false, records: fullRecords };
    }
  }

  return { ok: true, records: updated };
}

function calculateSalesFields(record) {
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      return new Date(dateStr);
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12) {
        return null;
      }
      return new Date(y, m - 1, d);
    }
    return null;
  };

  const qty = parseFloat(record.qty) || 0;
  const rate = parseFloat(record.rate) || 0;
  const receivedWeight = parseFloat(record.receivedWeight) || 0;
  const claimPct = parseFloat(record.claimPct) || 0;
  const cdPct = parseFloat(record.cdPct) || 0;
  const tdsReceived = parseFloat(record.tdsReceived) || 0;
  const bankPmt1 = parseFloat(record.bankPmt1) || 0;
  const bankPmt2 = parseFloat(record.bankPmt2) || 0;
  const bankPmt3 = parseFloat(record.bankPmt3) || 0;

 const grossAmt = Math.round(qty * rate);
const shortage = qty - receivedWeight;
const shortageAmount = Math.round(shortage * rate);
const gunnyWeight = parseFloat(record.gunnyWeight) || 0;
const gunnyAmount = Math.round(gunnyWeight * rate);
const claim = parseFloat(record.claim) || 0;
  const cdRule = record.cdRule || "standard";
  const storedCd = parseFloat(record.cd);

  // Honour a manually-entered CD; otherwise derive it from CD%
  const cd = (!isNaN(storedCd) && storedCd !== 0)
    ? storedCd
    : (cdRule === "gross"
        ? Math.round((receivedWeight * rate) * cdPct / 100)
        : Math.round(((receivedWeight * rate) - claim) * cdPct / 100));

  const netAmt = grossAmt - shortageAmount - claim - cd - tdsReceived - gunnyAmount;
  const totalPaid = bankPmt1 + bankPmt2 + bankPmt3;
  const pendingAmt = netAmt - totalPaid;

  let days = 0;
  const billDate = parseDate(record.date);
  if (!billDate) {
    console.warn("Invalid bill date:", record.date);
    days = 0;
  } else {
    billDate.setHours(0, 0, 0, 0);
    const date1 = record.bankDate1 ? parseDate(record.bankDate1) : null;
    const date2 = record.bankDate2 ? parseDate(record.bankDate2) : null;
    const date3 = record.bankDate3 ? parseDate(record.bankDate3) : null;
    if (date1) date1.setHours(0, 0, 0, 0);
    if (date2) date2.setHours(0, 0, 0, 0);
    if (date3) date3.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalDays = 0;
    let paymentsFound = false;
    if (date1 && bankPmt1 > 0) {
      paymentsFound = true;
      const diffMs = date1 - billDate;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      totalDays += bankPmt1 * diffDays;
    }
    if (date2 && bankPmt2 > 0) {
      paymentsFound = true;
      const diffMs = date2 - billDate;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      totalDays += bankPmt2 * diffDays;
    }
    if (date3 && bankPmt3 > 0) {
      paymentsFound = true;
      const diffMs = date3 - billDate;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      totalDays += bankPmt3 * diffDays;
    }
    if (paymentsFound && totalPaid > 0) {
      days = Math.round(totalDays / totalPaid);
    } else {
      const diffMs = today - billDate;
      days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
    if (isNaN(days)) {
      days = 0;
    }
  }

  return {
    ...record,
    shortage: Math.round(shortage * 100) / 100,
    shortageAmount: Math.round(shortageAmount),
      gunnyWeight: gunnyWeight,
     gunnyAmount: gunnyAmount,
    claim: claim,
    cd: cd,
   netAmt: netAmt,
pendingAmt: pendingAmt,
    days: days
  };
}

const WORKING_COLS = [
  { label: "Ref No", w: 70, align: "left" },
  { label: "Date", w: 80, align: "left" },
  { label: "Party", w: 120, align: "left" },
  { label: "Broker", w: 100, align: "left" },
  { label: "Item", w: 100, align: "left" },
  { label: "Qty", w: 60, align: "right" },
  { label: "Rate", w: 60, align: "right" },
  { label: "Rec Weight", w: 80, align: "right" },
  { label: "Shortage", w: 70, align: "right" },
  { label: "Shortage Amt", w: 80, align: "right" },
  { label: "Gunny Wt", w: 70, align: "right" },
  { label: "Gunny Amt", w: 80, align: "right" },
  { label: "Claim %", w: 70, align: "right" },
  { label: "Claim", w: 70, align: "right" },
  { label: "CD %", w: 60, align: "right" },
  { label: "CD", w: 70, align: "right" },
  { label: "TDS", w: 80, align: "right" },
  { label: "Net Amt", w: 80, align: "right" },
  { label: "Bk Date 1", w: 80, align: "left" },
  { label: "Bk Pmt 1", w: 70, align: "right" },
  { label: "Bk Date 2", w: 80, align: "left" },
  { label: "Bk Pmt 2", w: 70, align: "right" },
  { label: "Bk Date 3", w: 80, align: "left" },
  { label: "Bk Pmt 3", w: 70, align: "right" },
  { label: "Pending", w: 80, align: "right" },
  { label: "Days", w: 60, align: "right" },
];
const WORKING_TABLE_WIDTH = WORKING_COLS.reduce((s, c) => s + c.w, 0);

const WORKING_TABLE_COMPONENTS = {
  Table: ({ children, style, ...rest }) => (
    <table {...rest} style={{ ...style, width: "100%", minWidth: WORKING_TABLE_WIDTH, fontSize: 10, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
      <colgroup>{WORKING_COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>
      {children}
    </table>
  ),
  TableRow: ({ style, ...props }) => {
    const i = props["data-index"];
    return <tr {...props} style={{ ...style, borderBottom: "1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
  },
};

const SalesWorkingCells = React.memo(function SalesWorkingCells({ rec, onUpdate, onSave }) {
  const calculated = calculateSalesFields(rec);
  const editStyle = { width:"100%", padding:"2px 4px", background:"#1a2236", border:"1px solid #1e2a3a", borderRadius:3, color:"#cbd5e1", fontSize:10 };
  const tdEdit = { padding:"3px 3px", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };

  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.date}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdL}>{rec.broker}</td>
      <td style={tdL}>{rec.itemName}</td>
      <td style={tdR}>{rec.qty}</td>
      <td style={tdR}>₹{rec.rate}</td>

      <td style={tdEdit}>
        <input type="number" value={rec.receivedWeight}
          onChange={(e) => onUpdate({ ...rec, receivedWeight: parseFloat(e.target.value) || 0 })}
          onBlur={() => onSave(rec)} style={editStyle} />
      </td>

      <td style={tdR}>{calculated.shortage.toFixed(2)}</td>
      <td style={tdR}>₹{calculated.shortageAmount}</td>
    
    <td style={tdEdit}>
  <input type="number" step="0.001" value={rec.gunnyWeight || 0}
    onChange={(e) => onUpdate({ ...rec, gunnyWeight: parseFloat(e.target.value) || 0 })}
    onBlur={() => onSave({ ...rec, gunnyWeight: rec.gunnyWeight })}
    style={editStyle} />
</td>
<td style={tdR}>₹{calculated.gunnyAmount}</td>

    <td style={tdEdit}>
  <input type="number" step="0.01" value={rec.claimPct}
    onChange={(e) => {
      const claimPct = parseFloat(e.target.value) || 0;
      const claim = Math.round((rec.receivedWeight * rec.rate * claimPct) / 100);
      onUpdate({ ...rec, claimPct, claim });
    }}
    onBlur={() => onSave({ ...rec, claimPct: rec.claimPct, claim: rec.claim })}
    style={editStyle} />
</td>

     <td style={tdEdit}>
  <input type="number" value={rec.claim}
    onChange={(e) => {
      const claim = parseFloat(e.target.value) || 0;
      const claimPct = rec.receivedWeight > 0 ? (claim * 100) / (rec.rate * rec.receivedWeight) : 0;
      onUpdate({ ...rec, claim, claimPct: parseFloat(claimPct.toFixed(2)) });
    }}
    onBlur={() => onSave({ ...rec, claim: rec.claim, claimPct: rec.claimPct })}
    style={editStyle} />
</td>

     <td style={tdEdit}>
  <input type="number" step="0.01" value={rec.cdPct}
    onChange={(e) => {
      const cdPct = parseFloat(e.target.value) || 0;
      const cd = Math.round((rec.rate * rec.receivedWeight * cdPct) / 100);
      onUpdate({ ...rec, cdPct, cd });
    }}
    onBlur={() => onSave({ ...rec, cdPct: rec.cdPct, cd: rec.cd })}
    style={editStyle} />
</td>
     
   <td style={tdEdit}>
  <input type="number" value={rec.cd}
    onChange={(e) => {
      const cd = parseFloat(e.target.value) || 0;
      const cdPct = rec.receivedWeight > 0 ? (cd * 100) / (rec.rate * rec.receivedWeight) : 0;
      onUpdate({ ...rec, cd, cdPct: parseFloat(cdPct.toFixed(2)) });
    }}
    onBlur={() => onSave({ ...rec, cd: rec.cd, cdPct: rec.cdPct })}
    style={editStyle} />
</td>
      
 <td style={tdEdit}>
  <input type="number" value={rec.tdsReceived}
    onChange={(e) => onUpdate({ ...rec, tdsReceived: parseFloat(e.target.value) || 0 })}
    onBlur={() => onSave({ ...rec, tdsReceived: rec.tdsReceived })}
    style={editStyle} />
</td>

      <td style={tdR}>₹{calculated.netAmt}</td>
{/* 6. BANK DATE 1 */}
<td style={tdEdit}>
  <input type="date" value={rec.bankDate1}
    onChange={(e) => onUpdate({ ...rec, bankDate1: e.target.value })}
    onBlur={() => onSave({ ...rec, bankDate1: rec.bankDate1 })}
    style={editStyle} />
</td>

{/* 7. BANK PMT 1 */}
<td style={tdEdit}>
  <input type="number" value={rec.bankPmt1}
    onChange={(e) => onUpdate({ ...rec, bankPmt1: parseFloat(e.target.value) || 0 })}
    onBlur={() => onSave({ ...rec, bankPmt1: rec.bankPmt1 })}
    style={editStyle} />
</td>

{/* 8. BANK DATE 2 */}
<td style={tdEdit}>
  <input type="date" value={rec.bankDate2}
    onChange={(e) => onUpdate({ ...rec, bankDate2: e.target.value })}
    onBlur={() => onSave({ ...rec, bankDate2: rec.bankDate2 })}
    style={editStyle} />
</td>

{/* 9. BANK PMT 2 */}
<td style={tdEdit}>
  <input type="number" value={rec.bankPmt2}
    onChange={(e) => onUpdate({ ...rec, bankPmt2: parseFloat(e.target.value) || 0 })}
    onBlur={() => onSave({ ...rec, bankPmt2: rec.bankPmt2 })}
    style={editStyle} />
</td>

{/* 10. BANK DATE 3 */}
<td style={tdEdit}>
  <input type="date" value={rec.bankDate3}
    onChange={(e) => onUpdate({ ...rec, bankDate3: e.target.value })}
    onBlur={() => onSave({ ...rec, bankDate3: rec.bankDate3 })}
    style={editStyle} />
</td>

{/* 11. BANK PMT 3 */}
<td style={tdEdit}>
  <input type="number" value={rec.bankPmt3}
    onChange={(e) => onUpdate({ ...rec, bankPmt3: parseFloat(e.target.value) || 0 })}
    onBlur={() => onSave({ ...rec, bankPmt3: rec.bankPmt3 })}
    style={editStyle} />
</td>
      <td style={tdR}>₹{calculated.pendingAmt}</td>
      <td style={{ padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap" }}>{calculated.days}</td>
    </>
  );
});

const DataTableRow = React.memo(function DataTableRow({ rec, visibleKeys, fmt, fmtDate, getLinkedBankStatus }) {
  return (
    <>
      {visibleKeys.map(k => (
        k === "_bankLinked" ? (
          <td key={k} style={{ padding:"6px 6px", fontWeight:700, color: getLinkedBankStatus(rec.refNo).includes("✓") ? "#22c55e" : "#ef4444", textAlign:"center", whiteSpace:"nowrap" }}>
            {getLinkedBankStatus(rec.refNo)}
          </td>
        ) : (
          <td key={k} style={{ padding:"6px 6px", color:"#cbd5e1", textAlign: k.includes("Qty") || k.includes("Rate") || k.includes("Amt") || k.includes("Balance") || k.includes("TDS") ? "right" : "left", whiteSpace:"nowrap" }}>
            {k.includes("Amt") || k.includes("Balance") || k.includes("TDS") ? "₹" : ""}
            {k.includes("Amt") || k.includes("Balance") || k.includes("TDS") 
              ? (k === "_balance" ? (rec[k] !== undefined && rec[k] !== "" ? fmt(rec[k]) : "0") : fmt(rec[k])) 
              : k.includes("Date") 
              ? fmtDate(rec[k]) 
              : (rec[k] || "")}
          </td>
        )
      ))}
    </>
  );
});


const PmtTableRow = React.memo(function PmtTableRow({ rec, visibleKeys, fmt, fmtDate }) {
  return (
    <>
      {visibleKeys.map(k => (
        <td key={k} style={{
          padding:"6px 6px",
          color:"#cbd5e1",
          textAlign: k.includes("Amt") || k.includes("Balance") ? "right" : "left",
          whiteSpace:"nowrap",
          borderRight:"1px solid #1e2a3a"
        }}>
          {k.includes("Amt") || k.includes("Balance")
            ? "₹ " + (k === "_balance" ? "0" : fmt(rec[k]))
            : k.includes("Date")
            ? fmtDate(rec[k])
            : (rec[k] || "")}
        </td>
      ))}
    </>
  );
});

const FLASH_COLS = [
  { key:"refNo",      label:"Ref No",       align:"left",  w:70  },
  { key:"date",       label:"Date",         align:"left",  w:80  },
  { key:"partyName",  label:"Party Name",   align:"left",  w:120 },
  { key:"broker",     label:"Broker",       align:"left",  w:100 },
  { key:"itemName",   label:"Item Name",    align:"left",  w:100 },
  { key:"poNo",       label:"PO No",        align:"left",  w:80  },
  { key:"truckNo",    label:"Truck No",     align:"left",  w:80  },
  { key:"qty",        label:"Qty",          align:"right", w:60  },
  { key:"rate",       label:"Rate",         align:"right", w:60  },
  { key:"netBillAmt", label:"Net Bill Amt", align:"right", w:100 },
];
const FLASH_TABLE_WIDTH = FLASH_COLS.reduce((s, c) => s + c.w, 0);

const FLASH_TABLE_COMPONENTS = {
  Table: ({ children, style, ...rest }) => (
    <table {...rest} style={{ ...style, width:"100%", minWidth:FLASH_TABLE_WIDTH, fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
      <colgroup>{FLASH_COLS.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
      {children}
    </table>
  ),
  TableRow: ({ style, ...props }) => {
    const i = props["data-index"];
    return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
  },
};

const FlashTableRow = React.memo(function FlashTableRow({ rec }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.date}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdL}>{rec.broker}</td>
      <td style={tdL}>{rec.itemName}</td>
      <td style={tdL}>{rec.poNo}</td>
      <td style={tdL}>{rec.truckNo}</td>
      <td style={tdR}>{rec.qty}</td>
      <td style={tdR}>₹{rec.rate}</td>
      <td style={{ ...tdR, borderRight:"none" }}>₹{rec.netBillAmt.toLocaleString()}</td>
    </>
  );
});

const ReconcileAddRow = React.memo(function ReconcileAddRow({ rec, onAdd }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.date}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdR}>{rec.qty}</td>
      <td style={tdR}>₹{rec.rate}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button
          onClick={() => onAdd(rec)}
          style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}
        >
          ➕ Add
        </button>
      </td>
    </>
  );
});

const ReconcileRemoveRow = React.memo(function ReconcileRemoveRow({ rec, onRemove }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.date}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdR}>{rec.qty}</td>
      <td style={tdR}>₹{rec.rate}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button
          onClick={() => onRemove(rec)}
          style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}
        >
          ❌ Remove
        </button>
      </td>
    </>
  );
});

const RECONCILE_SIMPLE_COLS = [
  { label:"Ref No", w:70,  align:"left"  },
  { label:"Date",   w:80,  align:"left"  },
  { label:"Party",  w:120, align:"left"  },
  { label:"Qty",    w:60,  align:"right" },
  { label:"Rate",   w:60,  align:"right" },
  { label:"Action", w:80,  align:"center"},
];
const RECONCILE_SIMPLE_WIDTH = RECONCILE_SIMPLE_COLS.reduce((s, c) => s + c.w, 0);

const RECONCILE_SIMPLE_COMPONENTS = {
  Table: ({ children, style, ...rest }) => (
    <table {...rest} style={{ ...style, width:"100%", minWidth:RECONCILE_SIMPLE_WIDTH, fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
      <colgroup>{RECONCILE_SIMPLE_COLS.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
      {children}
    </table>
  ),
  TableRow: ({ style, ...props }) => {
    const i = props["data-index"];
    return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
  },
};

const RECONCILE_SIMPLE_HEADER = (
  <tr style={{ background:"#151b2a" }}>
    {RECONCILE_SIMPLE_COLS.map((c, i) => (
      <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < RECONCILE_SIMPLE_COLS.length - 1 ? "1px solid #1e2a3a" : "none" }}>
        {c.label}
      </th>
    ))}
  </tr>
);

const PS_EXACT_COLS = [
  { label:"Ref No",      w:70,  align:"left",  side:"purchase" },
  { label:"Delivery At", w:120, align:"left",  side:"purchase" },
  { label:"Rec Qty",     w:80,  align:"right", side:"purchase" },
  { label:"Rate",        w:70,  align:"right", side:"purchase" },
  { label:"Claim",       w:80,  align:"right", side:"purchase" },
  { label:"Ref No",      w:70,  align:"left",  side:"sales"    },
  { label:"Party",       w:120, align:"left",  side:"sales"    },
  { label:"Qty",         w:60,  align:"right", side:"sales"    },
  { label:"Rate",        w:70,  align:"right", side:"sales"    },
  { label:"Action",      w:100, align:"center",side:"sales"    },
];
const PS_EXACT_WIDTH = PS_EXACT_COLS.reduce((s, c) => s + c.w, 0);

const PS_ORPHAN_PURCHASE_COLS = [
  { label:"Ref No",      w:70,  align:"left"  },
  { label:"Delivery At", w:120, align:"left"  },
  { label:"Rec Qty",     w:80,  align:"right" },
  { label:"Claim",       w:80,  align:"right" },
];
const PS_ORPHAN_PURCHASE_WIDTH = PS_ORPHAN_PURCHASE_COLS.reduce((s, c) => s + c.w, 0);

const PS_ORPHAN_SALES_COLS = [
  { label:"Ref No",  w:70,  align:"left"  },
  { label:"Party",   w:120, align:"left"  },
  { label:"Qty",     w:60,  align:"right" },
  { label:"Net Amt", w:80,  align:"right" },
  { label:"Action",  w:100, align:"center"},
];
const PS_ORPHAN_SALES_WIDTH = PS_ORPHAN_SALES_COLS.reduce((s, c) => s + c.w, 0);

const PS_MISMATCH_COLS = [
  { label:"Ref No",      w:70,  align:"left"  },
  { label:"Data Party",  w:120, align:"left"  },
  { label:"Sales Party", w:120, align:"left"  },
  { label:"Claim",       w:80,  align:"right" },
  { label:"Action",      w:120, align:"center"},
];
const PS_MISMATCH_WIDTH = PS_MISMATCH_COLS.reduce((s, c) => s + c.w, 0);

function makeTableComponents(width) {
  return {
    Table: ({ children, style, ...rest }) => (
      <table {...rest} style={{ ...style, width:"100%", minWidth:width, fontSize:9, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
        {children}
      </table>
    ),
    TableRow: ({ style, ...props }) => {
      const i = props["data-index"];
      return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
    },
  };
}

const PsExactRow = React.memo(function PsExactRow({ item, onLink }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdG = { padding:"6px 6px", color:"#22c55e", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdGR = { padding:"6px 6px", color:"#22c55e", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={{ ...tdL, fontWeight:600 }}>{item.purchase.refNo}</td>
      <td style={tdL}>{item.purchase.deliveryAt}</td>
      <td style={tdR}>{item.purchase.receiveQty || "-"}</td>
      <td style={tdR}>₹{item.purchase.rate || "-"}</td>
      <td style={{ ...tdR, borderRight:"2px solid #1e2a3a", fontWeight:600 }}>₹{item.purchase.qualityClaim || "-"}</td>
      <td style={{ ...tdG, fontWeight:600 }}>{item.sales.refNo}</td>
      <td style={tdG}>{item.sales.partyName}</td>
      <td style={tdGR}>{item.sales.qty || "-"}</td>
      <td style={tdGR}>₹{item.sales.rate || "-"}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button onClick={() => onLink(item.purchase.refNo)} style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>✓ Link</button>
      </td>
    </>
  );
});

const PsMismatchRow = React.memo(function PsMismatchRow({ item, onUpdate }) {
  const tdY = { padding:"6px 6px", color:"#f59e0b", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={{ ...tdY, fontWeight:600 }}>{item.purchase.refNo}</td>
      <td style={tdY}>{item.purchase.deliveryAt}</td>
      <td style={{ ...tdY, background:"#f5950b22" }}>{item.sales.partyName}</td>
      <td style={{ ...tdY, textAlign:"right", fontWeight:600 }}>₹{item.purchase.qualityClaim || "-"}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button onClick={() => onUpdate(item.purchase.refNo, item.sales.partyName)} style={{ background:"#3b82f6", border:"none", borderRadius:4, padding:"4px 8px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>🔄 Update</button>
      </td>
    </>
  );
});

const PsOrphanPurchaseRow = React.memo(function PsOrphanPurchaseRow({ rec }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={{ ...tdL, fontWeight:600 }}>{rec.refNo}</td>
      <td style={tdL}>{rec.deliveryAt}</td>
      <td style={tdR}>{rec.receiveQty || "-"}</td>
      <td style={{ ...tdR, fontWeight:600 }}>₹{rec.qualityClaim || "-"}</td>
    </>
  );
});

const PsOrphanSalesRow = React.memo(function PsOrphanSalesRow({ rec, onIgnore }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const netAmt = calculateSalesFields(rec).netAmt;
  return (
    <>
      <td style={{ ...tdL, fontWeight:600 }}>{rec.refNo}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdR}>{rec.qty || "-"}</td>
      <td style={tdR}>₹{netAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button onClick={() => onIgnore(rec.partyName)} style={{ background:"#64748b", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>🙈 Ignore</button>
      </td>
    </>
  );
});

const PsIgnoredRow = React.memo(function PsIgnoredRow({ party, count, onRemove }) {
  const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", fontWeight:600 };
  const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  return (
    <>
      <td style={tdL}>{party}</td>
      <td style={tdR}>{count} entries</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <button onClick={() => onRemove(party)} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>Remove</button>
      </td>
    </>
  );
});

const BANK_TRANS_COLS_PMT = [
  { label:"Date",       w:80,  align:"left"  },
  { label:"Narration",  w:200, align:"left"  },
  { label:"Chq/Ref",   w:80,  align:"left"  },
  { label:"Withdrawal", w:100, align:"right" },
  { label:"Ref No",     w:80,  align:"left"  },
  { label:"Party",      w:120, align:"left"  },
];
const BANK_TRANS_COLS_SALES = [
  { label:"Date",      w:80,  align:"left"  },
  { label:"Narration", w:200, align:"left"  },
  { label:"Chq/Ref",  w:80,  align:"left"  },
  { label:"Deposit",   w:100, align:"right" },
  { label:"Ref No",    w:80,  align:"left"  },
  { label:"Party",     w:120, align:"left"  },
];
const BANK_TRANS_WIDTH = BANK_TRANS_COLS_PMT.reduce((s, c) => s + c.w, 0);

const BANK_MAIN_COLS = [
  { key:"date",        label:"Date",        w:80,  align:"left"   },
  { key:"narration",   label:"Narration",   w:200, align:"left"   }, // width overridden by narrationWidth
  { key:"chqRef",      label:"Chq./Ref",    w:100, align:"left"   },
  { key:"valueDt",     label:"Value Dt",    w:80,  align:"left"   }, // label swaps to "Mode" for VASB
  { key:"withdrawal",  label:"Withdrawal",  w:100, align:"right"  },
  { key:"deposit",     label:"Deposit",     w:100, align:"right"  },
  { key:"cbBank",      label:"CB (Bank)",   w:120, align:"right"  },
  { key:"cbCalc",      label:"CB (Calc)",   w:120, align:"right"  },
  { key:"status",      label:"Status",      w:80,  align:"center" },
  { key:"refNo",       label:"REF NO",      w:80,  align:"center" },
  { key:"party",       label:"PARTY",       w:100, align:"left"   },
  { key:"action",      label:"ACTION",      w:80,  align:"center" },
];

const PMT_RIGHT_COLS = [
  { label:"REF NO",    w:70,  align:"left"  },
  { label:"PARTY",     w:100, align:"left"  },
  { label:"BILL DATE", w:80,  align:"left"  },
  { label:"BILL NO",   w:70,  align:"left"  },
  { label:"FINAL AMT", w:80,  align:"right" },
  { label:"SLOT 1 AMT",w:80,  align:"right" },
  { label:"SLOT 1 DT", w:80,  align:"left"  },
  { label:"SLOT 1 BK", w:70,  align:"left"  },
  { label:"SLOT 2 AMT",w:80,  align:"right" },
  { label:"SLOT 2 DT", w:80,  align:"left"  },
  { label:"SLOT 2 BK", w:70,  align:"left"  },
  { label:"SLOT 3 AMT",w:80,  align:"right" },
  { label:"SLOT 3 DT", w:80,  align:"left"  },
  { label:"SLOT 3 BK", w:70,  align:"left"  },
  { label:"BALANCE",   w:80,  align:"right" },
  { label:"ACTION",    w:70,  align:"center"},
];
const PMT_RIGHT_WIDTH = PMT_RIGHT_COLS.reduce((s, c) => s + c.w, 0);

const SALES_RIGHT_COLS = [
  { label:"Ref No",    w:70,  align:"left"  },
  { label:"Date",      w:80,  align:"left"  },
  { label:"Party",     w:120, align:"left"  },
  { label:"Net Amt",   w:100, align:"right" },
  { label:"Bk Date 1", w:80,  align:"left"  },
  { label:"Slot 1 Amt",w:100, align:"right" },
  { label:"PMT ID 1",  w:80,  align:"left"  },
  { label:"Bk Date 2", w:80,  align:"left"  },
  { label:"Slot 2 Amt",w:100, align:"right" },
  { label:"PMT ID 2",  w:80,  align:"left"  },
  { label:"Bk Date 3", w:80,  align:"left"  },
  { label:"Slot 3 Amt",w:100, align:"right" },
  { label:"PMT ID 3",  w:80,  align:"left"  },
  { label:"Balance",   w:100, align:"right" },
  { label:"Days",      w:60,  align:"right" },
  { label:"Action",    w:70,  align:"center"},
];
const SALES_RIGHT_WIDTH = SALES_RIGHT_COLS.reduce((s, c) => s + c.w, 0);

const BankTransRow = React.memo(function BankTransRow({ trans, isSelected, reconcileMode, onSelect }) {
  const amount = reconcileMode === "pmt" ? trans.withdrawalAmt : trans.depositAmt;
 const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  return (
    <>
      <td style={tdL}>{trans.date}</td>
     <td style={{ ...tdL, overflow:"hidden", textOverflow:"ellipsis" }}>{trans.narration}</td>
      <td style={{ ...tdL, fontWeight:600 }}>{trans.chqRef}</td>
      <td style={tdR}>₹{amount ? amount.toLocaleString() : "-"}</td>
     <td style={{ ...tdL, color: trans.linkedRefNo ? "#22c55e" : "#ef4444", fontWeight:700 }}>
        {trans.linkedRefNo
          ? <>✓ {trans.linkedRefNo}{trans.linkedFy ? <span style={{ color:"#64748b", fontWeight:600, fontSize:9, marginLeft:4 }}>({trans.linkedFy})</span> : ""}</>
          : "-"}
      </td>
      <td style={tdL}>{trans.partyName || "-"}</td>
    </>
  );
});

function makeBankMainComponents(narrationWidth) {
  const cols = BANK_MAIN_COLS.map(c => c.key === "narration" ? { ...c, w: narrationWidth } : c);
  const width = cols.reduce((s, c) => s + c.w, 0);
  return {
    Table: ({ children, style, ...rest }) => (
      <table {...rest} style={{ ...style, width:"100%", minWidth:width, fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
        <colgroup>{cols.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
        {children}
      </table>
    ),
    TableRow: ({ style, ...props }) => {
      const i = props["data-index"];
      return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
    },
  };
}

const BankMainRow = React.memo(function BankMainRow({ item, bankTab, narrationWidth, onLink, onUnlink }) {
  if (item.type === "separator") {
    return (
      <td colSpan={12} style={{ padding:"6px 10px", background:"#1a2236", borderTop:"2px solid #f59e0b", borderBottom:"2px solid #f59e0b", color:"#f59e0b", fontWeight:800, fontSize:11, letterSpacing:"1px", textAlign:"center" }}>
        ◄ FINANCIAL YEAR {item.fy} ►
      </td>
    );
  }

  const trans = item.trans;
  const { calculatedCB, isValid } = item;
  const tdBase = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };

  return (
    <>
      <td style={tdBase}>{trans.date}</td>
      <td style={{ ...tdBase, textAlign:"left" }}>{trans.narration}</td>
      <td style={tdBase}>{trans.chqRef}</td>
      <td style={tdBase}>{bankTab === "VASB" ? trans.mode : trans.valueDt}</td>
      <td style={{ ...tdBase, textAlign:"right" }}>₹{trans.withdrawalAmt ? trans.withdrawalAmt.toLocaleString() : "-"}</td>
      <td style={{ ...tdBase, textAlign:"right" }}>₹{trans.depositAmt ? trans.depositAmt.toLocaleString() : "-"}</td>
      <td style={{ ...tdBase, textAlign:"right" }}>₹{trans.closingBalance.toLocaleString()}</td>
      <td style={{ ...tdBase, textAlign:"right", color: isValid ? "#22c55e" : "#ef4444", fontWeight:700 }}>₹{calculatedCB.toLocaleString()}</td>
      <td style={{ ...tdBase, textAlign:"center" }}>
        <span style={{ color: isValid ? "#22c55e" : "#ef4444", fontWeight:700 }}>{isValid ? "✓" : "✗"}</span>
      </td>
      <td style={{ ...tdBase, textAlign:"center", color: trans.linkedRefNo ? "#22c55e" : "#ef4444", fontWeight:700 }}>
        {trans.linkedRefNo
          ? <>✓ {trans.linkedRefNo}{trans.linkedFy ? <span style={{ color:"#64748b", fontWeight:600, fontSize:9, marginLeft:4 }}>({trans.linkedFy})</span> : ""}</>
          : "-"}
      </td>
      <td style={tdBase}>{trans.partyName || "-"}</td>
      <td style={{ ...tdBase, textAlign:"center" }}>
        {trans.linkedRefNo ? (
          <button onClick={() => onUnlink(trans)} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 8px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}>Unlink</button>
        ) : (
          <button onClick={() => onLink(trans)} style={{ background:"#38bdf8", border:"none", borderRadius:4, padding:"4px 8px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}>Link</button>
        )}
      </td>
    </>
  );
});

const PmtRightRow = React.memo(function PmtRightRow({ rec, linkedSlots, fmt, fmtDate, onLink, onUnlink }) {
  const sl = (n) => ({ padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", background: linkedSlots.includes(n) ? "#22c55e33" : "transparent" });
  const slR = (n) => ({ ...sl(n), textAlign:"right" });
 const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.partyName}</td>
      <td style={tdL}>{rec.billDate ? fmtDate(rec.billDate) : ""}</td>
      <td style={tdL}>{rec.billNo || ""}</td>
      <td style={tdR}>₹ {fmt(rec._finalAmt)}</td>
      <td style={slR(1)}>₹ {fmt(rec.bankAmt1)}</td>
      <td style={sl(1)}>{rec.bankDate1 ? fmtDate(rec.bankDate1) : ""}</td>
      <td style={sl(1)}>{rec.bankName1 || ""}</td>
      <td style={slR(2)}>₹ {fmt(rec.bankAmt2)}</td>
      <td style={sl(2)}>{rec.bankDate2 ? fmtDate(rec.bankDate2) : ""}</td>
      <td style={sl(2)}>{rec.bankName2 || ""}</td>
      <td style={slR(3)}>₹ {fmt(rec.bankAmt3)}</td>
      <td style={sl(3)}>{rec.bankDate3 ? fmtDate(rec.bankDate3) : ""}</td>
      <td style={sl(3)}>{rec.bankName3 || ""}</td>
      <td style={tdR}>₹ {fmt(rec._balance)}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
          <button onClick={() => onLink(rec)} style={{ background:"#38bdf8", border:"none", borderRadius:4, padding:"4px 8px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}>Link</button>
          {((parseFloat(rec.bankAmt1) || 0) > 0 || (parseFloat(rec.bankAmt2) || 0) > 0 || (parseFloat(rec.bankAmt3) || 0) > 0) && (
            <button onClick={() => onUnlink(rec)} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 8px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}>Unlink</button>
          )}
        </div>
      </td>
    </>
  );
});

const SalesRightRow = React.memo(function SalesRightRow({ rec, onLink, onUnlink }) {
const tdL = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
const tdR = { padding:"6px 6px", color:"#cbd5e1", textAlign:"right", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  const fmtD = (d) => { if (!d) return "-"; const p = d.split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
  const calculated = calculateSalesFields(rec);
  const balance = calculated.netAmt - (rec.bankPmt1 + rec.bankPmt2 + rec.bankPmt3);
  return (
    <>
      <td style={tdL}>{rec.refNo}</td>
      <td style={tdL}>{rec.date}</td>
      <td style={tdL}>{rec.partyName}</td>
     <td style={tdR}>₹{calculated.netAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
      <td style={tdL}>{fmtD(rec.bankDate1)}</td>
      <td style={tdR}>₹{(rec.bankPmt1 || 0).toLocaleString()}</td>
      <td style={{ ...tdL, color: rec.pmtId1 ? "#22c55e" : "#ef4444", fontWeight:600 }}>{rec.pmtId1 || "-"}</td>
      <td style={tdL}>{fmtD(rec.bankDate2)}</td>
      <td style={tdR}>₹{(rec.bankPmt2 || 0).toLocaleString()}</td>
      <td style={{ ...tdL, color: rec.pmtId2 ? "#22c55e" : "#ef4444", fontWeight:600 }}>{rec.pmtId2 || "-"}</td>
      <td style={tdL}>{fmtD(rec.bankDate3)}</td>
      <td style={tdR}>₹{(rec.bankPmt3 || 0).toLocaleString()}</td>
      <td style={{ ...tdL, color: rec.pmtId3 ? "#22c55e" : "#ef4444", fontWeight:600 }}>{rec.pmtId3 || "-"}</td>
      <td style={tdR}>₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
      <td style={tdR}>{calculated.days}</td>
      <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
        <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
          <button onClick={() => onLink(rec)} style={{ background:"#38bdf8", border:"none", borderRadius:4, padding:"4px 6px", color:"#fff", fontWeight:700, fontSize:9, cursor:"pointer" }}>Link</button>
          {(rec.pmtId1 || rec.pmtId2 || rec.pmtId3) && (
            <button onClick={() => onUnlink(rec)} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 6px", color:"#fff", fontWeight:700, fontSize:9, cursor:"pointer" }}>Unlink</button>
          )}
        </div>
      </td>
    </>
  );
});

const SALES_SUMMARY_COLS = [
  { key:"refNo",          label:"Ref No",       align:"left",  type:"text"  },
  { key:"date",           label:"Date",         align:"left",  type:"text"  },
  { key:"partyName",      label:"Party",        align:"left",  type:"text"  },
  { key:"broker",         label:"Broker",       align:"left",  type:"text"  },
  { key:"qty",            label:"Qty",          align:"right", type:"num"   },
  { key:"rate",           label:"Rate",         align:"right", type:"money" },
  { key:"shortage",       label:"Shortage",     align:"right", type:"num",   calc:true },
  { key:"shortageAmount", label:"Shortage Amt", align:"right", type:"money", calc:true },
  { key:"gunnyWeight",    label:"Gunny Wt",     align:"right", type:"num"   },
  { key:"gunnyAmount",    label:"Gunny Amt",    align:"right", type:"money", calc:true },
  { key:"claim",          label:"Claim",        align:"right", type:"money" },
  { key:"cd",             label:"CD",           align:"right", type:"money" },
  { key:"tdsReceived",    label:"TDS",          align:"right", type:"money" },
  { key:"netAmt",         label:"Net Amt",      align:"right", type:"money", calc:true },
  { key:"bankDate1",      label:"Bk Date 1",    align:"left",  type:"date"  },
  { key:"bankPmt1",       label:"Bk Pmt 1",     align:"right", type:"money" },
  { key:"bankDate2",      label:"Bk Date 2",    align:"left",  type:"date"  },
  { key:"bankPmt2",       label:"Bk Pmt 2",     align:"right", type:"money" },
  { key:"bankDate3",      label:"Bk Date 3",    align:"left",  type:"date"  },
  { key:"bankPmt3",       label:"Bk Pmt 3",     align:"right", type:"money" },
  { key:"pendingAmt",     label:"Pending",      align:"right", type:"money", calc:true },
  { key:"days",           label:"Days",         align:"right", type:"num",   calc:true },
];
const SALES_SUMMARY_TOTAL_KEYS = new Set(["tdsReceived","netAmt","bankPmt1","bankPmt2","bankPmt3","pendingAmt"]);

const salesColValue = (col, rec, calc) => col.calc ? calc[col.key] : rec[col.key];

const SalesSummaryRow = React.memo(function SalesSummaryRow({ rec, cols }) {
  const calc = calculateSalesFields(rec);
  const money = (v) => (v === 0 || v === "" || v == null) ? "" : "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const fmtIso = (d) => { if (!d) return ""; const p = String(d).split('-'); return (p.length === 3 && p[0].length === 4) ? `${p[2]}-${p[1]}-${p[0]}` : d; };
  const base = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", overflow:"hidden", textOverflow:"ellipsis" };
  return (
    <>
      {cols.map(col => {
        const v = salesColValue(col, rec, calc);
        let content;
        if (col.type === "money") content = money(v);
        else if (col.type === "num") content = (v === 0 || v === "" || v == null) ? "" : v;
        else if (col.type === "date") content = fmtIso(v);
        else content = v || "";
        return <td key={col.key} style={{ ...base, textAlign: col.align }}>{content}</td>;
      })}
    </>
  );
});

const EMPTY = {
  refNo:"", deliveryAt:"", truckNo:"", partyName:"", brokerName:"",
  billDate:"", billNo:"", rate:"", billQty:"", receiveQty:"",
  halfKgValue:"", gunnyWeight:"", cdPct:"", qualityClaim:"",
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

  // Keep the displayed text in sync with the committed value (e.g. on edit-load / clear)
  useEffect(() => { setQ(value || ""); }, [value]);

  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 10);
    return options.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 10);
  }, [q, options]);

  // Commit the typed text only if it exactly matches a list option (case-insensitive);
  // empty commits as "" (valid for optional fields); otherwise revert to last committed value.
  const commitOrRevert = () => {
    const typed = q.trim();
    if (typed === "") {
      if (value !== "") onChange({ target: { name, value: "" } });
      setQ("");
      return;
    }
    const match = options.find(o => o.toLowerCase() === typed.toLowerCase());
    if (match) {
      if (match !== value) onChange({ target: { name, value: match } });
      setQ(match); // snap to canonical spelling
    } else {
      setQ(value || ""); // revert — typed text was not a valid pick
    }
  };

  // Pick an option from the dropdown = commit
  const pick = (o) => {
    setQ(o);
    onChange({ target: { name, value: o } });
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        commitOrRevert();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); }}  // typing filters only — does NOT commit
        onFocus={() => setOpen(true)}
        onBlur={commitOrRevert}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commitOrRevert(); setOpen(false); }
          if (e.key === "Escape") { setQ(value || ""); setOpen(false); }
        }}
        placeholder={placeholder}
        style={style}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#1a2236", border:"1px solid #2a3a50", borderRadius:8, zIndex:1000, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.5)" }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => pick(o)}
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
 
  const sortedRecords = useMemo(() => {
    const parseRef = (ref) => {
      const s = (ref || "").trim();
      const m = s.match(/^(\d+)(.*)$/);
      if (m) return { num: parseInt(m[1], 10), suffix: m[2].toUpperCase() };
      return { num: Infinity, suffix: s.toUpperCase() }; // non-numeric refs sort to the end
    };
    return [...records].sort((a, b) => {
      const pa = parseRef(a.refNo), pb = parseRef(b.refNo);
      if (pa.num !== pb.num) return pa.num - pb.num;
      return pa.suffix.localeCompare(pb.suffix);
    });
  }, [records]);

const loadAtIndex = (idx) => {
    if (idx < 0 || idx >= sortedRecords.length) return;
    const rec = sortedRecords[idx];
    setHisabRec(rec);
    setHisabRef(rec.refNo);
    setHisabErr("");
  };

  const loadHisab = () => {
    const ref = hisabRef.trim();
    if (!ref) { setHisabErr("Please enter a Ref No"); return; }
    const idx = sortedRecords.findIndex(r => r.refNo.trim().toUpperCase() === ref.toUpperCase());
    if (idx === -1) { setHisabErr("Ref No not found!"); setHisabRec(null); return; }
    loadAtIndex(idx);
  };

  const currentIndex = hisabRec ? sortedRecords.findIndex(r => r.refNo === hisabRec.refNo) : -1;

  const c = hisabRec ? calcAll(hisabRec, hisabRec._tds || 0) : null;

  const h = (n) => n !== undefined && n !== null && !isNaN(n) ? Math.round(Number(n)).toString() : "0";
 const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
  const NUMERIC_TOTAL_KEYS = new Set(["_tds","_brokerageAmt","_finalAmt","_balance"]);
  const sumCol = (rows, k) => rows.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0);
  const PMT_TOTAL_KEYS = new Set(["_finalAmt","bankAmt1","bankAmt2","bankAmt3","_balance"]);
 
  const rh = (pt) => ({ height: Math.round(pt * 0.74)+"px" });
  const fs = (pt) => Math.round(pt * 0.72)+"px";

  const thin = "1px solid #000";
  const hair = "1px solid #aaa";
  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:200 };

  return (
    <div>
      <div className="hisab-controls" style={{ display:"flex", gap:12, marginBottom:28, alignItems:"center" }}>
        <input value={hisabRef} onChange={e => setHisabRef(e.target.value)} onKeyDown={e => e.key==="Enter" && loadHisab()}
          placeholder="Enter Ref No..." style={inp} />
        <button onClick={loadHisab} style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:8, padding:"10px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>Load</button>
        <button onClick={() => loadAtIndex(currentIndex - 1)} disabled={currentIndex <= 0}
          style={{ background: currentIndex <= 0 ? "#1e2a3a" : "#334155", border:"1px solid #2a3a50", borderRadius:8, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:14, cursor: currentIndex <= 0 ? "not-allowed" : "pointer" }}>◀</button>
        <button onClick={() => loadAtIndex(currentIndex + 1)} disabled={currentIndex === -1 || currentIndex >= sortedRecords.length - 1}
          style={{ background: (currentIndex === -1 || currentIndex >= sortedRecords.length - 1) ? "#1e2a3a" : "#334155", border:"1px solid #2a3a50", borderRadius:8, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:14, cursor: (currentIndex === -1 || currentIndex >= sortedRecords.length - 1) ? "not-allowed" : "pointer" }}>▶</button>
       {hisabRec && <button onClick={() => window.print()} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:8, padding:"10px 24px", color:"#38bdf8", fontWeight:700, fontSize:14, cursor:"pointer" }}>🖨 Print</button>}
        {hisabRec && <button onClick={() => {
          const clean = (s) => String(s || "").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
          const parts = [hisabRec.refNo, hisabRec.billNo, hisabRec.partyName, hisabRec.brokerName]
            .map(clean).filter(Boolean);
          const fileName = parts.join(" - ") || "hisab";
          const prevTitle = document.title;
          document.title = fileName;
          const restore = () => { document.title = prevTitle; window.removeEventListener("afterprint", restore); };
          window.addEventListener("afterprint", restore);
          window.print();
        }} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:8, padding:"10px 24px", color:"#22c55e", fontWeight:700, fontSize:14, cursor:"pointer" }}>📄 Save PDF</button>}
        {hisabErr && <span style={{ color:"#ef4444", fontWeight:600 }}>{hisabErr}</span>}
        {hisabRec && <span style={{ color:"#64748b", fontSize:12 }}>{currentIndex + 1} / {sortedRecords.length}</span>}
      </div>

      {hisabRec && c && (
        <div style={{ background:"#e0e0e0", padding:"30px", borderRadius:8 }}>
       <div id="hisab-print" style={{ background:"#fff", color:"#000", width:496, margin:"0 auto", fontFamily:"Arial,sans-serif" }}>
         <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
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
              <td colSpan={6} style={{ fontSize:fs(18), fontWeight:"bold", textAlign:"center", verticalAlign:"middle", padding:"2px 4px", borderTop:thin, borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#003d76" }}>I K ENTERPRISES</td>
            </tr>
            <tr style={rh(22.2)}>
              <td colSpan={6} style={{ fontSize:fs(10), fontWeight:"bold", textAlign:"center", verticalAlign:"middle", padding:"1px", letterSpacing:"1px", borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#003d76" }}>GENRAL MERCHANT AND COMMISION AGENT</td>
            </tr>
            <tr style={rh(21.6)}>
              <td colSpan={6} style={{ fontSize:fs(11), fontWeight:"bold", textAlign:"center", verticalAlign:"middle", padding:"1px 0 3px", borderLeft:thin, borderRight:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden", color:"#003d76" }}>18, NEW ANAJ MANDI,SANYOGITAGANJ, INDORE, 452001</td>
            </tr>
            <tr style={rh(43.2)}>
              <td colSpan={6} style={{ fontSize:fs(19), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"4px", borderTop:thin, borderBottom:thin, borderLeft:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.partyName || "—"}</td>
            </tr>
            <tr style={rh(36)}>
              <td colSpan={2} style={{ fontSize:fs(16), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>DELIVERY AT-</td>
              <td colSpan={4} style={{ fontSize:fs(18), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"middle", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.deliveryAt || "—"}</td>
            </tr>
            <tr style={rh(60)}>
             <td style={{ fontSize:fs(16), fontWeight:"bold", textAlign:"left", verticalAlign:"bottom", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderLeft:thin, borderRight:thin , whiteSpace:"normal", overflow:"hidden" }}>REF NO-{hisabRec.refNo}</td>
              <td style={{ fontSize:fs(16), textAlign:"right", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>BROKER-</td>
              <td colSpan={2} style={{ fontSize:fs(16), fontWeight:"bold", fontStyle:"italic", textAlign:"center", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"normal", overflow:"hidden" }}>{hisabRec.brokerName || "—"}</td>
              <td style={{ fontSize:fs(15), fontWeight:"bold",textAlign:"right", verticalAlign:"bottom", padding:"3px 4px", borderTop:thin, borderBottom:thin , whiteSpace:"nowrap", overflow:"hidden" }}>TRUCK NO.</td>
              <td style={{ fontSize:fs(14), fontWeight:"bold", textAlign:"left", verticalAlign:"bottom", padding:"3px 6px", borderTop:thin, borderBottom:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.truckNo || "—"}</td>
            </tr>
            <tr style={rh(24.6)}>
              <td style={{ fontSize:fs(15), fontWeight:"bold", textAlign:"left", padding:"2px 6px", borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>BILL NO.</td>
              <td style={{ fontSize:fs(15),fontWeight:"bold", textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>BILL DATE</td>
              <td colSpan={2} style={{ fontSize:fs(15),fontWeight:"bold", textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>QTY<em style={{ fontWeight:"bold" }}>(in Qts.)</em></td>
              <td style={{ fontSize:fs(15),fontWeight:"bold", textAlign:"left", padding:"2px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>RATE <em style={{ fontWeight:"bold" }}>(per Qt)</em></td>
              <td style={{ fontSize:fs(15),fontWeight:"bold", textAlign:"left", padding:"2px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>AMT</td>
            </tr>
            <tr style={rh(8)}>
              <td style={{ borderTop:thin, borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ borderTop:thin, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
           
            <tr style={rh(16)}>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"0px 6px", borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.billNo || "—"}</td>
              <td style={{ fontSize:fs(18), textAlign:"left", padding:"0px 4px", whiteSpace:"nowrap" }}>{fmtDate(hisabRec.billDate)}</td>
             <td style={{ fontSize:fs(20), textAlign:"right", padding:"0px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.billQty ? parseFloat(hisabRec.billQty).toFixed(2) : "—"}</td>
              <td colSpan={2} style={{ fontSize:fs(14), fontStyle:"italic", textAlign:"right", padding:"0px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>PARTY BILL AMT.</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"0px 6px", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.partyBillAmt)}</td>
            </tr>
            <tr style={rh(16)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", verticalAlign:"top", padding:"0px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.shortage > 0 ? (-c.shortage).toFixed(2) : ""}</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"0px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.shortage > 0 ? "SHTG" : ""}</td>
              <td colSpan={2} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
             </tr> 
            <tr style={rh(16)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"0px 4px", whiteSpace:"nowrap", overflow:"hidden" }}>{c.halfKgQty > 0 ? (-c.halfKgQty).toFixed(2) : ""}</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"0px 4px" , whiteSpace:"nowrap", overflow:"hidden" }}>{c.halfKgQty > 0 ? "("+parseFloat(hisabRec.halfKgValue||0)+" KG)" : ""}</td>
              <td colSpan={2} style={{ borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
           <tr style={rh(16)}>
              <td colSpan={2} style={{ borderLeft:thin, whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"0px 4px", whiteSpace:"nowrap", overflow:"hidden" }}>{c.gunnyDeduct > 0 ? (-c.gunnyDeduct).toFixed(3) : ""}</td>
              <td style={{ fontSize:fs(16), textAlign:"left", padding:"0px 4px", whiteSpace:"nowrap", overflow:"hidden" }}>{c.gunnyDeduct > 0 ? "GUNNY" : ""}</td>
              <td colSpan={2} style={{ borderRight:thin, whiteSpace:"nowrap", overflow:"hidden" }}></td>
            </tr>
            <tr style={rh(16)}>
              <td colSpan={2} style={{ borderLeft:thin , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"right", padding:"0px 4px", borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}>{c.netQty.toFixed(2)}</td>
              <td style={{ borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}></td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"0px 4px", borderTop:hair , whiteSpace:"nowrap", overflow:"hidden" }}>{hisabRec.rate ? Math.round(parseFloat(hisabRec.rate)) : "—"}</td>
              <td style={{ fontSize:fs(20), textAlign:"left", padding:"0px 6px", borderTop:hair, borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.netAmt1)}</td>
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
              <td colSpan={3} style={{ fontSize:fs(15), fontWeight:"bold", textAlign:"center", padding:"2px 4px", color:"#555", borderRight:thin , whiteSpace:"nowrap", overflow:"hidden" }}>
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
              <td style={{ fontSize:fs(20), fontWeight:"bold", textAlign:"left", padding:"4px 6px", borderTop:thin, borderBottom:thin, borderRight:thin, color: c.balance === 0 ? "#067647" : c.balance > 0 ? "#a90000" : "#067647" , whiteSpace:"nowrap", overflow:"hidden" }}>{h(c.balance)}</td>
            </tr>

            {hisabRec.note && <tr>
              <td colSpan={6} style={{ padding:"5px 6px", fontSize:fs(12), color:"#000000", fontStyle:"italic" , whiteSpace:"nowrap", overflow:"hidden" }}>Note: {hisabRec.note}</td>
            </tr>}

            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}

function PurchaseTDSTab({ records, fmt, partyPans, activeFY }) {
const fyStartYear = parseInt((activeFY || "2026-27").split("-")[0], 10); // e.g. 2026 from "2026-27"
  const FY_MONTHS = [
    { label: "April",     y: fyStartYear,     m: 4  },
    { label: "May",       y: fyStartYear,     m: 5  },
    { label: "June",      y: fyStartYear,     m: 6  },
    { label: "July",      y: fyStartYear,     m: 7  },
    { label: "August",    y: fyStartYear,     m: 8  },
    { label: "September", y: fyStartYear,     m: 9  },
    { label: "October",   y: fyStartYear,     m: 10 },
    { label: "November",  y: fyStartYear,     m: 11 },
    { label: "December",  y: fyStartYear,     m: 12 },
    { label: "January",   y: fyStartYear + 1, m: 1  },
    { label: "February",  y: fyStartYear + 1, m: 2  },
    { label: "March",     y: fyStartYear + 1, m: 3  },
  ];

  const [selectedMonth, setSelectedMonth] = useState("");
  const [summaryView, setSummaryView] = useState(false);

 const panInfoFor = (party) => (partyPans && partyPans[(party || "").trim()]) || { pan: "", verified: false };

  const parseBillNo = (bn) => {
    const s = String(bn || "").trim();
    const mm = s.match(/^(\d+)(.*)$/);
    return mm ? { num: parseInt(mm[1], 10), suf: mm[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
  };

  const monthBills = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split("-").map(Number);
    return records
      .filter(r => {
        const tds = parseFloat(r._tds) || 0;
        if (tds <= 0 || !r.billDate) return false;
        const d = new Date(r.billDate);
        return d.getFullYear() === y && (d.getMonth() + 1) === m;
      })
      .sort((a, b) => {
        const pa = (a.partyName || "").trim().toLowerCase();
        const pb = (b.partyName || "").trim().toLowerCase();
        if (pa !== pb) return pa.localeCompare(pb);
        if (a.billDate !== b.billDate) return a.billDate.localeCompare(b.billDate);
        const ba = parseBillNo(a.billNo), bb = parseBillNo(b.billNo);
        return ba.num !== bb.num ? ba.num - bb.num : ba.suf.localeCompare(bb.suf);
      });
  }, [records, selectedMonth]);

  const detailedRows = useMemo(() => {
    const rows = [];
    let curParty = null, subtotal = 0;
    const closeParty = () => { if (curParty !== null) rows.push({ type: "subtotal", partyName: curParty, tds: subtotal }); };
    monthBills.forEach(r => {
      const party = (r.partyName || "").trim();
      if (party !== curParty) { closeParty(); curParty = party; subtotal = 0; }
      const tds = parseFloat(r._tds) || 0;
      subtotal += tds;
      rows.push({ type: "bill", r, tds });
    });
    closeParty();
    return rows;
  }, [monthBills]);

  const summaryRows = useMemo(() => {
    const map = new Map();
    monthBills.forEach(r => {
      const party = (r.partyName || "").trim();
      map.set(party, (map.get(party) || 0) + (parseFloat(r._tds) || 0));
    });
    return [...map.entries()].map(([partyName, tds]) => ({ partyName, tds }));
  }, [monthBills]);

  const grandTotalTDS = monthBills.reduce((s, r) => s + (parseFloat(r._tds) || 0), 0);
  const monthLabel = FY_MONTHS.find(fm => `${fm.y}-${fm.m}` === selectedMonth)?.label || "";

  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", maxWidth:220 };
  const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
  const th = { padding:"10px 12px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const thR = { ...th, textAlign:"right" };
  const td = { padding:"8px 12px", color:"#cbd5e1", fontSize:12, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { ...td, textAlign:"right" };

  const printTable = () => {
    if (monthBills.length === 0) return;
    const w = window.open('', '', 'height=700,width=900');
    let html = `<style>
      @page { size: A4; margin: 10mm; }
      body { font-family: Arial, sans-serif; }
      h2 { font-size: 15px; margin: 0 0 10px; }
      table { width:100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #000; padding: 4px 8px; white-space: nowrap; }
      th { background: #eee; text-align: left; }
      .r { text-align: right; }
      .sub { font-weight: bold; background: #f5f5f5; }
      .grand { font-weight: bold; background: #ddd; }
      .miss { color: #b00; font-weight: bold; }
    </style>`;
    html += `<h2>PURCHASE TDS ${summaryView ? "SUMMARY" : "DETAIL"} — ${monthLabel}</h2>`;
    const panCell = (party) => {
      const { pan, verified } = panInfoFor(party);
      if (!pan) return `<span class="miss">PAN MISSING</span>`;
      return `${pan}${verified ? ' ✓ Verified' : ' (unverified)'}`;
    };
    if (summaryView) {
      html += `<table><thead><tr><th>Party Name</th><th>PAN</th><th class="r">TDS</th></tr></thead><tbody>`;
      summaryRows.forEach(row => {
        html += `<tr><td>${row.partyName}</td><td>${panCell(row.partyName)}</td><td class="r">₹${Math.round(row.tds).toLocaleString("en-IN")}</td></tr>`;
      });
      html += `<tr class="grand"><td colspan="2">GRAND TOTAL</td><td class="r">₹${Math.round(grandTotalTDS).toLocaleString("en-IN")}</td></tr></tbody></table>`;
    } else {
   html += `<table><thead><tr><th>Ref No</th><th>Bill No</th><th>Date</th><th>Party Name</th><th>PAN</th><th class="r">TDS</th></tr></thead><tbody>`;
      detailedRows.forEach(row => {
        if (row.type === "bill") {
          html += `<tr><td>${row.r.refNo || ""}</td><td>${row.r.billNo || ""}</td><td>${fmtDate(row.r.billDate)}</td><td>${row.r.partyName || ""}</td><td>${panCell(row.r.partyName)}</td><td class="r">₹${Math.round(row.tds).toLocaleString("en-IN")}</td></tr>`;
        } else {
          html += `<tr class="sub"><td colspan="5">SUBTOTAL — ${row.partyName}</td><td class="r">₹${Math.round(row.tds).toLocaleString("en-IN")}</td></tr>`;
        }
      });
      html += `<tr class="grand"><td colspan="5">GRAND TOTAL</td><td class="r">₹${Math.round(grandTotalTDS).toLocaleString("en-IN")}</td></tr></tbody></table>`;
    }
    w.document.write(html); w.document.close(); w.print();
  };



  const exportSummaryCSV = () => {
    if (summaryRows.length === 0) return;

    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [];
    lines.push(["Party Name", "PAN", "TDS"].map(esc).join(","));

    summaryRows.forEach(row => {
      const pan = panInfoFor(row.partyName).pan || "PAN MISSING";
      lines.push([row.partyName, pan, Math.round(row.tds)].map(esc).join(","));
    });

    lines.push(["GRAND TOTAL", "", Math.round(grandTotalTDS)].map(esc).join(","));

    const csv = lines.join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Purchase_TDS_Summary_${monthLabel || "month"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const PanText = ({ party }) => {
    const { pan, verified } = panInfoFor(party);
    if (!pan) return <span style={{ color:"#ef4444", fontWeight:700 }}>⚠ PAN MISSING</span>;
    return (
      <span>
        {pan}{" "}
        {verified
          ? <span style={{ color:"#22c55e", fontWeight:700 }}>✓ Verified</span>
          : <span style={{ color:"#f59e0b", fontWeight:600 }}>(unverified)</span>}
      </span>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
        <select style={inp} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="">— Select Month —</option>
          {FY_MONTHS.map(fm => <option key={`${fm.y}-${fm.m}`} value={`${fm.y}-${fm.m}`}>{fm.label}</option>)}
        </select>

        <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, color:"#cbd5e1", background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"8px 12px" }}>
          <input type="checkbox" checked={summaryView} onChange={e => setSummaryView(e.target.checked)} style={{ cursor:"pointer", width:15, height:15 }} />
          Summary view
        </label>

    {selectedMonth && monthBills.length > 0 && (
          <>
            <button onClick={printTable} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              🖨️ Print
            </button>
            {summaryView && (
              <button onClick={exportSummaryCSV} style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                ⬇️ Export CSV
              </button>
            )}
          </>
        )}
      </div>

      {!selectedMonth ? (
        <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>Select a month to view its TDS entries.</div>
      ) : monthBills.length === 0 ? (
        <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>No TDS entries for {monthLabel}.</div>
      ) : (
        <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            {summaryView ? (
              <>
                <thead>
                  <tr style={{ background:"#151b2a" }}>
                    <th style={th}>Party Name</th>
                    <th style={th}>PAN</th>
                    <th style={{ ...thR, borderRight:"none" }}>TDS</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row, i) => (
                    <tr key={row.partyName} style={{ borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }}>
                      <td style={td}>{row.partyName}</td>
                      <td style={td}><PanText party={row.partyName} /></td>
                      <td style={{ ...tdR, borderRight:"none", color:"#f59e0b", fontWeight:700 }}>₹{fmt(Math.round(row.tds))}</td>
                    </tr>
                  ))}
                  <tr style={{ background:"#151b2a", borderTop:"2px solid #f59e0b" }}>
                    <td colSpan={2} style={{ ...td, fontWeight:700, color:"#f59e0b" }}>GRAND TOTAL</td>
                    <td style={{ ...tdR, borderRight:"none", fontWeight:800, color:"#f59e0b" }}>₹{fmt(Math.round(grandTotalTDS))}</td>
                  </tr>
                </tbody>
              </>
            ) : (
              <>
          <thead>
                  <tr style={{ background:"#151b2a" }}>
                    <th style={th}>Ref No</th>
                    <th style={th}>Bill No</th>
                    <th style={th}>Date</th>
                    <th style={th}>Party Name</th>
                    <th style={th}>PAN</th>
                    <th style={{ ...thR, borderRight:"none" }}>TDS</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.map((row) => (
                    row.type === "bill" ? (
                    <tr key={`bill-${row.r.refNo}`} style={{ borderBottom:"1px solid #1e2a3a", background:"#0f1117" }}>
                        <td style={td}>{row.r.refNo}</td>
                        <td style={td}>{row.r.billNo}</td>
                        <td style={td}>{fmtDate(row.r.billDate)}</td>
                        <td style={td}>{row.r.partyName}</td>
                        <td style={td}><PanText party={row.r.partyName} /></td>
                        <td style={{ ...tdR, borderRight:"none" }}>₹{fmt(Math.round(row.tds))}</td>
                      </tr>
                    ) : (
                      <tr key={`sub-${row.partyName}`} style={{ background:"#1a2236", borderBottom:"2px solid #1e2a3a" }}>
                        <td colSpan={5} style={{ ...td, fontWeight:700, color:"#94a3b8" }}>SUBTOTAL — {row.partyName}</td>
                        <td style={{ ...tdR, borderRight:"none", fontWeight:700, color:"#22c55e" }}>₹{fmt(Math.round(row.tds))}</td>
                      </tr>
                    )
                  ))}
                  <tr style={{ background:"#151b2a", borderTop:"2px solid #f59e0b" }}>
                    <td colSpan={5} style={{ ...td, fontWeight:700, color:"#f59e0b" }}>GRAND TOTAL</td>
                    <td style={{ ...tdR, borderRight:"none", fontWeight:800, color:"#f59e0b" }}>₹{fmt(Math.round(grandTotalTDS))}</td>
                  </tr>
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function RenamePartyTab({ records, setRecords, salesWorkingData, setSalesWorkingData, parties, setParties, calcTDS, calcAll, showToast, claimRules, activeFY }) {
  const [mode, setMode] = useState("purchase"); // "purchase" or "sales"
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%" };
  const lbl = { fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:5 };

  // Source options depend on mode
 const sourceOptions = useMemo(() => {
    if (mode === "purchase") {
      return [...new Set(records.map(r => r.partyName).filter(Boolean))].sort();
    } else {
      const fromPurchases = records.map(r => r.deliveryAt).filter(Boolean);
      const fromWorking = salesWorkingData.map(s => s.partyName).filter(Boolean);
      return [...new Set([...fromPurchases, ...fromWorking])].sort();
    }
  }, [mode, records, salesWorkingData]);

  // Impact counts (computed from in-memory data — fast, no DB round-trip for preview)
const impact = useMemo(() => {
    if (!source) return null;
    if (mode === "purchase") {
      const purchaseCount = records.filter(r => r.partyName === source).length;
      const targetExists = !!target && records.some(r => r.partyName === target);
      return { purchaseCount, targetExists };
    } else {
      const purchaseCount = records.filter(r => r.deliveryAt === source).length;
      const workingCount = salesWorkingData.filter(s => s.partyName === source).length;
      const targetExists = !!target && (records.some(r => r.deliveryAt === target) || salesWorkingData.some(s => s.partyName === target));
      return { purchaseCount, workingCount, targetExists };
    }
  }, [mode, source, target, records, salesWorkingData]);

  const handleRename = async () => {
    const src = source.trim();
    const tgt = target.trim();
    if (!src) { showToast("Select a source party", "error"); return; }
    if (!tgt) { showToast("Enter a target name", "error"); return; }
    if (src === tgt) { showToast("Source and target are the same", "error"); return; }

    if (mode === "purchase") {
      const merging = records.some(r => r.partyName === tgt);
      const msg = merging
        ? `MERGE: "${src}" into existing party "${tgt}".\n\nAll purchase bills of "${src}" will move to "${tgt}", and TDS for "${tgt}" will be recomputed across the combined bills.\n\nProceed?`
        : `RENAME purchase party "${src}" → "${tgt}".\n\nAll its purchase bills move to the new name and TDS is recomputed.\n\nProceed?`;
      if (!confirm(msg)) return;

      setBusy(true);
      // 1. Bulk rename in Supabase
      const ok = await renamePurchaseParty(src, tgt);
      if (!ok) { setBusy(false); showToast("Failed to rename — check connection", "error"); return; }

      // 2. Update Manage parties list: remove old; add new if not present
      if (parties.includes(src)) await deleteParty(src);
      if (!parties.includes(tgt)) await addParty(tgt);

      // 3. Reload records fresh from DB so state matches
      const fresh = await loadRecords();

      // 4. Recompute TDS for the target party's bills against the unified set
      const targetBills = fresh.filter(r => r.partyName === tgt);
      for (const bill of targetBills) {
        const tds = bill.partyName ? calcTDS(bill, fresh) : 0;
        const cdRule = claimRules.find(r => r.partyName === bill.deliveryAt)?.cdRule || "standard";
        const c = calcAll(bill, tds, cdRule);
        const rec = { ...bill, _tds: tds, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt, _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance };
        const ok = await upsertRecord(rec, activeFY);
        const idx = fresh.findIndex(r => r.refNo === rec.refNo);
        if (idx >= 0) fresh[idx] = rec;
      }

      // 5. Sync state
      setRecords(fresh);
      setParties(prev => {
        const without = prev.filter(p => p !== src);
        return without.includes(tgt) ? without : [...without, tgt].sort();
      });

      setBusy(false);
      setSource(""); setTarget("");
      showToast(`Purchase party renamed → "${tgt}" (${targetBills.length} bills, TDS recomputed)`);
    } else {
      // SALES mode — rename deliveryAt + sales_working partyName + claim_rules party
      const targetExists = records.some(r => r.deliveryAt === tgt);
      if (targetExists) {
        if (!confirm(`WARNING: "${tgt}" already exists as a sales party. This will MERGE them. Are you sure?`)) return;
      } else {
        if (!confirm(`RENAME sales party "${src}" → "${tgt}" across purchases, sales working, and claim rules.\n\nProceed?`)) return;
      }

      setBusy(true);
      const ok1 = await renamePurchaseDeliveryAt(src, tgt);
      const ok2 = await renameSalesWorkingParty(src, tgt);
      const ok3 = await renameClaimRuleParty(src, tgt);
      if (!ok1 || !ok2 || !ok3) { setBusy(false); showToast("Partial failure — check connection and console", "error"); return; }

      // Reload affected data to sync state
      const freshRecords = await loadRecords();
      const freshWorking = await loadSalesWorking();
      setRecords(freshRecords);
      setSalesWorkingData(freshWorking);

      setBusy(false);
      setSource(""); setTarget("");
      showToast(`Sales party renamed "${src}" → "${tgt}"`);
    }
  };

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["purchase", "sales"].map(m => (
          <button key={m} onClick={() => { setMode(m); setSource(""); setTarget(""); }}
            style={{ padding:"8px 18px", borderRadius:8, border:"none",
              background: mode === m ? "#3b82f6" : "#1e2a3a",
              color: mode === m ? "#fff" : "#94a3b8", fontWeight:700, cursor:"pointer", fontSize:13 }}>
            {m === "purchase" ? "Purchase Party (TDS)" : "Sales Party (Delivery At)"}
          </button>
        ))}
      </div>

      <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"20px 22px", maxWidth:640 }}>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>
          {mode === "purchase"
            ? "Rename or merge a PURCHASE party. Updates all purchase records and recomputes TDS for the target party."
            : "Rename a SALES party (Delivery At). Updates purchases, sales working, and claim rules."}
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Source party (current name)</label>
          <input list="renameSourceList" value={source} onChange={e => setSource(e.target.value)} placeholder="Select existing party..." style={inp} />
          <datalist id="renameSourceList">
            {sourceOptions.map(o => <option key={o} value={o} />)}
          </datalist>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Target name (corrected name)</label>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Type the correct name..." style={inp} />
        </div>

        {impact && (
          <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:12, color:"#cbd5e1" }}>
            <div><strong>{impact.purchaseCount}</strong> purchase record(s) use "{source}".</div>
            {mode === "purchase" && impact.targetExists && (
              <div style={{ color:"#f59e0b", marginTop:6, fontWeight:600 }}>⚠️ "{target}" already exists — this will MERGE the two parties and recompute their combined TDS.</div>
            )}
            {mode === "sales" && impact.targetExists && (
              <div style={{ color:"#ef4444", marginTop:6, fontWeight:600 }}>⚠️ "{target}" already exists as a sales party — proceeding will merge them.</div>
            )}
          </div>
        )}

        <button onClick={handleRename} disabled={busy}
          style={{ background: busy ? "#64748b" : "#22c55e", border:"none", borderRadius:8, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Working..." : (mode === "purchase" ? "Rename / Merge Purchase Party" : "Rename Sales Party")}
        </button>
      </div>
    </div>
  );
}

function ExternalSourcePurchaseTab({ records, setRecords, calcTDS, calcAll, purchaseFlashData, setPurchaseFlashData, showToast, parties, setParties, brokers, setBrokers, addBroker, salesWorkingData, setSalesWorkingData, claimRules, activeFY }) {
  const [subTab, setSubTab] = useState("excel");
  const [status, setStatus] = useState("");
  const [renameMode, setRenameMode] = useState("purchase"); // "purchase" or "sales"
  const [renameSource, setRenameSource] = useState("");
  const [renameTarget, setRenameTarget] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%" };

  const parsePurchaseData = (pastedText) => {
    const lines = pastedText.trim().split('\n');
    const out = [];

    const num = (s) => {
      const t = (s || "").trim();
      if (t === "" || t === "0") return "";
      return t;
    };
    const text0 = (s) => {
      const t = (s || "").trim();
      return t === "0" ? "" : t;
    };
    const date = (s) => {
      const t = (s || "").trim();
      if (t === "" || t === "0") return "";
      if (/^0?0-0?1-1900$/.test(t)) return "";
      const parts = t.split('-');
      if (parts.length === 3 && parts[2].length === 4) {
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
      }
      return t;
    };

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toUpperCase().includes('REF NO')) return;
      const c = line.split('\t');
      if (c.length < 27) return;

      out.push({
        refNo: (c[0] || "").trim(),
        deliveryAt: (c[1] || "").trim(),
        truckNo: (c[2] || "").trim(),
        partyName: text0(c[3]),
        brokerName: text0(c[4]),
        billDate: date(c[5]),
        billNo: (c[6] || "").trim(),
        rate: num(c[7]),
        billQty: num(c[8]),
        receiveQty: num(c[9]),
        halfKgValue: num(c[10]),
        cdPct: num(c[11]),
        qualityClaim: num(c[12]),
        hammali: num(c[13]),
        freight: num(c[14]),
        others: num(c[15]),
        brokerageAmt: num(c[16]),
        bankAmt1: num(c[17]), bankDate1: date(c[18]), bankName1: text0(c[19]),
        bankAmt2: num(c[20]), bankDate2: date(c[21]), bankName2: text0(c[22]),
        bankAmt3: num(c[23]), bankDate3: date(c[24]), bankName3: text0(c[25]),
        note: text0(c[26]),
        brokerageRate: "", tcs: "", refA: "", refB: ""
      });
    });

    return out;
  };

  const handleImport = async () => {
    const pasted = prompt("Paste Excel purchase data (with header row):");
    if (!pasted) return;

  const parsed = parsePurchaseData(pasted);
    if (parsed.length === 0) {
      setStatus("❌ Invalid format — check column order / tabs.");
      return;
    }

    // Reject import if any bill date falls outside the active FY
    const fyStartYear = parseInt(activeFY.split("-")[0], 10);
    const fyMin = `${fyStartYear}-04-01`;
    const fyMax = `${fyStartYear + 1}-03-31`;
    const outOfRange = parsed.filter(r => r.billDate && (r.billDate < fyMin || r.billDate > fyMax));
    if (outOfRange.length > 0) {
      const sample = outOfRange.slice(0, 3).map(r => `${r.refNo || "?"} (${r.billDate})`).join(", ");
      setStatus(`❌ Import cancelled: ${outOfRange.length} row(s) have dates outside FY ${activeFY}. e.g. ${sample}`);
      return;
    }

    setStatus(`⏳ Importing ${parsed.length} rows...`);

    // Build the complete dataset (existing + imported, imported overwriting by refNo)
    const merged = [...records];
    parsed.forEach(p => {
      const i = merged.findIndex(r => r.refNo.trim().toUpperCase() === p.refNo.trim().toUpperCase());
      if (i >= 0) merged[i] = p; else merged.push(p);
    });

    // Compute TDS + calcAll for each imported row against the COMPLETE set
    let saved = 0;
    const finalRecords = [...merged];
    for (const p of parsed) {
     const tds = p.partyName ? calcTDS(p, merged) : 0;
const cdRule = claimRules.find(r => r.partyName === p.deliveryAt)?.cdRule || "standard";
const c = calcAll(p, tds, cdRule);
      const record = {
        ...p,
        _tds: tds, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty,
        _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt,
        _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance
      };
      const ok = await upsertRecord(record, activeFY);
      if (ok) {
        saved++;
        const i = finalRecords.findIndex(r => r.refNo.trim().toUpperCase() === record.refNo.trim().toUpperCase());
        if (i >= 0) finalRecords[i] = record;
      }
    }

 // Recompute all bills of every party touched by this import (back-dated safety)
    const affected = [...new Set(parsed.map(p => p.partyName).filter(Boolean))];
    const { ok: recOk, records: recomputed } = await recomputePartiesTDS(affected, finalRecords, claimRules, "all", activeFY);
    setRecords(recomputed);
    setStatus(recOk
      ? `✅ Imported ${saved} of ${parsed.length} rows. TDS recomputed for ${affected.length} party(ies).`
      : `⚠️ Imported ${saved}, but TDS recompute failed — check connection.`);
  };

 const parseFlashPurchase = (pastedText) => {
    const lines = pastedText.trim().split('\n');
    const out = [];

    const num = (s) => {
      const t = (s || "").trim();
      if (t === "" || t === "0") return "";
      return t;
    };
    const text0 = (s) => {
      const t = (s || "").trim();
      return t === "0" ? "" : t;
    };
    const date = (s) => {
      const t = (s || "").trim();
      if (t === "" || t === "0") return "";
      if (/^0?0-0?1-1900$/.test(t)) return "";
      const parts = t.split('-');
      if (parts.length === 3 && parts[2].length === 4) {
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
      }
      return t;
    };

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toUpperCase().includes('REF NO')) return;
      const c = line.split('\t');
      if (c.length < 9) return;

      out.push({
        refNo: (c[0] || "").trim(),
        deliveryAt: (c[1] || "").trim(),
        truckNo: (c[2] || "").trim(),
        partyName: text0(c[3]),
        brokerName: text0(c[4]),
        billDate: date(c[5]),
        billNo: (c[6] || "").trim(),
        rate: num(c[7]),
        billQty: num(c[8])
      });
    });

    return out;
  };

  const handleFlashImport = async () => {
    const pasted = prompt("Paste Flash purchase data (with header row):");
    if (!pasted) return;

    const parsed = parseFlashPurchase(pasted);
    if (parsed.length === 0) {
      setStatus("❌ Invalid format — check column order / tabs.");
      return;
    }

    setStatus(`⏳ Importing ${parsed.length} Flash rows...`);
    const ok = await replacePurchaseFlash(parsed, activeFY);
    if (!ok) { setStatus("❌ Failed to save Flash data — check connection."); return; }

setPurchaseFlashData(parsed);

   // Auto-absorb new purchase party names into Manage parties list
    const flashParties = [...new Set(parsed.map(r => r.partyName).filter(Boolean))];
    const newParties = flashParties.filter(p => !parties.includes(p));
    for (const p of newParties) {
      await addParty(p);
    }
    if (newParties.length > 0) {
      setParties(prev => [...new Set([...prev, ...newParties])].sort());
    }
  
    // Auto-absorb new broker names into Manage brokers list
const flashBrokers = [...new Set(parsed.map(r => r.brokerName).filter(Boolean))];
const newBrokers = flashBrokers.filter(b => !brokers.includes(b));
for (const b of newBrokers) {
  await addBroker(b);
}
if (newBrokers.length > 0) {
  setBrokers(prev => [...new Set([...prev, ...newBrokers])].sort());
}


    setStatus(`✅ Flash imported: ${parsed.length} rows. ${newParties.length} new parties, ${newBrokers.length} new brokers added to Manage.`); 
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>📥 EXTERNAL SOURCE PURCHASE</h2>

     <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {["excel", "flash", "rename"].map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            style={{ padding:"10px 20px", borderRadius:8, border:"none",
              background: subTab === t ? "#f59e0b" : "#1e2a3a",
              color: subTab === t ? "#0f1117" : "#94a3b8", fontWeight:700, cursor:"pointer" }}>
            {t === "excel" ? "📊 Excel" : t === "flash" ? "⚡ Flash" : "✏️ Rename Party"}
          </button>
        ))}
      </div>

      {subTab === "excel" && (
        <div>
          <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
            <button onClick={handleImport}
              style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}>
              📋 Paste Excel Data
            </button>
            {status && <span style={{ fontSize:13, color:"#cbd5e1", fontWeight:600 }}>{status}</span>}
          </div>
          <div style={{ background:"#151b2a", padding:"16px", borderRadius:8, border:"1px solid #1e2a3a", fontSize:12, color:"#64748b", lineHeight:1.6 }}>
            <p style={{ marginBottom:8 }}><strong>Expected columns (in order):</strong></p>
            <p>Ref No, Delivery At, Truck No, Party Name, Broker Name, Bill Date, Bill No, Rate, Bill Qty, Receive Qty, 0.5KG Value, CD%, Quality Claim, Hammali, Freight, Others, Brokerage Amount, Bank 1 Amount/Date/Name, Bank 2 Amount/Date/Name, Bank 3 Amount/Date/Name, Note</p>
            <p style={{ marginTop:8 }}>Final Amount and Balance are calculated automatically — do not include them. Dates DD-MM-YYYY. Zeros and 00-01-1900 dates import as blank.</p>
          </div>
        </div>
      )}

     {subTab === "flash" && (
        <div>
          <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
            <button onClick={handleFlashImport}
              style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}>
              📋 Paste Flash Data
            </button>
            <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>
              Flash rows: <span style={{ color:"#f59e0b" }}>{purchaseFlashData.length}</span>
            </div>
            {status && <span style={{ fontSize:13, color:"#cbd5e1", fontWeight:600 }}>{status}</span>}
          </div>
            {(() => {
            // Data is unique on refNo (your discipline) — build a Map for O(1) lookup
            const dataByRef = new Map(records.map(r => [r.refNo.trim().toUpperCase(), r]));
            const flashRefSet = new Set(purchaseFlashData.map(f => f.refNo.trim().toUpperCase()));

            const presentBoth = [];
            const partyMismatch = [];
            const inFlashNotData = [];
            purchaseFlashData.forEach(f => {
              const key = f.refNo.trim().toUpperCase();
              const d = dataByRef.get(key);
              if (!d) { inFlashNotData.push(f); return; }
              if ((d.partyName || "").trim() === (f.partyName || "").trim()) presentBoth.push({ flash: f, data: d });
              else partyMismatch.push({ flash: f, data: d });
            });
            const inDataNotFlash = records.filter(r => !flashRefSet.has(r.refNo.trim().toUpperCase()));

            const th = { padding:"8px 6px", textAlign:"left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", fontSize:10 };
            const td = { padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a", fontSize:10 };
            const secBox = { marginBottom:30 };
            const secHead = { fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:12 };

            // ---- ACTION: Update Data from Flash (pull 9 fields, keep worked values, recompute) ----
            const handleUpdate = async (flash, data) => {
              const updated = {
                ...data,
                deliveryAt: flash.deliveryAt,
                truckNo: flash.truckNo,
                partyName: flash.partyName,
                brokerName: flash.brokerName,
                billDate: flash.billDate,
                billNo: flash.billNo,
                rate: flash.rate,
                billQty: flash.billQty
              };
           const tds = updated.partyName ? calcTDS(updated, records) : 0;
              const cdRule = claimRules.find(r => r.partyName === updated.deliveryAt)?.cdRule || "standard";
              const c = calcAll(updated, tds, cdRule);
              const record = { ...updated, _tds: tds, _cdRule: cdRule, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt, _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance };
              const fyStartYear = parseInt(activeFY.split("-")[0], 10);
              const fyMin = `${fyStartYear}-04-01`;
              const fyMax = `${fyStartYear + 1}-03-31`;
              if (record.billDate && (record.billDate < fyMin || record.billDate > fyMax)) {
                showToast(`Cannot update: bill date ${record.billDate} is outside FY ${activeFY}`, "error");
                return;
              }
              const ok = await upsertRecord(record, activeFY);
              if (!ok) { showToast("Failed to update — check connection", "error"); return; }
              const mergedUpd = records.map(r => r.refNo === data.refNo ? record : r);
              const { ok: recOk, records: newRecs } = await recomputePartiesTDS([record.partyName], mergedUpd, claimRules, "changed", activeFY);
              if (!recOk) showToast("Updated, but TDS refresh failed — check connection", "error");
              setRecords(newRecs);
              showToast(`Updated Ref No ${data.refNo} from Flash`);
            };

            // ---- ACTION: Add Flash row into Data ----
            const handleAdd = async (flash) => {
              if (!confirm(`Add Ref No ${flash.refNo} to Data?`)) return;
              const base = {
                refNo: flash.refNo, deliveryAt: flash.deliveryAt, truckNo: flash.truckNo,
                partyName: flash.partyName, brokerName: flash.brokerName,
                billDate: flash.billDate, billNo: flash.billNo,
                rate: flash.rate, billQty: flash.billQty,
                receiveQty:"", halfKgValue:"", cdPct:"", qualityClaim:"", hammali:"", freight:"", others:"",
                brokerageRate:"", brokerageAmt:"", tcs:"", note:"",
                bankAmt1:"", bankDate1:"", bankName1:"", bankAmt2:"", bankDate2:"", bankName2:"", bankAmt3:"", bankDate3:"", bankName3:"",
                refA:"", refB:""
              };
              const tds = base.partyName ? calcTDS(base, records) : 0;
              const cdRule = claimRules.find(r => r.partyName === base.deliveryAt)?.cdRule || "standard";
               const c = calcAll(base, tds, cdRule);
              const record = { ...base, _tds: tds, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt, _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance };
              const fyStartYear = parseInt(activeFY.split("-")[0], 10);
              const fyMin = `${fyStartYear}-04-01`;
              const fyMax = `${fyStartYear + 1}-03-31`;
              if (record.billDate && (record.billDate < fyMin || record.billDate > fyMax)) {
                showToast(`Cannot add: bill date ${record.billDate} is outside FY ${activeFY}`, "error");
                return;
              }
              const ok = await upsertRecord(record, activeFY);
              if (!ok) { showToast("Failed to add — check connection", "error"); return; }
              const mergedAdd = [...records, record];
              const { ok: recOk, records: newRecs } = await recomputePartiesTDS([record.partyName], mergedAdd, claimRules, "changed", activeFY);
              if (!recOk) showToast("Added, but TDS refresh failed — check connection", "error");
              setRecords(newRecs);
              showToast(`Ref No ${flash.refNo} added to Data`);
            };

            // ---- ACTION: Remove Data row ----
            const handleRemove = async (data) => {
              if (!confirm(`Remove Ref No ${data.refNo} from Data? (Not in Flash)`)) return;
              const ok = await deleteRecord(data.refNo, activeFY);
              if (!ok) { showToast("Failed to remove — check connection", "error"); return; }
              setRecords(prev => prev.filter(r => r.refNo !== data.refNo));
              showToast(`Ref No ${data.refNo} removed from Data`);
            };

            const printList = (title, rows, cols) => {
              const w = window.open('', '', 'height=600,width=900');
              let html = `<h2>${title}</h2><table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f0f0">`;
              cols.forEach(c => html += `<th>${c.label}</th>`);
              html += `<th>Notes</th></tr></thead><tbody>`;
              rows.forEach(r => {
                html += '<tr>';
                cols.forEach(c => html += `<td>${r[c.key] ?? ""}</td>`);
                html += '<td style="height:40px"></td></tr>';
              });
              html += `</tbody></table><p>Total: ${rows.length}</p>`;
              w.document.write(html); w.document.close(); w.print();
            };

            return (
              <div>
                {/* SUMMARY */}
                <div style={{ display:"flex", gap:16, marginBottom:24, flexWrap:"wrap" }}>
                  {[
                    { label:"Flash rows", val:purchaseFlashData.length, color:"#f59e0b" },
                    { label:"Present in both", val:presentBoth.length, color:"#22c55e" },
                    { label:"Party mismatch", val:partyMismatch.length, color:"#f59e0b" },
                    { label:"In Flash, not Data", val:inFlashNotData.length, color:"#38bdf8" },
                    { label:"In Data, not Flash", val:inDataNotFlash.length, color:"#ef4444" },
                  ].map(s => (
                    <div key={s.label} style={{ flex:1, minWidth:140, background:"#151b2a", borderRadius:8, padding:16, border:"1px solid #1e2a3a" }}>
                      <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* SECTION 1: PRESENT IN BOTH */}
                <div style={secBox}>
                  <div style={secHead}>✅ Present in Both (refNo & party match)</div>
                  {presentBoth.length === 0 ? (
                    <div style={{ padding:16, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>None</div>
                  ) : (
                    <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto", maxHeight:400, overflowY:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                          <th style={th}>Ref No</th><th style={th}>Party</th>
                          <th style={th}>Flash Rate</th><th style={th}>Data Rate</th>
                          <th style={th}>Flash Qty</th><th style={th}>Data Qty</th>
                          <th style={th}>Flash Bill No</th><th style={th}>Data Bill No</th>
                          <th style={{ ...th, textAlign:"center" }}>Action</th>
                        </tr></thead>
                        <tbody>
                          {presentBoth.map(({ flash, data }) => (
                            <tr key={`pb-${data.refNo}`} style={{ borderBottom:"1px solid #1e2a3a" }}>
                              <td style={{ ...td, fontWeight:600 }}>{flash.refNo}</td>
                              <td style={td}>{flash.partyName}</td>
                              <td style={td}>₹{flash.rate}</td><td style={td}>₹{data.rate}</td>
                              <td style={td}>{flash.billQty}</td><td style={td}>{data.billQty}</td>
                              <td style={td}>{flash.billNo}</td><td style={td}>{data.billNo}</td>
                              <td style={{ ...td, textAlign:"center" }}>
                                <button onClick={() => handleUpdate(flash, data)} style={{ background:"#3b82f6", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>🔄 Update</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION 2: PARTY MISMATCH */}
                <div style={secBox}>
                  <div style={secHead}>⚠️ Party Mismatch (refNo matches, party differs)</div>
                  {partyMismatch.length === 0 ? (
                    <div style={{ padding:16, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>None</div>
                  ) : (
                    <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto", maxHeight:400, overflowY:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                          <th style={th}>Ref No</th><th style={th}>Data Party (current)</th><th style={th}>Flash Party (new)</th>
                          <th style={{ ...th, textAlign:"center" }}>Action</th>
                        </tr></thead>
                        <tbody>
                          {partyMismatch.map(({ flash, data }) => (
                            <tr key={`pm-${data.refNo}`} style={{ borderBottom:"1px solid #1e2a3a" }}>
                              <td style={{ ...td, fontWeight:600 }}>{flash.refNo}</td>
                              <td style={{ ...td, background:"#f5950b22", color:"#f59e0b", fontWeight:600 }}>{data.partyName}</td>
                              <td style={{ ...td, color:"#22c55e" }}>{flash.partyName}</td>
                              <td style={{ ...td, textAlign:"center" }}>
                                <button onClick={() => handleUpdate(flash, data)} style={{ background:"#3b82f6", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>🔄 Update Party</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION 3: IN FLASH, NOT IN DATA */}
                <div style={secBox}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={secHead}>➕ In Flash, not in Data (Add these)</div>
                    {inFlashNotData.length > 0 && (
                      <button onClick={() => printList("IN FLASH, NOT IN DATA", inFlashNotData, [
                        { key:"refNo", label:"Ref No" }, { key:"partyName", label:"Party" }, { key:"deliveryAt", label:"Delivery At" },
                        { key:"billDate", label:"Bill Date" }, { key:"billNo", label:"Bill No" }, { key:"rate", label:"Rate" }, { key:"billQty", label:"Qty" }
                      ])} style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"8px 16px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>🖨️ Print</button>
                    )}
                  </div>
                  {inFlashNotData.length === 0 ? (
                    <div style={{ padding:16, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>None</div>
                  ) : (
                    <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto", maxHeight:400, overflowY:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                          <th style={th}>Ref No</th><th style={th}>Party</th><th style={th}>Delivery At</th>
                          <th style={th}>Bill Date</th><th style={th}>Bill No</th><th style={th}>Rate</th><th style={th}>Qty</th>
                          <th style={{ ...th, textAlign:"center" }}>Action</th>
                        </tr></thead>
                        <tbody>
                          {inFlashNotData.map((f, i) => (
                            <tr key={`fnd-${f.refNo}-${i}`} style={{ borderBottom:"1px solid #1e2a3a" }}>
                              <td style={{ ...td, fontWeight:600 }}>{f.refNo}</td>
                              <td style={{ ...td, color: f.partyName ? "#cbd5e1" : "#ef4444" }}>{f.partyName || "(blank)"}</td>
                              <td style={td}>{f.deliveryAt}</td><td style={td}>{f.billDate}</td>
                              <td style={td}>{f.billNo}</td><td style={td}>₹{f.rate}</td><td style={td}>{f.billQty}</td>
                              <td style={{ ...td, textAlign:"center" }}>
                                <button onClick={() => handleAdd(f)} style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>➕ Add</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION 4: IN DATA, NOT IN FLASH */}
                <div style={secBox}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={secHead}>❌ In Data, not in Flash (Remove these)</div>
                    {inDataNotFlash.length > 0 && (
                      <button onClick={() => printList("IN DATA, NOT IN FLASH", inDataNotFlash, [
                        { key:"refNo", label:"Ref No" }, { key:"partyName", label:"Party" }, { key:"deliveryAt", label:"Delivery At" },
                        { key:"billNo", label:"Bill No" }, { key:"rate", label:"Rate" }
                      ])} style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"8px 16px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>🖨️ Print</button>
                    )}
                  </div>
                  {inDataNotFlash.length === 0 ? (
                    <div style={{ padding:16, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>None</div>
                  ) : (
                    <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto", maxHeight:400, overflowY:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead><tr style={{ background:"#151b2a", position:"sticky", top:0 }}>
                          <th style={th}>Ref No</th><th style={th}>Party</th><th style={th}>Delivery At</th>
                          <th style={th}>Bill No</th><th style={th}>Rate</th>
                          <th style={{ ...th, textAlign:"center" }}>Action</th>
                        </tr></thead>
                        <tbody>
                          {inDataNotFlash.map(d => (
                            <tr key={`dnf-${d.refNo}`} style={{ borderBottom:"1px solid #1e2a3a" }}>
                              <td style={{ ...td, fontWeight:600 }}>{d.refNo}</td>
                              <td style={td}>{d.partyName}</td><td style={td}>{d.deliveryAt}</td>
                              <td style={td}>{d.billNo}</td><td style={td}>₹{d.rate}</td>
                              <td style={{ ...td, textAlign:"center" }}>
                                <button onClick={() => handleRemove(d)} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:9, cursor:"pointer" }}>❌ Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
{subTab === "rename" && (
<RenamePartyTab
  records={records}
  setRecords={setRecords}
  salesWorkingData={salesWorkingData}
  setSalesWorkingData={setSalesWorkingData}
  parties={parties}
  setParties={setParties}
  calcTDS={calcTDS}
  calcAll={calcAll}
  showToast={showToast}
  claimRules={claimRules}
  activeFY={activeFY}
/>
      )}
    
    </div>
  );
}


export default function App() {
 
  // USER MANAGEMENT STATES
const [currentUser, setCurrentUser] = useState(null);
const [activeFY, setActiveFY] = useState("2026-27");
const [financialYears, setFinancialYears] = useState([]);  
const [newFYStart, setNewFYStart] = useState("");
const [navScrollWidth, setNavScrollWidth] = useState(0);
  const [users, setUsers] = useState([]);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserRole, setNewUserRole] = useState("Restricted");
  const [selectedTabs, setSelectedTabs] = useState(["entry", "data"]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [editFYs, setEditFYs] = useState([]);
  const [editTabs, setEditTabs] = useState([]);
  const [editUsername, setEditUsername] = useState("");
const [editRole, setEditRole] = useState("Restricted");

const allTabs = ["entry", "data", "externalSourcePurchase", "pmt", "hisab", "manage", "banking", "reconcile", "sales", "purchaseSalesReconcile", "tds", "claimManagement", "loan" ,"users"];
const tabLabels = {
  entry: "+ New Entry",
  data: "☰ Data",
  externalSourcePurchase: "📥 External Source Purchase",
  pmt: "💳 Payment",
  hisab: "📋 Hisab",
  manage: "⚙ Manage",
  banking: "🏦 Banking",
  reconcile: "🔗 Reconcile",
  sales: "💰 Sales",
  purchaseSalesReconcile: "🔗 Purchase-Sales Reconcile",
  claimManagement: "📋 Claim Mgmt",
  tds: "🧾 TDS",
  users: "👥 Users",
  loan: "💰 Loan",
};
  useEffect(() => {
  (async () => {
    const loaded = await loadAppUsers();
    if (loaded.length > 0) setUsers(loaded);
  })();
}, []);

// Restore Supabase Auth session on load — keeps you logged in across refreshes
useEffect(() => {
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const email = session.user.email || "";
      const profile = users.find(u => u.username.toLowerCase() === email.toLowerCase());
      if (profile) {
        setCurrentUser(profile);
      } else {
        setCurrentUser({
          id: session.user.id,
          username: email,
          role: "Admin",
          tabs: allTabs,
          allowedFys: []
        });
      }
    }
  })();
}, [users]);

const handleLogin = async () => {
    const email = loginUsername.trim();      // now an email
    const password = loginPassword.trim();

    if (!email || !password) {
      showToast("ENTER EMAIL & PASSWORD", "error");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showToast(error.message || "LOGIN FAILED", "error");
      return;
    }

    const profile = users.find(u => u.username.toLowerCase() === email.toLowerCase());

    if (profile) {
      setCurrentUser(profile);
    } else {
      setCurrentUser({
        id: data.user.id,
        username: email,
        role: "Admin",
        tabs: allTabs,
        allowedFys: []
      });
    }

    setLoginUsername("");
    setLoginPassword("");
    showToast("WELCOME!");
  };

 const handleLogout = async () => {
  await supabase.auth.signOut();
  setCurrentUser(null);
  setView("entry");
  showToast("LOGGED OUT!");
};

// Auto-logout after inactivity
useEffect(() => {
  if (!currentUser) return;
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes
  let timer;
  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { handleLogout(); }, TIMEOUT);
  };
  const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
  events.forEach(e => window.addEventListener(e, reset));
  reset();
  return () => {
    clearTimeout(timer);
    events.forEach(e => window.removeEventListener(e, reset));
  };
}, [currentUser]);  

// ---- Loan Party handlers ----
const addLoanPartyHandler = async () => {
  const name = newLoanParty.trim();
  if (!name) { showToast("Enter party name", "error"); return; }
  if (loanParties.some(p => p.partyName.toLowerCase() === name.toLowerCase())) {
    showToast("Party already exists", "error"); return;
  }
  const ok = await addLoanParty(name);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }
  setLoanParties(await loadLoanParties());
  setNewLoanParty("");
  showToast("Loan party added");
};

const addLoanBrokerHandler = async () => {
  const name = newLoanBroker.trim();
  if (!name) { showToast("Enter broker name", "error"); return; }
  if (loanBrokers.some(b => b.brokerName.toLowerCase() === name.toLowerCase())) {
    showToast("Broker already exists", "error"); return;
  }
  const ok = await addLoanBroker(name);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }
  setLoanBrokers(await loadLoanBrokers());
  setNewLoanBroker("");
  showToast("Loan broker added");
};
  
// FY string (e.g. "2026-27") from a YYYY-MM-DD date
const fyFromDate = (dateStr) => {
  if (!dateStr) return activeFY;
  const [y, m] = dateStr.split("-").map(Number);
  const startY = m < 4 ? y - 1 : y; // Jan-Mar belong to previous FY
  return `${startY}-${String((startY + 1) % 100).padStart(2, "0")}`;
};

const handleSaveLoan = async () => {
  const f = loanForm;

  if (!f.partyName) { showToast("Select a loan party", "error"); return; }
  if (!f.brokerName) { showToast("Select a broker", "error"); return; }
  if (!(parseFloat(f.principal) > 0)) { showToast("Enter principal", "error"); return; }
  if (!(parseFloat(f.interestRate) >= 0)) { showToast("Enter interest rate", "error"); return; }
  if (!(parseFloat(f.brokerageRate) >= 0)) { showToast("Enter brokerage rate", "error"); return; }
  if (!f.startDate) { showToast("Enter start date", "error"); return; }
  if (f.loanType === "fixed" && !(parseFloat(f.months) > 0)) { showToast("Enter term months", "error"); return; }

  const calc = calcLoan({
    principal: f.principal, interestRate: f.interestRate, brokerageRate: f.brokerageRate,
    loanType: f.loanType, months: f.months, days: f.days
  });

  // Term 1 window (fixed only)
  let dueDate = null;
  if (f.loanType === "fixed") {
    const d = new Date(f.startDate);
    d.setMonth(d.getMonth() + Math.round(parseFloat(f.months)));
    dueDate = d.toISOString().slice(0, 10);
  }

  // 1. Create the loan (identity + unchanging fields). due_date kept for legacy but no longer authoritative.
  const loanId = await createLoan({
    partyName: f.partyName, brokerName: f.brokerName,
    principal: parseFloat(f.principal),
    interestRate: parseFloat(f.interestRate),
    brokerageRate: parseFloat(f.brokerageRate),
    loanType: f.loanType, startDate: f.startDate, dueDate
  });
  if (!loanId) { showToast("Failed to save loan — check connection", "error"); return; }

  // 2. Fixed loans: Term 1 = interest event + brokerage accrual, both stamped term_number 1
  if (f.loanType === "fixed") {
    const paymentDate = f.startDate; // interest paid upfront on start
    const fy = fyFromDate(paymentDate);

    const evOk = await addLoanInterestEvent({
      loanId, termNumber: 1, startDate: f.startDate, dueDate,
      termMonths: parseFloat(f.months), termDays: null,
      interestAmt: calc.interest, interestTds: calc.interestTDS, netParty: calc.netParty,
      paymentDate, financialYear: fy
    });
    if (!evOk) { showToast("Loan saved, but interest event failed — check connection", "error"); return; }

    const acOk = await addLoanBrokerageAccrual({
      loanId, termNumber: 1, brokerName: f.brokerName, amount: calc.brokerage, accrualDate: f.startDate
    });
    if (!acOk) { showToast("Interest saved, but brokerage accrual failed — check connection", "error"); return; }
  }

  // Reload loan data
  setLoanInterestEvents(await loadLoanInterestEvents());
  setActiveFixedLoans(await loadActiveFixedLoans());
  setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
  setLoansWithTerms(await loadLoansWithTerms());

  showToast("Loan saved!");
  setLoanForm({ partyName:"", brokerName:"", principal:"", interestRate:"", brokerageRate:"", loanType:"fixed", startDate:"", months:"", days:"" });
};
  
const handleRenewLoan = async () => {
  const loan = activeFixedLoans.find(l => l.id === renewLoanId);
  if (!loan) { showToast("Select a loan to renew", "error"); return; }
  if (!(parseFloat(renewMonths) > 0)) { showToast("Enter renewal term (months)", "error"); return; }
  const months = parseFloat(renewMonths);

  // New term inherits its start from the latest term's due date
  const termStart = loan.dueDate;                 // derived latest due date from loadActiveFixedLoans
  const nextTerm = (loan.latestTerm || 0) + 1;

  // Carry principal + rates from the loan
  const calc = calcLoan({
    principal: loan.principal, interestRate: loan.interestRate, brokerageRate: loan.brokerageRate,
    loanType: "fixed", months, days: null
  });

  // New term's due date = its start + renewal months
  const d = new Date(termStart);
  d.setMonth(d.getMonth() + Math.round(months));
  const newDueDate = d.toISOString().slice(0, 10);

  const paymentDate = termStart;                  // interest paid on the term's start (old due date)
  const fy = fyFromDate(paymentDate);

  // 1. New interest event for this term
  const evOk = await addLoanInterestEvent({
    loanId: loan.id, termNumber: nextTerm, startDate: termStart, dueDate: newDueDate,
    termMonths: months, termDays: null,
    interestAmt: calc.interest, interestTds: calc.interestTDS, netParty: calc.netParty,
    paymentDate, financialYear: fy
  });
  if (!evOk) { showToast("Renew failed at interest event — check connection", "error"); return; }

  // 2. New brokerage accrual for this term
  const acOk = await addLoanBrokerageAccrual({
    loanId: loan.id, termNumber: nextTerm, brokerName: loan.brokerName,
    amount: calc.brokerage, accrualDate: termStart
  });
  if (!acOk) { showToast("Interest saved, brokerage accrual failed — check connection", "error"); return; }

  // Reload — due date recomputes from the new latest term
  setLoanInterestEvents(await loadLoanInterestEvents());
  setActiveFixedLoans(await loadActiveFixedLoans());
  setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
  setLoansWithTerms(await loadLoansWithTerms());

  showToast(`Renewed — Term ${nextTerm}, new due date ${newDueDate.split("-").reverse().join("-")}`);
  setRenewLoanId("");
  setRenewMonths("");
};
  
    const handleAddUser = async () => {
    const username = newUsername.trim();
    
    if (!username) {
      showToast("ENTER USERNAME & PASSWORD", "error");
      return;
    }
    
    if (selectedTabs.length === 0) {
      showToast("SELECT AT LEAST ONE TAB", "error");
      return;
    }
    
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      showToast("USERNAME ALREADY EXISTS!", "error");
      return;
    }
    
   const newUser = {
  username,
  role: newUserRole,
  tabs: selectedTabs,
};

const ok = await upsertAppUser(newUser);
if (!ok) { showToast("FAILED TO SAVE — CHECK CONNECTION", "error"); return; }

const loaded = await loadAppUsers();
setUsers(loaded);
setNewUsername("");
setNewUserRole("Restricted");
setSelectedTabs(["entry", "data"]);
showToast("USER ADDED!");
  };

 const handleDeleteUser = async (id) => {
  if (id === currentUser?.id) {
    showToast("CANNOT DELETE CURRENT USER!", "error");
    return;
  }
  const user = users.find(u => u.id === id);
  if (!user) return;

  const ok = await deleteAppUser(user.username);
  if (!ok) { showToast("FAILED TO DELETE — CHECK CONNECTION", "error"); return; }

  const loaded = await loadAppUsers();
  setUsers(loaded);
  showToast("USER DELETED!");
};

  const handleToggleTab = (tab) => {
    setSelectedTabs(prev => 
      prev.includes(tab) 
        ? prev.filter(t => t !== tab)
        : [...prev, tab]
    );
  };

  const handleStartEdit = (user) => {
  setEditingUserId(user.id);
  setEditUsername(user.username);
  setEditRole(user.role);
  setEditTabs([...user.tabs]);
  setEditFYs([...(user.allowedFys || [])]);
};

const handleToggleFY = (fy) => {
  setSelectedFYs(prev => prev.includes(fy) ? prev.filter(f => f !== fy) : [...prev, fy]);
};
const handleEditToggleFY = (fy) => {
  setEditFYs(prev => prev.includes(fy) ? prev.filter(f => f !== fy) : [...prev, fy]);
};

const handleSaveEdit = async () => {
  if (!editUsername.trim()) {
    showToast("ENTER USERNAME", "error");
    return;
  }

  if (editTabs.length === 0) {
    showToast("SELECT AT LEAST ONE TAB", "error");
    return;
  }

const updatedUser = {
  ...users.find(u => u.id === editingUserId),
  username: editUsername.trim(),
  role: editRole,
  tabs: editTabs,
  allowedFys: editFYs
};

const ok = await upsertAppUser(updatedUser);
if (!ok) { showToast("FAILED TO SAVE — CHECK CONNECTION", "error"); return; }

const loaded = await loadAppUsers();
setUsers(loaded);

if (currentUser.id === editingUserId) {
  setCurrentUser(updatedUser);
}

showToast("USER UPDATED!");
setEditingUserId(null);
setEditUsername("");
setEditRole("Restricted");
setEditTabs([]);
setEditFYs([]);
};

const handleCancelEdit = () => {
  setEditingUserId(null);
  setEditUsername("");
  setEditRole("Restricted");
  setEditTabs([]);
  setEditFYs([]);
};

const handleEditToggleTab = (tab) => {
  setEditTabs(prev => 
    prev.includes(tab) 
      ? prev.filter(t => t !== tab)
      : [...prev, tab]
  );
};

// BANKING STATES
const [bankingData, setBankingData] = useState({ HDFC: [], SBI: [], VASB: [] });

const [narrationWidth, setNarrationWidth] = useState(200);
const [selectedBankTab, setSelectedBankTab] = useState("HDFC");
const [partyFilterBank, setPartyFilterBank] = useState("");
const [linkedTransactions, setLinkedTransactions] = useState({});
const [reconcileSearch, setReconcileSearch] = useState("");
const [reconcileSearchSales, setReconcileSearchSales] = useState("");
const [selectedBankTransId, setSelectedBankTransId] = useState(null);
const [selectedReconcileBank, setSelectedReconcileBank] = useState("HDFC");
const [linkingModal, setLinkingModal] = useState(null);
const [reconcileMode, setReconcileMode] = useState("pmt"); // "pmt" or "sales"
const [reconcileSplit, setReconcileSplit] = useState(1); 
const [reconcileNarrationWidth, setReconcileNarrationWidth] = useState(200);
const [reconcileFromDate, setReconcileFromDate] = useState("");
const [selectedSalesBills, setSelectedSalesBills] = useState([]); // For multi-select in modal
const [salesLinkingModal, setSalesLinkingModal] = useState(null);
const [unlinkSlotModal, setUnlinkSlotModal] = useState(null);
const [pmtUnlinkModal, setPmtUnlinkModal] = useState(null);
const [pmtLinkedSlots, setPmtLinkedSlots] = useState({});

// ===== NEW: MULTI-STEP MODAL HANDLERS =====
const handleModeSelect = (mode) => {
  setSalesLinkingModal(prev => ({
    ...prev,
    mode,
    selectedBills: [],
    allocations: {}
  }));
};

const handleModeNext = () => {
  setSalesLinkingModal(prev => ({
    ...prev,
    step: 2
  }));
};

const handleBillToggle = (billId) => {
  setSalesLinkingModal(prev => {
    const newBills = prev.selectedBills.includes(billId)
      ? prev.selectedBills.filter(id => id !== billId)
      : [...prev.selectedBills, billId];
    return { ...prev, selectedBills: newBills };
  });
};

const handleBillNext = () => {
  if (salesLinkingModal.selectedBills.length === 0) {
    showToast("Select at least one bill", "error");
    return;
  }
  
  const newAllocations = {};
  salesLinkingModal.selectedBills.forEach(billId => {
    newAllocations[billId] = { slot: 1, amount: 0 };
  });
  
  setSalesLinkingModal(prev => ({
    ...prev,
    step: 3,
    allocations: newAllocations
  }));
};

const handleAllocationChange = (billId, field, value) => {
  setSalesLinkingModal(prev => ({
    ...prev,
    allocations: {
      ...prev.allocations,
      [billId]: {
        ...prev.allocations[billId],
        [field]: field === "amount" ? parseFloat(value) || 0 : value
      }
    }
  }));
};

const handleSaveAllocation = async () => {
  const { bankTransId, selectedBills, allocations, chqRef, depositDate, bankName } = salesLinkingModal;
  const bankTrans = bankingData[selectedReconcileBank].find(t => t.id === bankTransId);
  
  if (!bankTrans) return;

  let updatedRecords = [];
  
  setSalesWorkingData(prev => prev.map(bill => {
    if (!selectedBills.includes(bill.id)) return bill;
    
    const alloc = allocations[bill.id];
    const slot = parseInt(alloc.slot);
    
    const updated = {
      ...bill,
      [`bankPmt${slot}`]: alloc.amount,
      [`bankDate${slot}`]: depositDate,
      [`pmtId${slot}`]: chqRef
    };
    
    updatedRecords.push(updated);
    return updated;
  }));

  if (updatedRecords.length > 0) {
   await upsertWorkingBatch(updatedRecords, activeFY);
  }

  const linkedBillNos = selectedBills
    .map(bId => salesWorkingData.find(b => b.id === bId)?.refNo)
    .filter(Boolean)
    .join(", ");
  
  const linkedParties = selectedBills
    .map(bId => salesWorkingData.find(b => b.id === bId)?.partyName)
    .filter(Boolean)
    .join(", ");

  const updatedBank = {
    ...bankTrans,
    linkedRefNo: linkedBillNos,
    partyName: linkedParties
  };

  await updateBankTransaction(updatedBank);
  
  setBankingData(prev => ({
    ...prev,
    [selectedReconcileBank]: prev[selectedReconcileBank].map(t =>
      t.id === bankTransId ? updatedBank : t
    )
  }));

  const totalAllocated = Object.values(allocations).reduce((s, a) => s + a.amount, 0);
  
  setSalesLinkingModal(null);
  setSelectedBankTransId(null);
  showToast(`✓ Allocated ₹${totalAllocated.toLocaleString()} to ${selectedBills.length} bill(s)`);
};
// ===== END NEW HANDLERS =====
const [salesFlashData, setSalesFlashData] = useState([]);
const [purchaseFlashData, setPurchaseFlashData] = useState([]);
const [salesWorkingData, setSalesWorkingData] = useState([]);
const [claimRules, setClaimRules] = useState([]);
const [selectedSalesTab, setSelectedSalesTab] = useState("flash");
const [salesSearch, setSalesSearch] = useState("");
const [salesFilterParty, setSalesFilterParty] = useState("");
const [salesFilterBroker, setSalesFilterBroker] = useState("");
const [salesPending, setSalesPending] = useState({ neg: true, zero: true, pos: true });
const [salesHidePmt, setSalesHidePmt] = useState(false);

// ADD THIS HERE
useEffect(() => {
  const scrollbar = document.getElementById("pmtScrollbar");
  const container = document.getElementById("pmtTableContainer");
  
 
  if (container && scrollbar) {
    container.addEventListener("scroll", () => {
      scrollbar.scrollLeft = container.scrollLeft;
    });
  }
}, []);
useEffect(() => {
  const scrollbar = document.getElementById("bankScrollbar");
  const container = document.getElementById("bankTableContainer");
  
  if (container && scrollbar) {
    const handleContainerScroll = () => {
      scrollbar.scrollLeft = container.scrollLeft;
    };
    
    const handleScrollbarScroll = () => {
      container.scrollLeft = scrollbar.scrollLeft;
    };
    
    container.addEventListener("scroll", handleContainerScroll);
    scrollbar.addEventListener("scroll", handleScrollbarScroll);
    
    return () => {
      container.removeEventListener("scroll", handleContainerScroll);
      scrollbar.removeEventListener("scroll", handleScrollbarScroll);
    };
  }
}, []);

useEffect(() => {
  const navContainer = document.getElementById("navContainer");
  const navScrollbar = document.getElementById("navScrollbar");
  
  if (!navContainer || !navScrollbar) return;
  
  const updateScrollWidth = () => {
    setNavScrollWidth(navContainer.scrollWidth);
  };
  
  updateScrollWidth();
  
  let rafId;
  
  const handleContainerScroll = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      navScrollbar.scrollLeft = navContainer.scrollLeft;
    });
  };
  
  const handleScrollbarScroll = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      navContainer.scrollLeft = navScrollbar.scrollLeft;
    });
  };
  
  navContainer.addEventListener("scroll", handleContainerScroll);
  navScrollbar.addEventListener("scroll", handleScrollbarScroll);
  window.addEventListener("resize", updateScrollWidth);
  
  return () => {
    navContainer.removeEventListener("scroll", handleContainerScroll);
    navScrollbar.removeEventListener("scroll", handleScrollbarScroll);
    window.removeEventListener("resize", updateScrollWidth);
    cancelAnimationFrame(rafId);
  };
}, [allTabs, currentUser]);

// Parse FLASH sales data from pasted text
const parseFlashData = (pastedText) => {
  const lines = pastedText.trim().split('\n');
  const parsed = [];
  
  lines.forEach((line, idx) => {
    if (idx === 0) return; // Skip header
    
    const cols = line.split('\t');
    if (cols.length < 10) return;
    
    parsed.push({
      id: Math.random().toString(36).substr(2, 9),
      refNo: cols[0],
      date: cols[1],
      partyName: cols[2],
      broker: cols[3],
      itemName: cols[4],
      poNo: cols[5],
      truckNo: cols[6],
      qty: parseFloat(cols[7]) || 0,
      rate: parseFloat(cols[8]) || 0,
      netBillAmt: parseFloat(cols[9]) || 0,
      receivedWeight: 0,
      shortage: 0,
      shortageAmount: 0,
      gunnyWeight: 0,
      claimPct: 0,
      claim: 0,
      cdPct: 0,
      cd: 0,
      tdsReceived: 0,
      netAmt: 0,
      bankDate1: "",
      bankPmt1: 0,
      bankDate2: "",
      bankPmt2: 0,
      bankDate3: "",
      bankPmt3: 0,
      pendingAmt: 0,
      days: 0,
      pmtId1: "",      
      pmtId2: "",      
      pmtId3: ""       
     });
  });
  
  return parsed;
};

const saveWorkingRow = useCallback(async (row) => {
    if (!row) return;
    const ok = await upsertWorkingRow(row, activeFY);
    if (!ok) showToast("Failed to save row — check connection", "error");
  }, [activeFY]);

const replaceWorkingRow = useCallback((updated) => {
    setSalesWorkingData(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);


const parseHDFCData = (pastedText) => {
  const lines = pastedText.trim().split('\n');
  const parsed = [];
  
  const convertDate = (dateStr) => {
    // Convert DD-MM-YY to DD-MM-YY (keep as-is for consistency)
    // Just clean up any extra spaces
    return dateStr.trim();
  };
  
  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().includes('date')) return;
    
    const cols = line.split('\t');
    if (cols.length < 7) return;
    
    parsed.push({
      id: Math.random().toString(36).substr(2, 9),
      date: convertDate(cols[0]),
      narration: cols[1],
      chqRef: cols[2],
      valueDt: cols[3],
      withdrawalAmt: parseFloat(cols[4]) || 0,
      depositAmt: parseFloat(cols[5]) || 0,
      closingBalance: parseFloat(cols[6]) || 0,
      linkedRefNo: "",
      partyName: ""
    });
  });
  
  return parsed;
};

const parseSBIData = (pastedText) => {
  const lines = pastedText.trim().split('\n');
  const parsed = [];

  const money = (s) => parseFloat((s || "").replace(/,/g, '').trim()) || 0;

  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().includes('txn date')) return; // skip header

    const cols = line.split('\t');
    if (cols.length < 8) return;

    parsed.push({
      id: Math.random().toString(36).substr(2, 9),
      date: cols[0].trim(),              // Txn Date
      valueDt: cols[1].trim(),           // Value Date
      narration: cols[2].trim(),         // Description
      chqRef: cols[3].trim(),            // Ref No./Cheque No.
      branchCode: cols[4].trim(),        // Branch Code
      mode: "",
      withdrawalAmt: money(cols[5]),     // Debit
      depositAmt: money(cols[6]),        // Credit
      closingBalance: money(cols[7]),    // Balance
      linkedRefNo: "",
      partyName: ""
    });
  });

  return parsed;
};

const parseVASBData = (pastedText) => {
  const lines = pastedText.trim().split('\n');
  const parsed = [];

  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().includes('date')) return; // skip header

    const cols = line.split('\t');
    if (cols.length < 7) return;

    // Dr/Cr indicator in column H (index 7). DR = negative, CR/blank = positive magnitude.
    const drcr = (cols[7] || "").trim().toUpperCase();
    let closing = parseFloat((cols[6] || "").replace(/,/g, '')) || 0;
    if (drcr === "DR" || drcr === "D") closing = -Math.abs(closing);
    else closing = Math.abs(closing);   // CR or missing → positive magnitude; sign owned by arithmetic

    parsed.push({
      id: Math.random().toString(36).substr(2, 9),
      date: cols[0].trim(),
      narration: cols[1].trim(),
      chqRef: cols[3].trim(),
      valueDt: "",
      branchCode: "",
      mode: cols[2].trim(),
      withdrawalAmt: parseFloat((cols[4] || "").replace(/,/g, '')) || 0,
      depositAmt: parseFloat((cols[5] || "").replace(/,/g, '')) || 0,
      closingBalance: closing,
      linkedRefNo: "",
      partyName: ""
    });
  });

  return parsed;
};

const handlePasteBankData = async (bank) => {
  const pastedData = prompt(`Paste your ${bank} bank data here:\n(Copy from Excel and paste)`);
  if (!pastedData) return;

  let parsed = [];
  if (bank === 'HDFC') parsed = parseHDFCData(pastedData);
  else if (bank === 'SBI') parsed = parseSBIData(pastedData);
  else if (bank === 'VASB') parsed = parseVASBData(pastedData);

  if (parsed.length === 0) {
    showToast("Invalid format! Check column order.", "error");
    return;
  }

  // Comparable key for date ordering (handles DD-MM-YY and DD-MM-YYYY)
  const toComparable = (dateStr) => {
    const parts = String(dateStr || "").split('-');
    if (parts.length !== 3) return "00000000";
    let [d, m, y] = parts;
    if (y.length === 2) y = "20" + y;
    return y + m.padStart(2, '0') + d.padStart(2, '0');
  };
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const existing = bankingData[bank] || [];
  const pasteDates = parsed.map(t => toComparable(t.date)).filter(d => d !== "00000000");
  if (pasteDates.length === 0) { showToast("Could not read dates from paste", "error"); return; }
  const pasteMin = pasteDates.reduce((a, b) => a < b ? a : b);

  let boundaryDate = null; // raw date string of the day to replace

  if (existing.length > 0) {
    const storedDates = existing.map(t => toComparable(t.date)).filter(d => d !== "00000000");
    const storedMax = storedDates.reduce((a, b) => a > b ? a : b);

    // 1. Reject wide overlaps outright
    if (pasteMin < storedMax) {
      showToast("Paste overlaps existing data. Start the paste on your last stored day.", "error");
      return;
    }

    if (pasteMin === storedMax) {
      boundaryDate = parsed.find(t => toComparable(t.date) === pasteMin)?.date;
    }

    // 2. Balance continuity check — BEFORE any confirm or delete
    const sortedExisting = [...existing].sort((a, b) => {
      const da = toComparable(a.date), db = toComparable(b.date);
      if (da !== db) return da.localeCompare(db);
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });

    // Anchor on the last stored row NOT on the boundary day (that day gets replaced)
    const anchorPool = boundaryDate
      ? sortedExisting.filter(t => t.date !== boundaryDate)
      : sortedExisting;

    if (anchorPool.length > 0) {
      const anchor = anchorPool[anchorPool.length - 1];
      const first = parsed[0];
      const expected = (parseFloat(anchor.closingBalance) || 0)
                     + (parseFloat(first.depositAmt) || 0)
                     - (parseFloat(first.withdrawalAmt) || 0);
      const stated = parseFloat(first.closingBalance) || 0;

      const matches = bank === "VASB"
        ? Math.abs(Math.abs(expected) - Math.abs(stated)) < 0.01
        : Math.abs(expected - stated) < 0.01;

      if (!matches) {
        const gap = stated - expected;
        showToast(
          `Chain break after ${anchor.date} (${money(anchor.closingBalance)}). ` +
          `First pasted row should close at ${money(expected)}, statement says ${money(stated)} — ` +
          `gap of ${money(Math.abs(gap))}. Missing transactions? Import cancelled.`,
          "error"
        );
        return;
      }
    }

    // 3. Boundary day confirmed and wiped only after validation passes
    if (boundaryDate) {
      const dayRows = existing.filter(t => t.date === boundaryDate).length;
      const linkedCount = await countLinkedOnDate(bank, boundaryDate);
      const msg = linkedCount > 0
        ? `Re-importing ${boundaryDate} will delete its ${dayRows} stored row(s), including ${linkedCount} LINKED transaction(s). Those links will be lost.\n\nContinue?`
        : `Re-importing ${boundaryDate} will replace its ${dayRows} stored row(s).\n\nContinue?`;
      if (!confirm(msg)) return;

      const okDel = await deleteBankTransactionsByDate(bank, boundaryDate);
      if (!okDel) { showToast("Failed to clear boundary day — check connection", "error"); return; }
    }
  }

  // Assign ascending createdAt so paste order becomes sort order
  const base = Date.now();
  const withBank = parsed.map((t, i) => ({ ...t, bank, createdAt: new Date(base + i).toISOString() }));

  const ok = await upsertBankTransactions(withBank);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }

  setBankingData(prev => {
    const kept = boundaryDate
      ? (prev[bank] || []).filter(t => t.date !== boundaryDate)
      : (prev[bank] || []);
    return { ...prev, [bank]: [...kept, ...withBank] };
  });

  showToast(boundaryDate
    ? `${withBank.length} transactions imported (${boundaryDate} replaced)`
    : `${withBank.length} transactions imported`);
};

// Link bank transaction to Ref No

const handleLinkBankTransaction = async (bankTransId, refNo, partyName) => {
  if (!refNo || !partyName) {
    showToast("Enter Ref No and Party Name", "error");
    return;
  }

  const updatedTrans = bankingData[selectedBankTab].find(t => t.id === bankTransId);
  if (!updatedTrans) return;

 const linked = { ...updatedTrans, linkedRefNo: refNo, linkedFy: activeFY, partyName };
  
  const ok = await updateBankTransaction(linked);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }

  setBankingData(prev => ({
    ...prev,
    [selectedBankTab]: prev[selectedBankTab].map(t =>
      t.id === bankTransId ? linked : t
    )
  }));

  setLinkedTransactions(prev => ({
    ...prev,
    [refNo]: { bank: selectedBankTab, bankTransId, date: new Date().toISOString() }
  }));

  showToast(`Linked to Ref No ${refNo}`);
};

// Delete bank transaction
const handleDeleteBankTransaction = async (bankTransId) => {
  const ok = await deleteBankTransaction(bankTransId);
  if (!ok) { showToast("Failed to delete — check connection", "error"); return; }

  setBankingData(prev => ({
    ...prev,
    [selectedBankTab]: prev[selectedBankTab].filter(t => t.id !== bankTransId)
  }));
  showToast("Transaction deleted");
};

// Get linked bank info for a Ref No
const getLinkedBankStatus = (refNo) => {
  for (const bank of ["HDFC", "SBI", "VASB"]) {
    const hit = bankingData[bank]?.find(t => t.linkedRefNo === refNo);
    if (hit) return `✓ Linked to ${bank}`;
  }
  return "✗ Not Linked";
};

 const [records, setRecords] = useState([]);
  const [parties, setParties] = useState([]);
  const [partyPans, setPartyPans] = useState({}); 
  const [brokers, setBrokers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
const [banks, setBanks] = useState([]);

// Loan module state

const [loanParties, setLoanParties] = useState([]);
const [loanBrokers, setLoanBrokers] = useState([]);
const [loanSubTab, setLoanSubTab] = useState("manage");
const [newLoanParty, setNewLoanParty] = useState("");
const [newLoanBroker, setNewLoanBroker] = useState("");
const [loanInterestEvents, setLoanInterestEvents] = useState([]);
const [activeFixedLoans, setActiveFixedLoans] = useState([]);
const [renewLoanId, setRenewLoanId] = useState("");
const [renewMonths, setRenewMonths] = useState("");
const [loanBrokerageAccruals, setLoanBrokerageAccruals] = useState([]);   
const [loanBrokeragePayments, setLoanBrokeragePayments] = useState([]);   
const [brokeragePmtModal, setBrokeragePmtModal] = useState(null); 
const [loanTdsSection, setLoanTdsSection] = useState("194a");
const [loanTdsMonth, setLoanTdsMonth] = useState("");
const [loansWithTerms, setLoansWithTerms] = useState([]);
const [nonFixedPayModal, setNonFixedPayModal] = useState(null);
const [loanForm, setLoanForm] = useState({
  partyName: "", brokerName: "", principal: "",
  interestRate: "", brokerageRate: "",
  loanType: "fixed", startDate: "", months: "", days: ""
});
 
// Load data from Supabase on mount + whenever active FY changes

useEffect(() => {
  if (!currentUser) return; // wait until authenticated — RLS returns nothing pre-login
  (async () => {
    setRecords(await loadRecords(activeFY));
    setPartyPans(await loadPartyPans());
    setSalesFlashData(await loadSalesFlash(activeFY));
    setClaimRules(await loadClaimRules());
    setPurchaseFlashData(await loadPurchaseFlash(activeFY));
    setSalesWorkingData(await loadSalesWorking(activeFY));
    setParties(await loadParties());
    setBrokers(await loadBrokers());
    setBanks(await loadBanks());
    setIgnoredSalesParties(await loadIgnoredSalesParties());
    setLoanParties(await loadLoanParties());
    setLoanBrokers(await loadLoanBrokers());
    setLoanInterestEvents(await loadLoanInterestEvents());
    setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());        
    setLoanBrokeragePayments(await loadLoanBrokeragePayments(activeFY));
    setActiveFixedLoans(await loadActiveFixedLoans());
    setLoansWithTerms(await loadLoansWithTerms());
    setDeliveries(await loadDeliveries());
    setFinancialYears(await loadFinancialYears());   
   
    // Load banking data (shared / continuous — not year-filtered)
    
    const [hdfc, sbi, vasb] = await Promise.all([
      loadBankTransactions('HDFC'),
      loadBankTransactions('SBI'),
      loadBankTransactions('VASB')
    ]);
    setBankingData({ HDFC: hdfc, SBI: sbi, VASB: vasb });

   // Load pmt linked slots (year-filtered)
    const slots = await loadPmtLinkedSlots(activeFY);
    if (slots) setPmtLinkedSlots(slots);
  })();
}, [activeFY, currentUser]);
  
useEffect(() => {
  const startYear = parseInt(activeFY.split("-")[0], 10);
  if (!isNaN(startYear)) setReconcileFromDate(`${startYear}-04-01`);
}, [activeFY]);

useEffect(() => {
  if (!activeFY) return;
  const startYear = parseInt(activeFY.split("-")[0], 10);
  if (!isNaN(startYear)) setBankFromDate(`${startYear}-04-01`);
}, [activeFY]);

  const [view, setView] = useState("entry");
  const [form, setForm] = useState({ ...EMPTY });
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [bankFromDate, setBankFromDate] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterBroker, setFilterBroker] = useState("");
  const [toast, setToast] = useState(null);
  const [newParty, setNewParty] = useState("");
  const [newBroker, setNewBroker] = useState("");
  const [newDelivery, setNewDelivery] = useState("");
  const [newBank, setNewBank] = useState("");
  const [summaryType, setSummaryType] = useState("none");
  const [purchaseSalesSearch, setPurchaseSalesSearch] = useState("");
  const [ignoredSalesParties, setIgnoredSalesParties] = useState([]);
  
  const autoTDS = useMemo(() => calcTDS(form, records), [form, records]);

const autoCDRule = useMemo(() => {
  if (!form.deliveryAt) return "standard";
  const rule = claimRules.find(r => r.partyName === form.deliveryAt);
  return rule?.cdRule || "standard";
}, [form.deliveryAt, claimRules]); 

const calc = useMemo(() => calcAll(form, autoTDS, autoCDRule), [form, autoTDS, autoCDRule]);

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

const hasBlankBroker = useMemo(() => {
    const pool = filterParty ? records.filter(r => r.partyName === filterParty) : records;
    return pool.some(r => !(r.brokerName || "").trim());
  }, [records, filterParty]);
  
  const hasBlankParty = useMemo(() => {
    const pool = filterBroker ? records.filter(r => r.brokerName === filterBroker) : records;
    return pool.some(r => !(r.partyName || "").trim());
  }, [records, filterBroker]);
  
  const handleBrokerChange = (e) => {
    setFilterBroker(e.target.value);
    // Only clear the dependent party in normal mode; in summary modes the primary must stay
    if (!e.target.value && summaryType === "none") setFilterParty("");
  };

  const handlePartyChange = (e) => {
    setFilterParty(e.target.value);
    if (!e.target.value && summaryType === "none") setFilterBroker("");
  };
  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

 // Auto-select the sole related secondary option in summary modes
  useEffect(() => {
    if (summaryType === "party" && filterParty) {
      const relatedBrokers = [...new Set(records.filter(r => r.partyName === filterParty).map(r => r.brokerName || ""))];
      if (relatedBrokers.length === 1 && relatedBrokers[0] && filterBroker !== relatedBrokers[0]) {
        setFilterBroker(relatedBrokers[0]);
      }
    }
    if (summaryType === "broker" && filterBroker) {
      const relatedParties = [...new Set(records.filter(r => r.brokerName === filterBroker).map(r => r.partyName || ""))];
      if (relatedParties.length === 1 && relatedParties[0] && filterParty !== relatedParties[0]) {
        setFilterParty(relatedParties[0]);
      }
    }
  }, [summaryType, filterParty, filterBroker, records]);
  
  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    const refNo = form.refNo.trim();
    if (!refNo) { showToast("PLEASE ENTER REF NO", "error"); return; }

    const exists = records.find(r => r.refNo.trim().toUpperCase() === refNo.toUpperCase());

    if (!editMode && exists) {
      showToast("REF NO ALREADY EXISTS!", "error"); return;
    }

  // Hard guard: bill date must be within the active financial year
    if (form.billDate) {
      const fyStartYear = parseInt(activeFY.split("-")[0], 10);
      const fyMin = `${fyStartYear}-04-01`;
      const fyMax = `${fyStartYear + 1}-03-31`;
      if (form.billDate < fyMin || form.billDate > fyMax) {
        showToast(`Bill date must be within FY ${activeFY} (01-04-${fyStartYear} to 31-03-${fyStartYear + 1})`, "error");
        return;
      }
    }

    // Guard: party required + must exist; broker/delivery optional but must exist if filled
    const inList = (val, list) => list.some(x => x.toLowerCase() === (val || "").trim().toLowerCase());
    if (!form.partyName.trim()) {
      showToast("Party Name is required", "error");
      return;
    }
    if (!inList(form.partyName, parties)) {
      showToast(`Party "${form.partyName.trim()}" is not in the list. Add it in Manage first.`, "error");
      return;
    }
    if (form.brokerName.trim() && !inList(form.brokerName, brokers)) {
      showToast(`Broker "${form.brokerName.trim()}" is not in the list. Add it in Manage first.`, "error");
      return;
    }
    if (form.deliveryAt.trim() && !inList(form.deliveryAt, deliveries)) {
      showToast(`Delivery "${form.deliveryAt.trim()}" is not in the list. Add it in Manage first.`, "error");
      return;
    }

    const tds = calcTDS(form, records);
   const cdRule = claimRules.find(r => r.partyName === form.deliveryAt)?.cdRule || "standard";
   const c = calcAll(form, tds, cdRule);
   const record = { ...form, _tds: tds, _cdRule: cdRule, _shortage: c.shortage, _halfKgQty: c.halfKgQty, _netQty: c.netQty, _netAmt1: c.netAmt1, _cdAmt: c.cdAmt, _netAmt: c.netAmt, _brokerageAmt: c.brokerageAmt, _finalAmt: c.finalAmt, _balance: c.balance };

    const ok = await upsertRecord(record, activeFY);
    if (!ok) { showToast("FAILED TO SAVE — CHECK CONNECTION", "error"); return; }

    // Build the merged set with this record in place
    let merged = [...records];
    if (editMode) {
      merged = merged.map(r => r.refNo.trim().toUpperCase() === refNo.toUpperCase() ? record : r);
    } else {
      merged.push(record);
    }

   // Recompute the party's other bills (only shifted ones get written — no lag)
    let { ok: recOk, records: newRecords } = await recomputePartiesTDS([record.partyName], merged, claimRules, "changed", activeFY);
    if (!recOk) { showToast("SAVED, BUT TDS REFRESH FAILED — CHECK CONNECTION", "error"); }

// Auto-create skeleton entries for linked refs (multi-location) — never overwrite existing refs
    {
      const linkedRefs = [form.refA, form.refB].map(r => (r || "").trim()).filter(Boolean);
      const createdSkeletons = [];
      const rejectedExisting = [];
      for (const linkRef of linkedRefs) {
        if (linkRef.toUpperCase() === refNo.toUpperCase()) continue; // don't link a ref to itself
        if (newRecords.some(r => r.refNo.trim().toUpperCase() === linkRef.toUpperCase())) {
          rejectedExisting.push(linkRef); // ref already exists — cannot be used as a link
          continue;
        }

        const skeleton = {
          ...EMPTY,
          refNo: linkRef,
          truckNo: form.truckNo,
          partyName: form.partyName,
          brokerName: form.brokerName,
          billDate: form.billDate,
          billNo: form.billNo,
          refA: refNo // point back to the parent
        };
        const skTds = calcTDS(skeleton, newRecords);
        const skCdRule = claimRules.find(r => r.partyName === skeleton.deliveryAt)?.cdRule || "standard";
        const skC = calcAll(skeleton, skTds, skCdRule);
        const skRecord = { ...skeleton, _tds: skTds, _cdRule: skCdRule, _shortage: skC.shortage, _halfKgQty: skC.halfKgQty, _netQty: skC.netQty, _netAmt1: skC.netAmt1, _cdAmt: skC.cdAmt, _netAmt: skC.netAmt, _brokerageAmt: skC.brokerageAmt, _finalAmt: skC.finalAmt, _balance: skC.balance };

        const okSk = await upsertRecord(skRecord, activeFY);
        if (okSk) {
          createdSkeletons.push(skRecord);
          newRecords = [...newRecords, skRecord];
        }
      }
      const baseMsg = editMode ? "RECORD UPDATED!" : "FORM SUBMITTED!";
      const parts = [];
      if (createdSkeletons.length > 0) parts.push(`Created ${createdSkeletons.map(s => s.refNo).join(", ")}`);
      // On new entries, warn about existing refs; on edits, existing refs are normal (prior skeletons) — stay quiet
      if (!editMode && rejectedExisting.length > 0) parts.push(`⚠ Ref already exists, cannot link: ${rejectedExisting.join(", ")}`);
      if (parts.length > 0) {
        showToast(`${baseMsg} ${parts.join(" | ")}`, (!editMode && rejectedExisting.length > 0) ? "error" : "success");
      } else {
        showToast(baseMsg);
      }
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

const handleDeleteEntry = async () => {
    const refNo = form.refNo.trim();
    if (!refNo || !editMode) { showToast("LOAD A RECORD FIRST (use Edit)", "error"); return; }
    if (!confirm(`Delete Ref No ${refNo}?\n\nParty: ${form.partyName || "(none)"}\nThis permanently removes the purchase record.`)) return;

    const ok = await deleteRecord(refNo, activeFY);
    if (!ok) { showToast("FAILED TO DELETE — CHECK CONNECTION", "error"); return; }

    // Clear any link references pointing to the deleted ref (prevents accidental re-creation on later edits)
    const upper = refNo.toUpperCase();
    let remaining = records.filter(r => r.refNo.trim().toUpperCase() !== upper);
    const referrers = remaining.filter(r =>
      (r.refA || "").trim().toUpperCase() === upper || (r.refB || "").trim().toUpperCase() === upper
    );
    let clearedCount = 0;
    for (const ref of referrers) {
      const cleaned = {
        ...ref,
        refA: (ref.refA || "").trim().toUpperCase() === upper ? "" : ref.refA,
        refB: (ref.refB || "").trim().toUpperCase() === upper ? "" : ref.refB
      };
      const okClear = await upsertRecord(cleaned, activeFY);
      if (okClear) {
        clearedCount++;
        remaining = remaining.map(r => r.refNo === cleaned.refNo ? cleaned : r);
      }
    }

    setRecords(remaining);
    setForm({ ...EMPTY });
    setEditMode(false);
    showToast(clearedCount > 0
      ? `RECORD DELETED! Cleared link on ${clearedCount} record(s).`
      : "RECORD DELETED!");
  };
  
  const handleNew = () => { setForm({ ...EMPTY }); setEditMode(false); };

const filtered = useMemo(() => {
    const parseRef = (ref) => {
      const s = String(ref || "").trim();
      const m = s.match(/^(\d+)(.*)$/);
      return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
    };
    return records
    .filter(r => {
        const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        // Expand a value into search targets. For ISO dates (YYYY-MM-DD),
        // also emit a DDMMYYYY form so "24-6-2026" / "24062026" matches.
        const targets = (v) => {
          const raw = String(v ?? "");
          const out = [norm(raw)];
          const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) out.push(`${m[3]}${m[2]}${m[1]}`); // DDMMYYYY
          return out;
        };
        // Normalize the query, and zero-pad a bare DMY like "24-6-2026" → "24062026"
        let s = norm(search);
        const dmy = search.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dmy) s = `${dmy[1].padStart(2,"0")}${dmy[2].padStart(2,"0")}${dmy[3]}`;
        const matchSearch = !s || Object.values(r).some(v => targets(v).some(t => t.includes(s)));
        const matchParty = !filterParty || (filterParty === "__BLANK__" ? !(r.partyName || "").trim() : r.partyName === filterParty);
        const matchBroker = !filterBroker || (filterBroker === "__BLANK__" ? !(r.brokerName || "").trim() : r.brokerName === filterBroker);
        return matchSearch && matchParty && matchBroker;
      })
      .sort((a, b) => {
        const pa = parseRef(a.refNo), pb = parseRef(b.refNo);
        return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
      });
  }, [records, search, filterParty, filterBroker]);
  
  const fmt = (n) => n !== undefined && n !== null && !isNaN(n) ? Number(n).toLocaleString("en-IN") : "—";
  const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
   const NUMERIC_TOTAL_KEYS = new Set(["_tds","_brokerageAmt","_finalAmt","_balance"]);
  const sumCol = (rows, k) => rows.reduce((s, r) => s + (parseFloat(r[k]) || 0), 0); 
  const PMT_TOTAL_KEYS = new Set(["_finalAmt","bankAmt1","bankAmt2","bankAmt3","_balance"]);
 
  const printTable = (rows, title) => {
    if (rows.length === 0) { showToast("Nothing to print", "error"); return; }

    const columnOrder = ["_bankLinked","refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","rate","billQty","receiveQty","_shortage","halfKgValue","gunnyWeight","_halfKgQty","_netQty","_netAmt1","cdPct","_cdAmt","qualityClaim","hammali","freight","others","_netAmt","brokerageRate","_brokerageAmt","_tds","_finalAmt","bankAmt1","bankDate1","bankName1","bankAmt2","bankDate2","bankName2","bankAmt3","bankDate3","bankName3","_balance","note"];
    const partyBaseColumns = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","rate","billQty","_shortage","_halfKgQty","gunnyWeight","_netQty","_netAmt1","_cdAmt","qualityClaim","hammali","freight","others","_netAmt","_tds","_brokerageAmt","_finalAmt"];
const brokerBaseColumns = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","rate","billQty","_shortage","_halfKgQty","gunnyWeight","_netQty","_netAmt1","_cdAmt","qualityClaim","hammali","freight","others","_netAmt","_tds","_brokerageAmt","_finalAmt"];
let cols;
    if (summaryType === "party") {
      cols = partyBaseColumns.filter(k => rows.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0"))
        .filter(k => {
          if (k === "partyName") return false;
          if (k === "brokerName" && filterBroker) return false;
          return true;
        });
    } else if (summaryType === "broker") {
      cols = brokerBaseColumns.filter(k => rows.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0"))
        .filter(k => {
          if (k === "brokerName") return false;
          if (k === "partyName" && filterParty) return false;
          return true;
        });
    } else {
      const allKeys = [...new Set(rows.flatMap(r => Object.keys(r)))];
      const visible = allKeys.filter(k => k !== "brokerageAmt" && rows.some(r => r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== ""));
      cols = [...visible].sort((a,b) => {
        const ai = columnOrder.indexOf(a), bi = columnOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }

    const label = (k) => k.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toUpperCase();
    const cell = (r,k) => {
      const v = r[k];
      if (v === undefined || v === null || v === "") return "";
      if (k.includes("Date")) return fmtDate(v);
      if (k.includes("Amt") || k.includes("Balance") || k.includes("TDS") || k === "_balance") return "₹" + fmt(v);
      return String(v);
    };

    const w = window.open('', '', 'height=700,width=1100');
    let html = `<style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; }
      h2 { font-size: 16px; margin: 0 0 8px; }
      table { width:100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
      th, td { border: 1px solid #000; padding: 4px 6px; }
      th { background: #eee; text-align: left; }
      td { word-break: break-word; }
    </style>`;
    
    let subHead = "";
    if (summaryType === "party" && filterParty) {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">PARTY: ${filterParty}</div>`;
      if (filterBroker) subHead += `<div style="font-size:11px;margin:0 0 8px">BROKER: ${filterBroker}</div>`;
    } else if (summaryType === "broker" && filterBroker) {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">BROKER: ${filterBroker}</div>`;
      if (filterParty) subHead += `<div style="font-size:11px;margin:0 0 8px">PARTY: ${filterParty}</div>`;
    }
    html += `<h2>${title} — ${rows.length} records</h2>${subHead}<table><thead><tr>`;

    cols.forEach(k => html += `<th>${label(k)}</th>`);
    html += `</tr></thead><tbody>`;
  rows.forEach(r => {
      html += '<tr>';
      cols.forEach(k => html += `<td>${cell(r,k)}</td>`);
      html += '</tr>';
    });
    if (summaryType !== "none") {
      html += '<tr style="font-weight:bold;background:#eee">';
      cols.forEach((k, i) => {
        if (NUMERIC_TOTAL_KEYS.has(k)) {
          html += `<td>₹${fmt(Math.round(sumCol(rows, k)))}</td>`;
        } else {
          html += `<td>${i === 0 ? "TOTAL" : ""}</td>`;
        }
      });
      html += '</tr>';
    }
    html += `</tbody></table>`;
    w.document.write(html); w.document.close(); w.print();
  };
  
  const exportSalesWorkingCSV = () => {
    const parseRef = (ref) => {
      const s = String(ref || "").trim();
      const m = s.match(/^(\d+)(.*)$/);
      return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
    };
    const rowsData = salesWorkingData
      .filter(r => !salesSearch ||
        r.refNo.toString().includes(salesSearch) ||
        r.partyName.toLowerCase().includes(salesSearch.toLowerCase()))
      .sort((a, b) => {
        const pa = parseRef(a.refNo), pb = parseRef(b.refNo);
        return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
      });

    if (rowsData.length === 0) { showToast("Nothing to export", "error"); return; }

  const headers = ["Ref No","Date","Party","Broker","Item","Qty","Rate","Rec Weight","Shortage","Shortage Amt","Gunny Wt","Gunny Amt","Claim %","Claim","CD %","CD","TDS","Net Amt","Bk Date 1","Bk Pmt 1","Bk Date 2","Bk Pmt 2","Bk Date 3","Bk Pmt 3","Pending","Days"];

    const rows = rowsData.map(r => {
      const c = calculateSalesFields(r);
      return [
        r.refNo, r.date, r.partyName, r.broker, r.itemName,
        r.qty, r.rate, r.receivedWeight,
        c.shortage, Math.round(c.shortageAmount),
        c.gunnyWeight, Math.round(c.gunnyAmount),
        r.claimPct, Math.round(parseFloat(r.claim) || 0),
        r.cdPct, Math.round(c.cd),
        Math.round(parseFloat(r.tdsReceived) || 0),
        Math.round(c.netAmt),
        r.bankDate1, Math.round(parseFloat(r.bankPmt1) || 0),
        r.bankDate2, Math.round(parseFloat(r.bankPmt2) || 0),
        r.bankDate3, Math.round(parseFloat(r.bankPmt3) || 0),
        Math.round(c.pendingAmt), c.days
      ];
    });

    downloadCSV("Sales_Working.csv", headers, rows);
  };
  
  const exportDataCSV = () => {
    if (filtered.length === 0) { showToast("Nothing to export", "error"); return; }

   const columnOrder = ["_bankLinked","refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","rate","billQty","receiveQty","_shortage","halfKgValue","gunnyWeight","_halfKgQty","_netQty","_netAmt1","cdPct","_cdAmt","qualityClaim","hammali","freight","others","_netAmt","brokerageRate","_brokerageAmt","_tds","_finalAmt","bankAmt1","bankDate1","bankName1","bankAmt2","bankDate2","bankName2","bankAmt3","bankDate3","bankName3","_balance","note"];
    const partyBaseColumns = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","rate","billQty","_shortage","_halfKgQty","_netQty","_netAmt1","_cdAmt","qualityClaim","hammali","freight","others","_netAmt","_tds","_brokerageAmt","_finalAmt"];
    const brokerBaseColumns = partyBaseColumns;

    let cols;
    if (summaryType === "party") {
      cols = partyBaseColumns.filter(k => filtered.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0"))
        .filter(k => !(k === "partyName") && !(k === "brokerName" && filterBroker));
    } else if (summaryType === "broker") {
      cols = brokerBaseColumns.filter(k => filtered.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0"))
        .filter(k => !(k === "brokerName") && !(k === "partyName" && filterParty));
    } else {
      const allKeys = [...new Set(filtered.flatMap(r => Object.keys(r)))];
      const visible = allKeys.filter(k => k !== "brokerageAmt" && (filtered.some(r => r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== "") || k === "_balance"));
      cols = [...visible].sort((a,b) => {
        const ai = columnOrder.indexOf(a), bi = columnOrder.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }

    const label = (k) => k.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toUpperCase();
    const cell = (r,k) => {
      const v = r[k];
      if (v === undefined || v === null || v === "") return "";
      if (k.includes("Date")) return fmtDate(v);
      if (k.includes("Amt") || k.includes("Balance") || k.includes("TDS") || k === "_balance") return Math.round(parseFloat(v) || 0);
      return String(v);
    };

    const headers = cols.map(label);
    const rows = filtered.map(r => cols.map(k => cell(r, k)));

    if (summaryType !== "none") {
      const totalRow = cols.map((k, i) => {
        if (NUMERIC_TOTAL_KEYS.has(k)) return Math.round(sumCol(filtered, k));
        return i === 0 ? "TOTAL" : "";
      });
      rows.push(totalRow);
    }

    const name = summaryType === "party" ? `Data_${filterParty || "party"}` : summaryType === "broker" ? `Data_${filterBroker || "broker"}` : "Data_Register";
    downloadCSV(`${name}.csv`, headers, rows);
  };
  
  const printPmtTable = (rows, title) => {
    if (rows.length === 0) { showToast("Nothing to print", "error"); return; }

    const pmtColumns = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","_finalAmt","bankAmt1","bankDate1","bankName1","bankAmt2","bankDate2","bankName2","bankAmt3","bankDate3","bankName3","_balance"];
    const partyBasePmt = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","_finalAmt","bankAmt1","bankDate1","bankName1","bankAmt2","bankDate2","bankName2","bankAmt3","bankDate3","bankName3","_balance"];
    const brokerBasePmt = ["refNo","deliveryAt","truckNo","partyName","brokerName","billDate","billNo","_finalAmt","bankAmt1","bankDate1","bankName1","bankAmt2","bankDate2","bankName2","bankAmt3","bankDate3","bankName3","_balance"];

    let cols;
    if (summaryType === "party") {
      cols = partyBasePmt.filter(k => rows.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0") || k === "_finalAmt" || k === "_balance")
        .filter(k => {
          if (k === "partyName") return false;
          if (k === "brokerName" && filterBroker) return false;
          return true;
        });
    } else if (summaryType === "broker") {
      cols = brokerBasePmt.filter(k => rows.some(r => r[k] && String(r[k]).trim() && String(r[k]).trim() !== "0") || k === "_finalAmt" || k === "_balance")
        .filter(k => {
          if (k === "brokerName") return false;
          if (k === "partyName" && filterParty) return false;
          return true;
        });
    } else {
      cols = pmtColumns.filter(k => rows.some(r => r[k] && String(r[k]).trim()) || k === "_finalAmt" || k === "_balance");
    }

    const label = (k) => k.replace(/_/g," ").replace(/([A-Z])/g," $1").trim().toUpperCase();
    const cell = (r,k) => {
      const v = r[k];
      if (v === undefined || v === null || v === "") return (k === "_finalAmt" || k === "_balance") ? "₹0" : "";
      if (k.includes("Date")) return fmtDate(v);
      if (k.includes("Amt") || k.includes("Balance") || k === "_balance" || k === "_finalAmt") return "₹" + fmt(v);
      return String(v);
    };

    let subHead = "";
    if (summaryType === "party" && filterParty) {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">PARTY: ${filterParty}</div>`;
      if (filterBroker) subHead += `<div style="font-size:11px;margin:0 0 8px">BROKER: ${filterBroker}</div>`;
    } else if (summaryType === "broker" && filterBroker) {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">BROKER: ${filterBroker}</div>`;
      if (filterParty) subHead += `<div style="font-size:11px;margin:0 0 8px">PARTY: ${filterParty}</div>`;
    }

    const w = window.open('', '', 'height=700,width=1100');
    let html = `<style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; }
      h2 { font-size: 16px; margin: 0 0 8px; }
      table { width:100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
      th, td { border: 1px solid #000; padding: 4px 6px; }
      th { background: #eee; text-align: left; }
      td { word-break: break-word; }
    </style>`;
    html += `<h2>${title} — ${rows.length} records</h2>${subHead}<table><thead><tr>`;
    cols.forEach(k => html += `<th>${label(k)}</th>`);
    html += `</tr></thead><tbody>`;
rows.forEach(r => {
      html += '<tr>';
      cols.forEach(k => html += `<td>${cell(r,k)}</td>`);
      html += '</tr>';
    });
    if (summaryType !== "none") {
      html += '<tr style="font-weight:bold;background:#eee">';
      cols.forEach((k, i) => {
        if (PMT_TOTAL_KEYS.has(k)) {
          html += `<td>₹${fmt(Math.round(sumCol(rows, k)))}</td>`;
        } else {
          html += `<td>${i === 0 ? "TOTAL" : ""}</td>`;
        }
      });
      html += '</tr>';
    }
    html += `</tbody></table>`;
    w.document.write(html); w.document.close(); w.print();
  };

  const printSalesSummary = (rows, visibleCols, mode, primaryName, secondaryName) => {
    if (rows.length === 0) { showToast("Nothing to print", "error"); return; }

const money = (v) => (v === 0 || v === "" || v == null) ? "" : "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const fmtIso = (d) => { if (!d) return ""; const p = String(d).split('-'); return (p.length === 3 && p[0].length === 4) ? `${p[2]}-${p[1]}-${p[0]}` : d; };

    const cellVal = (col, rec, calc) => {
      const v = col.calc ? calc[col.key] : rec[col.key];
      if (col.type === "money") return money(v);
      if (col.type === "num") return (v === 0 || v === "" || v == null) ? "" : String(v);
      if (col.type === "date") return fmtIso(v);
      return v || "";
    };

    const CALC_KEYS = new Set(["netAmt", "pendingAmt", "shortageAmount", "gunnyAmount"]);
    const totalFor = (key) => rows.reduce((s, { r, c }) =>
      s + (CALC_KEYS.has(key) ? (parseFloat(c[key]) || 0) : (parseFloat(r[key]) || 0)), 0);

    let subHead = "";
    if (mode === "party") {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">PARTY: ${primaryName}</div>`;
      if (secondaryName) subHead += `<div style="font-size:11px;margin:0 0 8px">BROKER: ${secondaryName}</div>`;
    } else {
      subHead += `<div style="font-size:13px;font-weight:bold;margin:0 0 2px">BROKER: ${primaryName}</div>`;
      if (secondaryName) subHead += `<div style="font-size:11px;margin:0 0 8px">PARTY: ${secondaryName}</div>`;
    }

    const w = window.open('', '', 'height=700,width=1100');
  let html = `<style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; }
      h2 { font-size: 16px; margin: 0 0 8px; }
      table { width:100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
      th, td { border: 1px solid #000; padding: 4px 6px; }
      th { background: #eee; text-align: left; }
      td { word-break: break-word; }
    </style>`;
    html += `<h2>${mode === "party" ? "PARTYWISE" : "BROKERWISE"} SUMMARY — ${rows.length} records</h2>${subHead}<table><thead><tr>`;
    visibleCols.forEach(col => html += `<th>${col.label.toUpperCase()}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach(({ r, c }) => {
      html += '<tr>';
      visibleCols.forEach(col => html += `<td>${cellVal(col, r, c)}</td>`);
      html += '</tr>';
    });
    html += '<tr style="font-weight:bold;background:#eee">';
    visibleCols.forEach((col, i) => {
      if (SALES_SUMMARY_TOTAL_KEYS.has(col.key)) {
   html += `<td>₹${Number(totalFor(col.key)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>`;
      } else {
        html += `<td>${i === 0 ? "TOTAL" : ""}</td>`;
      }
    });
    html += '</tr></tbody></table>';
    w.document.write(html); w.document.close(); w.print();
  };
  
  const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", transition:"border-color .15s" };
  const lbl = { fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:5 };
  const sec = { background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:14, padding:"20px 22px", marginBottom:20 };
  const stitle = { fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#f59e0b", marginBottom:16 };
  const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 };

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#0f1117", minHeight:"100vh", color:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          input:focus{border-color:#f59e0b!important}
          input::placeholder{color:#334155}
        `}</style>
        <div style={{ width:"100%", maxWidth:450, padding:"40px", background:"#151b2a", borderRadius:14, border:"1px solid #1e2a3a", textAlign:"center" }}>
        <div style={{ fontSize:28, fontWeight:800, color:"#f1f5f9", marginBottom:32, letterSpacing:"-0.5px" }}>I K ENTERPRISES</div>
        <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:8 }}>EMAIL</label>
            <input
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              placeholder="Enter email..."
              style={{ ...inp, marginBottom:0 }}
            />
          </div>
          
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#64748b", letterSpacing:"0.3px", display:"block", marginBottom:8 }}>PASSWORD</label>
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter password..."
              style={{ ...inp, marginBottom:0 }}
            />
          </div>
          
          <button
            onClick={handleLogin}
            style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:8, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", width:"100%", marginBottom:20 }}
          >
            LOGIN
          </button>
          
    
        </div>
        
        {toast && (
          <div style={{ position:"fixed", bottom:28, right:28, background:toast.type==="error"?"#ef4444":"#22c55e", color:"#fff", padding:"12px 18px", borderRadius:10, fontWeight:600, fontSize:13, zIndex:9999 }}>
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

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

    @media print {
          body * { visibility: hidden !important; }
          .hisab-controls { display: none !important; }
          #hisab-print, #hisab-print * { visibility: visible !important; }
      #hisab-print {
            position: absolute !important;
            left: 50% !important;
            top: 1.5mm !important;
            transform: translateX(-50%) !important;
            transform-origin: top center !important;
            zoom: 0.92 !important;
            background: #fff !important;
            box-shadow: none !important;
          }
      html, body {
            background: #fff !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          @page { size: A5; margin: 2mm; }
        }
      `}</style>

<header style={{ background:"linear-gradient(135deg,#1a1f2e 0%,#0f1117 100%)", borderBottom:"1px solid #1e2a3a", padding:"0 24px" }}>
  <div style={{ maxWidth:1500, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:40, height:40, background:"linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#fff" }}>IK</div>
    </div>
    
 <div style={{ display:"flex", alignItems:"center", gap:16, flex:1, marginLeft:40, minWidth:0 }}>
  
  {/* NAV CONTAINER WITH SCROLLBAR */}
  <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        {/* NAV TABS */}
        <nav 
          id="navContainer"
          style={{ 
            display:"flex", 
            gap:4, 
            overflowX:"auto", 
            overflowY:"hidden",
            scrollBehavior:"smooth",
            paddingBottom:"8px",
            marginBottom:"-8px",
            minWidth:0
          }}
        >
          {allTabs.map(tab => {
            const showTab = tab === "users" ? currentUser?.role === "Admin" : currentUser?.tabs?.includes(tab);
            return showTab ? (
              <button key={tab} onClick={() => { setView(tab); if(tab==="entry") handleNew(); }}
                style={{ 
                  padding:"8px 18px", 
                  borderRadius:8, 
                  border:"none", 
                  cursor:"pointer", 
                  fontSize:13, 
                  fontWeight:600, 
                  background: view===tab ? "#f59e0b" : "transparent", 
                  color: view===tab ? "#0f1117" : "#94a3b8", 
                  transition:"all .15s",
                  whiteSpace:"nowrap",
                  flexShrink:0
                }}>
                {tabLabels[tab]}
              </button>
            ) : null;
          })}
        </nav>
        
        {/* HORIZONTAL SCROLLBAR */}
        <div 
          id="navScrollbar" 
          style={{ 
            height:"6px", 
            background:"#0f1117", 
            borderTop:"1px solid #1e2a3a",
            overflowX:"auto", 
            overflowY:"hidden",
            borderRadius:"0 0 4px 4px"
          }}
        >
          <div 
            style={{ 
              height:"4px", 
              background:"#2a3a50", 
              borderRadius:"2px", 
              width:`${navScrollWidth}px`,
              margin:"1px",
              transition:"background 0.2s"
            }}
          />
        </div>
      </div>
      
   {/* USER INFO & LOGOUT */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, paddingLeft:16, borderLeft:"1px solid #1e2a3a", flexShrink:0 }}>
        <button onClick={handleLogout} style={{ background:"#ef4444", border:"none", borderRadius:6, padding:"6px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", flexShrink:0 }}>
          LOGOUT
        </button>
        <div style={{ fontSize:11, color:"#64748b" }}>{currentUser.username}</div>
      </div>
   {/* FINANCIAL YEAR SELECTOR */}
      <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:16, borderLeft:"1px solid #1e2a3a", flexShrink:0 }}>
        <span style={{ fontSize:10, color:"#64748b", fontWeight:600, letterSpacing:"0.5px" }}>FY</span>
        <select
          value={activeFY}
          onChange={e => setActiveFY(e.target.value)}
          style={{ background:"#0f1117", border:"1px solid #f59e0b", borderRadius:8, padding:"6px 10px", color:"#f59e0b", fontSize:13, fontWeight:700, cursor:"pointer", outline:"none" }}
        >
       {financialYears
  .filter(fyObj => {
    if (currentUser.role === "Admin") return true;              // admin sees all
    const allowed = currentUser.allowedFys || [];
    return allowed.length === 0 || allowed.includes(fyObj.fy);  // empty = all allowed
  })
  .map(fy => (
    <option key={fy.fy} value={fy.fy}>{fy.fy}</option>
  ))}
        </select>
      </div>
   
    </div>
  </div>
</header>

      <div style={{ maxWidth:1500, margin:"0 auto", padding:"0" }}>
               
                {view === "entry" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 290px", gap:24, alignItems:"start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                  <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9" }}>
                    {editMode ? `Editing · Ref #${form.refNo}` : "New Transaction Entry"}
                  </h2>
                  {form.refNo && <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                    {editMode ? "EDITING MODE — changes will update existing record" : ""}
                  </div>}
                </div>
                {editMode && <button onClick={handleNew} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:10, padding:"9px 18px", color:"#94a3b8", fontWeight:600, fontSize:13, cursor:"pointer" }}>✕ Cancel Edit</button>}
              </div>

              {/* Section 1: Transaction Details */}
              <div style={sec}>
                <div style={stitle}>Transaction Details</div>
                <div style={grid}>
               <div><label style={lbl}>Ref No *</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input name="refNo" value={form.refNo} onChange={handleChange} style={{ ...inp, borderColor: form.refNo ? "#f59e0b" : "#1e2a3a", flex:1 }} placeholder="Enter Ref No" />
                      <button onClick={handleEditByRef} style={{ background:"linear-gradient(135deg,#38bdf8,#0284c7)", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                        ✏ Edit
                      </button>
                    </div>
                    {!editMode && form.refNo.trim() && records.some(r => r.refNo.trim().toUpperCase() === form.refNo.trim().toUpperCase()) && (
                      <div style={{ fontSize:11, color:"#ef4444", fontWeight:600, marginTop:4 }}>
                        ⚠ Ref No {form.refNo.trim()} already exists
                      </div>
                    )}
                  </div>        
                   <div><label style={lbl}>Bill No</label>
                 <input name="billNo" value={form.billNo} onChange={handleChange} style={inp} placeholder="Bill No" />
                 </div>
                  <div><label style={lbl}>Bill Date</label>
                    <input
                    type="date"
                   name="billDate"
                   value={form.billDate}
                   onChange={handleChange}
                   min={`${parseInt(activeFY.split("-")[0], 10)}-04-01`}
                   max={`${parseInt(activeFY.split("-")[0], 10) + 1}-03-31`}
                    style={inp}
                    />
                  </div>
                  <div><label style={lbl}>Truck No</label>
                    <input name="truckNo" value={form.truckNo} onChange={handleChange} style={inp} placeholder="e.g. MP09HG1234" />
                  </div>
                  <div><label style={lbl}>Party Name</label>
                    <AutoComplete name="partyName" value={form.partyName} onChange={handleChange} options={parties} placeholder="Select party..." style={inp} />
                  </div>
                  <div><label style={lbl}>Broker Name</label>
                    <AutoComplete name="brokerName" value={form.brokerName} onChange={handleChange} options={brokers} placeholder="Select broker..." style={inp} />
                  </div>
                  <div style={{ gridColumn:"span 2" }}><label style={lbl}>Delivery At</label>
                    <AutoComplete name="deliveryAt" value={form.deliveryAt} onChange={handleChange} options={deliveries} placeholder="Delivery location..." style={inp} />
                  </div>
                </div>
              </div>

              {/* Section 2: Qty & Rate */}
              <div style={sec}>
                <div style={stitle}>Quantity, Rate & Deductions</div>
                <div style={grid}>
                  <div><label style={lbl}>Bill Qty (Qt)</label>
                    <input type="number" name="billQty" value={form.billQty} onChange={handleChange} style={inp} placeholder="0.00" />
                  </div>
                  <div><label style={lbl}>Rate (per Qt) ₹</label>
                    <input type="number" name="rate" value={form.rate} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Receive Qty (Qt)</label>
                    <input type="number" name="receiveQty" value={form.receiveQty} onChange={handleChange} style={inp} placeholder="0.00" />
                  </div>
                  <div><label style={lbl}>0.5 KG Value (e.g. 0.5, 0.3)</label>
                    <input type="number" name="halfKgValue" value={form.halfKgValue} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Gunny Bag Wt (Qt)</label>
                    <input type="number" step="0.001" name="gunnyWeight" value={form.gunnyWeight} onChange={handleChange} style={inp} placeholder="0.000" />
                   </div>
                  <div><label style={lbl}>CD %</label>
                    <input type="number" name="cdPct" value={form.cdPct} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Quality Claim ₹</label>
                    <input type="number" name="qualityClaim" value={form.qualityClaim} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Hammali ₹</label>
                    <input type="number" name="hammali" value={form.hammali} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Freight ₹</label>
                    <input type="number" name="freight" value={form.freight} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Others ₹</label>
                    <input type="number" name="others" value={form.others} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Brokerage Rate</label>
                    <input type="number" name="brokerageRate" value={form.brokerageRate} onChange={handleChange} style={inp} placeholder="0" />
                  </div>
                  <div><label style={lbl}>Brokerage Amt (manual override)</label>
                    <input type="number" name="brokerageAmt" value={form.brokerageAmt} onChange={handleChange} style={inp} placeholder="Auto calculated" />
                  </div>
                  <div><label style={lbl}>TDS/TCS <span style={{ color:"#22c55e", fontWeight:700 }}>AUTO</span></label>
                    <input disabled value={"₹ " + (autoTDS||0).toLocaleString("en-IN")} style={{ ...inp, color:"#22c55e", fontWeight:700, cursor:"not-allowed", opacity:0.8 }} />
                  </div>
                </div>
              </div>

              {/* Section 3: Payments */}
              <div style={sec}>
                <div style={stitle}>Bank Payments Received</div>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom: i<3?12:0 }}>
                    <div><label style={lbl}>Bank Amount {i} ₹</label>
                      <input type="number" name={`bankAmt${i}`} value={form[`bankAmt${i}`]} onChange={handleChange} style={inp} placeholder="0" />
                    </div>
                    <div><label style={lbl}>Bank Date {i}</label>
                      <input type="date" name={`bankDate${i}`} value={form[`bankDate${i}`]} onChange={handleChange} style={inp} />
                    </div>
                    <div><label style={lbl}>Bank Name {i}</label>
                      <select name={`bankName${i}`} value={form[`bankName${i}`]} onChange={handleChange} style={{ ...inp }}>
                        <option value="">Select Bank</option>
                        {banks.map(b => <option key={b} value={b}>{b}</option>)}
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Section 4: Ref Links & Note */}
              <div style={sec}>
                <div style={stitle}>Linked References & Note</div>
                <div style={grid}>
                  <div><label style={lbl}>Link Ref A <span style={{ color:"#64748b", fontWeight:400 }}>(multi-location)</span></label>
                    <input name="refA" value={form.refA} onChange={handleChange} style={inp} placeholder="Ref No for location A" />
                  </div>
                  <div><label style={lbl}>Link Ref B</label>
                    <input name="refB" value={form.refB} onChange={handleChange} style={inp} placeholder="Ref No for location B" />
                  </div>
                  <div style={{ gridColumn:"span 2" }}><label style={lbl}>Note</label>
                    <input name="note" value={form.note} onChange={handleChange} style={inp} placeholder="Any remarks..." />
                  </div>
                </div>
              </div>

             <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <button onClick={handleSubmit} style={{ background:"linear-gradient(135deg,#f59e0b,#ef4444)", border:"none", borderRadius:10, padding:"13px 32px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", letterSpacing:"0.3px" }}>
                  {editMode ? "✔ Update Record" : "✔ Submit Form"}
                </button>
                <button onClick={handleNew} style={{ background:"#1e2a3a", border:"1px solid #2a3a50", borderRadius:10, padding:"12px 22px", color:"#94a3b8", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  Clear Form
                </button>
                {editMode && (
                  <button onClick={handleDeleteEntry} style={{ marginLeft:"auto", background:"#ef4444", border:"none", borderRadius:10, padding:"12px 22px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                    🗑 Delete Record
                  </button>
                )}
              </div>
            </div>

            {/* LIVE CALC PANEL */}
            <div style={{ background:"linear-gradient(135deg,#1a1f2e,#0f1117)", border:"1px solid #2a3a50", borderRadius:14, padding:"20px 22px", position:"sticky", top:20 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", color:"#38bdf8", marginBottom:16 }}>⚡ Live Calculation</div>
              {[
                ["Shortage Qty", calc.shortage + " Qt", false],
                ["0.5 KG Qty Deduct", calc.halfKgQty + " Qt", false],
                ["Gunny Deduct", calc.gunnyDeduct + " Qt", false],
                ["Net Qty", calc.netQty + " Qt", false],
                ["Net Amt 1 (Gross)", "₹ " + fmt(calc.netAmt1), false],
                ["CD Amount", "₹ " + fmt(calc.cdAmt), false],
                ["Brokerage", "₹ " + fmt(calc.brokerageAmt), false],
                ["Net Amount", "₹ " + fmt(calc.netAmt), false],
                ["TDS (Auto)", "₹ " + fmt(autoTDS), false],
                ["Final Amount", "₹ " + fmt(calc.finalAmt), false],
              ].map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #1e2a3a", fontSize:13 }}>
                  <span style={{ color:"#64748b" }}>{l}</span>
                  <span style={{ fontWeight:600, color:"#e2e8f0", fontVariantNumeric:"tabular-nums" }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", marginTop:4 }}>
                <span style={{ fontWeight:700, color:"#94a3b8" }}>Balance Due</span>
                <span style={{ fontWeight:800, fontSize:16, fontVariantNumeric:"tabular-nums", color: calc.balance < 0 ? "#ef4444" : calc.balance === 0 ? "#22c55e" : "#f59e0b" }}>
                  ₹ {fmt(calc.balance)}
                </span>
              </div>
              <div style={{ marginTop:12, padding:"10px 14px", background:"#0f1117", borderRadius:8, fontSize:12, color:"#64748b" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span>Party Bill Amt</span>
                  <span style={{ color:"#94a3b8", fontWeight:600 }}>₹ {fmt(calc.partyBillAmt)}</span>
                </div>
               {form.partyName && form.billDate && (() => {
                  const fyStartYear = parseInt(activeFY.split("-")[0], 10);
                  const FY_START = new Date(fyStartYear, 3, 1); // April 1 of active FY
                  const thisBillDate = new Date(form.billDate);

                  // If this record is before FY — show not applicable
                  if (thisBillDate < FY_START) {
                    return (
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span>TDS applicable from</span>
                        <span style={{ color:"#64748b", fontWeight:600 }}>Apr 1, {fyStartYear}</span>
                      </div>
                    );
                  }

                  // Sort all party records by date+billNo
                  const partyRecs = records
                    .filter(r => r.partyName?.trim() === form.partyName?.trim() && r.billDate)
                    .sort((a,b) => a.billDate.localeCompare(b.billDate) || String(a.billNo).localeCompare(String(b.billNo)));

                  // Cumulative up to and including current ref no — only FY records
                  const seen = new Set();
                  let cumulative = 0;
                  let foundSelf = false;
                  for (const r of partyRecs) {
                    if (new Date(r.billDate) < FY_START) continue;
                    const key = r.partyName?.trim() + "__" + r.billNo?.trim();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    // Always use Bill Qty x Rate for cumulative
                    const ap = Math.round((parseFloat(r.billQty)||0)*(parseFloat(r.rate)||0));
                    cumulative += ap;
                    if (r.refNo?.trim() === form.refNo?.trim()) { foundSelf = true; break; }
                  }
                  // If new entry (not yet saved), add this bill
                  if (!foundSelf && form.billQty && form.rate) {
                    cumulative += Math.round((parseFloat(form.billQty)||0)*(parseFloat(form.rate)||0));
                  }
                  const crossed = cumulative >= 5000000;
                  const remaining = 5000000 - cumulative;
                  return (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span>Cumulative till this bill</span>
                        <span style={{ color: crossed?"#ef4444":"#94a3b8", fontWeight:700 }}>₹ {fmt(cumulative)}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between" }}>
                        <span>TDS Threshold (₹50L)</span>
                        <span style={{ color: crossed?"#ef4444":"#22c55e", fontWeight:700 }}>
                          {crossed ? "⚠ CROSSED by ₹"+fmt(Math.abs(remaining)) : "₹ "+fmt(remaining)+" left"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
{view === "users" && currentUser.role === "Admin" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>USER MANAGEMENT</h2>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
      {currentUser.role === "Admin" && (
  <div style={{ marginBottom:24, padding:16, background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:10 }}>
    <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b", marginBottom:12 }}>➕ CREATE FINANCIAL YEAR</div>
    <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
      <span style={{ fontSize:12, color:"#64748b" }}>Start year (April):</span>
      <input
        type="number"
        value={newFYStart}
        onChange={e => setNewFYStart(e.target.value)}
        placeholder="e.g. 2025"
        style={{ width:110, background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"8px 10px", color:"#e2e8f0", fontSize:13, outline:"none" }}
      />
      <span style={{ fontSize:12, color:"#cbd5e1" }}>
        {newFYStart && /^\d{4}$/.test(newFYStart)
          ? `→ FY ${newFYStart}-${String((parseInt(newFYStart,10)+1)%100).padStart(2,'0')}`
          : ""}
      </span>
      <button
        onClick={async () => {
          const y = parseInt(newFYStart, 10);
          if (!y || newFYStart.length !== 4) { showToast("Enter a valid 4-digit start year", "error"); return; }
          if (financialYears.some(f => f.startYear === y)) { showToast("That FY already exists", "error"); return; }
          const res = await createFinancialYear(y);
          if (!res.ok) { showToast("Failed to create FY: " + res.error, "error"); return; }
          setFinancialYears(await loadFinancialYears());
          setNewFYStart("");
          showToast(`Created FY ${res.fy}`, "success");
        }}
        style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}
      >
        Create
      </button>
    </div>
    <div style={{ fontSize:11, color:"#64748b", marginTop:10 }}>
      Existing: {financialYears.map(f => f.fy).join(", ") || "none"}
    </div>
  </div>
)}
      {/* LEFT: ADD NEW USER OR EDIT EXISTING */}
      <div style={sec}>
        <div style={stitle}>{editingUserId ? "✏️ EDIT USER" : "➕ ADD NEW USER"}</div>
        
        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Username</label>
          <input
            value={editingUserId ? editUsername : newUsername}
            onChange={e => editingUserId ? setEditUsername(e.target.value) : setNewUsername(e.target.value)}
            placeholder="Enter username..."
            style={inp}
          />
        </div>
        
        
        
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Role</label>
          <select 
            value={editingUserId ? editRole : newUserRole} 
            onChange={e => editingUserId ? setEditRole(e.target.value) : setNewUserRole(e.target.value)} 
            style={inp}
          >
            <option value="Admin">Admin</option>
            <option value="Restricted">Restricted</option>
          </select>
        </div>
        
        <div style={{ marginBottom:16 }}>
          <label style={{...lbl, marginBottom:10}}>Tab Access</label>
          <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:12 }}>
            {allTabs.map(tab => (
              <label key={tab} style={{ display:"flex", alignItems:"center", marginBottom:10, cursor:"pointer" }}>
                <input
                  type="checkbox"
                  checked={editingUserId ? editTabs.includes(tab) : selectedTabs.includes(tab)}
                  onChange={() => editingUserId ? handleEditToggleTab(tab) : handleToggleTab(tab)}
                  style={{ marginRight:8, cursor:"pointer", width:16, height:16 }}
                />
                <span style={{ fontSize:12, color:"#cbd5e1" }}>{tabLabels[tab]}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom:16 }}>
          <label style={{...lbl, marginBottom:10}}>Financial Year Access</label>
          <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:12 }}>
            {financialYears.length === 0 ? (
              <span style={{ fontSize:11, color:"#64748b" }}>No financial years created yet.</span>
            ) : financialYears.map(fyObj => {
              const fy = fyObj.fy;
              return (
                <label key={fy} style={{ display:"flex", alignItems:"center", marginBottom:10, cursor:"pointer" }}>
                  <input
                    type="checkbox"
                    checked={editingUserId ? editFYs.includes(fy) : selectedFYs.includes(fy)}
                    onChange={() => editingUserId ? handleEditToggleFY(fy) : handleToggleFY(fy)}
                    style={{ marginRight:8, cursor:"pointer", width:16, height:16 }}
                  />
                  <span style={{ fontSize:12, color:"#cbd5e1" }}>{fy}</span>
                </label>
              );
            })}
            <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>
              Leave all unchecked to allow all years.
            </div>
          </div>
        </div>     
     
        <div style={{ display:"flex", gap:12 }}>
          <button
            onClick={editingUserId ? handleSaveEdit : handleAddUser}
            style={{ flex:1, background: editingUserId ? "linear-gradient(135deg,#3b82f6,#0284c7)" : "linear-gradient(135deg,#22c55e,#16a34a)", border:"none", borderRadius:8, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
          >
            {editingUserId ? "✔ SAVE CHANGES" : "+ ADD USER"}
          </button>
          {editingUserId && (
            <button
              onClick={handleCancelEdit}
              style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
            >
              ✕ CANCEL
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: ALL USERS LIST */}
      <div style={sec}>
        <div style={stitle}>ALL USERS ({users.length})</div>
        <div style={{ maxHeight:500, overflowY:"auto" }}>
          {users.map(user => (
            <div 
              key={user.id} 
              style={{ 
                display:"flex", 
                flexDirection:"column", 
                padding:"14px", 
                background:"#0f1117", 
                borderRadius:8, 
                marginBottom:12, 
                border: editingUserId === user.id ? "2px solid #22c55e" : "1px solid #1e2a3a",
                transition:"all 0.2s"
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{user.username}</div>
                  <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>
                    <span style={{ background: user.role === "Admin" ? "#ef444466" : "#f59e0b66", padding:"2px 6px", borderRadius:4, marginRight:6 }}>
                      {user.role}
                    </span>
                    {new Date(user.created).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {user.id !== currentUser.id ? (
                    <>
                      <button
                        onClick={() => handleStartEdit(user)}
                        style={{ 
                          background: editingUserId === user.id ? "#22c55e" : "#3b82f6", 
                          border:"none", 
                          borderRadius:6, 
                          padding:"4px 10px", 
                          color:"#fff", 
                          fontWeight:700, 
                          fontSize:11, 
                          cursor:"pointer",
                          transition:"background 0.2s"
                        }}
                      >
                        {editingUserId === user.id ? "✏️ EDITING" : "✏️ EDIT"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{ background:"#ef4444", border:"none", borderRadius:6, padding:"4px 10px", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer" }}
                      >
                        DEL
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize:10, color:"#64748b", fontStyle:"italic" }}>Current User</span>
                  )}
                </div>
              </div>
              
              <div style={{ fontSize:9, color:"#94a3b8", padding:8, background:"#151b2a", borderRadius:6, display:"flex", flexWrap:"wrap", gap:6 }}>
                {user.tabs && user.tabs.map(tab => (
                  <span key={tab} style={{ background:"#22c55e66", padding:"2px 6px", borderRadius:3, whiteSpace:"nowrap" }}>
                    ✓ {tabLabels[tab]}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
{view === "banking" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>🏦 BANKING RECONCILIATION</h2>
    
    {/* Bank Sub-Tabs */}
    <div style={{ display:"flex", gap:8, marginBottom:20 }}>
      {["HDFC", "SBI", "VASB"].map(bank => (
        <button
          key={bank}
          onClick={() => { setSelectedBankTab(bank); setPartyFilterBank(""); }}
          style={{
            padding:"10px 20px",
            borderRadius:8,
            border:"none",
            background: selectedBankTab === bank ? "#f59e0b" : "#1e2a3a",
            color: selectedBankTab === bank ? "#0f1117" : "#94a3b8",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          🏢 {bank}
        </button>
      ))}
    </div>
      {/* SUMMARY CARDS */}
<div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
  <div style={{ flex:1, background:"#151b2a", borderRadius:8, padding:16, border:"1px solid #1e2a3a", minWidth:"200px" }}>
    <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginBottom:6 }}>TOTAL TRANSACTIONS</div>
    <div style={{ fontSize:24, fontWeight:800, color:"#f59e0b" }}>{bankingData[selectedBankTab].length}</div>
  </div>
  
  <div style={{ flex:1, background:"#151b2a", borderRadius:8, padding:16, border:"1px solid #1e2a3a", minWidth:"200px" }}>
    <div style={{ fontSize:11, color:"#64748b", fontWeight:600, marginBottom:6 }}>LATEST STATEMENT DATE</div>
    <div style={{ fontSize:24, fontWeight:800, color:"#22c55e" }}>
  {(() => {
    if (bankingData[selectedBankTab].length === 0) return "—";
    
    const convertToComparable = (dateStr) => {
      // Convert DD-MM-YY to YYYYMMDD for proper sorting
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      let [day, month, year] = parts;
      if (year.length === 2) year = "20" + year;
      return year + month.padStart(2, '0') + day.padStart(2, '0');
    };
    
    const sorted = [...bankingData[selectedBankTab]].sort((a, b) => 
      convertToComparable(b.date).localeCompare(convertToComparable(a.date))
    );
    return sorted[0].date;
  })()}
</div>

  </div>
</div>
    {/* Action Buttons */}
    <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
      <button
        onClick={() => handlePasteBankData(selectedBankTab)}
        style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}
      >
        📋 Paste Bank Data
      </button>
      
      
    </div>

    {/* Search across all columns */}
    <div style={{ marginBottom:20 }}>
      <input
        style={{...inp, maxWidth:"400px"}}
        placeholder="Search by Date, Amount, Narration, Party..."
        value={partyFilterBank}
        onChange={e => setPartyFilterBank(e.target.value)}
      />
    </div>

   {/* Bank Data Table with Validation (virtualized) */}
    <div style={{ width:"100vw", marginLeft:"calc(50% - 50vw)", borderRadius:8, border:"1px solid #1e2a3a", height:"700px", padding:"0 20px", boxSizing:"border-box" }}>
      {(() => {
        const toComparable = (dateStr) => {
          const parts = String(dateStr || "").split('-');
          if (parts.length !== 3) return "00000000";
          let [day, month, year] = parts;
          if (year.length === 2) year = "20" + year;
          return year + month.padStart(2, '0') + day.padStart(2, '0');
        };

        const full = [...bankingData[selectedBankTab]].sort((a, b) => {
          const da = toComparable(a.date), db = toComparable(b.date);
          if (da !== db) return da.localeCompare(db);
          return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        });

        const first = full[0];
        const opening = first
          ? (parseFloat(first.closingBalance) || 0) + (parseFloat(first.withdrawalAmt) || 0) - (parseFloat(first.depositAmt) || 0)
          : 0;
        let prevBalance = opening;
        const cbMap = {};
        for (const t of full) {
          const calculatedCB = prevBalance + t.depositAmt - t.withdrawalAmt;
          cbMap[t.id] = calculatedCB;
          prevBalance = calculatedCB;
        }

    const fromCompBank = bankFromDate ? bankFromDate.replace(/-/g, '') : "";
        const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const targets = (v) => {
          const raw = String(v ?? "");
          const out = [norm(raw)];
          const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) out.push(`${m[3]}${m[2]}${m[1]}`); // DDMMYYYY
          return out;
        };
        let bq = norm(partyFilterBank);
        const bdmy = partyFilterBank.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (bdmy) bq = `${bdmy[1].padStart(2,"0")}${bdmy[2].padStart(2,"0")}${bdmy[3]}`;
        const searchFields = (t) => [t.date, t.narration, t.chqRef, t.withdrawalAmt, t.depositAmt, t.partyName, t.linkedRefNo];
        const filtered = full.filter(t => {
          const matchText = !partyFilterBank ||
            searchFields(t).some(v => targets(v).some(x => x.includes(bq)));
          const matchDate = !fromCompBank || toComparable(t.date) >= fromCompBank;
          return matchText && matchDate;
        });

        const fyOf = (dateStr) => {
          if (!dateStr) return "";
          const parts = String(dateStr).split(/[-/]/);
          if (parts.length !== 3) return "";
          const monthNames = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
          const rawMonth = parts[1].trim().toLowerCase();
          let mm = monthNames[rawMonth.slice(0,3)] || parseInt(parts[1], 10);
          let yy = parseInt(parts[2], 10);
          if (isNaN(mm) || isNaN(yy)) return "";
          if (yy < 100) yy += 2000;
          const startY = mm < 4 ? yy - 1 : yy;
          return `${startY}-${String((startY + 1) % 100).padStart(2, "0")}`;
        };

        const items = [];
        let prevFY = null;
        filtered.forEach(trans => {
          const thisFY = fyOf(trans.date);
          if (thisFY && thisFY !== prevFY) {
            items.push({ type: "separator", fy: thisFY, key: `sep-${thisFY}` });
            prevFY = thisFY;
          }
          const calculatedCB = cbMap[trans.id];
          const isValid = selectedBankTab === "VASB"
            ? Math.abs(Math.abs(calculatedCB) - Math.abs(trans.closingBalance)) < 1
            : Math.abs(calculatedCB - trans.closingBalance) < 1;
          items.push({ type: "row", trans, calculatedCB, isValid, key: trans.id });
        });

        const handleLinkRow = (trans) => {
          const refNo = prompt(`Link to Ref No?\n\nParty: ${trans.narration.split('-')[1] || "Unknown"}`);
          if (refNo) {
            const partyName = prompt("Enter Party Name:");
            if (partyName) handleLinkBankTransaction(trans.id, refNo, partyName);
          }
        };
        const handleUnlinkRow = async (trans) => {
          const newTrans = { ...trans, linkedRefNo: "", linkedFy: "", partyName: "" };
          const ok = await updateBankTransaction(newTrans);
          if (!ok) { showToast("Failed to save — check connection", "error"); return; }
          setBankingData(prev => ({
            ...prev,
            [selectedBankTab]: prev[selectedBankTab].map(t => t.id === trans.id ? newTrans : t)
          }));
          setLinkedTransactions(prev => { const u = { ...prev }; delete u[trans.linkedRefNo]; return u; });
          showToast("Unlinked");
        };

        const cols = BANK_MAIN_COLS.map(c => c.key === "narration" ? { ...c, w: narrationWidth } : c);

        if (filtered.length === 0) {
          return <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>No matching transactions.</div>;
        }

        return (
          <TableVirtuoso
            style={{ height:"100%" }}
            data={items}
            computeItemKey={(_, item) => item.key}
            components={makeBankMainComponents(narrationWidth)}
            fixedHeaderContent={() => (
              <tr style={{ background:"#151b2a" }}>
                {cols.map((c, i) => (
                  <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < cols.length - 1 ? "1px solid #1e2a3a" : "none", position: c.key === "narration" ? "relative" : undefined, userSelect: c.key === "narration" ? "none" : undefined }}>
                    {c.key === "valueDt" ? (selectedBankTab === "VASB" ? "Mode" : "Value Dt") : c.label}
                    {c.key === "narration" && (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startWidth = narrationWidth;
                          const onMove = (ev) => setNarrationWidth(Math.max(150, startWidth + (ev.clientX - startX)));
                          const onUp = () => {
                            document.removeEventListener("mousemove", onMove);
                            document.removeEventListener("mouseup", onUp);
                          };
                          document.addEventListener("mousemove", onMove);
                          document.addEventListener("mouseup", onUp);
                        }}
                        style={{ position:"absolute", right:0, top:0, width:"5px", height:"100%", cursor:"col-resize", background:"#f59e0b", opacity:0, transition:"opacity .2s" }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                      />
                    )}
                  </th>
                ))}
              </tr>
            )}
            itemContent={(_, item) => (
              <BankMainRow item={item} bankTab={selectedBankTab} narrationWidth={narrationWidth} onLink={handleLinkRow} onUnlink={handleUnlinkRow} />
            )}
          />
        );
      })()}
    </div>    
    {bankingData[selectedBankTab].length === 0 && (
      <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>No bank data. Click "Paste Bank Data" to import.</div>
    )}
  </div>
)}
{view === "reconcile" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>🔗 RECONCILIATION</h2>
    
    {/* MODE TOGGLE */}
    <div style={{ display:"flex", gap:8, marginBottom:20 }}>
      <button
        onClick={() => { setReconcileMode("pmt"); setReconcileSearch(""); setSelectedBankTransId(null); }}
        style={{
          padding:"10px 20px",
          borderRadius:8,
          border:"none",
          background: reconcileMode === "pmt" ? "#f59e0b" : "#1e2a3a",
          color: reconcileMode === "pmt" ? "#0f1117" : "#94a3b8",
          fontWeight:700,
          cursor:"pointer"
        }}
      >
        💳 PMT ↔ BANK
      </button>
      <button
        onClick={() => { setReconcileMode("sales"); setReconcileSearch(""); setSelectedBankTransId(null); setSelectedSalesBills([]); }}
        style={{
          padding:"10px 20px",
          borderRadius:8,
          border:"none",
          background: reconcileMode === "sales" ? "#f59e0b" : "#1e2a3a",
          color: reconcileMode === "sales" ? "#0f1117" : "#94a3b8",
          fontWeight:700,
          cursor:"pointer"
        }}
      >
        💰 SALES ↔ BANK
      </button>
    </div>

    {/* BANK SUB-TABS */}
    <div style={{ display:"flex", gap:8, marginBottom:20 }}>
      {["HDFC", "SBI", "VASB"].map(bank => (
        <button
          key={bank}
          onClick={() => { setSelectedReconcileBank(bank); setReconcileSearch(""); setSelectedBankTransId(null); }}
          style={{
            padding:"10px 20px",
            borderRadius:8,
            border:"none",
            background: selectedReconcileBank === bank ? "#f59e0b" : "#1e2a3a",
            color: selectedReconcileBank === bank ? "#0f1117" : "#94a3b8",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          🏢 {bank}
        </button>
      ))}
    </div>

    {/* SEARCH */}
    <div style={{ marginBottom:20 }}>
      <input
        style={{...inp, maxWidth:"400px"}}
        placeholder="Search by Date, Amount, Narration, Party..."
        value={reconcileSearch}
        onChange={e => setReconcileSearch(e.target.value)}
      />
    </div>

  {/* SPLIT VIEW */}
  <div
    id="reconcileSplitContainer"
    style={{ width:"100vw", marginLeft:"calc(50% - 50vw)", display:"grid", gridTemplateColumns:`${reconcileSplit}fr 6px 2.5fr`, gap:6, height:"calc(100vh - 225px)", padding:"0 20px", boxSizing:"border-box" }}>
  

      {/* LEFT — BANK TRANSACTIONS */}
      {(() => {
     const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const q = norm(reconcileSearch);
        const bankFiltered = bankingData[selectedReconcileBank].filter(t => {
     const matchSearch = !reconcileSearch ||
            t.date.includes(reconcileSearch) ||
            norm(t.narration).includes(q) ||
            norm(t.chqRef).includes(q) ||
            (reconcileMode === "pmt" ? t.withdrawalAmt.toString().includes(reconcileSearch) : t.depositAmt.toString().includes(reconcileSearch));
          const matchMode = reconcileMode === "pmt" ? t.withdrawalAmt > 0 : t.depositAmt > 0;
          const toComp = (dateStr) => {
            const p = String(dateStr || "").split('-');
            if (p.length !== 3) return "00000000";
            let [d, m, y] = p;
            if (y.length === 2) y = "20" + y;
            return y + m.padStart(2, '0') + d.padStart(2, '0');
          };
          const fromComp = reconcileFromDate ? reconcileFromDate.replace(/-/g, '') : "";
          const matchDate = !fromComp || toComp(t.date) >= fromComp;
          return matchMode && matchSearch && matchDate;
        });
        const baseCols = reconcileMode === "pmt" ? BANK_TRANS_COLS_PMT : BANK_TRANS_COLS_SALES;
        const cols = baseCols.map(c => c.label === "Narration" ? { ...c, w: reconcileNarrationWidth } : c);
        const colsWidth = cols.reduce((s, c) => s + c.w, 0);
        return (
       <div style={{ border:"1px solid #1e2a3a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <span style={{ fontWeight:700, color:"#f59e0b", fontSize:12 }}>BANK TRANSACTIONS ({selectedReconcileBank})</span>
              <input
                type="date"
                value={reconcileFromDate}
                onChange={(e) => setReconcileFromDate(e.target.value)}
                title="Show bank transactions from this date onward"
                style={{ background:"#0f1420", border:"1px solid #1e2a3a", borderRadius:6, padding:"4px 8px", color:"#e2e8f0", fontSize:11, fontWeight:600 }}
              />
            </div>
            <div style={{ flex:1, overflowX:"auto", overflowY:"hidden" }}>
              <TableVirtuoso
                style={{ height:"100%" }}
                data={bankFiltered}
                computeItemKey={(_, t) => t.id}
                components={{
               Table: ({ children, style, ...rest }) => (
                    <table {...rest} style={{ ...style, width:"100%", minWidth:colsWidth, fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
                      <colgroup>{cols.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
                      {children}
                    </table>
                  ),
                  TableRow: ({ style, ...props }) => {
                    const t = bankFiltered[props["data-index"]];
                    const isSelected = t && selectedBankTransId === t.id;
                    return <tr {...props} onClick={() => t && setSelectedBankTransId(t.id)}
                      style={{ ...style, borderBottom:"1px solid #1e2a3a", background: isSelected ? "#f59e0b33" : props["data-index"] % 2 === 0 ? "#0f1117" : "#151b2a", cursor:"pointer", outline: isSelected ? "2px solid #f59e0b" : "none" }} />;
                  },
                }}
            fixedHeaderContent={() => (
                  <tr style={{ background:"#151b2a" }}>
                    {cols.map((c, i) => (
                      <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < cols.length - 1 ? "1px solid #1e2a3a" : "none", position: c.label === "Narration" ? "relative" : undefined, userSelect: c.label === "Narration" ? "none" : undefined }}>
                        {c.label}
                        {c.label === "Narration" && (
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const startX = e.clientX;
                              const startWidth = reconcileNarrationWidth;
                              const onMove = (ev) => setReconcileNarrationWidth(Math.max(100, startWidth + (ev.clientX - startX)));
                              const onUp = () => {
                                document.removeEventListener("mousemove", onMove);
                                document.removeEventListener("mouseup", onUp);
                              };
                              document.addEventListener("mousemove", onMove);
                              document.addEventListener("mouseup", onUp);
                            }}
                            style={{ position:"absolute", right:0, top:0, width:"5px", height:"100%", cursor:"col-resize", background:"#f59e0b", opacity:0, transition:"opacity .2s" }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                )}
                itemContent={(_, trans) => (
                  <BankTransRow trans={trans} isSelected={selectedBankTransId === trans.id} reconcileMode={reconcileMode} onSelect={setSelectedBankTransId} />
                )}
              />
            </div>
          </div>
        );
      })()}

      {/* DRAG DIVIDER */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          const container = document.getElementById("reconcileSplitContainer");
          if (!container) return;
          const rect = container.getBoundingClientRect();

          const onMove = (ev) => {
            const usable = rect.width - 40 - 6;
            const leftPx = ev.clientX - rect.left - 20;
            const ratio = leftPx / (usable - leftPx);
            const clamped = Math.min(Math.max(ratio, 0.25), 4);
            setReconcileSplit(clamped * 2.5);
          };
          const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
        style={{ cursor:"col-resize", background:"#1e2a3a", borderRadius:3, transition:"background .15s" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#f59e0b"}
        onMouseLeave={(e) => e.currentTarget.style.background = "#1e2a3a"}
      />

      {/* RIGHT — PMT or SALES */}
      {reconcileMode === "pmt" ? (() => {
        const parseRefPmt = (ref) => {
          const s = String(ref || "").trim();
          const m = s.match(/^(\d+)(.*)$/);
          return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
        };
        const pmtFiltered = filtered
          .filter(r => !reconcileSearch || r.partyName.toLowerCase().includes(reconcileSearch.toLowerCase()))
          .sort((a, b) => {
            const pa = parseRefPmt(a.refNo), pb = parseRefPmt(b.refNo);
            return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
          });
        return (
          <div style={{ border:"1px solid #1e2a3a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", fontWeight:700, color:"#f59e0b", fontSize:12, flexShrink:0 }}>
              PAYMENT RECORDS
            </div>
            <div style={{ flex:1, overflowX:"auto", overflowY:"hidden" }}>
              <TableVirtuoso
                style={{ height:"100%" }}
                data={pmtFiltered}
                computeItemKey={(_, rec) => rec.refNo}
                components={{
                  Table: ({ children, style, ...rest }) => (
                    <table {...rest} style={{ ...style, width:"100%", minWidth:PMT_RIGHT_WIDTH, fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
                      <colgroup>{PMT_RIGHT_COLS.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
                      {children}
                    </table>
                  ),
                  TableRow: ({ style, ...props }) => (
                    <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: props["data-index"] % 2 === 0 ? "#0f1117" : "#151b2a" }} />
                  ),
                }}
                fixedHeaderContent={() => (
                  <tr style={{ background:"#151b2a" }}>
                    {PMT_RIGHT_COLS.map((c, i) => (
                      <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < PMT_RIGHT_COLS.length - 1 ? "1px solid #1e2a3a" : "none" }}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                )}
                itemContent={(_, rec) => (
              <PmtRightRow
                    rec={rec}
                    linkedSlots={pmtLinkedSlots[rec.refNo] || []}
                    fmt={fmt}
                    fmtDate={fmtDate}
                    onLink={(rec) => {
                      if (!selectedBankTransId) { showToast("SELECT BANK TRANSACTION FIRST", "error"); return; }
                      const t = bankingData[selectedReconcileBank].find(t => t.id === selectedBankTransId);
                      setLinkingModal({ refNo: rec.refNo, partyName: rec.partyName, bankAmount: t.withdrawalAmt, bankDate: t.date });
                    }}
                    onUnlink={(rec) => setPmtUnlinkModal({
                      refNo: rec.refNo, partyName: rec.partyName,
                      bankAmt1: rec.bankAmt1, bankName1: rec.bankName1,
                      bankAmt2: rec.bankAmt2, bankName2: rec.bankName2,
                      bankAmt3: rec.bankAmt3, bankName3: rec.bankName3
                    })}
                  />
                )}
              />
            </div>
          </div>
        );
      })() : (() => {
      const parseRefRec = (ref) => {
          const s = String(ref || "").trim();
          const m = s.match(/^(\d+)(.*)$/);
          return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
        };
        const salesFiltered = salesWorkingData
          .filter(rec =>
            !reconcileSearchSales ||
            rec.refNo.toString().includes(reconcileSearchSales) ||
            rec.partyName.toLowerCase().includes(reconcileSearchSales.toLowerCase())
          )
          .sort((a, b) => {
            const pa = parseRefRec(a.refNo), pb = parseRefRec(b.refNo);
            return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
          });
        return (
          <div style={{ border:"1px solid #1e2a3a", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", fontWeight:700, color:"#f59e0b", fontSize:12, flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>SALES WORKING RECORDS</span>
              <input style={{...inp, maxWidth:"150px", fontSize:10, padding:"6px 8px"}} placeholder="Search..."
                value={reconcileSearchSales} onChange={e => setReconcileSearchSales(e.target.value)} />
            </div>
            <div style={{ flex:1, overflowX:"auto", overflowY:"hidden" }}>
              <TableVirtuoso
                style={{ height:"100%" }}
                data={salesFiltered}
                computeItemKey={(_, rec) => rec.id}
                components={{
                  Table: ({ children, style, ...rest }) => (
                    <table {...rest} style={{ ...style, width:"100%", minWidth:SALES_RIGHT_WIDTH, fontSize:9, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
                      <colgroup>{SALES_RIGHT_COLS.map((c, i) => <col key={i} style={{ width:c.w }} />)}</colgroup>
                      {children}
                    </table>
                  ),
                  TableRow: ({ style, ...props }) => (
                    <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: props["data-index"] % 2 === 0 ? "#0f1117" : "#151b2a" }} />
                  ),
                }}
                fixedHeaderContent={() => (
                  <tr style={{ background:"#151b2a" }}>
                    {SALES_RIGHT_COLS.map((c, i) => (
                      <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < SALES_RIGHT_COLS.length - 1 ? "1px solid #1e2a3a" : "none" }}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                )}
                itemContent={(_, rec) => (
                  <SalesRightRow
                    rec={rec}
                 onLink={(rec) => {
  if (!selectedBankTransId) { showToast("SELECT BANK TRANSACTION FIRST", "error"); return; }
  setSelectedSalesBills([rec.id]);
  const t = bankingData[selectedReconcileBank].find(t => t.id === selectedBankTransId);
  setSalesLinkingModal({ 
    bankTransId: selectedBankTransId, 
    chqRef: t?.chqRef, 
    depositAmt: t?.depositAmt, 
    depositDate: t?.date, 
    selectedBills: [rec],
    mode: "single",
    slotForSingle: "",
    multiBillSelections: {}
  });
}}
                    onUnlink={(rec) => setUnlinkSlotModal({ billId: rec.id, billNo: rec.refNo, pmtId1: rec.pmtId1, pmtId2: rec.pmtId2, pmtId3: rec.pmtId3, bankPmt1: rec.bankPmt1, bankPmt2: rec.bankPmt2, bankPmt3: rec.bankPmt3 })}
                  />
                )}
              />
            </div>
          </div>
        );
      })()}
    </div>
    {/* PMT LINKING MODAL */}
    {linkingModal && reconcileMode === "pmt" && (
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
        <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:400, boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:20 }}>LINK PAYMENT</h3>
          
          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Ref No</label>
            <div style={{ padding:"10px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>
              {linkingModal.refNo}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Party Name</label>
            <div style={{ padding:"10px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>
              {linkingModal.partyName}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Select Payment Slot</label>
            <select id="slotSelect" style={inp}>
              <option value="">-- Choose Slot --</option>
              <option value="1">Slot 1</option>
              <option value="2">Slot 2</option>
              <option value="3">Slot 3</option>
            </select>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Amount</label>
            <div style={{ padding:"10px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>
              ₹ {linkingModal.bankAmount.toLocaleString()}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Date</label>
            <div style={{ padding:"10px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>
              {linkingModal.bankDate}
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Bank Name</label>
            <div style={{ padding:"10px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>
              {selectedReconcileBank}
            </div>
          </div>

          <div style={{ display:"flex", gap:12 }}>
            <button
              onClick={async () => {
  const slot = document.getElementById("slotSelect").value;
  if (!slot) {
    showToast("SELECT A SLOT", "error");
    return;
  }

  const slotNum = parseInt(slot);
  const amtKey = `bankAmt${slotNum}`;
  const dateKey = `bankDate${slotNum}`;
  const nameKey = `bankName${slotNum}`;

  // Build the updated record so we can both save and set state
  const target = records.find(r => r.refNo === linkingModal.refNo);
  if (!target) { showToast("Record not found", "error"); return; }

 const toIso = (d) => {
    if (!d) return "";
    const parts = String(d).split(/[-/]/);
    if (parts.length !== 3) return d;
    let [day, month, year] = parts;
    if (year.length === 2) year = "20" + year;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const updatedRecord = {
    ...target,
    [amtKey]: linkingModal.bankAmount,
    [dateKey]: toIso(linkingModal.bankDate),
    [nameKey]: selectedReconcileBank
  };
  const totalPaid = (parseFloat(updatedRecord.bankAmt1) || 0) + (parseFloat(updatedRecord.bankAmt2) || 0) + (parseFloat(updatedRecord.bankAmt3) || 0);
  updatedRecord._balance = (parseFloat(updatedRecord._finalAmt) || 0) - totalPaid;

  // Build the updated bank transaction
  const bankTrans = bankingData[selectedReconcileBank].find(t => t.id === selectedBankTransId);
  const updatedBank = { ...bankTrans, linkedRefNo: linkingModal.refNo, linkedSlot: slotNum, partyName: linkingModal.partyName,  linkedFy: activeFY };

  // Build the updated slots list
  const newSlots = [...(pmtLinkedSlots[linkingModal.refNo] || []), slotNum];

  // ---- Persist all three to Supabase ----
  const okRec = await upsertRecord(updatedRecord, activeFY);
  if (!okRec) { showToast("Failed to save payment — check connection", "error"); return; }

  const okBank = await updateBankTransaction(updatedBank);
  if (!okBank) { showToast("Failed to save bank link — check connection", "error"); return; }

  const okSlot = await upsertPmtLinkedSlot(linkingModal.refNo, newSlots, activeFY);
  if (!okSlot) { showToast("Failed to save slot — check connection", "error"); return; }

  // ---- Update state ----
  setRecords(prev => prev.map(r => r.refNo === linkingModal.refNo ? updatedRecord : r));
  setBankingData(prev => ({
    ...prev,
    [selectedReconcileBank]: prev[selectedReconcileBank].map(t =>
      t.id === selectedBankTransId ? updatedBank : t
    )
  }));
  setPmtLinkedSlots(prev => ({ ...prev, [linkingModal.refNo]: newSlots }));

  showToast(`Linked to Ref No ${linkingModal.refNo} - Slot ${slotNum}`);
  setLinkingModal(null);
  setSelectedBankTransId(null);
}}
              style={{ flex:1, background:"#22c55e", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
            >
              LINK
            </button>
            <button
              onClick={() => setLinkingModal(null)}
              style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    )}


{/* PMT UNLINK MODAL */}
    {pmtUnlinkModal && (() => {
      const m = pmtUnlinkModal;
      const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
      const slots = [1, 2, 3].map(n => ({
        n, amt: parseFloat(m[`bankAmt${n}`]) || 0, name: m[`bankName${n}`]
      })).filter(s => s.amt > 0);

      return (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:440, boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>UNLINK PAYMENTS</h3>
            <div style={{ fontSize:13, color:"#f59e0b", fontWeight:700, marginBottom:16 }}>Ref No {m.refNo}</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>This clears all bank payment slots on this record and un-links their bank transactions:</div>

            <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"12px 14px", marginBottom:20 }}>
              {slots.map(s => (
                <div key={s.n} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", color:"#cbd5e1" }}>
                  <span style={{ color:"#64748b" }}>Slot {s.n} — {s.name || "—"}</span>
                  <span style={{ fontWeight:600 }}>{money(s.amt)}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button
                onClick={async () => {
                  const target = records.find(r => r.refNo === m.refNo);
                  if (!target) { showToast("Record not found", "error"); setPmtUnlinkModal(null); return; }

                  // 1. Clear all bank slots on the purchase record + recompute balance
                  const cleared = {
                    ...target,
                    bankAmt1:"", bankDate1:"", bankName1:"",
                    bankAmt2:"", bankDate2:"", bankName2:"",
                    bankAmt3:"", bankDate3:"", bankName3:""
                  };
                  cleared._balance = parseFloat(cleared._finalAmt) || 0;

                  const okRec = await upsertRecord(cleared, activeFY);
                  if (!okRec) { showToast("Failed to unlink — check connection", "error"); return; }

                  // 2. Clear any bank transactions linked to this ref (scan all three banks)
                  const updatedBanks = { HDFC:[...bankingData.HDFC], SBI:[...bankingData.SBI], VASB:[...bankingData.VASB] };
                  for (const bank of ["HDFC","SBI","VASB"]) {
                    for (let i = 0; i < updatedBanks[bank].length; i++) {
                      const t = updatedBanks[bank][i];
                      if (t.linkedRefNo === m.refNo) {
                        const clearedT = { ...t, linkedRefNo:"", linkedSlot:null, linkedFy:"", partyName:"" };
                        await updateBankTransaction(clearedT);
                        updatedBanks[bank][i] = clearedT;
                      }
                    }
                  }

                  // 3. Remove the ref's tracked slots
                  await deletePmtLinkedSlot(m.refNo, activeFY);

                  // 4. Update state
                  setRecords(prev => prev.map(r => r.refNo === m.refNo ? cleared : r));
                  setBankingData(updatedBanks);
                  setPmtLinkedSlots(prev => { const u = { ...prev }; delete u[m.refNo]; return u; });
                  setPmtUnlinkModal(null);
                  showToast(`Unlinked all slots on Ref No ${m.refNo}`);
                }}
                style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
              >
                UNLINK ALL
              </button>
              <button onClick={() => setPmtUnlinkModal(null)} style={{ flex:1, background:"#64748b", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      );
    })()}    
    
    {/* SALES LINKING MODAL */}
   {salesLinkingModal && reconcileMode === "sales" && (
  <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
    <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:600, boxShadow:"0 10px 40px rgba(0,0,0,.5)", maxHeight:"90vh", overflowY:"auto" }}>
      
      {/* HEADER */}
      <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:20 }}>ALLOCATE BANK DEPOSIT</h3>

      {/* BANK INFO ROW */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:"#64748b", fontWeight:600, marginBottom:4 }}>PMT ID (CHQ/REF)</div>
          <div style={{ padding:"8px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#f59e0b", fontSize:13, fontWeight:700 }}>{salesLinkingModal.chqRef}</div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#64748b", fontWeight:600, marginBottom:4 }}>DEPOSIT AMOUNT</div>
          <div style={{ padding:"8px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#22c55e", fontSize:13, fontWeight:700 }}>₹{salesLinkingModal.depositAmt?.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#64748b", fontWeight:600, marginBottom:4 }}>DEPOSIT DATE</div>
          <div style={{ padding:"8px 12px", background:"#0f1117", borderRadius:8, border:"1px solid #1e2a3a", color:"#cbd5e1", fontSize:13 }}>{salesLinkingModal.depositDate}</div>
        </div>
      </div>

      {/* MODE DROPDOWN */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, color:"#64748b", fontWeight:600, marginBottom:6 }}>MODE</div>
        <select
          value={salesLinkingModal.mode || "single"}
          onChange={e => setSalesLinkingModal(prev => ({
            ...prev,
            mode: e.target.value,
            // reset selections on mode change
            slotForSingle: "",
            multiBillSelections: {}
          }))}
          style={{ ...inp, maxWidth:200 }}
        >
          <option value="single">Single Bill</option>
          <option value="multi">Multi Bill</option>
        </select>
      </div>

      {/* SINGLE BILL MODE */}
      {(!salesLinkingModal.mode || salesLinkingModal.mode === "single") && (() => {
        const bill = salesLinkingModal.selectedBills?.[0];
        if (!bill) return <div style={{ color:"#ef4444", fontSize:12 }}>No bill selected.</div>;
        const calc = calculateSalesFields(bill);
        const alreadyPaid = (bill.bankPmt1 || 0) + (bill.bankPmt2 || 0) + (bill.bankPmt3 || 0);
        const pending = calc.netAmt - alreadyPaid;
        const slot = salesLinkingModal.slotForSingle || "";

        // Which slots are already occupied
        const occupiedSlots = [
          bill.bankPmt1 > 0 ? 1 : null,
          bill.bankPmt2 > 0 ? 2 : null,
          bill.bankPmt3 > 0 ? 3 : null,
        ].filter(Boolean);

        return (
          <div>
            <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:9, color:"#64748b", marginBottom:3 }}>REF NO</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#cbd5e1" }}>{bill.refNo}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#64748b", marginBottom:3 }}>PARTY</div>
                  <div style={{ fontSize:12, color:"#cbd5e1" }}>{bill.partyName}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#64748b", marginBottom:3 }}>NET AMT</div>
                  <div style={{ fontSize:12, color:"#cbd5e1" }}>₹{calc.netAmt.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:"#64748b", marginBottom:3 }}>PENDING</div>
                  <div style={{ fontSize:12, fontWeight:700, color: pending <= 0 ? "#22c55e" : "#f59e0b" }}>₹{pending.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ fontSize:10, color:"#64748b", fontWeight:600 }}>ALLOCATE TO SLOT:</div>
                {[1,2,3].map(s => {
                  const occupied = occupiedSlots.includes(s);
                  const selected = slot === String(s);
                  return (
                    <button
                      key={s}
                      disabled={occupied}
                      onClick={() => setSalesLinkingModal(prev => ({ ...prev, slotForSingle: String(s) }))}
                      style={{
                        padding:"6px 16px", borderRadius:6, border: selected ? "2px solid #22c55e" : "1px solid #1e2a3a",
                        background: occupied ? "#0f1117" : selected ? "#22c55e22" : "#151b2a",
                        color: occupied ? "#334155" : selected ? "#22c55e" : "#cbd5e1",
                        fontWeight:700, fontSize:12, cursor: occupied ? "not-allowed" : "pointer"
                      }}
                    >
                      Slot {s} {occupied ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STATUS */}
            <div style={{ background:"#1a2236", borderRadius:8, padding:"10px 14px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#64748b" }}>Deposit vs Pending:</span>
              <span style={{ fontSize:13, fontWeight:700, color:
                salesLinkingModal.depositAmt === pending ? "#22c55e" :
                salesLinkingModal.depositAmt > pending ? "#f59e0b" : "#ef4444"
              }}>
                {salesLinkingModal.depositAmt === pending ? "✓ EXACT MATCH" :
                 salesLinkingModal.depositAmt > pending ? `SURPLUS ₹${(salesLinkingModal.depositAmt - pending).toLocaleString()}` :
                 `SHORT ₹${(pending - salesLinkingModal.depositAmt).toLocaleString()}`}
              </span>
            </div>
          </div>
        );
      })()}

      {/* MULTI BILL MODE */}
      {salesLinkingModal.mode === "multi" && (() => {
        const filteredBills = salesWorkingData.filter(rec =>
          !reconcileSearchSales ||
          rec.refNo.toString().includes(reconcileSearchSales) ||
          rec.partyName.toLowerCase().includes(reconcileSearchSales.toLowerCase())
        );

        const selections = salesLinkingModal.multiBillSelections || {};
        const depositAmt = salesLinkingModal.depositAmt || 0;

        // Auto-compute how much of the deposit each selected bill gets (pending amt until deposit runs out)
        let remaining = depositAmt;
        const allotments = {}; // refNo -> amount allotted
        filteredBills.forEach(bill => {
          if (!selections[bill.id]?.checked) return;
          const calc = calculateSalesFields(bill);
          const alreadyPaid = (bill.bankPmt1 || 0) + (bill.bankPmt2 || 0) + (bill.bankPmt3 || 0);
          const pending = calc.netAmt - alreadyPaid;
          const toAllocate = Math.min(pending > 0 ? pending : 0, remaining);
          allotments[bill.id] = toAllocate;
          remaining -= toAllocate;
        });

        const totalAllocated = depositAmt - remaining;
        const selectedCount = Object.values(selections).filter(s => s?.checked).length;

        return (
          <div>
            <div style={{ fontSize:11, color:"#64748b", marginBottom:10 }}>
              Showing bills matching search: <strong style={{ color:"#f59e0b" }}>"{reconcileSearchSales || "all"}"</strong> — check bills to allocate
            </div>

            <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, overflow:"hidden", marginBottom:16 }}>
              {/* TABLE HEADER */}
              <div style={{ display:"grid", gridTemplateColumns:"28px 70px 1fr 90px 90px 90px 100px", gap:0, padding:"8px 12px", background:"#151b2a", borderBottom:"1px solid #1e2a3a" }}>
                {["","Ref No","Party","Net Amt","Pending","Allot","Slot"].map((h,i) => (
                  <div key={i} style={{ fontSize:9, fontWeight:700, color:"#64748b" }}>{h}</div>
                ))}
              </div>

              {/* ROWS */}
              <div style={{ maxHeight:320, overflowY:"auto" }}>
                {filteredBills.length === 0 && (
                  <div style={{ padding:20, textAlign:"center", color:"#64748b", fontSize:12 }}>No bills match the search filter.</div>
                )}
                {filteredBills.map(bill => {
                  const calc = calculateSalesFields(bill);
                  const alreadyPaid = (bill.bankPmt1 || 0) + (bill.bankPmt2 || 0) + (bill.bankPmt3 || 0);
                  const pending = calc.netAmt - alreadyPaid;
                  const isChecked = !!selections[bill.id]?.checked;
                  const allotted = allotments[bill.id] ?? 0;
                  const slot = selections[bill.id]?.slot || "";
                  const occupiedSlots = [
                    bill.bankPmt1 > 0 ? 1 : null,
                    bill.bankPmt2 > 0 ? 2 : null,
                    bill.bankPmt3 > 0 ? 3 : null,
                  ].filter(Boolean);

                  return (
                    <div key={bill.id} style={{ display:"grid", gridTemplateColumns:"28px 70px 1fr 90px 90px 90px 100px", gap:0, padding:"8px 12px", borderBottom:"1px solid #1e2a3a", background: isChecked ? "#22c55e0d" : "transparent", alignItems:"center" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => setSalesLinkingModal(prev => ({
                          ...prev,
                          multiBillSelections: {
                            ...prev.multiBillSelections,
                            [bill.id]: { ...(prev.multiBillSelections?.[bill.id] || {}), checked: e.target.checked }
                          }
                        }))}
                        style={{ cursor:"pointer", width:14, height:14 }}
                      />
                      <div style={{ fontSize:11, fontWeight:700, color:"#cbd5e1" }}>{bill.refNo}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{bill.partyName}</div>
                      <div style={{ fontSize:11, color:"#cbd5e1" }}>₹{calc.netAmt.toLocaleString()}</div>
                      <div style={{ fontSize:11, color: pending <= 0 ? "#22c55e" : "#f59e0b", fontWeight:600 }}>₹{pending.toLocaleString()}</div>
                      <div style={{ fontSize:11, color: isChecked ? "#22c55e" : "#334155", fontWeight:700 }}>
                        {isChecked ? `₹${allotted.toLocaleString()}` : "—"}
                      </div>
                      <div>
                        {isChecked && (
                          <select
                            value={slot}
                            onChange={e => setSalesLinkingModal(prev => ({
                              ...prev,
                              multiBillSelections: {
                                ...prev.multiBillSelections,
                                [bill.id]: { ...(prev.multiBillSelections?.[bill.id] || {}), slot: e.target.value }
                              }
                            }))}
                            style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:6, padding:"4px 6px", color:"#cbd5e1", fontSize:11, width:"100%" }}
                          >
                            <option value="">Slot</option>
                            {[1,2,3].map(s => (
                              <option key={s} value={String(s)} disabled={occupiedSlots.includes(s)}>
                                Slot {s}{occupiedSlots.includes(s) ? " ✓" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STATUS BAR */}
            <div style={{ background:"#1a2236", borderRadius:8, padding:"10px 14px", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11 }}>
                <span style={{ color:"#64748b" }}>Bills selected:</span>
                <span style={{ color:"#cbd5e1", fontWeight:600 }}>{selectedCount}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11 }}>
                <span style={{ color:"#64748b" }}>Total allocated:</span>
                <span style={{ color:"#cbd5e1", fontWeight:600 }}>₹{totalAllocated.toLocaleString()}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11 }}>
                <span style={{ color:"#64748b" }}>Deposit amount:</span>
                <span style={{ color:"#cbd5e1", fontWeight:600 }}>₹{depositAmt.toLocaleString()}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:700 }}>
                <span style={{ color:"#64748b" }}>Remaining:</span>
                <span style={{ color: remaining === 0 ? "#22c55e" : remaining > 0 ? "#f59e0b" : "#ef4444" }}>
                  {remaining === 0 ? "✓ FULLY ALLOCATED" : remaining > 0 ? `₹${remaining.toLocaleString()} UNALLOCATED` : `OVER by ₹${Math.abs(remaining).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ACTION BUTTONS */}
      <div style={{ display:"flex", gap:12 }}>
        <button
          onClick={async () => {
            const mode = salesLinkingModal.mode || "single";

            if (mode === "single") {
              const bill = salesLinkingModal.selectedBills?.[0];
              const slot = salesLinkingModal.slotForSingle;
              if (!bill) { showToast("No bill selected", "error"); return; }
              if (!slot) { showToast("SELECT A SLOT", "error"); return; }
              const slotNum = parseInt(slot);
              const amtKey = `bankPmt${slotNum}`;
              const dateKey = `bankDate${slotNum}`;
              const pmtIdKey = `pmtId${slotNum}`;

              const freshBill = salesWorkingData.find(b => b.id === bill.id);
              if (!freshBill) { showToast("Bill not found", "error"); return; }

              const depositDateIso = (() => {
                const d = salesLinkingModal.depositDate;
                if (!d) return "";
                const parts = d.split('-');
                if (parts.length !== 3) return d;
                const [day, month, year] = parts;
                return `${year}-${month}-${day}`;
              })();

              const updatedBill = {
                ...freshBill,
                [amtKey]: salesLinkingModal.depositAmt,
                [dateKey]: depositDateIso,
                [pmtIdKey]: salesLinkingModal.chqRef
              };

              const bankTrans = bankingData[selectedReconcileBank].find(t => t.id === salesLinkingModal.bankTransId);
              const updatedBank = { ...bankTrans, linkedRefNo: freshBill.refNo, partyName: freshBill.partyName , linkedFy: activeFY };

              const okBill = await upsertWorkingBatch([updatedBill], activeFY);
              const okBank = await updateBankTransaction(updatedBank);
              if (!okBank) { showToast("Failed to save bank link", "error"); return; }

              setSalesWorkingData(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
              setBankingData(prev => ({
                ...prev,
                [selectedReconcileBank]: prev[selectedReconcileBank].map(t => t.id === salesLinkingModal.bankTransId ? updatedBank : t)
              }));
              showToast(`Allocated ₹${salesLinkingModal.depositAmt?.toLocaleString()} to Ref No ${freshBill.refNo} — Slot ${slotNum}`);

            } else {
              // MULTI BILL
              const selections = salesLinkingModal.multiBillSelections || {};
              const selectedIds = Object.entries(selections).filter(([,v]) => v?.checked).map(([id]) => id);
              if (selectedIds.length === 0) { showToast("SELECT AT LEAST ONE BILL", "error"); return; }

              const missingSlot = selectedIds.find(id => !selections[id]?.slot);
              if (missingSlot) { showToast("SELECT A SLOT FOR EACH SELECTED BILL", "error"); return; }

              const depositAmt = salesLinkingModal.depositAmt || 0;
              let remaining = depositAmt;

              const depositDateIso = (() => {
                const d = salesLinkingModal.depositDate;
                if (!d) return "";
                const parts = d.split('-');
                if (parts.length !== 3) return d;
                const [day, month, year] = parts;
                return `${year}-${month}-${day}`;
              })();

              const updatedBills = [];
              for (const id of selectedIds) {
                const bill = salesWorkingData.find(b => b.id === id);
                if (!bill) continue;
                const calc = calculateSalesFields(bill);
                const alreadyPaid = (bill.bankPmt1 || 0) + (bill.bankPmt2 || 0) + (bill.bankPmt3 || 0);
                const pending = calc.netAmt - alreadyPaid;
                const toAllocate = Math.min(pending > 0 ? pending : 0, remaining);
                remaining -= toAllocate;
                const slotNum = parseInt(selections[id].slot);
                updatedBills.push({
                  ...bill,
                  [`bankPmt${slotNum}`]: toAllocate,
                  [`bankDate${slotNum}`]: depositDateIso,
                  [`pmtId${slotNum}`]: salesLinkingModal.chqRef
                });
              }

              await upsertWorkingBatch(updatedBills , activeFY);

              const linkedRefNos = updatedBills.map(b => b.refNo).join(", ");
              const linkedParties = [...new Set(updatedBills.map(b => b.partyName))].join(", ");
              const bankTrans = bankingData[selectedReconcileBank].find(t => t.id === salesLinkingModal.bankTransId);
              const updatedBank = { ...bankTrans, linkedRefNo: linkedRefNos, partyName: linkedParties,  linkedFy: activeFY };
              await updateBankTransaction(updatedBank);

              setSalesWorkingData(prev => prev.map(b => {
                const updated = updatedBills.find(u => u.id === b.id);
                return updated || b;
              }));
              setBankingData(prev => ({
                ...prev,
                [selectedReconcileBank]: prev[selectedReconcileBank].map(t => t.id === salesLinkingModal.bankTransId ? updatedBank : t)
              }));
              showToast(`Allocated to ${updatedBills.length} bill(s) | PMT ID: ${salesLinkingModal.chqRef}`);
            }

            setSalesLinkingModal(null);
            setSelectedSalesBills([]);
            setSelectedBankTransId(null);
          }}
          style={{ flex:1, background:"#22c55e", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
        >
          ALLOCATE
        </button>
        <button
          onClick={() => { setSalesLinkingModal(null); setSelectedSalesBills([]); }}
          style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
        >
          CANCEL
        </button>
      </div>
    </div>
  </div>
   )}
    {/* SALES UNLINK MODAL */}
    {unlinkSlotModal && (() => {
      const m = unlinkSlotModal;
      const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
      const slots = [1, 2, 3].map(n => ({
        n,
        pmtId: m[`pmtId${n}`],
        amt: m[`bankPmt${n}`]
      })).filter(s => s.pmtId || s.amt > 0);

      return (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
          <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:440, boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>UNLINK PAYMENTS</h3>
            <div style={{ fontSize:13, color:"#f59e0b", fontWeight:700, marginBottom:16 }}>Ref No {m.billNo}</div>

            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>
              This will clear all linked payment slots on this bill:
            </div>

            <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"12px 14px", marginBottom:20 }}>
              {slots.length === 0 ? (
                <div style={{ fontSize:12, color:"#64748b" }}>No linked slots found.</div>
              ) : slots.map(s => (
                <div key={s.n} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", color:"#cbd5e1" }}>
                  <span style={{ color:"#64748b" }}>Slot {s.n} — PMT {s.pmtId || "—"}</span>
                  <span style={{ fontWeight:600 }}>{money(s.amt)}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button
                onClick={async () => {
                  const fresh = salesWorkingData.find(b => b.id === m.billId);
                  if (!fresh) { showToast("Bill not found", "error"); setUnlinkSlotModal(null); return; }

                  const cleared = {
                    ...fresh,
                    bankPmt1: 0, bankDate1: "", pmtId1: "",
                    bankPmt2: 0, bankDate2: "", pmtId2: "",
                    bankPmt3: 0, bankDate3: "", pmtId3: ""
                  };

                  const ok = await upsertWorkingBatch([cleared], activeFY);
                  if (!ok) { showToast("Failed to unlink — check connection", "error"); return; }

                  setSalesWorkingData(prev => prev.map(b => b.id === m.billId ? cleared : b));
                  setUnlinkSlotModal(null);
                  showToast(`Unlinked all slots on Ref No ${m.billNo}`);
                }}
                style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
              >
                UNLINK ALL
              </button>
              <button
                onClick={() => setUnlinkSlotModal(null)}
                style={{ flex:1, background:"#64748b", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    
     </div>
)} 
    {view === "sales" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>💰 SALES</h2>
    
  {/* Sales Sub-Tabs */}
    <div style={{ display:"flex", gap:8, marginBottom:20 }}>
      {["flash", "working", "reconcile"].map(tab => (
        <button
          key={tab}
          onClick={() => { setSelectedSalesTab(tab); setSalesSearch(""); }}
          style={{
            padding:"10px 20px",
            borderRadius:8,
            border:"none",
            background: selectedSalesTab === tab ? "#f59e0b" : "#1e2a3a",
            color: selectedSalesTab === tab ? "#0f1117" : "#94a3b8",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          {tab === "flash" && "📊 As Per Flash"}
          {tab === "working" && "✏️ Full With PMT"}
          {tab === "reconcile" && "🔗 Reconcile"}
        </button>
      ))}
{["partywise", "brokerwise", "groupbypmt"].map((tab, idx) => (
        <button
          key={tab}
          onClick={() => { setSelectedSalesTab(tab); setSalesSearch(""); setSalesFilterParty(""); setSalesFilterBroker(""); setSalesPending({ neg: true, zero: true, pos: true }); }}
          style={{
            marginLeft: idx === 0 ? "auto" : 0,
            padding:"10px 20px",
            borderRadius:8,
            border:"none",
            background: selectedSalesTab === tab ? "#f59e0b" : "#1e2a3a",
            color: selectedSalesTab === tab ? "#0f1117" : "#94a3b8",
            fontWeight:700,
            cursor:"pointer"
          }}
        >
          {tab === "partywise" && "👥 Partywise Summary"}
          {tab === "brokerwise" && "🏢 Brokerwise Summary"}
          {tab === "groupbypmt" && "🧾 Group by PMT"}
        </button>
      ))}
    </div>

    {/* FLASH TAB */}
    {selectedSalesTab === "flash" && (
      <div>
        <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
          <button
           onClick={async () => {
              const pastedData = prompt("Paste FLASH exported data:\n(Copy from Excel and paste)");
              if (!pastedData) return;
              
              const parsed = parseFlashData(pastedData);
              if (parsed.length === 0) {
                showToast("Invalid format!", "error");
                return;
              }
              
              const ok = await replaceSalesFlash(parsed, activeFY);
              if (!ok) { showToast("Failed to save to database", "error"); return; }
              
              setSalesFlashData(parsed);

              // Auto-absorb new sales party names into Manage deliveries list
              const flashDeliveries = [...new Set(parsed.map(r => r.partyName).filter(Boolean))];
              const newDeliveries = flashDeliveries.filter(d => !deliveries.includes(d));
              for (const d of newDeliveries) {
                await addDelivery(d);
              }
              if (newDeliveries.length > 0) {
                setDeliveries(prev => [...new Set([...prev, ...newDeliveries])].sort());
              }

              showToast(`${parsed.length} entries imported. ${newDeliveries.length} new sales parties added to Manage.`);
            }}
            style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}
          >
            📋 Paste FLASH Data
          </button>
          <input
            style={{...inp, maxWidth:"300px"}}
            placeholder="Search..."
            value={salesSearch}
            onChange={e => setSalesSearch(e.target.value)}
          />
          <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>
            Total: <span style={{ color:"#f59e0b" }}>{salesFlashData.length}</span> entries
          </div>
        </div>

       {(() => {
      const flashFiltered = salesFlashData.filter(r => !salesSearch ||
        r.refNo.toString().includes(salesSearch) ||
        r.partyName.toLowerCase().includes(salesSearch.toLowerCase())
      );
      return (
        <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
          {flashFiltered.length > 0 ? (
            <TableVirtuoso
              style={{ height:600 }}
              data={flashFiltered}
              computeItemKey={(_, rec) => rec.id}
              components={FLASH_TABLE_COMPONENTS}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  {FLASH_COLS.map((c, i) => (
                    <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < FLASH_COLS.length - 1 ? "1px solid #1e2a3a" : "none" }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              )}
              itemContent={(_, rec) => <FlashTableRow rec={rec} />}
            />
          ) : (
            <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>No data. Click "Paste FLASH Data" to import.</div>
          )}
        </div>
      );
    })()}

  </div>
)}

    {/* WORKING TAB */}
{selectedSalesTab === "working" && (
  <div>
    <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
 <button
  onClick={async () => {  // ← ADD async HERE
  if (salesFlashData.length === 0) {
    showToast("No FLASH data! Paste data in 'As Per Flash' first", "error");
    return;
  }
  
  const workingRefNos = new Set(salesWorkingData.map(r => r.refNo));
  const newRecords = salesFlashData.filter(r => !workingRefNos.has(r.refNo));
  
  if (newRecords.length === 0) {
    showToast("No new entries to import. Check Reconcile tab for changes.", "info");
    return;
  }
  
  setSalesWorkingData([...salesWorkingData, ...newRecords]);
  await upsertWorkingBatch([...salesWorkingData, ...newRecords], activeFY);  // ← ADD THIS LINE
  showToast(`${newRecords.length} new entries imported.`);
}}      style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}
      >
        📥 Import from Flash
      </button>
      
<button
 onClick={async () => {
  const claimRules = await loadClaimRules();
  const ruleMap = new Map(claimRules.map(r => [r.partyName, r]));
  let updated = 0;
  let skipped = 0;
  let updatedRecords = [];

  // Guards: don't overwrite a field that already has a value (protects manual corrections)
  const hasClaim  = (r) => (parseFloat(r.claim) || 0) > 0;
  const hasRecWt  = (r) => (parseFloat(r.receivedWeight) || 0) > 0;
  const hasGunny  = (r) => (parseFloat(r.gunnyWeight) || 0) > 0;
  setSalesWorkingData(prev => {
    const newData = prev.map(salesRec => {
      const rule = ruleMap.get(salesRec.partyName);
      if (!rule) {
        skipped++;
        return salesRec;
      }

      // cdRule always follows the party (not guarded)
      const cdRule = rule.cdRule || "standard";

      // Source from Sales Qty — only sets received weight (guarded)
      if (rule.recWeightSource === 'sales') {
        updated++;
        const updatedRec = {
          ...salesRec,
          receivedWeight: hasRecWt(salesRec) ? salesRec.receivedWeight : (parseFloat(salesRec.qty) || 0),
          cdRule
        };
        updatedRecords.push(updatedRec);
        return updatedRec;
      }

      // Source from Data — need matching Data record
      const dataRec = records.find(r =>
        r.refNo === salesRec.refNo &&
        r.deliveryAt === salesRec.partyName
      );

      if (!dataRec) {
        skipped++;
        return salesRec;
      }

      updated++;
      const newRecWeight = parseFloat(dataRec.receiveQty) || 0;

      // claimRule "nothing" — set received weight only (guarded), leave claim alone
      if (rule.claimRule === 'nothing') {
        const updatedRec = {
          ...salesRec,
          receivedWeight: hasRecWt(salesRec) ? salesRec.receivedWeight : (parseFloat(salesRec.qty) || 0),
           gunnyWeight: hasGunny(salesRec) ? salesRec.gunnyWeight : (parseFloat(dataRec.gunnyWeight) || 0),
          cdRule
        };
        updatedRecords.push(updatedRec);
        return updatedRec;
      }

      // Compute the rule-derived claim (only used if claim is currently blank)
      let newClaim = 0;
      if (rule.claimRule === 'copy') {
        newClaim = Math.round(parseFloat(dataRec.qualityClaim) || 0);
      } else if (rule.claimRule === 'ratio') {
        const dataClaimAmt = parseFloat(dataRec.qualityClaim) || 0;
        const salesRate = parseFloat(salesRec.rate) || 0;
        const dataRate = parseFloat(dataRec.rate) || 0;
        if (dataRate > 0) {
          newClaim = Math.round(dataClaimAmt * (salesRate / dataRate));
        }
      }

      const updatedRec = {
        ...salesRec,
        receivedWeight: hasRecWt(salesRec) ? salesRec.receivedWeight : newRecWeight,
        claim: hasClaim(salesRec) ? salesRec.claim : newClaim,
gunnyWeight: hasGunny(salesRec) ? salesRec.gunnyWeight : (parseFloat(dataRec.gunnyWeight) || 0),
        cdRule
      };
      updatedRecords.push(updatedRec);
      return updatedRec;
    });
    return newData;
  });

  if (updatedRecords.length > 0) {
    await upsertWorkingBatch(updatedRecords, activeFY);
  }

  if (updated === 0 && skipped === 0) {
    showToast("No parties found in Claim Management", "info");
  } else {
    showToast(`✅ Updated ${updated} | ⏭️ Skipped ${skipped}`, "success");
  }
}}
  style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}
>
  🔄 Auto-Populate Claims
</button>
   
   <button
        onClick={exportSalesWorkingCSV}
        style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"10px 20px", color:"#fff", fontWeight:700, cursor:"pointer" }}
      >
        ⬇️ CSV
      </button>
   
   <input
        style={{...inp, maxWidth:"300px"}}
        placeholder="Search..."
        value={salesSearch}
        onChange={e => setSalesSearch(e.target.value)}
      />
      <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>
        Total: <span style={{ color:"#f59e0b" }}>{salesWorkingData.length}</span> entries
      </div>
    </div>

    {/* TABLE (virtualized) */}
<div style={{ width:"100vw", marginLeft:"calc(50% - 50vw)", borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden", padding:"0 20px", boxSizing:"border-box" }}>
  {(() => {
    const parseRef = (ref) => {
      const s = String(ref || "").trim();
      const m = s.match(/^(\d+)(.*)$/);
      return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
    };
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targets = (v) => {
      const raw = String(v ?? "");
      const out = [norm(raw)];
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) out.push(`${m[3]}${m[2]}${m[1]}`); // DDMMYYYY
      return out;
    };
    let q = norm(salesSearch);
    const dmy = salesSearch.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmy) q = `${dmy[1].padStart(2,"0")}${dmy[2].padStart(2,"0")}${dmy[3]}`;
    const workingFiltered = salesWorkingData
      .filter(r => !salesSearch ||
        Object.values(r).some(v => targets(v).some(t => t.includes(q)))
      )
      .sort((a, b) => {
        const pa = parseRef(a.refNo), pb = parseRef(b.refNo);
        return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
      });
    return (
      <TableVirtuoso
        style={{ height: 600 }}
        data={workingFiltered}
        computeItemKey={(index, rec) => rec.id}
        components={WORKING_TABLE_COMPONENTS}
        fixedHeaderContent={() => (
          <tr style={{ background:"#151b2a" }}>
            {WORKING_COLS.map((c, i) => (
              <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < WORKING_COLS.length - 1 ? "1px solid #1e2a3a" : "none" }}>{c.label}</th>
            ))}
          </tr>
        )}
        itemContent={(index, rec) => (
          <SalesWorkingCells rec={rec} onUpdate={replaceWorkingRow} onSave={saveWorkingRow} />
        )}
      />
    );
  })()}
</div>
    {salesWorkingData.length === 0 && <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>No data. Click "Import from Flash" to add entries.</div>}
  </div>
)}

  {/* RECONCILE TAB */}
{selectedSalesTab === "reconcile" && (
  <div>
    <div style={{ display:"flex", gap:20, marginBottom:30 }}>
      <div style={{ flex:1, background:"#151b2a", borderRadius:8, padding:20, border:"1px solid #1e2a3a" }}>
        <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginBottom:8 }}>📊 Flash Tab (Source)</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#f59e0b" }}>{salesFlashData.length}</div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>Total entries</div>
      </div>
      <div style={{ flex:1, background:"#151b2a", borderRadius:8, padding:20, border:"1px solid #1e2a3a" }}>
        <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginBottom:8 }}>✏️ Working Tab</div>
        <div style={{ fontSize:28, fontWeight:800, color:"#22c55e" }}>{salesWorkingData.length}</div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>Total entries</div>
      </div>
      <div style={{ flex:1, background:"#151b2a", borderRadius:8, padding:20, border:"1px solid #1e2a3a" }}>
        <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginBottom:8 }}>🔗 Status</div>
        <div style={{ fontSize:28, fontWeight:800, color: salesFlashData.length === salesWorkingData.length ? "#22c55e" : "#ef4444" }}>
          {salesFlashData.length === salesWorkingData.length ? "✅ Synced" : "⚠️ Out of Sync"}
        </div>
        <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>
          {Math.abs(salesFlashData.length - salesWorkingData.length)} entries to sync
        </div>
      </div>
    </div>

    {/* ── SECTION 1: In Flash but NOT in Working ── */}
    <div style={{ marginBottom:30 }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>
        ➕ In Flash but NOT in Working (Add these)
      </h3>
      {(() => {
        const workingRefNos = new Set(salesWorkingData.map(r => r.refNo));
        const flashNotInWorking = salesFlashData.filter(r => !workingRefNos.has(r.refNo));
        const handleAdd = async (rec) => {
  if (confirm(`Add Ref No ${rec.refNo} to Working?`)) {
    const newRow = {
      ...rec,
      id: rec.refNo,
      receivedWeight:0, gunnyWeight:0, claimPct:0, claim:0, cdPct:0, cd:0, tdsReceived:0,
      bankDate1:"", bankPmt1:0, bankDate2:"", bankPmt2:0, bankDate3:"", bankPmt3:0,
      pmtId1:"", pmtId2:"", pmtId3:""
    };
    const ok = await upsertWorkingRow(newRow, activeFY);
    if (!ok) { showToast("Failed to save — check connection", "error"); return; }
    setSalesWorkingData(prev => [...prev, newRow]);
    showToast(`Ref No ${rec.refNo} added to Working`);
  }
};
        return flashNotInWorking.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No missing entries</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(flashNotInWorking.length * 35 + 40, 500) }}
              data={flashNotInWorking}
              computeItemKey={(_, rec) => rec.id}
              components={RECONCILE_SIMPLE_COMPONENTS}
              fixedHeaderContent={() => RECONCILE_SIMPLE_HEADER}
              itemContent={(_, rec) => <ReconcileAddRow rec={rec} onAdd={handleAdd} />}
            />
          </div>
        );
      })()}
    </div>

    {/* ── SECTION 2: Changed entries ── */}
    <div style={{ marginBottom:30 }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>
        🔄 Changed in Flash (Update or Keep Current)
      </h3>
      {(() => {
        const workingMap = new Map(salesWorkingData.map(r => [r.refNo, r]));
        const changedEntries = [];
        salesFlashData.forEach(flashRec => {
          const workingRec = workingMap.get(flashRec.refNo);
          if (workingRec) {
            const changed =
              flashRec.date !== workingRec.date ||
              flashRec.partyName !== workingRec.partyName ||
              flashRec.qty !== workingRec.qty ||
              flashRec.rate !== workingRec.rate;
            if (changed) changedEntries.push({ flashRec, workingRec });
          }
        });

        // Flatten into rows for virtualization
        const changeRows = [];
        changedEntries.forEach((item, idx) => {
          const changes = [];
          if (item.flashRec.date !== item.workingRec.date) changes.push({ field:"Date", current:item.workingRec.date, new:item.flashRec.date });
          if (item.flashRec.partyName !== item.workingRec.partyName) changes.push({ field:"Party", current:item.workingRec.partyName, new:item.flashRec.partyName });
          if (item.flashRec.qty !== item.workingRec.qty) changes.push({ field:"Qty", current:item.workingRec.qty, new:item.flashRec.qty });
          if (item.flashRec.rate !== item.workingRec.rate) changes.push({ field:"Rate", current:item.workingRec.rate, new:item.flashRec.rate });
          changes.forEach((change, changeIdx) => {
            changeRows.push({ ...change, refNo: item.flashRec.refNo, flashRec: item.flashRec, workingRec: item.workingRec, isFirst: changeIdx === 0, rowIdx: idx });
          });
        });

        return changedEntries.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No changed entries</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(changeRows.length * 35 + 40, 600) }}
              data={changeRows}
              computeItemKey={(_, row) => `${row.refNo}-${row.field}`}
              components={{
                Table: ({ children, style, ...rest }) => (
                  <table {...rest} style={{ ...style, width:"100%", fontSize:9, borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed" }}>
                    <colgroup>
                      <col style={{ width:70 }} />
                      <col style={{ width:100 }} />
                      <col style={{ width:100 }} />
                      <col style={{ width:100 }} />
                      <col style={{ width:180 }} />
                    </colgroup>
                    {children}
                  </table>
                ),
                TableRow: ({ style, ...props }) => {
                  const i = props["data-index"];
                  return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
                },
              }}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  {["Ref No","Field","Current (Working)","New (Flash)","Action"].map((label, i, arr) => (
                    <th key={label} style={{ padding:"8px 6px", textAlign: i === 4 ? "center" : "left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < arr.length - 1 ? "1px solid #1e2a3a" : "none" }}>
                      {label}
                    </th>
                  ))}
                </tr>
              )}
              itemContent={(_, row) => (
                <>
                  <td style={{ padding:"6px 6px", color:"#cbd5e1", fontWeight:600, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" }}>{row.isFirst ? row.refNo : ""}</td>
                  <td style={{ padding:"6px 6px", color:"#f59e0b", fontWeight:600, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" }}>{row.field}</td>
                  <td style={{ padding:"6px 6px", color:"#cbd5e1", whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" }}>{row.current}</td>
                  <td style={{ padding:"6px 6px", color:"#22c55e", fontWeight:600, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" }}>{row.new}</td>
                  <td style={{ padding:"6px 6px", textAlign:"center", whiteSpace:"nowrap" }}>
                    {row.isFirst && (
                      <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                        <button
                         onClick={async () => {
                            if (confirm(`Update Ref No ${row.flashRec.refNo} from Flash?\n\nThis will reset: Received Weight, Claim %, CD %, TDS, Bank Payments`)) {
                              const updated = {
                                ...row.workingRec,
                                date:row.flashRec.date, partyName:row.flashRec.partyName,
                                qty:row.flashRec.qty, rate:row.flashRec.rate,
                                receivedWeight:0, claimPct:0, claim:0, cdPct:0, cd:0, tdsReceived:0,
                                bankDate1:"", bankPmt1:0, bankDate2:"", bankPmt2:0, bankDate3:"", bankPmt3:0,
                                pmtId1:"", pmtId2:"", pmtId3:""
                              };
                              const ok = await upsertWorkingRow(updated, activeFY);
                              if (!ok) { showToast("Failed to save — check connection", "error"); return; }
                              setSalesWorkingData(prev => prev.map(r => r.refNo === row.flashRec.refNo ? updated : r));
                              showToast(`Ref No ${row.flashRec.refNo} updated from Flash`);
                            }
                          }}
                          style={{ background:"#3b82f6", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:8, cursor:"pointer" }}
                        >
                          🔄 Update
                        </button>
                        <button
                          onClick={() => showToast(`Ref No ${row.flashRec.refNo} kept as-is`)}
                          style={{ background:"#64748b", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:600, fontSize:8, cursor:"pointer" }}
                        >
                          ✓ Keep
                        </button>
                      </div>
                    )}
                  </td>
                </>
              )}
            />
          </div>
        );
      })()}
    </div>

    {/* ── SECTION 3: In Working but NOT in Flash ── */}
    <div>
      <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>
        ❌ In Working but NOT in Flash (Remove these)
      </h3>
      {(() => {
        const flashRefNos = new Set(salesFlashData.map(r => r.refNo));
        const workingNotInFlash = salesWorkingData.filter(r => !flashRefNos.has(r.refNo));
       const handleRemove = async (rec) => {
  if (confirm(`Remove Ref No ${rec.refNo} from Working? (Not in Flash)`)) {
    const ok = await deleteWorkingRow(rec.refNo, activeFY);
    if (!ok) { showToast("Failed to remove — check connection", "error"); return; }
    setSalesWorkingData(prev => prev.filter(r => r.id !== rec.id));
    showToast(`Ref No ${rec.refNo} removed from Working`);
  }
};
        return workingNotInFlash.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No orphaned entries in Working</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(workingNotInFlash.length * 35 + 40, 500) }}
              data={workingNotInFlash}
              computeItemKey={(_, rec) => rec.id}
              components={RECONCILE_SIMPLE_COMPONENTS}
              fixedHeaderContent={() => RECONCILE_SIMPLE_HEADER}
              itemContent={(_, rec) => <ReconcileRemoveRow rec={rec} onRemove={handleRemove} />}
            />
          </div>
     );
      })()}
    </div>
  </div>
)}

 {(selectedSalesTab === "partywise" || selectedSalesTab === "brokerwise") && (() => {
      const mode = selectedSalesTab === "partywise" ? "party" : "broker";
      const primaryVal = mode === "party" ? salesFilterParty : salesFilterBroker;

      const primaryList = mode === "party"
        ? [...new Set(salesWorkingData.map(r => r.partyName).filter(Boolean))].sort()
        : [...new Set(salesWorkingData.map(r => r.broker).filter(Boolean))].sort();

      const secondaryList = !primaryVal ? [] : (mode === "party"
        ? [...new Set(salesWorkingData.filter(r => r.partyName === salesFilterParty).map(r => r.broker).filter(Boolean))].sort()
        : [...new Set(salesWorkingData.filter(r => r.broker === salesFilterBroker).map(r => r.partyName).filter(Boolean))].sort());

      const secondaryHasBlank = !primaryVal ? false : (mode === "party"
        ? salesWorkingData.some(r => r.partyName === salesFilterParty && !(r.broker || "").trim())
        : salesWorkingData.some(r => r.broker === salesFilterBroker && !(r.partyName || "").trim()));

      const needsSelection = !primaryVal;

      const rowsWithCalc = salesWorkingData.map(r => ({ r, c: calculateSalesFields(r) })).filter(({ r, c }) => {
        const matchPrimary = mode === "party" ? r.partyName === salesFilterParty : r.broker === salesFilterBroker;
        const matchSecondary = mode === "party"
          ? (!salesFilterBroker || (salesFilterBroker === "__BLANK__" ? !(r.broker || "").trim() : r.broker === salesFilterBroker))
          : (!salesFilterParty || (salesFilterParty === "__BLANK__" ? !(r.partyName || "").trim() : r.partyName === salesFilterParty));
        const s = salesSearch.toLowerCase();
        const matchSearch = !s || [r.refNo, r.partyName, r.broker, r.date].some(v => String(v || "").toLowerCase().includes(s));
        const p = c.pendingAmt;
        const matchPending = (p < 0 && salesPending.neg) || (p === 0 && salesPending.zero) || (p > 0 && salesPending.pos);
        return matchPrimary && matchSecondary && matchSearch && matchPending;
      });
      const parseRefSummary = (ref) => {
        const s = String(ref || "").trim();
        const m = s.match(/^(\d+)(.*)$/);
        return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
      };
      rowsWithCalc.sort((a, b) => {
        const pa = parseRefSummary(a.r.refNo), pb = parseRefSummary(b.r.refNo);
        return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
      });
  
      const PMT_KEYS = new Set(["bankDate1","bankPmt1","bankDate2","bankPmt2","bankDate3","bankPmt3","pendingAmt","days"]);
      const visibleCols = SALES_SUMMARY_COLS.filter(col => {
        if (salesHidePmt && PMT_KEYS.has(col.key)) return false;
        if (mode === "party" && col.key === "partyName") return false;
        if (mode === "broker" && col.key === "broker") return false;
        if (mode === "party" && col.key === "broker" && salesFilterBroker && salesFilterBroker !== "__BLANK__") return false;
        if (mode === "broker" && col.key === "partyName" && salesFilterParty && salesFilterParty !== "__BLANK__") return false;
        return rowsWithCalc.some(({ r, c }) => {
          const v = salesColValue(col, r, c);
          const str = String(v ?? "").trim();
          return str !== "" && str !== "0";
        });
      });

     const CALC_KEYS = new Set(["netAmt", "pendingAmt", "shortageAmount", "gunnyAmount"]);
      const totalFor = (key) => rowsWithCalc.reduce((s, { r, c }) =>
        s + (CALC_KEYS.has(key) ? (parseFloat(c[key]) || 0) : (parseFloat(r[key]) || 0)), 0);

      const rows = rowsWithCalc.map(x => x.r);

      return (
        <div>
          <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
            <input
              style={{ ...inp, maxWidth:"260px", opacity: needsSelection ? 0.4 : 1 }}
              placeholder={needsSelection ? (mode === "party" ? "Select a party first..." : "Select a broker first...") : "Search..."}
              value={salesSearch}
              onChange={e => setSalesSearch(e.target.value)}
              disabled={needsSelection}
            />
            {mode === "party" ? (
              <>
                <select style={{ ...inp, maxWidth:"220px" }} value={salesFilterParty} onChange={e => { setSalesFilterParty(e.target.value); setSalesFilterBroker(""); }}>
                  <option value="">— Select Party —</option>
                  {primaryList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select style={{ ...inp, maxWidth:"220px", opacity: salesFilterParty ? 1 : 0.4 }} value={salesFilterBroker} onChange={e => setSalesFilterBroker(e.target.value)} disabled={!salesFilterParty}>
                  <option value="">All Brokers</option>
                  {secondaryHasBlank && <option value="__BLANK__">(No Broker)</option>}
                  {secondaryList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </>
            ) : (
              <>
                <select style={{ ...inp, maxWidth:"220px" }} value={salesFilterBroker} onChange={e => { setSalesFilterBroker(e.target.value); setSalesFilterParty(""); }}>
                  <option value="">— Select Broker —</option>
                  {primaryList.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select style={{ ...inp, maxWidth:"220px", opacity: salesFilterBroker ? 1 : 0.4 }} value={salesFilterParty} onChange={e => setSalesFilterParty(e.target.value)} disabled={!salesFilterBroker}>
                  <option value="">All Parties</option>
                  {secondaryHasBlank && <option value="__BLANK__">(No Party)</option>}
                  {secondaryList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </>
            )}

            <div style={{ display:"flex", gap:12, alignItems:"center", background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"8px 12px" }}>
              <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>PENDING:</span>
              {[["neg","< 0"],["zero","0"],["pos","> 0"]].map(([k, label]) => (
                <label key={k} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:12, color:"#cbd5e1" }}>
                  <input type="checkbox" checked={salesPending[k]} onChange={e => setSalesPending(prev => ({ ...prev, [k]: e.target.checked }))} style={{ cursor:"pointer", width:15, height:15 }} />
                  {label}
                </label>
            ))}
            </div>
            
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:12, color:"#cbd5e1", background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"8px 12px" }}>
              <input type="checkbox" checked={salesHidePmt} onChange={e => setSalesHidePmt(e.target.checked)} style={{ cursor:"pointer", width:15, height:15 }} />
              Hide PMT details
            </label>

            {!needsSelection && rows.length > 0 && (
              <button onClick={() => printSalesSummary(rowsWithCalc, visibleCols, mode, primaryVal, mode === "party" ? salesFilterBroker : salesFilterParty)} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                🖨️ Print
              </button>
            )}
          </div>

          <div style={{ width:"100vw", marginLeft:"calc(50% - 50vw)", borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden", padding:"0 20px", boxSizing:"border-box" }}>
            {needsSelection ? (
              <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>
                {mode === "party" ? "Select a party to view its records." : "Select a broker to view its records."}
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>NO RECORDS</div>
            ) : (
              <>
                <TableVirtuoso
                  style={{ height:600 }}
                  data={rows}
                  computeItemKey={(_, rec) => rec.id}
                  components={{
                    Table: ({ children, style, ...rest }) => (
                      <table {...rest} style={{ ...style, width:"100%", fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"auto" }}>
                        {children}
                      </table>
                    ),
                    TableRow: ({ style, ...props }) => {
                      const i = props["data-index"];
                      return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
                    },
                  }}
                  fixedHeaderContent={() => (
                    <tr style={{ background:"#151b2a" }}>
                      {visibleCols.map((col, i) => (
                        <th key={col.key} style={{ padding:"8px 6px", textAlign: col.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < visibleCols.length - 1 ? "1px solid #1e2a3a" : "none", fontSize:10 }}>
                          {col.label.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  )}
                  itemContent={(_, rec) => <SalesSummaryRow rec={rec} cols={visibleCols} />}
                />
                <div style={{ display:"flex", flexWrap:"wrap", gap:16, padding:"12px 16px", background:"#151b2a", borderTop:"2px solid #f59e0b", fontSize:11 }}>
                  <span style={{ color:"#f59e0b", fontWeight:700, marginRight:8 }}>TOTALS ({rows.length})</span>
                  {visibleCols.filter(col => SALES_SUMMARY_TOTAL_KEYS.has(col.key)).map(col => (
                    <span key={col.key} style={{ color:"#cbd5e1" }}>
                      <span style={{ color:"#64748b" }}>{col.label.toUpperCase()}:</span>{" "}
                      <strong>₹{Number(totalFor(col.key)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      );
})()}
 
 {selectedSalesTab === "groupbypmt" && (() => {
  const parseBankDate = (d) => {
    if (!d) return null;
    const p = String(d).split('-');
    if (p.length !== 3) return null;
    let [dd, mm, yy] = p;
    if (yy.length === 2) yy = "20" + yy;
    return new Date(parseInt(yy), parseInt(mm) - 1, parseInt(dd));
  };

  const parseRefNo = (ref) => {
    const s = String(ref || "").trim();
    const m = s.match(/^(\d+)(.*)$/);
    return m ? { num: parseInt(m[1], 10), suf: m[2].toUpperCase() } : { num: Infinity, suf: s.toUpperCase() };
  };

  const allBank = [...(bankingData.HDFC || []), ...(bankingData.SBI || []), ...(bankingData.VASB || [])];
  const bankByChq = new Map();
  allBank.forEach(t => { if (t.chqRef) bankByChq.set(String(t.chqRef).trim(), t); });

  const groups = {};
  salesWorkingData.forEach(bill => {
    [1, 2, 3].forEach(slot => {
      const pid = String(bill[`pmtId${slot}`] || "").trim();
      const amt = parseFloat(bill[`bankPmt${slot}`]) || 0;
      if (!pid) return;
      if (!groups[pid]) groups[pid] = [];
      groups[pid].push({ bill, slot, allocated: amt });
    });
  });

  const groupList = Object.entries(groups).map(([pid, rows]) => {
    const bankTrans = bankByChq.get(pid);
    const bankAmt = bankTrans ? (parseFloat(bankTrans.depositAmt) || 0) : 0;
    const bankDate = bankTrans ? bankTrans.date : "";
    const billsTotal = rows.reduce((s, r) => s + r.allocated, 0);
    const sortedRows = [...rows].sort((a, b) => {
      const pa = parseRefNo(a.bill.refNo), pb = parseRefNo(b.bill.refNo);
      return pa.num !== pb.num ? pa.num - pb.num : pa.suf.localeCompare(pb.suf);
    });
    return { pid, rows: sortedRows, bankAmt, bankDate, billsTotal, diff: billsTotal - bankAmt };
  });

  groupList.sort((a, b) => {
    const da = parseBankDate(a.bankDate), db = parseBankDate(b.bankDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  const money = (v) => "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const th = { padding:"8px 10px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const thR = { ...th, textAlign:"right" };
  const td = { padding:"8px 10px", color:"#cbd5e1", fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
  const tdR = { ...td, textAlign:"right" };
  const handlePrintGroups = () => {
    if (groupList.length === 0) { showToast("Nothing to print", "error"); return; }
    const w = window.open('', '', 'height=700,width=1100');
    let html = `<style>
      @page { size: A4 landscape; margin: 8mm; }
      body { font-family: Arial, sans-serif; }
      h2 { font-size: 14px; margin: 0 0 4px; }
      .ghead { font-size: 12px; margin: 14px 0 4px; font-weight: bold; }
      table { width:100%; border-collapse: collapse; font-size: 9px; margin-bottom: 6px; }
      th, td { border: 1px solid #000; padding: 3px 5px; white-space: nowrap; }
      th { background: #eee; text-align: left; }
      .r { text-align: right; }
      .tot { font-weight: bold; background: #eee; }
    </style>`;
    html += `<h2>GROUP BY PMT — ${groupList.length} payments</h2>`;
    groupList.forEach(g => {
      html += `<div class="ghead">PMT ${g.pid} — Bank Deposit ₹${Number(g.bankAmt).toLocaleString("en-IN",{maximumFractionDigits:2})} · ${g.bankDate || "—"} · ${g.diff === 0 ? "MATCHED" : (g.diff > 0 ? "OVER ₹"+Number(g.diff).toLocaleString("en-IN",{maximumFractionDigits:2}) : "SHORT ₹"+Number(-g.diff).toLocaleString("en-IN",{maximumFractionDigits:2}))}</div>`;
      html += `<table><thead><tr><th>Ref No</th><th>Date</th><th>Party</th><th class="r">Net Amt</th><th class="r">Slot</th><th class="r">Allocated</th><th class="r">Pending</th><th class="r">Days</th></tr></thead><tbody>`;
      g.rows.forEach(r => {
        const c = calculateSalesFields(r.bill);
        html += `<tr><td>${r.bill.refNo}</td><td>${r.bill.date || ""}</td><td>${r.bill.partyName || ""}</td><td class="r">₹${Number(c.netAmt).toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td class="r">${r.slot}</td><td class="r">₹${Number(r.allocated).toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td class="r">₹${Number(c.pendingAmt).toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td class="r">${c.days}</td></tr>`;
      });
      html += `<tr class="tot"><td colspan="5">TOTAL (${g.rows.length})</td><td class="r">₹${Number(g.billsTotal).toLocaleString("en-IN",{maximumFractionDigits:2})}</td><td colspan="2"></td></tr>`;
      html += `</tbody></table>`;
    });
    w.document.write(html); w.document.close(); w.print();
  };
 
  if (groupList.length === 0) {
    return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>No linked PMTs yet.</div>;
  }

 return (
    <div>
      <div style={{ marginBottom:16 }}>
        <button onClick={handlePrintGroups} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>
          🖨️ Print All Groups
        </button>
      </div>
      {groupList.map(g => (
        <div key={g.pid} style={{ marginBottom:28, border:"1px solid #1e2a3a", borderRadius:8, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontWeight:800, color:"#f59e0b", fontSize:14 }}>PMT {g.pid}</span>
            <span style={{ color:"#cbd5e1", fontSize:12 }}>Bank Deposit <strong>{money(g.bankAmt)}</strong></span>
            <span style={{ color:"#64748b", fontSize:12 }}>{g.bankDate || "—"}</span>
            <span style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color: g.diff === 0 ? "#22c55e" : "#ef4444" }}>
              {g.diff === 0 ? "✓ Matched" : (g.diff > 0 ? `Over ${money(g.diff)}` : `Short ${money(-g.diff)}`)}
            </span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:11 }}>
              <thead>
                <tr style={{ background:"#0f1117" }}>
                  <th style={th}>Ref No</th>
                  <th style={th}>Date</th>
                  <th style={th}>Party</th>
                  <th style={thR}>Net Amt</th>
                  <th style={thR}>Slot</th>
                  <th style={thR}>Allocated</th>
                  <th style={thR}>Pending</th>
                  <th style={thR}>Days</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => {
                  const c = calculateSalesFields(r.bill);
                  return (
                    <tr key={`${g.pid}-${r.bill.id}-${r.slot}`} style={{ background: i % 2 === 0 ? "#0f1117" : "#151b2a", borderBottom:"1px solid #1e2a3a" }}>
                      <td style={td}>{r.bill.refNo}</td>
                      <td style={td}>{r.bill.date}</td>
                      <td style={td}>{r.bill.partyName}</td>
                      <td style={tdR}>{money(c.netAmt)}</td>
                      <td style={tdR}>{r.slot}</td>
                      <td style={tdR}>{money(r.allocated)}</td>
                      <td style={tdR}>{money(c.pendingAmt)}</td>
                      <td style={tdR}>{c.days}</td>
                    </tr>
                  );
                })}
                <tr style={{ background:"#151b2a", borderTop:"2px solid #f59e0b", fontWeight:700 }}>
                  <td style={td} colSpan={5}>TOTAL ({g.rows.length})</td>
                  <td style={tdR}>{money(g.billsTotal)}</td>
                  <td style={td} colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
})()}

  </div>
)}
      {view === "data" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>DATA REGISTER</h2>
    <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
      {/* SEARCH — disabled in summary modes until primary is selected */}
      <input
        style={{ ...inp, opacity: (summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker) ? 0.4 : 1 }}
        placeholder={
          summaryType === "party" && !filterParty ? "Select a party first..." :
          summaryType === "broker" && !filterBroker ? "Select a broker first..." :
          "Search..."
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        disabled={(summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker)}
      />

      {summaryType === "party" ? (
        <>
          <select style={inp} value={filterParty} onChange={handlePartyChange}>
            <option value="">— Select Party —</option>
            {parties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
     <select
            style={{ ...inp, opacity: filterParty ? 1 : 0.4 }}
            value={filterBroker}
            onChange={handleBrokerChange}
            disabled={!filterParty}
          >
            <option value="">All Brokers</option>
           {hasBlankBroker && <option value="__BLANK__">(No Broker)</option>}
            {filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </>
      ) : summaryType === "broker" ? (
        <>
          <select style={inp} value={filterBroker} onChange={handleBrokerChange}>
            <option value="">— Select Broker —</option>
            {brokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
     <select
            style={{ ...inp, opacity: filterBroker ? 1 : 0.4 }}
            value={filterParty}
            onChange={handlePartyChange}
            disabled={!filterBroker}
          >
            <option value="">All Parties</option>
            {hasBlankParty && <option value="__BLANK__">(No Party)</option>}
            {filteredParties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </>
      ) : (
        <>
        <select style={inp} value={filterBroker} onChange={handleBrokerChange}><option value="">All Brokers</option>{hasBlankBroker && <option value="__BLANK__">(No Broker)</option>}{filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select style={inp} value={filterParty} onChange={handlePartyChange}><option value="">All Parties</option>{filteredParties.map(p => <option key={p} value={p}>{p}</option>)}</select>
        </>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setSummaryType(summaryType === "party" ? "none" : "party"); setFilterParty(""); setFilterBroker(""); setSearch(""); }} style={{ background: summaryType === "party" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          👥 Party Summary
        </button>
        <button onClick={() => { setSummaryType(summaryType === "broker" ? "none" : "broker"); setFilterParty(""); setFilterBroker(""); setSearch(""); }} style={{ background: summaryType === "broker" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          🏢 Broker Summary
        </button>
     <button onClick={() => printTable(filtered, "DATA REGISTER")} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          🖨️ Print
        </button>
        <button onClick={exportDataCSV} style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          ⬇️ CSV
        </button>
      </div>
    </div>

    {(() => {
      const allKeys = [...new Set(filtered.flatMap(r => Object.keys(r)))];
      const alwaysShow = ["_balance"];
     const partyBaseColumns = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "rate", "billQty", "_shortage", "_halfKgQty", "_netQty", "_netAmt1", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "_tds", "_brokerageAmt","_finalAmt"];
      const brokerBaseColumns = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "rate", "billQty", "_shortage", "_halfKgQty", "_netQty", "_netAmt1", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "_tds", "_brokerageAmt","_finalAmt"];
      const summaryColumns = summaryType === "party" ? partyBaseColumns : summaryType === "broker" ? brokerBaseColumns : [];
      const isSummaryMode = summaryType !== "none";
     const columnsToUse = isSummaryMode ? summaryColumns : allKeys.filter(key => key !== "brokerageAmt" && (filtered.some(r => r[key] && String(r[key]).trim()) || alwaysShow.includes(key)));
      const visibleKeys = isSummaryMode 
        ? summaryColumns.filter(key => filtered.some(r => r[key] && String(r[key]).trim() && String(r[key]).trim() !== "0"))
        : columnsToUse.filter(key => filtered.some(r => r[key] && String(r[key]).trim()));
      const columnOrder = ["_bankLinked","refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "rate", "billQty", "receiveQty", "_shortage", "halfKgValue", "gunnyWeight", "_halfKgQty", "_netQty", "_netAmt1", "cdPct", "_cdAmt", "qualityClaim", "hammali", "freight", "others", "_netAmt", "brokerageRate","_brokerageAmt", "_tds", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance", "note"];
      const sortedVisibleKeys = [...visibleKeys].sort((a, b) => {
        const aIdx = columnOrder.indexOf(a);
        const bIdx = columnOrder.indexOf(b);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    const finalKeys = sortedVisibleKeys.filter(k => {
        if (summaryType === "party") {
          if (k === "partyName") return false;                 // primary always hidden
          if (k === "brokerName" && filterBroker) return false; // secondary hidden only if a specific broker chosen
        }
        if (summaryType === "broker") {
          if (k === "brokerName") return false;                // primary always hidden
          if (k === "partyName" && filterParty) return false;  // secondary hidden only if a specific party chosen
        }
        return true;
      });
      const needsSelection = (summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker);
     
      // KEY FIX: tableLayout:"auto", NO colgroup — lets browser size dynamic columns naturally
      const DATA_TABLE_COMPONENTS = {
        Table: ({ children, style, ...rest }) => (
          <table {...rest} style={{ ...style, width:"100%", fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"auto" }}>
            {children}
          </table>
        ),
        TableRow: ({ style, ...props }) => {
          const i = props["data-index"];
          return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
        },
      };

    return (
        <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
          {needsSelection ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>
              {summaryType === "party" ? "Select a party to view its records." : "Select a broker to view its records."}
            </div>
          ) : filtered.length > 0 ? (
            <TableVirtuoso
              style={{ height:600 }}
              data={filtered}
              computeItemKey={(_, rec) => rec.refNo}
              components={DATA_TABLE_COMPONENTS}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  {finalKeys.map(k => (
                    <th key={k} style={{ padding:"8px 6px", textAlign:"left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight:"1px solid #1e2a3a", fontSize:10 }}>
                      {k.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </th>
                  ))}
                </tr>
              )}
          itemContent={(_, rec) => (
                <DataTableRow
                  rec={rec}
                  visibleKeys={finalKeys}
                  fmt={fmt}
                  fmtDate={fmtDate}
                  getLinkedBankStatus={getLinkedBankStatus}
                />
              )}
            />
          ) : (
            <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>NO RECORDS</div>
          )}
          {isSummaryMode && !needsSelection && filtered.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:16, padding:"12px 16px", background:"#151b2a", borderTop:"2px solid #f59e0b", fontSize:11 }}>
              <span style={{ color:"#f59e0b", fontWeight:700, marginRight:8 }}>TOTALS ({filtered.length})</span>
              {finalKeys.filter(k => NUMERIC_TOTAL_KEYS.has(k)).map(k => (
                <span key={k} style={{ color:"#cbd5e1" }}>
                  <span style={{ color:"#64748b" }}>{k.replace(/_/g,"").replace(/([A-Z])/g," $1").trim().toUpperCase()}:</span>{" "}
                  <strong>₹{fmt(Math.round(sumCol(filtered, k)))}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    })()}
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
      <input
        style={{ ...inp, opacity: (summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker) ? 0.4 : 1 }}
        placeholder={
          summaryType === "party" && !filterParty ? "Select a party first..." :
          summaryType === "broker" && !filterBroker ? "Select a broker first..." :
          "Search..."
        }
        value={search}
        onChange={e => setSearch(e.target.value)}
        disabled={(summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker)}
      />

      {summaryType === "party" ? (
        <>
          <select style={inp} value={filterParty} onChange={handlePartyChange}>
            <option value="">— Select Party —</option>
            {parties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select style={{ ...inp, opacity: filterParty ? 1 : 0.4 }} value={filterBroker} onChange={handleBrokerChange} disabled={!filterParty}>
            <option value="">All Brokers</option>
            {filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </>
      ) : summaryType === "broker" ? (
        <>
          <select style={inp} value={filterBroker} onChange={handleBrokerChange}>
            <option value="">— Select Broker —</option>
            {brokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select style={{ ...inp, opacity: filterBroker ? 1 : 0.4 }} value={filterParty} onChange={handlePartyChange} disabled={!filterBroker}>
            <option value="">All Parties</option>
            {filteredParties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </>
      ) : (
        <>
          <select style={inp} value={filterBroker} onChange={handleBrokerChange}><option value="">All Brokers</option>{filteredBrokers.map(b => <option key={b} value={b}>{b}</option>)}</select>
          <select style={inp} value={filterParty} onChange={handlePartyChange}><option value="">All Parties</option>{filteredParties.map(p => <option key={p} value={p}>{p}</option>)}</select>
        </>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setSummaryType(summaryType === "party" ? "none" : "party"); setFilterParty(""); setFilterBroker(""); setSearch(""); }} style={{ background: summaryType === "party" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          👥 Party Summary
        </button>
        <button onClick={() => { setSummaryType(summaryType === "broker" ? "none" : "broker"); setFilterParty(""); setFilterBroker(""); setSearch(""); }} style={{ background: summaryType === "broker" ? "#f59e0b" : "#64748b", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          🏢 Broker Summary
        </button>
      <button onClick={() => printPmtTable(filtered, "PAYMENT SUMMARY")} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 12px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
          🖨️ Print
        </button>
      </div>
    </div>

    {(() => {
      const pmtColumns = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];
      const partyBasePmt = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];
      const brokerBasePmt = ["refNo", "deliveryAt", "truckNo", "partyName", "brokerName", "billDate", "billNo", "_finalAmt", "bankAmt1", "bankDate1", "bankName1", "bankAmt2", "bankDate2", "bankName2", "bankAmt3", "bankDate3", "bankName3", "_balance"];

    const columnsToUse = summaryType === "party" ? partyBasePmt : summaryType === "broker" ? brokerBasePmt : pmtColumns;
      const visibleKeys = columnsToUse.filter(key =>
        filtered.some(r => r[key] && String(r[key]).trim()) || key === "_finalAmt" || key === "_balance"
     
      ).filter(k => {
           if (summaryType === "party") {
          if (k === "partyName") return false;
          if (k === "brokerName" && filterBroker) return false;
        }
        if (summaryType === "broker") {
          if (k === "brokerName") return false;
          if (k === "partyName" && filterParty) return false;
        }
        return true;
      });
    
      const needsSelection = (summaryType === "party" && !filterParty) || (summaryType === "broker" && !filterBroker);
      const PMT_TABLE_COMPONENTS = {
        Table: ({ children, style, ...rest }) => (
          <table {...rest} style={{ ...style, width:"100%", fontSize:10, borderCollapse:"separate", borderSpacing:0, tableLayout:"auto" }}>
            {children}
          </table>
        ),
        TableRow: ({ style, ...props }) => {
          const i = props["data-index"];
          return <tr {...props} style={{ ...style, borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }} />;
        },
      };

      return (
        <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
          {needsSelection ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>
              {summaryType === "party" ? "Select a party to view its records." : "Select a broker to view its records."}
            </div>
          ) : filtered.length > 0 ? (
            <TableVirtuoso
              style={{ height:600 }}
              data={filtered}
              computeItemKey={(_, rec) => rec.refNo}
              components={PMT_TABLE_COMPONENTS}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  {visibleKeys.map(k => (
                    <th key={k} style={{ padding:"8px 6px", textAlign:"left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight:"1px solid #1e2a3a", fontSize:10 }}>
                      {k.replace(/([A-Z])/g, ' $1').toUpperCase()}
                    </th>
                  ))}
                </tr>
              )}
         itemContent={(_, rec) => (
                <PmtTableRow
                  rec={rec}
                  visibleKeys={visibleKeys}
                  fmt={fmt}
                  fmtDate={fmtDate}
                />
              )}
            />
          ) : (
            <div style={{ padding:20, textAlign:"center", color:"#64748b" }}>NO RECORDS</div>
          )}
          {summaryType !== "none" && !needsSelection && filtered.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:16, padding:"12px 16px", background:"#151b2a", borderTop:"2px solid #f59e0b", fontSize:11 }}>
              <span style={{ color:"#f59e0b", fontWeight:700, marginRight:8 }}>TOTALS ({filtered.length})</span>
              {visibleKeys.filter(k => PMT_TOTAL_KEYS.has(k)).map(k => (
                <span key={k} style={{ color:"#cbd5e1" }}>
                  <span style={{ color:"#64748b" }}>{k.replace(/_/g,"").replace(/([A-Z])/g," $1").trim().toUpperCase()}:</span>{" "}
                  <strong>₹{fmt(Math.round(sumCol(filtered, k)))}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    })()}
  </div>
)}
       {view === "manage" && (() => {
          const CONFIGS = [
            { title: "PARTIES", list: parties, setList: setParties, newItem: newParty, setNewItem: setNewParty, addFn: addParty, delFn: deleteParty },
            { title: "BROKERS", list: brokers, setList: setBrokers, newItem: newBroker, setNewItem: setNewBroker, addFn: addBroker, delFn: deleteBroker },
            { title: "DELIVERIES", list: deliveries, setList: setDeliveries, newItem: newDelivery, setNewItem: setNewDelivery, addFn: addDelivery, delFn: deleteDelivery },
            { title: "BANKS", list: banks, setList: setBanks, newItem: newBank, setNewItem: setNewBank, addFn: addBank, delFn: deleteBank }
          ];

          const renderCard = ({ title, list, setList, newItem, setNewItem, addFn, delFn }) => {
            const trimmedInput = newItem.trim();
            const exists = list.some(item => item.toLowerCase() === trimmedInput.toLowerCase());
            const suggestions = trimmedInput ? list.filter(item => item.toLowerCase().includes(trimmedInput.toLowerCase())).slice(0, 5) : [];
            const canAdd = trimmedInput && !exists;
            const isParties = title === "PARTIES";

            const handleAdd = async () => {
              if (!canAdd) {
                showToast(exists ? title.slice(0,-1) + " already exists!" : "Enter a value", "error");
                return;
              }
              if (addFn) {
                const ok = await addFn(trimmedInput);
                if (!ok) { showToast("Failed to save — check connection", "error"); return; }
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
                    <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} style={inp} placeholder={"Add " + title.toLowerCase() + "..."} />
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
                {list.map(item => {
                    const panInfo = partyPans[item] || { pan: "", verified: false };
                    const isVerified = !!panInfo.verified;
                    const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

                    return (
                      <div key={item} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, padding:"8px 10px", background:"#0f1117", borderRadius:6, marginBottom:6 }}>
                        <span style={{ fontSize:12, color:"#e2e8f0", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item}</span>

                        {isParties && (
                          <>
                            <input
                              defaultValue={panInfo.pan}
                              key={`pan-${item}-${panInfo.pan}-${isVerified}`}
                              placeholder="PAN"
                              maxLength={10}
                              disabled={isVerified}
                              onBlur={async (e) => {
                                if (isVerified) return; // locked, shouldn't fire
                                const pan = e.target.value.trim().toUpperCase();
                                if (pan === (panInfo.pan || "")) return;
                                const ok = await updatePartyPan(item, pan);
                                if (!ok) { showToast("Failed to save PAN — check connection", "error"); return; }
                                setPartyPans(prev => ({ ...prev, [item]: { ...(prev[item] || {}), pan, verified: false } }));
                                showToast(`PAN saved for ${item}`);
                              }}
                              style={{
                                width:130, background: isVerified ? "#0f1117" : "#151b2a",
                                border:"1px solid #1e2a3a", borderRadius:4, padding:"4px 6px",
                                color: isVerified ? "#64748b" : "#e2e8f0", fontSize:11,
                                textTransform:"uppercase", outline:"none", flexShrink:0,
                                cursor: isVerified ? "not-allowed" : "text"
                              }}
                            />

                            <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color: isVerified ? "#22c55e" : "#64748b", cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                              <input
                                type="checkbox"
                                checked={isVerified}
                                onChange={async (e) => {
                                  const wantVerified = e.target.checked;
                                  if (wantVerified) {
                                    // Gate: only allow verify if PAN is a valid 10-char PAN
                                    const currentPan = (partyPans[item]?.pan || "").trim().toUpperCase();
                                    if (!PAN_RE.test(currentPan)) {
                                      showToast("Enter a valid 10-character PAN first (e.g. ABCDE1234F)", "error");
                                      return;
                                    }
                                  }
                                  const ok = await updatePartyPanVerified(item, wantVerified);
                                  if (!ok) { showToast("Failed to save — check connection", "error"); return; }
                                  setPartyPans(prev => ({ ...prev, [item]: { ...(prev[item] || {}), verified: wantVerified } }));
                                  showToast(wantVerified ? `PAN verified & locked for ${item}` : `Unlocked ${item} for editing`);
                                }}
                                style={{ cursor:"pointer", width:13, height:13 }}
                              />
                              Verified
                            </label>
                          </>
                        )}

                        <button onClick={async () => {
                          if (delFn) {
                            const ok = await delFn(item);
                            if (!ok) { showToast("Failed to delete — check connection", "error"); return; }
                          }
                          setList(list.filter(x => x !== item));
                          showToast(title.slice(0,-1) + " DELETED!", "error");
                        }} style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"3px 8px", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0 }}>DEL</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          };

          const partiesCfg = CONFIGS.find(c => c.title === "PARTIES");
          const restCfgs = CONFIGS.filter(c => c.title !== "PARTIES");

          return (
            <div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>MANAGE LISTS</h2>

              {/* Parties — full width */}
              <div style={{ marginBottom:20 }}>
                {renderCard(partiesCfg)}
              </div>

              {/* Brokers, Deliveries, Banks — below */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20 }}>
                {restCfgs.map(renderCard)}
              </div>
            </div>
          );
        })()}
      </div>
{view === "purchaseSalesReconcile" && (() => {
  // ── Build Maps ONCE — O(n) instead of O(n²) ──
  const salesByRefNo = new Map(salesWorkingData.map(s => [s.refNo, s]));
  const recordsByRefNo = new Map(records.map(r => [r.refNo, r]));

  const exactMatches = records.filter(r => {
    const s = salesByRefNo.get(r.refNo);
    return s && s.partyName === r.deliveryAt &&
      (!purchaseSalesSearch ||
        r.refNo.toString().includes(purchaseSalesSearch) ||
        r.deliveryAt.toLowerCase().includes(purchaseSalesSearch.toLowerCase()));
  }).map(r => ({ purchase: r, sales: salesByRefNo.get(r.refNo) }));

  const partyMismatch = records.filter(r => {
    const s = salesByRefNo.get(r.refNo);
    return s && s.partyName !== r.deliveryAt &&
      (!purchaseSalesSearch ||
        r.refNo.toString().includes(purchaseSalesSearch) ||
        r.deliveryAt.toLowerCase().includes(purchaseSalesSearch.toLowerCase()));
  }).map(r => ({ purchase: r, sales: salesByRefNo.get(r.refNo) }));

  const orphanedPurchases = records.filter(r =>
    !salesByRefNo.has(r.refNo) &&
    (!purchaseSalesSearch ||
      r.refNo.toString().includes(purchaseSalesSearch) ||
      r.deliveryAt.toLowerCase().includes(purchaseSalesSearch.toLowerCase()))
  );

  const orphanedSales = salesWorkingData.filter(s =>
    !recordsByRefNo.has(s.refNo) &&
    !ignoredSalesParties.includes(s.partyName) &&
    (!purchaseSalesSearch ||
      s.refNo.toString().includes(purchaseSalesSearch) ||
      s.partyName.toLowerCase().includes(purchaseSalesSearch.toLowerCase()))
  );

  const handleLink = (refNo) => showToast(`Linked: ${refNo}`, "success");
 const handleUpdate = async (refNo, newParty) => {
  const rec = records.find(r => r.refNo === refNo);
  if (!rec) return;

  const updated = { ...rec, deliveryAt: newParty };

  const ok = await upsertRecord(updated, activeFY);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }

  setRecords(prev => prev.map(r => r.refNo === refNo ? updated : r));
  showToast(`Updated: ${refNo}`, "success");
};
  const handleIgnore = async (partyName) => {
  const ok = await addIgnoredSalesParty(partyName);
  if (!ok) { showToast("Failed to save — check connection", "error"); return; }
  setIgnoredSalesParties(prev => [...new Set([...prev, partyName])]);
  showToast(`${partyName} added to ignore list`, "success");
};
const handleUnignore = async (party) => {
  const ok = await deleteIgnoredSalesParty(party);
  if (!ok) { showToast("Failed to remove — check connection", "error"); return; }
  setIgnoredSalesParties(prev => prev.filter(p => p !== party));
  showToast(`${party} removed from ignore list`, "info");
};

  const H = (label) => (cols) => (
    <tr style={{ background:"#151b2a" }}>
      {cols.map((c, i) => (
        <th key={i} style={{ padding:"8px 6px", textAlign:c.align, color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < cols.length - 1 ? "1px solid #1e2a3a" : "none", fontSize:9 }}>
          {c.label}
        </th>
      ))}
    </tr>
  );

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>🔗 PURCHASE-SALES RECONCILE</h2>

      <div style={{ marginBottom:20 }}>
        <input style={{...inp, maxWidth:"400px"}} placeholder="Search by Ref No, Party, Delivery..." value={purchaseSalesSearch} onChange={e => setPurchaseSalesSearch(e.target.value)} />
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display:"flex", gap:20, marginBottom:30 }}>
        {[
          { label:"📋 Purchases (Data)", val:records.length, color:"#f59e0b", sub:"Total entries" },
          { label:"💰 Sales",            val:salesWorkingData.length, color:"#22c55e", sub:"Total entries" },
          { label:"✅ Exact Match",      val:exactMatches.length, color:"#22c55e", sub:"Both refNo & party match" },
          { label:"⚠️ Party Mismatch",  val:partyMismatch.length, color:"#f59e0b", sub:"RefNo matches, party doesn't" },
        ].map(({ label, val, color, sub }) => (
          <div key={label} style={{ flex:1, background:"#151b2a", borderRadius:8, padding:20, border:"1px solid #1e2a3a" }}>
            <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:800, color }}>{val}</div>
            <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* SECTION 1: EXACT MATCHES */}
      <div style={{ marginBottom:40 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>✅ EXACT MATCH (RefNo & Party both match)</h3>
        {exactMatches.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>No exact matches found</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(exactMatches.length * 35 + 40, 600) }}
              data={exactMatches}
              computeItemKey={(_, item) => item.purchase.refNo}
              components={makeTableComponents(PS_EXACT_WIDTH)}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  <th colSpan={5} style={{ padding:"12px 6px", textAlign:"center", color:"#22c55e", fontWeight:700, borderRight:"2px solid #1e2a3a", background:"#0f1117", fontSize:9 }}>PURCHASE (Data)</th>
                  <th colSpan={5} style={{ padding:"12px 6px", textAlign:"center", color:"#22c55e", fontWeight:700, background:"#0f1117", fontSize:9 }}>SALES</th>
                </tr>
              )}
              itemContent={(_, item) => <PsExactRow item={item} onLink={handleLink} />}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: PARTY MISMATCH */}
      <div style={{ marginBottom:40 }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>⚠️ PARTY MISMATCH (RefNo matches, party differs)</h3>
        {partyMismatch.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No party mismatches</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(partyMismatch.length * 35 + 40, 600) }}
              data={partyMismatch}
              computeItemKey={(_, item) => `mismatch-${item.purchase.refNo}`}
              components={makeTableComponents(PS_MISMATCH_WIDTH)}
              fixedHeaderContent={() => H()(PS_MISMATCH_COLS)}
              itemContent={(_, item) => <PsMismatchRow item={item} onUpdate={handleUpdate} />}
            />
          </div>
        )}
      </div>

      {/* SECTION 3: ORPHANED PURCHASES */}
      <div style={{ marginBottom:40 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1" }}>❌ ORPHANED PURCHASES (In Data but NOT in Sales)</h3>
          <button
            onClick={() => {
              const w = window.open('', '', 'height=600,width=800');
              let html = '<h2>ORPHANED PURCHASES</h2><table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f0f0"><th>Ref No</th><th>Delivery At</th><th>Receive Qty</th><th>Rate</th><th>Notes</th></tr></thead><tbody>';
              orphanedPurchases.forEach(r => { html += `<tr><td>${r.refNo}</td><td>${r.deliveryAt}</td><td>${r.receiveQty}</td><td>₹${r.rate}</td><td style="height:40px"></td></tr>`; });
              html += `</tbody></table><p>Total: ${orphanedPurchases.length}</p>`;
              w.document.write(html); w.document.close(); w.print();
            }}
            style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"8px 16px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}
          >🖨️ Print</button>
        </div>
        {orphanedPurchases.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No orphaned purchases</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(orphanedPurchases.length * 35 + 40, 500) }}
              data={orphanedPurchases}
              computeItemKey={(_, rec) => rec.refNo}
              components={makeTableComponents(PS_ORPHAN_PURCHASE_WIDTH)}
              fixedHeaderContent={() => H()(PS_ORPHAN_PURCHASE_COLS)}
              itemContent={(_, rec) => <PsOrphanPurchaseRow rec={rec} />}
            />
          </div>
        )}
      </div>

      {/* SECTION 4: ORPHANED SALES */}
      <div style={{ marginBottom:40 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1" }}>❌ ORPHANED SALES (In Sales but NOT in Data)</h3>
          <button
            onClick={() => {
              const w = window.open('', '', 'height=600,width=800');
              let html = '<h2>ORPHANED SALES</h2><table border="1" cellpadding="8" cellspacing="0" style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0f0f0"><th>Ref No</th><th>Party</th><th>Qty</th><th>Rate</th><th>Notes</th></tr></thead><tbody>';
              orphanedSales.forEach(r => { html += `<tr><td>${r.refNo}</td><td>${r.partyName}</td><td>${r.qty}</td><td>₹${r.rate}</td><td style="height:40px"></td></tr>`; });
              html += `</tbody></table><p>Total: ${orphanedSales.length}</p>`;
              w.document.write(html); w.document.close(); w.print();
            }}
            style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"8px 16px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}
          >🖨️ Print</button>
        </div>
        {orphanedSales.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>✅ No orphaned sales</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(orphanedSales.length * 35 + 40, 500) }}
              data={orphanedSales}
              computeItemKey={(_, rec) => rec.id}
              components={makeTableComponents(PS_ORPHAN_SALES_WIDTH)}
              fixedHeaderContent={() => H()(PS_ORPHAN_SALES_COLS)}
              itemContent={(_, rec) => <PsOrphanSalesRow rec={rec} onIgnore={handleIgnore} />}
            />
          </div>
        )}
      </div>

      {/* SECTION 5: IGNORED PARTIES */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, color:"#cbd5e1", marginBottom:15 }}>🙈 IGNORED SALES PARTIES</h3>
        {ignoredSalesParties.length === 0 ? (
          <div style={{ padding:20, textAlign:"center", color:"#64748b", background:"#0f1117", borderRadius:8 }}>No ignored parties</div>
        ) : (
          <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflowX:"auto" }}>
            <TableVirtuoso
              style={{ height: Math.min(ignoredSalesParties.length * 35 + 40, 400) }}
              data={ignoredSalesParties.map(party => ({ party, count: salesWorkingData.filter(s => s.partyName === party).length }))}
              computeItemKey={(_, item) => item.party}
              components={makeTableComponents(300)}
              fixedHeaderContent={() => (
                <tr style={{ background:"#151b2a" }}>
                  {["Party Name","Sales Count","Action"].map((label, i, arr) => (
                    <th key={label} style={{ padding:"8px 6px", textAlign: i === 2 ? "center" : i === 1 ? "right" : "left", color:"#64748b", fontWeight:700, whiteSpace:"nowrap", background:"#151b2a", borderRight: i < arr.length - 1 ? "1px solid #1e2a3a" : "none", fontSize:9 }}>
                      {label}
                    </th>
                  ))}
                </tr>
              )}
              itemContent={(_, item) => <PsIgnoredRow party={item.party} count={item.count} onRemove={handleUnignore} />}
            />
          </div>
        )}
      </div>
    </div>
  );
})()}
{view === "claimManagement" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>📋 CLAIM MANAGEMENT</h2>
    <ClaimManagementTab claimRules={claimRules} setClaimRules={setClaimRules} activeFY={activeFY} />
  </div>
)}
      
{view === "tds" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>🧾 PURCHASE TDS</h2>
    <PurchaseTDSTab records={records} fmt={fmt} partyPans={partyPans} activeFY={activeFY} />
  </div>
)}

{view === "externalSourcePurchase" && (
<ExternalSourcePurchaseTab
  records={records}
  setRecords={setRecords}
  calcTDS={calcTDS}
  calcAll={calcAll}
  purchaseFlashData={purchaseFlashData}
  setPurchaseFlashData={setPurchaseFlashData}
  showToast={showToast}
  parties={parties}
  setParties={setParties}
  addBroker={addBroker}
  brokers={brokers}
  setBrokers={setBrokers}
  salesWorkingData={salesWorkingData}
  setSalesWorkingData={setSalesWorkingData}
  claimRules={claimRules}
  activeFY={activeFY}
/>
)}
  {view === "loan" && (
  <div>
    <h2 style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", marginBottom:16 }}>💰 LOAN</h2>

    {/* Sub-tab navigation */}
    <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
      {[
        { id:"manage", label:"Manage" },
        { id:"form", label:"Form" },
        { id:"loans", label:"Loans" },
        { id:"interest", label:"Interest Data" },
        { id:"brokerage", label:"Brokerage Data" },
        { id:"tds", label:"TDS Data" },
      ].map(st => (
        <button
          key={st.id}
          onClick={() => setLoanSubTab(st.id)}
          style={{
            padding:"9px 18px", borderRadius:8, border:"none", fontWeight:700, fontSize:13, cursor:"pointer",
            background: loanSubTab === st.id ? "#f59e0b" : "#151b2a",
            color: loanSubTab === st.id ? "#0f1117" : "#94a3b8"
          }}
        >
          {st.label}
        </button>
      ))}
    </div>

    {/* Sub-tab content */}
   {loanSubTab === "manage" && (() => {
      const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

      const renderList = ({ title, list, newVal, setNewVal, addFn, nameKey, delFn, panFn, verFn, reload }) => (
        <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:10, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b", marginBottom:12 }}>{title}</div>
          <div style={{ display:"flex", gap:8, marginBottom:15 }}>
            <input
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addFn(); }}
              placeholder={`Add ${title.toLowerCase()}...`}
              style={{ flex:1, background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none" }}
            />
            <button onClick={addFn} style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ ADD</button>
          </div>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {list.length === 0 ? (
              <div style={{ fontSize:11, color:"#64748b", padding:8 }}>None yet.</div>
            ) : list.map(item => {
              const name = item[nameKey];
              const isVerified = !!item.panVerified;
              return (
                <div key={name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"#0f1117", borderRadius:6, marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#e2e8f0", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
                  <input
                    key={`pan-${name}-${item.pan}-${isVerified}`}
                    defaultValue={item.pan}
                    placeholder="PAN"
                    maxLength={10}
                    disabled={isVerified}
                    onBlur={async (e) => {
                      if (isVerified) return;
                      const pan = e.target.value.trim().toUpperCase();
                      if (pan === (item.pan || "")) return;
                      const ok = await panFn(name, pan);
                      if (!ok) { showToast("Failed to save PAN", "error"); return; }
                      reload();
                      showToast(`PAN saved for ${name}`);
                    }}
                    style={{ width:130, background: isVerified ? "#0f1117" : "#151b2a", border:"1px solid #1e2a3a", borderRadius:4, padding:"4px 6px", color: isVerified ? "#64748b" : "#e2e8f0", fontSize:11, textTransform:"uppercase", outline:"none", flexShrink:0, cursor: isVerified ? "not-allowed" : "text" }}
                  />
                  <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color: isVerified ? "#22c55e" : "#64748b", cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={async (e) => {
                        const want = e.target.checked;
                        if (want && !PAN_RE.test((item.pan || "").trim().toUpperCase())) {
                          showToast("Enter a valid 10-character PAN first (e.g. ABCDE1234F)", "error"); return;
                        }
                        const ok = await verFn(name, want);
                        if (!ok) { showToast("Failed to save", "error"); return; }
                        reload();
                        showToast(want ? `PAN verified & locked for ${name}` : `Unlocked ${name}`);
                      }}
                      style={{ cursor:"pointer", width:13, height:13 }}
                    />
                    Verified
                  </label>
                  <button
                    onClick={async () => {
                       if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
                      const ok = await delFn(name);
                      if (!ok) { showToast("Failed to delete", "error"); return; }
                      reload();
                      showToast(`${name} deleted`);
                    }}
                    style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"3px 8px", color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer", flexShrink:0 }}
                  >DEL</button>
                </div>
              );
            })}
          </div>
        </div>
      );

      return (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))", gap:20 }}>
          {renderList({
            title:"LOAN PARTIES", list:loanParties, newVal:newLoanParty, setNewVal:setNewLoanParty,
            addFn:addLoanPartyHandler, nameKey:"partyName",
            delFn:deleteLoanParty, panFn:updateLoanPartyPan, verFn:updateLoanPartyPanVerified,
            reload: async () => setLoanParties(await loadLoanParties())
          })}
          {renderList({
            title:"LOAN BROKERS", list:loanBrokers, newVal:newLoanBroker, setNewVal:setNewLoanBroker,
            addFn:addLoanBrokerHandler, nameKey:"brokerName",
            delFn:deleteLoanBroker, panFn:updateLoanBrokerPan, verFn:updateLoanBrokerPanVerified,
            reload: async () => setLoanBrokers(await loadLoanBrokers())
          })}
        </div>
      );
    })()}
    {loanSubTab === "form" && (() => {
      const f = loanForm;
      const set = (k, v) => setLoanForm(prev => ({ ...prev, [k]: v }));
      const calc = calcLoan({
        principal: f.principal, interestRate: f.interestRate, brokerageRate: f.brokerageRate,
        loanType: f.loanType, months: f.months, days: f.days
      });
      const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };
      const lbl = { fontSize:11, color:"#64748b", fontWeight:600, marginBottom:5, display:"block" };
      const money = (n) => `₹${(n||0).toLocaleString("en-IN")}`;

      return (
        <div style={{ maxWidth:900 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div>
              <label style={lbl}>Loan Party (lender)</label>
              <select style={inp} value={f.partyName} onChange={e => set("partyName", e.target.value)}>
                <option value="">— Select —</option>
                {loanParties.map(p => <option key={p.partyName} value={p.partyName}>{p.partyName}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Broker</label>
              <select style={inp} value={f.brokerName} onChange={e => set("brokerName", e.target.value)}>
                <option value="">— Select —</option>
                {loanBrokers.map(b => <option key={b.brokerName} value={b.brokerName}>{b.brokerName}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Principal (₹)</label>
              <input style={inp} type="number" value={f.principal} onChange={e => set("principal", e.target.value)} placeholder="e.g. 10000000" />
            </div>
            <div>
              <label style={lbl}>Loan Type</label>
              <select style={inp} value={f.loanType} onChange={e => set("loanType", e.target.value)}>
                <option value="fixed">Fixed (pre-decided term)</option>
                <option value="non_fixed">Non-fixed (open, daily/30)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Interest Rate (% per month)</label>
              <input style={inp} type="number" step="0.01" value={f.interestRate} onChange={e => set("interestRate", e.target.value)} placeholder="e.g. 0.95" />
            </div>
            <div>
              <label style={lbl}>Brokerage Rate (% per month)</label>
              <input style={inp} type="number" step="0.01" value={f.brokerageRate} onChange={e => set("brokerageRate", e.target.value)} placeholder="e.g. 0.05" />
            </div>
            <div>
              <label style={lbl}>Start Date</label>
              <input style={inp} type="date" value={f.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            {f.loanType === "fixed" ? (
              <div>
                <label style={lbl}>Term (months)</label>
                <input style={inp} type="number" step="0.01" value={f.months} onChange={e => set("months", e.target.value)} placeholder="e.g. 3" />
              </div>
            ) : (
              <div>
                <label style={lbl}>Days (for preview only)</label>
                <input style={inp} type="number" value={f.days} onChange={e => set("days", e.target.value)} placeholder="computed at settlement" />
              </div>
            )}
          </div>

          {/* LIVE BREAKDOWN — verify before saving */}
          <div style={{ background:"#151b2a", border:"1px solid #f59e0b", borderRadius:10, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:12 }}>CALCULATED BREAKDOWN {f.loanType === "non_fixed" ? "(preview — final at settlement)" : ""}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px", fontSize:13 }}>
              <span style={{ color:"#94a3b8" }}>Time factor</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{calc.timeFactor}</span>
              <span style={{ color:"#94a3b8" }}>Interest</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(calc.interest)}</span>
              <span style={{ color:"#94a3b8" }}>Interest TDS (10%)</span><span style={{ color:"#ef4444", textAlign:"right" }}>−{money(calc.interestTDS)}</span>
              <span style={{ color:"#94a3b8", fontWeight:700 }}>Net to party</span><span style={{ color:"#22c55e", textAlign:"right", fontWeight:700 }}>{money(calc.netParty)}</span>
              <span style={{ color:"#94a3b8" }}>Brokerage (accrues to broker)</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(calc.brokerage)}</span>
              <span style={{ color:"#f59e0b", fontWeight:800, borderTop:"1px solid #1e2a3a", paddingTop:8 }}>TOTAL COST TO YOU (interest + brokerage)</span>
              <span style={{ color:"#f59e0b", textAlign:"right", fontWeight:800, borderTop:"1px solid #1e2a3a", paddingTop:8 }}>{money(calc.interest + calc.brokerage)}</span>
            </div>
          </div>

        <button
            onClick={handleSaveLoan}
            style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"11px 24px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
          >
            SAVE LOAN
          </button>
        {/* ── RENEW EXISTING FIXED LOAN ── */}
          <div style={{ marginTop:32, paddingTop:24, borderTop:"2px solid #1e2a3a" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#f59e0b", marginBottom:16 }}>🔄 RENEW FIXED LOAN</div>
            {(() => {
              const rl = activeFixedLoans.find(l => l.id === renewLoanId);
              const rCalc = rl ? calcLoan({
                principal: rl.principal, interestRate: rl.interestRate, brokerageRate: rl.brokerageRate,
                loanType: "fixed", months: renewMonths, days: null
              }) : null;
              const rDue = (rl && parseFloat(renewMonths) > 0) ? (() => {
                const d = new Date(rl.dueDate); d.setMonth(d.getMonth() + Math.round(parseFloat(renewMonths)));
                return d.toISOString().slice(0,10).split("-").reverse().join("-");
              })() : "";
              const money = (n) => `₹${Math.round(n||0).toLocaleString("en-IN")}`;

              return (
                <div style={{ maxWidth:700 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
                    <div>
                      <label style={lbl}>Select Active Fixed Loan</label>
                      <select style={inp} value={renewLoanId} onChange={e => setRenewLoanId(e.target.value)}>
                        <option value="">— Select —</option>
                        {activeFixedLoans.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.partyName} — {money(l.principal)} — due {l.dueDate ? l.dueDate.split("-").reverse().join("-") : "?"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Renewal Term (months)</label>
                      <input style={inp} type="number" step="0.01" value={renewMonths} onChange={e => setRenewMonths(e.target.value)} placeholder="e.g. 2" />
                    </div>
                  </div>

                  {rl && parseFloat(renewMonths) > 0 && (
                    <div style={{ background:"#151b2a", border:"1px solid #f59e0b", borderRadius:10, padding:16, marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", marginBottom:10 }}>RENEWAL BREAKDOWN</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 24px", fontSize:13 }}>
                        <span style={{ color:"#94a3b8" }}>Interest paid on (current due date)</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{rl.dueDate ? rl.dueDate.split("-").reverse().join("-") : ""}</span>
                        <span style={{ color:"#94a3b8" }}>Interest</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(rCalc.interest)}</span>
                        <span style={{ color:"#94a3b8" }}>Interest TDS (10%)</span><span style={{ color:"#ef4444", textAlign:"right" }}>−{money(rCalc.interestTDS)}</span>
                        <span style={{ color:"#94a3b8", fontWeight:700 }}>Net to party</span><span style={{ color:"#22c55e", textAlign:"right", fontWeight:700 }}>{money(rCalc.netParty)}</span>
                        <span style={{ color:"#94a3b8" }}>Brokerage (accrues)</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(rCalc.brokerage)}</span>
                        <span style={{ color:"#f59e0b", fontWeight:800, borderTop:"1px solid #1e2a3a", paddingTop:6 }}>New due date</span><span style={{ color:"#f59e0b", textAlign:"right", fontWeight:800, borderTop:"1px solid #1e2a3a", paddingTop:6 }}>{rDue}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRenewLoan}
                    style={{ background:"#f59e0b", border:"none", borderRadius:8, padding:"11px 24px", color:"#0f1117", fontWeight:800, fontSize:14, cursor:"pointer" }}
                  >
                    RENEW LOAN
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      );
    })()}
   {loanSubTab === "loans" && (() => {
      const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
      const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";

      const th = { padding:"7px 10px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:10, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const thR = { ...th, textAlign:"right" };
      const td = { padding:"6px 10px", color:"#cbd5e1", fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const tdR = { ...td, textAlign:"right" };

      const handleDeleteTerm = async (loan, term, isOnlyTerm) => {
        const msg = isOnlyTerm
          ? `Delete Term ${term.termNumber} — the ONLY term of this loan?\n\nThis removes the loan entirely (${loan.partyName}, ${money(loan.principal)}), its interest event, and its brokerage accrual.\n\nProceed?`
          : `Delete Term ${term.termNumber} (latest) of ${loan.partyName}'s loan?\n\nRemoves this term's interest event and brokerage accrual. The loan's due date falls back to Term ${term.termNumber - 1}.\n\nProceed?`;
        if (!window.confirm(msg)) return;

        const ok = await deleteLoanTerm(loan.id, term.termNumber);
        if (!ok) { showToast("Failed to delete — check connection", "error"); return; }

        setLoansWithTerms(await loadLoansWithTerms());
        setActiveFixedLoans(await loadActiveFixedLoans());
        setLoanInterestEvents(await loadLoanInterestEvents());
        setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
        showToast(isOnlyTerm ? "Loan deleted" : `Term ${term.termNumber} deleted`);
      };

      if (loansWithTerms.length === 0) {
        return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>No loans yet.</div>;
      }

      return (
        <div>
          {loansWithTerms.map(loan => {
            const isFixed = loan.loanType === "fixed";
            const latestTermNo = loan.terms.length ? Math.max(...loan.terms.map(t => t.termNumber || 0)) : 0;
            const currentDue = loan.terms.length ? loan.terms.find(t => t.termNumber === latestTermNo)?.dueDate : null;

            return (
              <div key={loan.id} style={{ marginBottom:24, border:"1px solid #1e2a3a", borderRadius:8, overflow:"hidden" }}>
                {/* LOAN HEADER */}
                <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontWeight:800, color:"#f59e0b", fontSize:14 }}>{loan.partyName}</span>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>Broker: {loan.brokerName}</span>
                  <span style={{ fontSize:12, color:"#cbd5e1" }}>Principal <strong>{money(loan.principal)}</strong></span>
                  <span style={{ fontSize:11, color:"#64748b" }}>Int {loan.interestRate}% · Brok {loan.brokerageRate}%</span>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:4, background: isFixed ? "#3b82f622" : "#64748b22", color: isFixed ? "#38bdf8" : "#94a3b8", fontWeight:700 }}>
                    {isFixed ? "FIXED" : "NON-FIXED"}
                  </span>
                  {isFixed && currentDue && (
                    <span style={{ marginLeft:"auto", fontSize:12, color:"#f59e0b", fontWeight:700 }}>Current due: {fmtDate(currentDue)}</span>
                  )}
                </div>

                {/* TERM CHAIN (fixed only) */}
                {isFixed ? (
                  loan.terms.length === 0 ? (
                    <div style={{ padding:16, textAlign:"center", color:"#64748b", fontSize:12 }}>No terms — anomalous. (A fixed loan should have Term 1.)</div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead>
                          <tr style={{ background:"#0f1117" }}>
                            <th style={th}>Term</th>
                            <th style={th}>Start</th>
                            <th style={th}>Due</th>
                            <th style={thR}>Months</th>
                            <th style={thR}>Interest</th>
                            <th style={thR}>TDS</th>
                            <th style={thR}>Net</th>
                            <th style={thR}>Brokerage</th>
                            <th style={{ ...th, textAlign:"center", borderRight:"none" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loan.terms.map((t, i) => {
                            const isLatest = t.termNumber === latestTermNo;
                            const isOnly = loan.terms.length === 1;
                            return (
                              <tr key={t.id} style={{ background: i % 2 === 0 ? "#0f1117" : "#151b2a", borderBottom:"1px solid #1e2a3a" }}>
                                <td style={{ ...td, fontWeight:700, color:"#f59e0b" }}>Term {t.termNumber}</td>
                                <td style={td}>{fmtDate(t.startDate)}</td>
                                <td style={td}>{fmtDate(t.dueDate)}</td>
                                <td style={tdR}>{t.months}</td>
                                <td style={tdR}>{money(t.interestAmt)}</td>
                                <td style={{ ...tdR, color:"#ef4444" }}>{money(t.interestTds)}</td>
                                <td style={{ ...tdR, color:"#22c55e" }}>{money(t.netParty)}</td>
                                <td style={tdR}>{money(t.brokerage)}</td>
                                <td style={{ ...td, textAlign:"center", borderRight:"none" }}>
                                  {isLatest ? (
                                    <button onClick={() => handleDeleteTerm(loan, t, isOnly)}
                                      style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 10px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}>
                                      {isOnly ? "Delete Loan" : "Delete Term"}
                                    </button>
                                  ) : (
                                    <span style={{ fontSize:9, color:"#334155" }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
              ) : (() => {
                  const settled = loan.status === "closed";
                  const s = loan.terms[0]; // settlement event, if any

                  return (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                        <thead>
                          <tr style={{ background:"#0f1117" }}>
                            <th style={th}>Status</th>
                            <th style={th}>Start</th>
                            <th style={th}>Settled</th>
                            <th style={thR}>Days</th>
                            <th style={thR}>Interest</th>
                            <th style={thR}>TDS</th>
                            <th style={thR}>Net</th>
                            <th style={thR}>Brokerage</th>
                            <th style={{ ...th, textAlign:"center", borderRight:"none" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background:"#0f1117", borderBottom:"1px solid #1e2a3a" }}>
                            <td style={{ ...td, fontWeight:700, color: settled ? "#22c55e" : "#f59e0b" }}>
                              {settled ? "SETTLED" : "ACTIVE"}
                            </td>
                            <td style={td}>{fmtDate(loan.startDate)}</td>
                            <td style={td}>{settled && s ? fmtDate(s.dueDate) : "—"}</td>
                            <td style={tdR}>{settled && s && s.termDays != null ? s.termDays : "—"}</td>
                            <td style={tdR}>{settled && s ? money(s.interestAmt) : "—"}</td>
                            <td style={{ ...tdR, color: settled ? "#ef4444" : "#64748b" }}>{settled && s ? money(s.interestTds) : "—"}</td>
                            <td style={{ ...tdR, color: settled ? "#22c55e" : "#64748b" }}>{settled && s ? money(s.netParty) : "—"}</td>
                            <td style={tdR}>{settled && s ? money(s.brokerage) : "—"}</td>
                            <td style={{ ...td, textAlign:"center", borderRight:"none" }}>
                              <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                                {!settled && (
                                  <button
                                    onClick={() => {
                                      const today = new Date().toISOString().slice(0, 10);
                                      setNonFixedPayModal({ loan, settlementDate: today });
                                    }}
                                    style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"4px 12px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}
                                  >
                                    💸 Pay
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    const msg = settled
                                      ? `Delete this SETTLED non-fixed loan (${loan.partyName}, ${money(loan.principal)})?\n\nRemoves the loan, its interest event, and brokerage accrual.\n\nProceed?`
                                      : `Delete this non-fixed loan (${loan.partyName}, ${money(loan.principal)})?\n\nProceed?`;
                                    if (!window.confirm(msg)) return;
                                    const ok = await deleteNonFixedLoan(loan.id);
                                    if (!ok) { showToast("Failed to delete — check connection", "error"); return; }
                                    setLoansWithTerms(await loadLoansWithTerms());
                                    setLoanInterestEvents(await loadLoanInterestEvents());
                                    setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
                                    showToast("Non-fixed loan deleted");
                                  }}
                                  style={{ background:"#ef4444", border:"none", borderRadius:4, padding:"4px 12px", color:"#fff", fontWeight:700, fontSize:10, cursor:"pointer" }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      );
    })()}
   
   {loanSubTab === "interest" && (() => {
      const money = (n) => `₹${Math.round(n||0).toLocaleString("en-IN")}`;
      const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
      const termLabel = (ev) => ev.termMonths != null ? `${ev.termMonths} mo` : (ev.termDays != null ? `${ev.termDays} days` : "");

      // Group by party (already sorted by payment_date from the query)
      const groups = {};
      loanInterestEvents.forEach(ev => {
        const p = ev.partyName || "(unknown)";
        if (!groups[p]) groups[p] = [];
        groups[p].push(ev);
      });
      const partyNames = Object.keys(groups).sort((a,b) => a.localeCompare(b));

      const gTotInt = loanInterestEvents.reduce((s,e) => s + (e.interestAmt||0), 0);
      const gTotTds = loanInterestEvents.reduce((s,e) => s + (e.interestTds||0), 0);
      const gTotNet = loanInterestEvents.reduce((s,e) => s + (e.netParty||0), 0);

      const th = { padding:"9px 10px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const thR = { ...th, textAlign:"right" };
      const td = { padding:"7px 10px", color:"#cbd5e1", fontSize:12, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const tdR = { ...td, textAlign:"right" };

      if (loanInterestEvents.length === 0) {
        return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>No interest events yet.</div>;
      }

      return (
        <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            <thead>
              <tr style={{ background:"#151b2a" }}>
                <th style={th}>Party</th>
                <th style={th}>Broker</th>
                <th style={thR}>Principal</th>
                <th style={thR}>Int %</th>
                <th style={thR}>Brok %</th>
                <th style={thR}>Total %</th>
                <th style={th}>Term</th>
                <th style={thR}>Interest</th>
                <th style={thR}>TDS (10%)</th>
                <th style={thR}>Net</th>
                <th style={th}>Pay Date</th>
                <th style={th}>Due Date</th>
                <th style={{ ...th, borderRight:"none" }}>FY</th>
              </tr>
            </thead>
            <tbody>
              {partyNames.map(pName => {
                const evs = groups[pName];
                const subInt = evs.reduce((s,e) => s + (e.interestAmt||0), 0);
                const subTds = evs.reduce((s,e) => s + (e.interestTds||0), 0);
                const subNet = evs.reduce((s,e) => s + (e.netParty||0), 0);
                return (
                  <React.Fragment key={pName}>
                    {evs.map((e, i) => (
                      <tr key={e.id} style={{ borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }}>
                        <td style={td}>{e.partyName}</td>
                        <td style={td}>{e.brokerName}</td>
                        <td style={tdR}>{money(e.principal)}</td>
                        <td style={tdR}>{e.interestRate}</td>
                        <td style={tdR}>{e.brokerageRate}</td>
                        <td style={tdR}>{(parseFloat(e.interestRate)||0) + (parseFloat(e.brokerageRate)||0)}</td>
                        <td style={td}>{termLabel(e)}</td>
                        <td style={tdR}>{money(e.interestAmt)}</td>
                        <td style={{ ...tdR, color:"#ef4444" }}>{money(e.interestTds)}</td>
                        <td style={{ ...tdR, color:"#22c55e" }}>{money(e.netParty)}</td>
                        <td style={td}>{fmtDate(e.paymentDate)}</td>
                        <td style={td}>{e.dueDate ? fmtDate(e.dueDate) : "—"}</td>
                        <td style={{ ...td, borderRight:"none" }}>{e.financialYear}</td>
                      </tr>
                    ))}
                    <tr style={{ background:"#1a2236", borderBottom:"2px solid #1e2a3a" }}>
                      <td colSpan={7} style={{ ...td, fontWeight:700, color:"#94a3b8" }}>SUBTOTAL — {pName}</td>
                      <td style={{ ...tdR, fontWeight:700 }}>{money(subInt)}</td>
                      <td style={{ ...tdR, fontWeight:700, color:"#ef4444" }}>{money(subTds)}</td>
                      <td style={{ ...tdR, fontWeight:700, color:"#22c55e" }}>{money(subNet)}</td>
                     <td colSpan={3} style={{ ...td, borderRight:"none" }}></td>
                    </tr>
                  </React.Fragment>
                );
              })}
              <tr style={{ background:"#151b2a", borderTop:"2px solid #f59e0b" }}>
                <td colSpan={7} style={{ ...td, fontWeight:800, color:"#f59e0b" }}>GRAND TOTAL</td>
                <td style={{ ...tdR, fontWeight:800, color:"#f59e0b" }}>{money(gTotInt)}</td>
                <td style={{ ...tdR, fontWeight:800, color:"#f59e0b" }}>{money(gTotTds)}</td>
                <td style={{ ...tdR, fontWeight:800, color:"#f59e0b" }}>{money(gTotNet)}</td>
                <td colSpan={3} style={{ ...td, borderRight:"none" }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    })()}
    {loanSubTab === "brokerage" && (() => {
      const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
      const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";
      const panFor = (broker) => {
        const b = loanBrokers.find(x => x.brokerName === broker);
        return b ? { pan: b.pan || "", verified: !!b.panVerified } : { pan: "", verified: false };
      };

      // Every broker that appears in either accruals or payments
      const brokerSet = new Set([
        ...loanBrokerageAccruals.map(a => a.brokerName),
        ...loanBrokeragePayments.map(p => p.brokerName)
      ].filter(Boolean));
      const brokerNames = [...brokerSet].sort((a, b) => a.localeCompare(b));

      // Build a combined chronological ledger per broker
      const buildLedger = (broker) => {
        const accr = loanBrokerageAccruals
          .filter(a => a.brokerName === broker)
          .map(a => ({ kind: "accrual", date: a.accrualDate, party: a.partyName, amount: a.amount, tds: 0, net: 0 }));
        const pays = loanBrokeragePayments
          .filter(p => p.brokerName === broker)
          .map(p => ({ kind: "payment", date: p.paymentDate, mode: p.mode, amount: p.amount, tds: p.brokerageTds, net: p.netBroker }));
        return [...accr, ...pays].sort((x, y) => String(x.date).localeCompare(String(y.date)));
      };

      const th = { padding:"8px 10px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const thR = { ...th, textAlign:"right" };
      const td = { padding:"7px 10px", color:"#cbd5e1", fontSize:12, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const tdR = { ...td, textAlign:"right" };

      // Grand totals
      const gAccrued = loanBrokerageAccruals.reduce((s, a) => s + (a.amount || 0), 0);
      const gCash = loanBrokeragePayments.filter(p => p.mode === "cash").reduce((s, p) => s + (p.amount || 0), 0);
      const gBank = loanBrokeragePayments.filter(p => p.mode === "bank").reduce((s, p) => s + (p.amount || 0), 0);
      const gTds = loanBrokeragePayments.reduce((s, p) => s + (p.brokerageTds || 0), 0);
      const gPending = gAccrued - gCash - gBank;

      if (brokerNames.length === 0) {
        return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>No brokerage accruals yet.</div>;
      }

      return (
        <div>
          {brokerNames.map(broker => {
            const ledger = buildLedger(broker);
            const accrued = loanBrokerageAccruals.filter(a => a.brokerName === broker).reduce((s, a) => s + (a.amount || 0), 0);
            const cashPaid = loanBrokeragePayments.filter(p => p.brokerName === broker && p.mode === "cash").reduce((s, p) => s + (p.amount || 0), 0);
            const bankPaid = loanBrokeragePayments.filter(p => p.brokerName === broker && p.mode === "bank").reduce((s, p) => s + (p.amount || 0), 0);
            const tdsPaid = loanBrokeragePayments.filter(p => p.brokerName === broker).reduce((s, p) => s + (p.brokerageTds || 0), 0);
            const pending = accrued - cashPaid - bankPaid;
            const pan = panFor(broker);

            return (
              <div key={broker} style={{ marginBottom:28, border:"1px solid #1e2a3a", borderRadius:8, overflow:"hidden" }}>
                {/* BROKER HEADER */}
                <div style={{ padding:"12px 16px", background:"#151b2a", borderBottom:"1px solid #1e2a3a", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontWeight:800, color:"#f59e0b", fontSize:14 }}>{broker}</span>
                  {pan.pan
                    ? <span style={{ fontSize:11, color: pan.verified ? "#22c55e" : "#f59e0b" }}>{pan.pan}{pan.verified ? " ✓" : " (unverified)"}</span>
                    : <span style={{ fontSize:11, color:"#ef4444", fontWeight:700 }}>⚠ PAN MISSING</span>}
                  <span style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color: pending === 0 ? "#22c55e" : "#f59e0b" }}>
                    Pending {money(pending)}
                  </span>
                  <button
                    onClick={() => setBrokeragePmtModal({ brokerName: broker, cash: "", bank: "", date: new Date().toISOString().slice(0, 10), pending })}
                    style={{ background:"#38bdf8", border:"none", borderRadius:6, padding:"7px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}
                  >
                    💸 Make Payment
                  </button>
                </div>

                {/* LEDGER TABLE */}
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#0f1117" }}>
                        <th style={th}>Date</th>
                        <th style={th}>Type</th>
                        <th style={th}>Detail</th>
                        <th style={thR}>Amount</th>
                        <th style={thR}>TDS</th>
                        <th style={{ ...thR, borderRight:"none" }}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#0f1117" : "#151b2a", borderBottom:"1px solid #1e2a3a" }}>
                          <td style={td}>{fmtDate(row.date)}</td>
                          <td style={{ ...td, color: row.kind === "accrual" ? "#f59e0b" : "#38bdf8", fontWeight:600 }}>
                            {row.kind === "accrual" ? "Accrual" : `Payment (${row.mode})`}
                          </td>
                          <td style={td}>{row.kind === "accrual" ? row.party : ""}</td>
                          <td style={{ ...tdR, color: row.kind === "accrual" ? "#cbd5e1" : "#94a3b8" }}>
                            {row.kind === "accrual" ? money(row.amount) : `−${money(row.amount)}`}
                          </td>
                          <td style={{ ...tdR, color: row.tds > 0 ? "#ef4444" : "#64748b" }}>{row.tds > 0 ? money(row.tds) : "—"}</td>
                          <td style={{ ...tdR, borderRight:"none", color:"#22c55e" }}>{row.kind === "payment" ? money(row.net) : "—"}</td>
                        </tr>
                      ))}
                      {/* SUBTOTAL */}
                      <tr style={{ background:"#1a2236", borderTop:"2px solid #f59e0b", fontWeight:700 }}>
                        <td style={td} colSpan={3}>
                          Accrued {money(accrued)} · Cash {money(cashPaid)} · Bank {money(bankPaid)} · TDS {money(tdsPaid)}
                        </td>
                        <td style={tdR}>{money(cashPaid + bankPaid)}</td>
                        <td style={tdR}>{money(tdsPaid)}</td>
                        <td style={{ ...tdR, borderRight:"none", color: pending === 0 ? "#22c55e" : "#f59e0b" }}>Pending {money(pending)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* GRAND TOTAL */}
          <div style={{ border:"1px solid #f59e0b", borderRadius:8, padding:"14px 18px", background:"#151b2a", display:"flex", gap:24, flexWrap:"wrap", fontSize:12 }}>
            <span style={{ color:"#f59e0b", fontWeight:800 }}>GRAND TOTAL</span>
            <span style={{ color:"#cbd5e1" }}><span style={{ color:"#64748b" }}>Accrued:</span> <strong>{money(gAccrued)}</strong></span>
            <span style={{ color:"#cbd5e1" }}><span style={{ color:"#64748b" }}>Cash:</span> <strong>{money(gCash)}</strong></span>
            <span style={{ color:"#cbd5e1" }}><span style={{ color:"#64748b" }}>Bank:</span> <strong>{money(gBank)}</strong></span>
            <span style={{ color:"#cbd5e1" }}><span style={{ color:"#64748b" }}>TDS:</span> <strong style={{ color:"#ef4444" }}>{money(gTds)}</strong></span>
            <span style={{ color:"#cbd5e1", marginLeft:"auto" }}><span style={{ color:"#64748b" }}>Pending:</span> <strong style={{ color: gPending === 0 ? "#22c55e" : "#f59e0b" }}>{money(gPending)}</strong></span>
          </div>
        </div>
      );
    })()}
  {loanSubTab === "tds" && (() => {
      const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
      const fmtDate = (d) => d ? d.split("-").reverse().join("-") : "";

      const fyStartYear = parseInt((activeFY || "2026-27").split("-")[0], 10);
      const FY_MONTHS = [
        { label:"April", y:fyStartYear, m:4 }, { label:"May", y:fyStartYear, m:5 },
        { label:"June", y:fyStartYear, m:6 }, { label:"July", y:fyStartYear, m:7 },
        { label:"August", y:fyStartYear, m:8 }, { label:"September", y:fyStartYear, m:9 },
        { label:"October", y:fyStartYear, m:10 }, { label:"November", y:fyStartYear, m:11 },
        { label:"December", y:fyStartYear, m:12 }, { label:"January", y:fyStartYear+1, m:1 },
        { label:"February", y:fyStartYear+1, m:2 }, { label:"March", y:fyStartYear+1, m:3 },
      ];

      const is194A = loanTdsSection !== "194h";

      const partyPanFor = (name) => {
        const p = loanParties.find(x => x.partyName === name);
        return p ? { pan: p.pan || "", verified: !!p.panVerified } : { pan: "", verified: false };
      };
      const brokerPanFor = (name) => {
        const b = loanBrokers.find(x => x.brokerName === name);
        return b ? { pan: b.pan || "", verified: !!b.panVerified } : { pan: "", verified: false };
      };

      // Build rows for the selected month
      const rows = (() => {
        if (!loanTdsMonth) return [];
        const [y, mo] = loanTdsMonth.split("-").map(Number);
        const inMonth = (dateStr) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return d.getFullYear() === y && (d.getMonth() + 1) === mo;
        };
        if (is194A) {
          return loanInterestEvents
            .filter(e => inMonth(e.paymentDate))
            .map(e => ({ date: e.paymentDate, name: e.partyName, pan: partyPanFor(e.partyName), amount: e.interestAmt, tds: e.interestTds }))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.name.localeCompare(b.name));
        }
        return loanBrokeragePayments
          .filter(p => p.mode === "bank" && inMonth(p.paymentDate))
          .map(p => ({ date: p.paymentDate, name: p.brokerName, pan: brokerPanFor(p.brokerName), amount: p.amount, tds: p.brokerageTds }))
          .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.name.localeCompare(b.name));
      })();

      const totAmt = rows.reduce((s, r) => s + (r.amount || 0), 0);
      const totTds = rows.reduce((s, r) => s + (r.tds || 0), 0);
      const monthLabel = FY_MONTHS.find(fm => `${fm.y}-${fm.m}` === loanTdsMonth)?.label || "";
      const amtLabel = is194A ? "Interest Amt" : "Brokerage";

      const inp = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", maxWidth:220 };
      const th = { padding:"10px 12px", textAlign:"left", color:"#64748b", fontWeight:700, fontSize:11, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const thR = { ...th, textAlign:"right" };
      const td = { padding:"8px 12px", color:"#cbd5e1", fontSize:12, whiteSpace:"nowrap", borderRight:"1px solid #1e2a3a" };
      const tdR = { ...td, textAlign:"right" };

      const PanCell = ({ info }) => {
        if (!info.pan) return <span style={{ color:"#ef4444", fontWeight:700 }}>⚠ PAN MISSING</span>;
        return <span>{info.pan} {info.verified ? <span style={{ color:"#22c55e", fontWeight:700 }}>✓</span> : <span style={{ color:"#f59e0b" }}>(unverified)</span>}</span>;
      };

      const printReport = () => {
        if (rows.length === 0) return;
        const w = window.open('', '', 'height=700,width=900');
        let html = `<style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif}h2{font-size:15px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #000;padding:4px 8px;white-space:nowrap}th{background:#eee;text-align:left}.r{text-align:right}.tot{font-weight:bold;background:#ddd}.miss{color:#b00;font-weight:bold}</style>`;
        html += `<h2>${is194A ? "194A INTEREST TDS" : "194H BROKERAGE TDS"} — ${monthLabel} ${activeFY}</h2>`;
        html += `<table><thead><tr><th>Payment Date</th><th>${is194A ? "Party" : "Broker"}</th><th>PAN</th><th class="r">${amtLabel}</th><th class="r">TDS</th></tr></thead><tbody>`;
        rows.forEach(r => {
          const pan = r.pan.pan ? `${r.pan.pan}${r.pan.verified ? " ✓" : " (unverified)"}` : `<span class="miss">PAN MISSING</span>`;
          html += `<tr><td>${fmtDate(r.date)}</td><td>${r.name}</td><td>${pan}</td><td class="r">₹${Math.round(r.amount).toLocaleString("en-IN")}</td><td class="r">₹${Math.round(r.tds).toLocaleString("en-IN")}</td></tr>`;
        });
        html += `<tr class="tot"><td colspan="3">TOTAL — ${monthLabel}</td><td class="r">₹${Math.round(totAmt).toLocaleString("en-IN")}</td><td class="r">₹${Math.round(totTds).toLocaleString("en-IN")}</td></tr>`;
        html += `</tbody></table>`;
        w.document.write(html); w.document.close(); w.print();
      };

      const exportCSV = () => {
        if (rows.length === 0) return;
        const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
        const lines = [];
        lines.push(["Payment Date", is194A ? "Party" : "Broker", "PAN", amtLabel, "TDS"].map(esc).join(","));
        rows.forEach(r => lines.push([fmtDate(r.date), r.name, r.pan.pan || "PAN MISSING", Math.round(r.amount), Math.round(r.tds)].map(esc).join(",")));
        lines.push(["TOTAL", "", "", Math.round(totAmt), Math.round(totTds)].map(esc).join(","));
        const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type:"text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${is194A ? "194A_Interest" : "194H_Brokerage"}_TDS_${monthLabel || "month"}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      };

      return (
        <div>
          <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
            {/* SECTION TOGGLE */}
            <div style={{ display:"flex", gap:6 }}>
              {[["194a","194A Interest"],["194h","194H Brokerage"]].map(([id, label]) => (
                <button key={id} onClick={() => setLoanTdsSection(id)}
                  style={{ padding:"9px 16px", borderRadius:8, border:"none", fontWeight:700, fontSize:12, cursor:"pointer",
                    background: (is194A ? "194a" : "194h") === id ? "#f59e0b" : "#1e2a3a",
                    color: (is194A ? "194a" : "194h") === id ? "#0f1117" : "#94a3b8" }}>
                  {label}
                </button>
              ))}
            </div>

            <select style={inp} value={loanTdsMonth} onChange={e => setLoanTdsMonth(e.target.value)}>
              <option value="">— Select Month —</option>
              {FY_MONTHS.map(fm => <option key={`${fm.y}-${fm.m}`} value={`${fm.y}-${fm.m}`}>{fm.label}</option>)}
            </select>

            {loanTdsMonth && rows.length > 0 && (
              <>
                <button onClick={printReport} style={{ background:"#3b82f6", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>🖨️ Print</button>
                <button onClick={exportCSV} style={{ background:"#22c55e", border:"none", borderRadius:8, padding:"9px 16px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>⬇️ CSV</button>
              </>
            )}
          </div>

          {!loanTdsMonth ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>Select a month to view its {is194A ? "194A interest" : "194H brokerage"} TDS entries.</div>
          ) : rows.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b", fontSize:14 }}>No entries for {monthLabel}.</div>
          ) : (
            <div style={{ borderRadius:8, border:"1px solid #1e2a3a", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                <thead>
                  <tr style={{ background:"#151b2a" }}>
                    <th style={th}>Payment Date</th>
                    <th style={th}>{is194A ? "Party Name" : "Broker Name"}</th>
                    <th style={th}>PAN</th>
                    <th style={thR}>{amtLabel}</th>
                    <th style={{ ...thR, borderRight:"none" }}>TDS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #1e2a3a", background: i % 2 === 0 ? "#0f1117" : "#151b2a" }}>
                      <td style={td}>{fmtDate(r.date)}</td>
                      <td style={td}>{r.name}</td>
                      <td style={td}><PanCell info={r.pan} /></td>
                      <td style={tdR}>{money(r.amount)}</td>
                      <td style={{ ...tdR, borderRight:"none" }}>{money(r.tds)}</td>
                    </tr>
                  ))}
                  <tr style={{ background:"#151b2a", borderTop:"2px solid #f59e0b" }}>
                    <td colSpan={3} style={{ ...td, fontWeight:700, color:"#f59e0b" }}>TOTAL — {monthLabel}</td>
                    <td style={{ ...tdR, fontWeight:800, color:"#f59e0b" }}>{money(totAmt)}</td>
                    <td style={{ ...tdR, borderRight:"none", fontWeight:800, color:"#f59e0b" }}>{money(totTds)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    })()}
  </div>
)}   
   {/* NON-FIXED LOAN PAY / SETTLE MODAL */}
      {nonFixedPayModal && (() => {
        const loan = nonFixedPayModal.loan;
        const settleDate = nonFixedPayModal.settlementDate;
        const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

        // Day count: start day included, settlement day excluded → plain subtraction
        const days = (() => {
          if (!loan.startDate || !settleDate) return 0;
          const start = new Date(loan.startDate);
          const end = new Date(settleDate);
          const d = Math.round((end - start) / 86400000);
          return d > 0 ? d : 0;
        })();

        // Reuse calcLoan's non-fixed branch (timeFactor = days/30)
        const calc = calcLoan({
          principal: loan.principal, interestRate: loan.interestRate, brokerageRate: loan.brokerageRate,
          loanType: "non_fixed", months: null, days
        });

        const lblM = { fontSize:11, color:"#64748b", fontWeight:600, marginBottom:5, display:"block" };
        const inpM = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };
        const valid = days > 0;

        return (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
            <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:480, boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>SETTLE NON-FIXED LOAN</h3>
              <div style={{ fontSize:13, color:"#f59e0b", fontWeight:700, marginBottom:4 }}>{loan.partyName}</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:20 }}>
                Principal {money(loan.principal)} · Int {loan.interestRate}%/mo · Brok {loan.brokerageRate}%/mo · Broker {loan.brokerName}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                <div>
                  <label style={lblM}>Start Date</label>
                  <div style={{ ...inpM, color:"#94a3b8", background:"#0f1117" }}>{loan.startDate ? loan.startDate.split("-").reverse().join("-") : "—"}</div>
                </div>
                <div>
                  <label style={lblM}>Settlement Date</label>
                  <input style={inpM} type="date" value={settleDate}
                    onChange={e => setNonFixedPayModal(prev => ({ ...prev, settlementDate: e.target.value }))} />
                </div>
              </div>

              {/* LIVE BREAKDOWN */}
              <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"12px 14px", marginBottom:20, fontSize:13 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"6px 16px" }}>
                  <span style={{ color:"#94a3b8" }}>Days (start → settlement, settle day excluded)</span>
                  <span style={{ color: valid ? "#e2e8f0" : "#ef4444", textAlign:"right", fontWeight:700 }}>{days}</span>
                  <span style={{ color:"#94a3b8" }}>Time factor (days ÷ 30)</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{calc.timeFactor}</span>
                  <span style={{ color:"#94a3b8" }}>Interest</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(calc.interest)}</span>
                  <span style={{ color:"#94a3b8" }}>Interest TDS (10%)</span><span style={{ color:"#ef4444", textAlign:"right" }}>−{money(calc.interestTDS)}</span>
                  <span style={{ color:"#94a3b8", fontWeight:700 }}>Net to party</span><span style={{ color:"#22c55e", textAlign:"right", fontWeight:700 }}>{money(calc.netParty)}</span>
                  <span style={{ color:"#94a3b8", borderTop:"1px solid #1e2a3a", paddingTop:6 }}>Brokerage (accrues to broker)</span>
                  <span style={{ color:"#e2e8f0", textAlign:"right", borderTop:"1px solid #1e2a3a", paddingTop:6 }}>{money(calc.brokerage)}</span>
                </div>
              </div>

              {!valid && <div style={{ fontSize:12, color:"#ef4444", marginBottom:16 }}>Settlement date must be after the start date.</div>}

              <div style={{ display:"flex", gap:12 }}>
                <button
                  disabled={!valid}
                  onClick={async () => {
                    if (!valid) return;
                    const fy = fyFromDate(settleDate);
                    const ok = await settleNonFixedLoan(loan.id, {
                      startDate: loan.startDate,
                      settlementDate: settleDate,
                      days,
                      interest: calc.interest,
                      tds: calc.interestTDS,
                      netParty: calc.netParty,
                      brokerage: calc.brokerage,
                      brokerName: loan.brokerName,
                      financialYear: fy
                    });
                    if (!ok) { showToast("Failed to settle — check connection", "error"); return; }

                    setLoansWithTerms(await loadLoansWithTerms());
                    setLoanInterestEvents(await loadLoanInterestEvents());
                    setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
                    setActiveFixedLoans(await loadActiveFixedLoans());
                    setNonFixedPayModal(null);
                    showToast(`Settled — ${days} days, interest ${money(calc.interest)}`);
                  }}
                  style={{ flex:1, background: valid ? "#22c55e" : "#64748b", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor: valid ? "pointer" : "not-allowed" }}
                >
                  SETTLE LOAN
                </button>
                <button
                  onClick={() => setNonFixedPayModal(null)}
                  style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        );
      })()}  
  
  {/* BROKERAGE PAYMENT MODAL */}
      {brokeragePmtModal && (() => {
        const m = brokeragePmtModal;
        const cash = parseFloat(m.cash) || 0;
        const bank = parseFloat(m.bank) || 0;
        const bankTds = Math.round(bank * 2 / 100);
        const netBroker = cash + (bank - bankTds);
        const settled = cash + bank;
        const money = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
        const lblM = { fontSize:11, color:"#64748b", fontWeight:600, marginBottom:5, display:"block" };
        const inpM = { background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"9px 12px", color:"#e2e8f0", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

        const set = (k, v) => setBrokeragePmtModal(prev => ({ ...prev, [k]: v }));

        return (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
            <div style={{ background:"#151b2a", border:"1px solid #1e2a3a", borderRadius:12, padding:"24px", width:"100%", maxWidth:460, boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
              <h3 style={{ fontSize:16, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>PAY BROKERAGE</h3>
              <div style={{ fontSize:13, color:"#f59e0b", fontWeight:700, marginBottom:4 }}>{m.brokerName}</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:20 }}>Pending: <strong style={{ color:"#cbd5e1" }}>{money(m.pending)}</strong></div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                <div>
                  <label style={lblM}>Cash Amount (₹)</label>
                  <input style={inpM} type="number" value={m.cash} onChange={e => set("cash", e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label style={lblM}>Bank Amount / gross (₹)</label>
                  <input style={inpM} type="number" value={m.bank} onChange={e => set("bank", e.target.value)} placeholder="0" />
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={lblM}>Payment Date</label>
                  <input style={inpM} type="date" value={m.date} onChange={e => set("date", e.target.value)} />
                </div>
              </div>

              {/* LIVE BREAKDOWN */}
              <div style={{ background:"#0f1117", border:"1px solid #1e2a3a", borderRadius:8, padding:"12px 14px", marginBottom:20, fontSize:13 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"6px 16px" }}>
                  <span style={{ color:"#94a3b8" }}>Cash (no TDS)</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(cash)}</span>
                  <span style={{ color:"#94a3b8" }}>Bank gross</span><span style={{ color:"#e2e8f0", textAlign:"right" }}>{money(bank)}</span>
                  <span style={{ color:"#94a3b8" }}>Bank TDS (2%)</span><span style={{ color:"#ef4444", textAlign:"right" }}>−{money(bankTds)}</span>
                  <span style={{ color:"#94a3b8", fontWeight:700 }}>Broker receives</span><span style={{ color:"#22c55e", textAlign:"right", fontWeight:700 }}>{money(netBroker)}</span>
                  <span style={{ color:"#94a3b8", borderTop:"1px solid #1e2a3a", paddingTop:6 }}>Settles against accrual</span>
                  <span style={{ textAlign:"right", borderTop:"1px solid #1e2a3a", paddingTop:6, fontWeight:700, color: settled > m.pending ? "#f59e0b" : "#cbd5e1" }}>
                    {money(settled)}{settled > m.pending ? ` (over by ${money(settled - m.pending)})` : ""}
                  </span>
                </div>
              </div>

              <div style={{ display:"flex", gap:12 }}>
                <button
                  onClick={async () => {
                    if (settled <= 0) { showToast("Enter a cash and/or bank amount", "error"); return; }
                    if (!m.date) { showToast("Enter a payment date", "error"); return; }

                    const fy = fyFromDate(m.date);
                    const rows = [];
                    if (cash > 0) {
                      rows.push({ brokerName: m.brokerName, amount: Math.round(cash), mode: "cash", brokerageTds: 0, netBroker: Math.round(cash), paymentDate: m.date, financialYear: fy });
                    }
                    if (bank > 0) {
                      rows.push({ brokerName: m.brokerName, amount: Math.round(bank), mode: "bank", brokerageTds: bankTds, netBroker: Math.round(bank - bankTds), paymentDate: m.date, financialYear: fy });
                    }

                    const ok = await addLoanBrokeragePayment(rows);
                    if (!ok) { showToast("Failed to save payment — check connection", "error"); return; }

                    setLoanBrokeragePayments(await loadLoanBrokeragePayments(activeFY));
                    setLoanBrokerageAccruals(await loadLoanBrokerageAccruals());
                    setBrokeragePmtModal(null);
                    showToast(`Paid ${money(settled)} to ${m.brokerName}`);
                  }}
                  style={{ flex:1, background:"#22c55e", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
                >
                  SAVE PAYMENT
                </button>
                <button
                  onClick={() => setBrokeragePmtModal(null)}
                  style={{ flex:1, background:"#ef4444", border:"none", borderRadius:8, padding:"12px", color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer" }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        );
      })()}   
     
      {toast && (
        <div style={{ position:"fixed", bottom:28, right:28, background:toast.type==="error"?"#ef4444":"#22c55e", color:"#fff", padding:"12px 18px", borderRadius:10, fontWeight:600, fontSize:13, zIndex:9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}