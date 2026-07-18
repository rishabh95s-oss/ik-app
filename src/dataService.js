import { supabase } from './supabaseClient.js';

// Fetch all rows from a table, paginating past PostgREST's 1000-row cap.
// buildQuery receives a fresh query builder and should apply .eq/.order etc, but NOT .range.
async function fetchAll(table, buildQuery) {
  const PAGE = 1000;
  let all = [];
  let from = 0;

  while (true) {
    let q = supabase.from(table).select('*');
    if (buildQuery) q = buildQuery(q);
    const { data, error } = await q.range(from, from + PAGE - 1);

    if (error) { console.error(`fetchAll(${table}):`, error.message); return { data: null, error }; }
    if (!data || data.length === 0) break;

    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return { data: all, error: null };
}

// ---- PARTIES ----

export async function loadParties() {
  const { data, error } = await fetchAll('parties', q => q.order('party_name'));
  if (error) return [];
  return data.map(r => r.party_name);
}

export async function addParty(name) {
  const { error } = await supabase.from('parties').insert({ party_name: name });
  if (error) { console.error('addParty:', error.message); return false; }
  return true;
}
export async function deleteParty(name) {
  const { error } = await supabase.from('parties').delete().eq('party_name', name);
  if (error) { console.error('deleteParty:', error.message); return false; }
  return true;
}

// Load party → { pan, verified } lookup: { party_name: { pan, verified } }

export async function loadPartyPans() {
  const { data, error } = await fetchAll('parties', q => q.order('party_name'));
  if (error) return {};
  return data.reduce((acc, r) => {
    acc[r.party_name] = { pan: r.pan || "", verified: !!r.pan_verified };
    return acc;
  }, {});
}

export async function updatePartyPanVerified(partyName, verified) {
  const { error } = await supabase
    .from('parties')
    .update({ pan_verified: !!verified })
    .eq('party_name', partyName);
  if (error) { console.error('updatePartyPanVerified:', error.message); return false; }
  return true;
}

// Save/update a party's PAN (matched by party_name)

export async function updatePartyPan(partyName, pan) {
  const { error } = await supabase
    .from('parties')
    .update({ pan: (pan || "").trim().toUpperCase() })
    .eq('party_name', partyName);
  if (error) { console.error('updatePartyPan:', error.message); return false; }
  return true;
}

// ---- BROKERS ----

export async function loadBrokers() {
  const { data, error } = await fetchAll('brokers', q => q.order('broker_name'));
  if (error) return [];
  return data.map(r => r.broker_name);
}
export async function addBroker(name) {
  const { error } = await supabase.from('brokers').insert({ broker_name: name });
  if (error) { console.error('addBroker:', error.message); return false; }
  return true;
}
export async function deleteBroker(name) {
  const { error } = await supabase.from('brokers').delete().eq('broker_name', name);
  if (error) { console.error('deleteBroker:', error.message); return false; }
  return true;
}

export async function loadFinancialYears() {
  const { data, error } = await supabase.from('financial_years').select('*').order('start_year');
  if (error) { console.error('loadFinancialYears:', error.message); return []; }
  return data.map(r => ({ fy: r.fy, startYear: r.start_year }));
}

export async function createFinancialYear(startYear) {
  const fy = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  const { error } = await supabase
    .from('financial_years')
    .insert({ fy, start_year: startYear });
  if (error) { console.error('createFinancialYear:', error.message); return { ok: false, error: error.message }; }
  return { ok: true, fy };
}

// ---- DELIVERIES ----

export async function loadDeliveries() {
  const { data, error } = await fetchAll('deliveries', q => q.order('delivery_name'));
  if (error) return [];
  return data.map(r => r.delivery_name);
}
export async function addDelivery(name) {
  const { error } = await supabase.from('deliveries').insert({ delivery_name: name });
  if (error) { console.error('addDelivery:', error.message); return false; }
  return true;
}
export async function deleteDelivery(name) {
  const { error } = await supabase.from('deliveries').delete().eq('delivery_name', name);
  if (error) { console.error('deleteDelivery:', error.message); return false; }
  return true;
}

// ---- PURCHASES (records) ----

// Convert a Supabase row (snake_case) to the app's record shape (camelCase)

function purchaseRowToRecord(r) {
  return {
    refNo: r.ref_no || "", deliveryAt: r.delivery_at || "", truckNo: r.truck_no || "",
    partyName: r.party_name || "", brokerName: r.broker_name || "",
    billDate: r.bill_date || "", billNo: r.bill_no || "",
    rate: r.rate ?? "", billQty: r.bill_qty ?? "", receiveQty: r.receive_qty ?? "",
    halfKgValue: r.half_kg_value ?? "", gunnyWeight: r.gunny_weight ?? "", cdPct: r.cd_pct ?? "",
  qualityClaim: r.quality_claim ?? "", hammali: r.hammali ?? "",
    freight: r.freight ?? "", others: r.others ?? "",
    mandiTax: r.mandi_tax ?? "", driverExpense: r.driver_expense ?? "",
    claimCalc: r.claim_calc || null,
    brokerageRate: r.brokerage_rate ?? "", brokerageAmt: r.brokerage_amt ?? "",
    tcs: r.tcs ?? "",
    bankAmt1: r.bank_amt1 ?? "", bankDate1: r.bank_date1 || "", bankName1: r.bank_name1 || "",
    bankAmt2: r.bank_amt2 ?? "", bankDate2: r.bank_date2 || "", bankName2: r.bank_name2 || "",
    bankAmt3: r.bank_amt3 ?? "", bankDate3: r.bank_date3 || "", bankName3: r.bank_name3 || "",
    refA: r.ref_a || "", refB: r.ref_b || "", note: r.note || "",
    _tds: r._tds ?? 0, _shortage: r._shortage ?? 0, _halfKgQty: r._half_kg_qty ?? 0,
    _netQty: r._net_qty ?? 0, _netAmt1: r._net_amt1 ?? 0, _cdAmt: r._cd_amt ?? 0,
    _netAmt: r._net_amt ?? 0, _brokerageAmt: r._brokerage_amt ?? 0,
    _finalAmt: r._final_amt ?? 0, _balance: r._balance ?? 0,
    financialYear: r.financial_year || ""
  };
}

export async function loadRecords(financialYear) {
  const { data, error } = await fetchAll('purchases', q =>
    q.eq('financial_year', financialYear).order('ref_no')
  );
  if (error) return [];
  return data.map(purchaseRowToRecord);
}

// Convert app record (camelCase) → Supabase row (snake_case)
function recordToPurchaseRow(r) {
  const num = (v) => (v === "" || v === null || v === undefined ? null : parseFloat(v));
  return {
    ref_no: r.refNo, delivery_at: r.deliveryAt, truck_no: r.truckNo,
    party_name: r.partyName, broker_name: r.brokerName,
    bill_date: r.billDate, bill_no: r.billNo,
    rate: num(r.rate), bill_qty: num(r.billQty), receive_qty: num(r.receiveQty),
    half_kg_value: num(r.halfKgValue), gunny_weight: num(r.gunnyWeight), cd_pct: num(r.cdPct),
    quality_claim: num(r.qualityClaim), hammali: num(r.hammali),
    freight: num(r.freight), others: num(r.others),
    mandi_tax: num(r.mandiTax), driver_expense: num(r.driverExpense),
    claim_calc: r.claimCalc || null,
    brokerage_rate: num(r.brokerageRate), brokerage_amt: num(r.brokerageAmt),
    tcs: num(r.tcs),
    bank_amt1: num(r.bankAmt1), bank_date1: r.bankDate1, bank_name1: r.bankName1,
    bank_amt2: num(r.bankAmt2), bank_date2: r.bankDate2, bank_name2: r.bankName2,
    bank_amt3: num(r.bankAmt3), bank_date3: r.bankDate3, bank_name3: r.bankName3,
    ref_a: r.refA, ref_b: r.refB, note: r.note,
    _tds: num(r._tds), _shortage: num(r._shortage), _half_kg_qty: num(r._halfKgQty),
    _net_qty: num(r._netQty), _net_amt1: num(r._netAmt1), _cd_amt: num(r._cdAmt),
    _net_amt: num(r._netAmt), _brokerage_amt: num(r._brokerageAmt),
    _final_amt: num(r._finalAmt), _balance: num(r._balance)
  };
}

// Insert a new purchase, or update if ref_no already exists
export async function upsertRecord(record, financialYear) {
  const row = recordToPurchaseRow(record);
  row.financial_year = financialYear;
  const { error } = await supabase.from('purchases').upsert(row, { onConflict: 'ref_no,financial_year' });
  if (error) { console.error('upsertRecord:', error.message); return false; }
  return true;
}

export async function deleteRecord(refNo, financialYear) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('ref_no', refNo)
    .eq('financial_year', financialYear);
  if (error) { console.error('deleteRecord:', error.message); return false; }
  return true;
}

// ---- SALES FLASH ----

function flashRowToRecord(r) {
  return {
    id: r.id, refNo: r.ref_no || "", date: r.date || "",
    partyName: r.party_name || "", broker: r.broker || "",
    itemName: r.item_name || "", poNo: r.po_no || "", truckNo: r.truck_no || "",
    qty: r.qty ?? 0, rate: r.rate ?? 0, netBillAmt: r.net_bill_amt ?? 0
  };
}

export async function loadSalesFlash(financialYear) {
  const { data, error } = await fetchAll('sales_flash', q =>
    q.eq('financial_year', financialYear).order('ref_no')
  );
  if (error) return [];
  return data.map(flashRowToRecord);
}

// Replace the entire flash table with a new batch (matches paste-import behavior)

export async function replaceSalesFlash(records, financialYear) {
  if (records.length === 0) return true;   // ← guard BEFORE delete (also fixes the wipe-on-empty issue)

  // Clear existing (only this year's, ideally — but for now clears all; year filtering comes in Stage 3)
  const { error: delErr } = await supabase.from('sales_flash').delete().neq('ref_no', '___never___');
  if (delErr) { console.error('replaceSalesFlash delete:', delErr.message); return false; }

  const rows = records.map(r => ({
    ref_no: r.refNo, date: r.date, party_name: r.partyName, broker: r.broker,
    item_name: r.itemName, po_no: r.poNo, truck_no: r.truckNo,
    qty: parseFloat(r.qty) || 0, rate: parseFloat(r.rate) || 0,
    net_bill_amt: parseFloat(r.netBillAmt) || 0,
    financial_year: financialYear   // ← stamp the year
  }));

  const { error: insErr } = await supabase.from('sales_flash').insert(rows);
  if (insErr) { console.error('replaceSalesFlash insert:', insErr.message); return false; }
  return true;
}

// ---- SALES WORKING ----

function workingRowToRecord(r) {
  return {
    id: r.ref_no,
    refNo: r.ref_no || "", date: r.date || "",
    partyName: r.party_name || "", broker: r.broker || "",
    itemName: r.item_name || "", poNo: r.po_no || "", truckNo: r.truck_no || "",
    qty: r.qty ?? 0, rate: r.rate ?? 0,
    receivedWeight: r.received_weight ?? 0, shortage: r.shortage ?? 0,
    shortageAmount: r.shortage_amount ?? 0,
    gunnyWeight: r.gunny_weight ?? 0,
    claimPct: r.claim_pct ?? 0, claim: r.claim ?? 0,
    cdPct: r.cd_pct ?? 0, cd: r.cd ?? 0,
    cdRule: r.cd_rule || "standard",
    tdsReceived: r.tds_received ?? 0, netAmt: r.net_amt ?? 0,
    bankDate1: r.bank_date1 || "", bankPmt1: r.bank_pmt1 ?? 0,
    bankDate2: r.bank_date2 || "", bankPmt2: r.bank_pmt2 ?? 0,
    bankDate3: r.bank_date3 || "", bankPmt3: r.bank_pmt3 ?? 0,
    pendingAmt: r.pending_amt ?? 0, days: r.days ?? 0,
    pmtId1: r.pmt_id1 || "", pmtId2: r.pmt_id2 || "", pmtId3: r.pmt_id3 || ""
  };
}

function recordToWorkingRow(r) {
  const num = (v) => (v === "" || v === null || v === undefined ? null : parseFloat(v));
  return {
    ref_no: r.refNo, date: r.date, party_name: r.partyName, broker: r.broker,
    item_name: r.itemName, po_no: r.poNo, truck_no: r.truckNo,
    qty: num(r.qty), rate: num(r.rate),
    received_weight: num(r.receivedWeight), shortage: num(r.shortage),
    shortage_amount: num(r.shortageAmount),
    gunny_weight: num(r.gunnyWeight),
    claim_pct: num(r.claimPct), claim: num(r.claim),
    cd_pct: num(r.cdPct), cd: num(r.cd),
    cd_rule: r.cdRule || "standard",
    tds_received: num(r.tdsReceived), net_amt: num(r.netAmt),
    bank_date1: r.bankDate1, bank_pmt1: num(r.bankPmt1),
    bank_date2: r.bankDate2, bank_pmt2: num(r.bankPmt2),
    bank_date3: r.bankDate3, bank_pmt3: num(r.bankPmt3),
    pending_amt: num(r.pendingAmt), days: r.days ? parseInt(r.days) : null,
    pmt_id1: r.pmtId1, pmt_id2: r.pmtId2, pmt_id3: r.pmtId3
  };
}

export async function loadSalesWorking(financialYear) {
  const { data, error } = await fetchAll('sales_working', q =>
    q.eq('financial_year', financialYear).order('ref_no')
  );
  if (error) return [];
  return data.map(workingRowToRecord);
}
// Save one working row (used by save-on-blur)
export async function upsertWorkingRow(record, financialYear) {
  const row = recordToWorkingRow(record);
  row.financial_year = financialYear;
  const { error } = await supabase.from('sales_working').upsert(row, { onConflict: 'ref_no,financial_year' });
  if (error) { console.error('upsertWorkingRow:', error.message); return false; }
  return true;
}

// Save many working rows at once (used by Import from Flash / Auto-Populate)
export async function upsertWorkingBatch(records, financialYear) {
  if (records.length === 0) return true;
  const rows = records.map(r => ({ ...recordToWorkingRow(r), financial_year: financialYear }));
  const { error } = await supabase.from('sales_working').upsert(rows, { onConflict: 'ref_no,financial_year' });
  if (error) { console.error('upsertWorkingBatch:', error.message); return false; }
  return true;
}

export async function deleteWorkingRow(refNo, financialYear) {
  const { error } = await supabase
    .from('sales_working')
    .delete()
    .eq('ref_no', refNo)
    .eq('financial_year', financialYear);
  if (error) { console.error('deleteWorkingRow:', error.message); return false; }
  return true;
}

function claimRuleRowToRecord(r) {
  return {
    id: r.id,
    partyName: r.party_name,
    claimRule: r.claim_rule,
    recWeightSource: r.rec_weight_source,
    cdRule: r.cd_rule || "standard"
  };
}
function recordToClaimRuleRow(r) {
  return {
    party_name: r.partyName,
    claim_rule: r.claimRule,
    rec_weight_source: r.recWeightSource,
    cd_rule: r.cdRule || "standard"
  };
}

export async function loadClaimRules() {
  const { data, error } = await supabase.from('claim_rules').select('*').order('party_name');
  if (error) { console.error('loadClaimRules:', error.message); return []; }
  return data.map(claimRuleRowToRecord);
}

export async function upsertClaimRule(rule) {
  const row = recordToClaimRuleRow(rule);
  const { error } = await supabase.from('claim_rules').upsert(row, { onConflict: 'party_name' });
  if (error) { console.error('upsertClaimRule:', error.message); return false; }
  return true;
}

export async function deleteClaimRule(partyName) {
  const { error } = await supabase.from('claim_rules').delete().eq('party_name', partyName);
  if (error) { console.error('deleteClaimRule:', error.message); return false; }
  return true;
}
// ---- APP USERS ----

function userRowToRecord(r) {
  return {
    id: r.id,
    username: r.username,
    role: r.role,
    tabs: r.tabs || [],
    allowedFys: r.allowed_fys || [],
    created: r.created_at
  };
}

function recordToUserRow(r) {
  const row = {
    username: r.username,
    role: r.role,
    tabs: r.tabs || [],
    allowed_fys: r.allowedFys || []
  };
  if (r.id) row.id = r.id;
  return row;
}

export async function loadAppUsers() {
  const { data, error } = await supabase.from('app_users').select('*').order('id');
  if (error) { console.error('loadAppUsers:', error.message); return []; }
  return data.map(userRowToRecord);
}

export async function upsertAppUser(user) {
  const row = recordToUserRow(user);
  const { error } = await supabase.from('app_users').upsert(row, { onConflict: 'id' });
  if (error) { console.error('upsertAppUser:', error.message); return false; }
  return true;
}

export async function deleteAppUser(username) {
  const { error } = await supabase.from('app_users').delete().eq('username', username);
  if (error) { console.error('deleteAppUser:', error.message); return false; }
  return true;
}
// ---- BANK TRANSACTIONS ----

function bankTransRowToRecord(r) {
  return {
    id: r.id,
    bank: r.bank,
    createdAt: r.created_at,
    date: r.date || "",
    narration: r.narration || "",
    chqRef: r.chq_ref || "",
    valueDt: r.value_dt || "",
    mode: r.mode || "",
    branchCode: r.branch_code || "",
    withdrawalAmt: r.withdrawal_amt ?? 0,
    depositAmt: r.deposit_amt ?? 0,
    closingBalance: r.closing_balance ?? 0,
    linkedRefNo: r.linked_ref_no || "",
    linkedFy: r.linked_fy || "",
    partyName: r.party_name || ""
  };
}

function recordToBankTransRow(r) {
  return {
    id: r.id,
    bank: r.bank,
    created_at: r.createdAt,
    date: r.date,
    narration: r.narration,
    chq_ref: r.chqRef,
    value_dt: r.valueDt || "",
    mode: r.mode || "",
    branch_code: r.branchCode || "",
    withdrawal_amt: parseFloat(r.withdrawalAmt) || 0,
    deposit_amt: parseFloat(r.depositAmt) || 0,
    closing_balance: parseFloat(r.closingBalance) || 0,
    linked_ref_no: r.linkedRefNo || "",
      linked_fy: r.linkedFy || "",
    party_name: r.partyName || ""
  };
}

export async function loadBankTransactions(bank) {
  const { data, error } = await fetchAll('bank_transactions', q =>
    q.eq('bank', bank).order('created_at', { ascending: true })
  );
  if (error) return [];
  return data.map(bankTransRowToRecord);
}

export async function upsertBankTransactions(records) {
  if (records.length === 0) return true;
  const rows = records.map(recordToBankTransRow);
  const { error } = await supabase
    .from('bank_transactions')
    .upsert(rows, { onConflict: 'id' });
  if (error) { console.error('upsertBankTransactions:', error.message); return false; }
  return true;
}

export async function updateBankTransaction(record) {
  const row = recordToBankTransRow(record);
  const { error } = await supabase
    .from('bank_transactions')
    .upsert(row, { onConflict: 'id' });
  if (error) { console.error('updateBankTransaction:', error.message); return false; }
  return true;
}

export async function deleteBankTransaction(id) {
  const { error } = await supabase
    .from('bank_transactions')
    .delete()
    .eq('id', id);
  if (error) { console.error('deleteBankTransaction:', error.message); return false; }
  return true;
}

// Delete all transactions for a bank on a given date (used by boundary-day replace on import)

export async function deleteBankTransactionsByDate(bank, date) {
  const { error } = await supabase
    .from('bank_transactions')
    .delete()
    .eq('bank', bank)
    .eq('date', date);
  if (error) { console.error('deleteBankTransactionsByDate:', error.message); return false; }
  return true;
}

// How many transactions on this bank+date carry a link (warn before wiping)

export async function countLinkedOnDate(bank, date) {
  const { count, error } = await supabase
    .from('bank_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('bank', bank)
    .eq('date', date)
    .neq('linked_ref_no', '');
  if (error) { console.error('countLinkedOnDate:', error.message); return 0; }
  return count || 0;
}

// ---- PMT LINKED SLOTS ----

export async function loadPmtLinkedSlots(financialYear) {
  const { data, error } = await supabase.from('pmt_linked_slots').select('*').eq('financial_year', financialYear);
  if (error) { console.error('loadPmtLinkedSlots:', error.message); return {}; }
  return data.reduce((acc, r) => { acc[r.ref_no] = r.slots; return acc; }, {});
}

export async function upsertPmtLinkedSlot(refNo, slots, financialYear) {
  const { error } = await supabase
    .from('pmt_linked_slots')
    .upsert({ ref_no: refNo, slots, financial_year: financialYear }, { onConflict: 'ref_no,financial_year' });
  if (error) { console.error('upsertPmtLinkedSlot:', error.message); return false; }
  return true;
}

export async function deletePmtLinkedSlot(refNo, financialYear) {
  const { error } = await supabase
    .from('pmt_linked_slots')
    .delete()
    .eq('ref_no', refNo)
    .eq('financial_year', financialYear);
  if (error) { console.error('deletePmtLinkedSlot:', error.message); return false; }
  return true;
}

// ---- PURCHASE FLASH (external source, reconcile-only, inert) ----

function purchaseFlashRowToRecord(r) {
  return {
    refNo: r.ref_no || "",
    deliveryAt: r.delivery_at || "",
    truckNo: r.truck_no || "",
    partyName: r.party_name || "",
    brokerName: r.broker_name || "",
    billDate: r.bill_date || "",
    billNo: r.bill_no || "",
    rate: r.rate ?? "",
    billQty: r.bill_qty ?? ""
  };
}

export async function loadPurchaseFlash(financialYear) {
  const { data, error } = await fetchAll('purchase_flash', q =>
    q.eq('financial_year', financialYear).order('ref_no')
  );
  if (error) return [];
  return data.map(purchaseFlashRowToRecord);
}

// Replace the entire purchase_flash table with a new batch (paste-import behavior)

export async function replacePurchaseFlash(records, financialYear) {
  if (records.length === 0) return true;   // guard before delete

  const { error: delErr } = await supabase.from('purchase_flash').delete().neq('ref_no', '___never___');
  if (delErr) { console.error('replacePurchaseFlash delete:', delErr.message); return false; }

  const num = (v) => (v === "" || v === null || v === undefined ? null : parseFloat(v));
  const rows = records.map(r => ({
    ref_no: r.refNo, delivery_at: r.deliveryAt, truck_no: r.truckNo,
    party_name: r.partyName, broker_name: r.brokerName,
    bill_date: r.billDate, bill_no: r.billNo,
    rate: num(r.rate), bill_qty: num(r.billQty),
    financial_year: financialYear
  }));

  const { error: insErr } = await supabase.from('purchase_flash').insert(rows);
  if (insErr) { console.error('replacePurchaseFlash insert:', insErr.message); return false; }
  return true;
}
// ---- PARTY RENAME / MERGE HELPERS ----

// Bulk-rename purchase party (partyName) — for TDS-affecting purchase party

export async function renamePurchaseParty(oldName, newName) {
  const { error } = await supabase
    .from('purchases')
    .update({ party_name: newName })
    .eq('party_name', oldName);
  if (error) { console.error('renamePurchaseParty:', error.message); return false; }
  return true;
}

// Bulk-rename purchase delivery_at (the sales party as stored on purchases)

export async function renamePurchaseDeliveryAt(oldName, newName) {
  const { error } = await supabase
    .from('purchases')
    .update({ delivery_at: newName })
    .eq('delivery_at', oldName);
  if (error) { console.error('renamePurchaseDeliveryAt:', error.message); return false; }
  return true;
}

// Bulk-rename sales_working party_name

export async function renameSalesWorkingParty(oldName, newName) {
  const { error } = await supabase
    .from('sales_working')
    .update({ party_name: newName })
    .eq('party_name', oldName);
  if (error) { console.error('renameSalesWorkingParty:', error.message); return false; }
  return true;
}

// Rename a claim rule's party. party_name is the key, so this is a key change.

// Done as update (not upsert) so it changes the existing row in place.
export async function renameClaimRuleParty(oldName, newName) {
  const { error } = await supabase
    .from('claim_rules')
    .update({ party_name: newName })
    .eq('party_name', oldName);
  if (error) { console.error('renameClaimRuleParty:', error.message); return false; }
  return true;
}

// Count helpers for the impact preview (so the user sees what will change before confirming)

export async function countPurchasesByParty(name) {
  const { count, error } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .eq('party_name', name);
  if (error) { console.error('countPurchasesByParty:', error.message); return 0; }
  return count || 0;
}

export async function countPurchasesByDeliveryAt(name) {
  const { count, error } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_at', name);
  if (error) { console.error('countPurchasesByDeliveryAt:', error.message); return 0; }
  return count || 0;
}

export async function countSalesWorkingByParty(name) {
  const { count, error } = await supabase
    .from('sales_working')
    .select('*', { count: 'exact', head: true })
    .eq('party_name', name);
  if (error) { console.error('countSalesWorkingByParty:', error.message); return 0; }
  return count || 0;
}

export async function countClaimRulesByParty(name) {
  const { count, error } = await supabase
    .from('claim_rules')
    .select('*', { count: 'exact', head: true })
    .eq('party_name', name);
  if (error) { console.error('countClaimRulesByParty:', error.message); return 0; }
  return count || 0;
}

// ---- LOAN PARTIES ----

export async function loadLoanParties() {
  const { data, error } = await supabase.from('loan_parties').select('*').order('party_name');
  if (error) { console.error('loadLoanParties:', error.message); return []; }
  return data.map(r => ({
    id: r.id,
    partyName: r.party_name,
    pan: r.pan || "",
    panVerified: !!r.pan_verified,
    form15h: !!r.form_15h
  }));
}

export async function updateLoanPartyForm15h(partyName, value) {
  const { error } = await supabase.from('loan_parties')
    .update({ form_15h: !!value })
    .eq('party_name', partyName);
  if (error) { console.error('updateLoanPartyForm15h:', error.message); return false; }
  return true;
}

export async function addLoanParty(partyName) {
  const { error } = await supabase.from('loan_parties').insert({ party_name: partyName });
  if (error) { console.error('addLoanParty:', error.message); return false; }
  return true;
}

export async function deleteLoanParty(partyName) {
  const { error } = await supabase.from('loan_parties').delete().eq('party_name', partyName);
  if (error) { console.error('deleteLoanParty:', error.message); return false; }
  return true;
}

export async function updateLoanPartyPan(partyName, pan) {
  const { error } = await supabase.from('loan_parties')
    .update({ pan: (pan || "").trim().toUpperCase() })
    .eq('party_name', partyName);
  if (error) { console.error('updateLoanPartyPan:', error.message); return false; }
  return true;
}

export async function updateLoanPartyPanVerified(partyName, verified) {
  const { error } = await supabase.from('loan_parties')
    .update({ pan_verified: !!verified })
    .eq('party_name', partyName);
  if (error) { console.error('updateLoanPartyPanVerified:', error.message); return false; }
  return true;
}

// ---- LOAN BROKERS ----

export async function loadLoanBrokers() {
  const { data, error } = await supabase.from('loan_brokers').select('*').order('broker_name');
  if (error) { console.error('loadLoanBrokers:', error.message); return []; }
  return data.map(r => ({
    id: r.id,
    brokerName: r.broker_name,
    pan: r.pan || "",
    panVerified: !!r.pan_verified
  }));
}

export async function addLoanBroker(brokerName) {
  const { error } = await supabase.from('loan_brokers').insert({ broker_name: brokerName });
  if (error) { console.error('addLoanBroker:', error.message); return false; }
  return true;
}

export async function deleteLoanBroker(brokerName) {
  const { error } = await supabase.from('loan_brokers').delete().eq('broker_name', brokerName);
  if (error) { console.error('deleteLoanBroker:', error.message); return false; }
  return true;
}

export async function updateLoanBrokerPan(brokerName, pan) {
  const { error } = await supabase.from('loan_brokers')
    .update({ pan: (pan || "").trim().toUpperCase() })
    .eq('broker_name', brokerName);
  if (error) { console.error('updateLoanBrokerPan:', error.message); return false; }
  return true;
}

export async function updateLoanBrokerPanVerified(brokerName, verified) {
  const { error } = await supabase.from('loan_brokers')
    .update({ pan_verified: !!verified })
    .eq('broker_name', brokerName);
  if (error) { console.error('updateLoanBrokerPanVerified:', error.message); return false; }
  return true;
}

// ---- LOANS ----
export async function createLoan(loan) {
  const { data, error } = await supabase.from('loans').insert({
    party_name: loan.partyName,
    broker_name: loan.brokerName,
    principal: loan.principal,
    interest_rate: loan.interestRate,
    brokerage_rate: loan.brokerageRate,
    loan_type: loan.loanType,
    start_date: loan.startDate,
    due_date: loan.dueDate || null,
    status: 'active'
  }).select().single();
  if (error) { console.error('createLoan:', error.message); return null; }
  return data.id; // return the new loan's id for linking events
}

export async function addLoanInterestEvent(ev) {
  const { error } = await supabase.from('loan_interest_events').insert({
    loan_id: ev.loanId,
    term_number: ev.termNumber ?? null,
    start_date: ev.startDate ?? null,
    due_date: ev.dueDate ?? null,
    term_months: ev.termMonths ?? null,
    term_days: ev.termDays ?? null,
    interest_amt: ev.interestAmt,
    interest_tds: ev.interestTds,
    net_party: ev.netParty,
    interest_rate: ev.interestRate ?? null,
    brokerage_rate: ev.brokerageRate ?? null,
    form_15h: ev.form15h ?? false,
    payment_date: ev.paymentDate,
    financial_year: ev.financialYear
  });
  if (error) { console.error('addLoanInterestEvent:', error.message); return false; }
  return true;
}

export async function addLoanBrokerageAccrual(ac) {
  const { error } = await supabase.from('loan_brokerage_accruals').insert({
    loan_id: ac.loanId,
    term_number: ac.termNumber ?? null,
    broker_name: ac.brokerName,
    amount: ac.amount,
    accrual_date: ac.accrualDate
  });
  if (error) { console.error('addLoanBrokerageAccrual:', error.message); return false; }
  return true;
}

export async function loadLoanInterestEvents() {
  const { data, error } = await supabase
    .from('loan_interest_events')
.select(`
      id, term_months, term_days, interest_amt, interest_tds, net_party,
      interest_rate, brokerage_rate, form_15h, payment_date, financial_year,
      loans ( party_name, broker_name, principal, interest_rate, brokerage_rate, due_date )
    `)
    .order('payment_date');
  if (error) { console.error('loadLoanInterestEvents:', error.message); return []; }
  return data.map(r => ({
    id: r.id,
    partyName: r.loans?.party_name || "",
    brokerName: r.loans?.broker_name || "",
    principal: r.loans?.principal || 0,
    interestRate: r.interest_rate ?? r.loans?.interest_rate ?? 0,
    brokerageRate: r.brokerage_rate ?? r.loans?.brokerage_rate ?? 0,
    termMonths: r.term_months,
    termDays: r.term_days,
    interestAmt: r.interest_amt || 0,
    interestTds: r.interest_tds || 0,
    netParty: r.net_party || 0,
    form15h: !!r.form_15h,
    paymentDate: r.payment_date,
    financialYear: r.financial_year,
    dueDate: r.loans?.due_date || null
  }));
}

// Active fixed loans, with due date DERIVED from the latest term's due_date.

export async function loadActiveFixedLoans() {
  const { data, error } = await supabase
    .from('loans')
    .select(`*, loan_interest_events ( term_number, due_date )`)
    .eq('loan_type', 'fixed')
    .eq('status', 'active');
  if (error) { console.error('loadActiveFixedLoans:', error.message); return []; }
  return data.map(r => {
    const terms = r.loan_interest_events || [];
    const latest = terms.reduce((best, t) =>
      (t.term_number || 0) > (best?.term_number || 0) ? t : best, null);
    return {
      id: r.id,
      partyName: r.party_name,
      brokerName: r.broker_name,
      principal: r.principal || 0,
      interestRate: r.interest_rate || 0,
      brokerageRate: r.brokerage_rate || 0,
      startDate: r.start_date,
      dueDate: latest ? latest.due_date : r.due_date,   // derived; fallback to stored
      latestTerm: latest ? latest.term_number : 0,
      status: r.status
    };
  }).sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
}

// Update a loan's due date (used by renew)

export async function updateLoanDueDate(loanId, newDueDate) {
  const { error } = await supabase.from('loans').update({ due_date: newDueDate }).eq('id', loanId);
  if (error) { console.error('updateLoanDueDate:', error.message); return false; }
  return true;
}

// ---- LOAN BROKERAGE ACCRUALS (read) ----

export async function loadLoanBrokerageAccruals() {
  const { data, error } = await supabase
    .from('loan_brokerage_accruals')
    .select(`
      id, loan_id, broker_name, amount, accrual_date,
      loans ( party_name )
    `)
    .order('accrual_date');
  if (error) { console.error('loadLoanBrokerageAccruals:', error.message); return []; }
  return data.map(r => ({
    id: r.id,
    loanId: r.loan_id,
    brokerName: r.broker_name,
    partyName: r.loans?.party_name || "",
    amount: r.amount || 0,
    accrualDate: r.accrual_date
  }));
}

// ---- LOAN BROKERAGE PAYMENTS ----

export async function loadLoanBrokeragePayments(financialYear) {
  const { data, error } = await supabase
    .from('loan_brokerage_payments')
    .select('*')
    .eq('financial_year', financialYear)
    .order('payment_date');
  if (error) { console.error('loadLoanBrokeragePayments:', error.message); return []; }
  return data.map(r => ({
    id: r.id,
    brokerName: r.broker_name,
    amount: r.amount || 0,
    mode: r.mode,
    brokerageTds: r.brokerage_tds || 0,
    netBroker: r.net_broker || 0,
    paymentDate: r.payment_date,
    financialYear: r.financial_year
  }));
}

// Insert one or two payment rows (cash and/or bank) for a single settlement

export async function addLoanBrokeragePayment(rows) {
  if (!rows || rows.length === 0) return true;
  const dbRows = rows.map(r => ({
    broker_name: r.brokerName,
    amount: r.amount,
    mode: r.mode,
    brokerage_tds: r.brokerageTds,
    net_broker: r.netBroker,
    payment_date: r.paymentDate,
    financial_year: r.financialYear
  }));
  const { error } = await supabase.from('loan_brokerage_payments').insert(dbRows);
  if (error) { console.error('addLoanBrokeragePayment:', error.message); return false; }
  return true;
}

// Delete a single term (interest event + its brokerage accrual).

// If it was the loan's last remaining term, delete the loan row as well.

export async function deleteLoanTerm(loanId, termNumber) {
  const { error: e1 } = await supabase.from('loan_interest_events')
    .delete().eq('loan_id', loanId).eq('term_number', termNumber);
  if (e1) { console.error('deleteLoanTerm interest_event:', e1.message); return false; }

  const { error: e2 } = await supabase.from('loan_brokerage_accruals')
    .delete().eq('loan_id', loanId).eq('term_number', termNumber);
  if (e2) { console.error('deleteLoanTerm accrual:', e2.message); return false; }

  // Any terms left on this loan?
  const { count, error: e3 } = await supabase.from('loan_interest_events')
    .select('*', { count: 'exact', head: true }).eq('loan_id', loanId);
  if (e3) { console.error('deleteLoanTerm count:', e3.message); return false; }

  if ((count || 0) === 0) {
    const { error: e4 } = await supabase.from('loans').delete().eq('id', loanId);
    if (e4) { console.error('deleteLoanTerm loan:', e4.message); return false; }
  }

  return true;
}

// Every loan with its full term chain (for the Loans list / delete view).

export async function loadLoansWithTerms() {
  const { data, error } = await supabase
    .from('loans')
    .select(`
      *,
     loan_interest_events ( id, term_number, start_date, due_date, term_months,
                             interest_amt, interest_tds, net_party, interest_rate, brokerage_rate,
                             payment_date, financial_year ),
      loan_brokerage_accruals ( term_number, amount )
    `)
    .order('created_at');
  if (error) { console.error('loadLoansWithTerms:', error.message); return []; }
  return data.map(r => {
    const brokByTerm = {};
    (r.loan_brokerage_accruals || []).forEach(a => { brokByTerm[a.term_number] = a.amount; });
    const terms = (r.loan_interest_events || [])
    .map(t => ({
        id: t.id,
        termNumber: t.term_number,
        startDate: t.start_date,
        dueDate: t.due_date,
        months: t.term_months,
        interestAmt: t.interest_amt || 0,
        interestTds: t.interest_tds || 0,
        netParty: t.net_party || 0,
        interestRate: t.interest_rate ?? 0,
        brokerageRate: t.brokerage_rate ?? 0,
        brokerage: brokByTerm[t.term_number] || 0,
        paymentDate: t.payment_date,
        financialYear: t.financial_year
      }))
      .sort((a, b) => (a.termNumber || 0) - (b.termNumber || 0));
    return {
      id: r.id,
      partyName: r.party_name,
      brokerName: r.broker_name,
      principal: r.principal || 0,
      interestRate: r.interest_rate || 0,
      brokerageRate: r.brokerage_rate || 0,
      loanType: r.loan_type,
      startDate: r.start_date,
      status: r.status,
      terms
    };
  });
}

export async function updateLoanRates(loanId, interestRate, brokerageRate) {
  const { error } = await supabase.from('loans')
    .update({ interest_rate: interestRate, brokerage_rate: brokerageRate })
    .eq('id', loanId);
  if (error) { console.error('updateLoanRates:', error.message); return false; }
  return true;
}

// Settle a non-fixed loan: write interest event + brokerage accrual, then close it.

export async function settleNonFixedLoan(loanId, s) {
  // 1. Interest event (term_number 1, day-based)
const { error: e1 } = await supabase.from('loan_interest_events').insert({
    loan_id: loanId,
    term_number: 1,
    start_date: s.startDate,
    due_date: s.settlementDate,   
    term_months: null,
    term_days: s.days,
    interest_amt: s.interest,
    interest_tds: s.tds,
    net_party: s.netParty,
    form_15h: s.form15h ?? false,
    payment_date: s.settlementDate,
    financial_year: s.financialYear
  });
  if (e1) { console.error('settleNonFixedLoan interest:', e1.message); return false; }

  // 2. Brokerage accrual (term_number 1)
  
  const { error: e2 } = await supabase.from('loan_brokerage_accruals').insert({
    loan_id: loanId,
    term_number: 1,
    broker_name: s.brokerName,
    amount: s.brokerage,
    accrual_date: s.settlementDate
  });
  if (e2) { console.error('settleNonFixedLoan accrual:', e2.message); return false; }

  // 3. Close the loan
  
  const { error: e3 } = await supabase.from('loans')
    .update({ status: 'closed', due_date: s.settlementDate })
    .eq('id', loanId);
  if (e3) { console.error('settleNonFixedLoan close:', e3.message); return false; }

  return true;
}

// Delete a non-fixed loan entirely — its interest events, brokerage accruals, and the loan row.
// Works whether the loan is settled (has events) or unsettled (has none).

export async function deleteNonFixedLoan(loanId) {
  const { error: e1 } = await supabase.from('loan_interest_events').delete().eq('loan_id', loanId);
  if (e1) { console.error('deleteNonFixedLoan interest:', e1.message); return false; }

  const { error: e2 } = await supabase.from('loan_brokerage_accruals').delete().eq('loan_id', loanId);
  if (e2) { console.error('deleteNonFixedLoan accrual:', e2.message); return false; }

  const { error: e3 } = await supabase.from('loans').delete().eq('id', loanId);
  if (e3) { console.error('deleteNonFixedLoan loan:', e3.message); return false; }

  return true;
}
export async function loadBanks() {
  const { data, error } = await supabase.from('banks').select('name').order('name');
  if (error) { console.error('loadBanks', error); return []; }
  return data.map(r => r.name);
}

export async function addBank(name) {
  const { error } = await supabase.from('banks').insert({ name });
  if (error) { console.error('addBank', error); return false; }
  return true;
}

export async function deleteBank(name) {
  const { error } = await supabase.from('banks').delete().eq('name', name);
  if (error) { console.error('deleteBank', error); return false; }
  return true;
}

export async function loadIgnoredSalesParties() {
  const { data, error } = await supabase.from('ignored_sales_parties').select('party_name').order('party_name');
  if (error) { console.error('loadIgnoredSalesParties', error); return []; }
  return data.map(r => r.party_name);
}

export async function addIgnoredSalesParty(party) {
  const { error } = await supabase.from('ignored_sales_parties').insert({ party_name: party });
  if (error) { console.error('addIgnoredSalesParty', error); return false; }
  return true;
}

export async function deleteIgnoredSalesParty(party) {
  const { error } = await supabase.from('ignored_sales_parties').delete().eq('party_name', party);
  if (error) { console.error('deleteIgnoredSalesParty', error); return false; }
  return true;
}

export async function exportFullBackup() {
  const tables = [
    "app_users","bank_transactions","banks","brokers","claim_rules",
    "deliveries","financial_years","ignored_sales_parties",
    "loan_brokerage_accruals","loan_brokerage_payments","loan_brokers",
    "loan_interest_events","loan_parties","loans","parties",
    "pmt_linked_slots","purchase_flash","purchases","sales_flash",
    "sales_working","users"
  ];
  const backup = { _app: "ik-app", _exportedAt: new Date().toISOString(), _tables: {} };
  const errors = [];
  for (const t of tables) {
    
    // paginate in case any table exceeds the default 1000-row cap
    
    let all = [], from = 0;
    while (true) {
      const { data, error } = await supabase.from(t).select('*').range(from, from + 999);
      if (error) { errors.push(`${t}: ${error.message}`); break; }
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    backup._tables[t] = all;
  }
  return { backup, errors };
}
export async function importFullBackup(backup) {
 
  // conflict key per table
 
  const CONFLICT = {
    app_users: "id", bank_transactions: "id", banks: "name", brokers: "id",
    claim_rules: "id", deliveries: "id", financial_years: "fy",
    ignored_sales_parties: "party_name", loan_brokerage_accruals: "id",
    loan_brokerage_payments: "id", loan_brokers: "id", loan_interest_events: "id",
    loan_parties: "id", loans: "id", parties: "id",
    pmt_linked_slots: "ref_no,financial_year", purchase_flash: "ref_no,financial_year",
    purchases: "id", sales_flash: "id", sales_working: "id", users: "id",
  };

  // dependency order: parents/masters first, children last
  
  const ORDER = [
    "financial_years", "banks", "app_users", "users",
    "parties", "brokers", "deliveries", "ignored_sales_parties", "claim_rules",
    "loan_parties", "loan_brokers",
    "purchases", "sales_flash", "sales_working", "purchase_flash",
    "bank_transactions", "pmt_linked_slots",
    "loans", "loan_interest_events", "loan_brokerage_accruals", "loan_brokerage_payments",
  ];

  const tables = backup?._tables || {};
  const results = [];

  for (const t of ORDER) {
    const rows = tables[t];
    if (!Array.isArray(rows) || rows.length === 0) { results.push({ table: t, count: 0, status: "empty/skip" }); continue; }
    // upsert in chunks of 500
    let ok = 0, err = null;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from(t).upsert(chunk, { onConflict: CONFLICT[t] });
      if (error) { err = error.message; break; }
      ok += chunk.length;
    }
    results.push({ table: t, count: ok, status: err ? `ERROR: ${err}` : "ok" });
  }
  return results;
}