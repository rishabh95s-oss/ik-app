import { supabase } from './supabaseClient.js';

export async function migrateDataToSupabase() {
  console.log('🚀 Starting migration from localStorage to Supabase...');
  
  try {
    // 1. MIGRATE PARTIES
    const parties = JSON.parse(localStorage.getItem('ik_parties') || '[]');
    if (parties.length > 0) {
      const partyRows = parties.map(p => ({ party_name: p }));
      const { error: partiesErr } = await supabase.from('parties').insert(partyRows);
      if (partiesErr) throw new Error(`Parties: ${partiesErr.message}`);
      console.log(`✅ Migrated ${parties.length} parties`);
    }

    // 2. MIGRATE BROKERS
    const brokers = JSON.parse(localStorage.getItem('ik_brokers') || '[]');
    if (brokers.length > 0) {
      const brokerRows = brokers.map(b => ({ broker_name: b }));
      const { error: brokersErr } = await supabase.from('brokers').insert(brokerRows);
      if (brokersErr) throw new Error(`Brokers: ${brokersErr.message}`);
      console.log(`✅ Migrated ${brokers.length} brokers`);
    }

    // 3. MIGRATE DELIVERIES
    const deliveries = JSON.parse(localStorage.getItem('ik_deliveries') || '[]');
    if (deliveries.length > 0) {
      const deliveryRows = deliveries.map(d => ({ delivery_name: d }));
      const { error: deliveriesErr } = await supabase.from('deliveries').insert(deliveryRows);
      if (deliveriesErr) throw new Error(`Deliveries: ${deliveriesErr.message}`);
      console.log(`✅ Migrated ${deliveries.length} deliveries`);
    }

    // 4. MIGRATE PURCHASES (ik_v2)
    const purchases = JSON.parse(localStorage.getItem('ik_v2') || '[]');
    if (purchases.length > 0) {
      const purchaseRows = purchases.map(r => ({
        ref_no: r.refNo,
        delivery_at: r.deliveryAt,
        truck_no: r.truckNo,
        party_name: r.partyName,
        broker_name: r.brokerName,
        bill_date: r.billDate,
        bill_no: r.billNo,
        rate: parseFloat(r.rate) || 0,
        bill_qty: parseFloat(r.billQty) || 0,
        receive_qty: parseFloat(r.receiveQty) || 0,
        half_kg_value: parseFloat(r.halfKgValue) || 0,
        cd_pct: parseFloat(r.cdPct) || 0,
        quality_claim: parseFloat(r.qualityClaim) || 0,
        hammali: parseFloat(r.hammali) || 0,
        freight: parseFloat(r.freight) || 0,
        others: parseFloat(r.others) || 0,
        brokerage_rate: parseFloat(r.brokerageRate) || 0,
        brokerage_amt: parseFloat(r.brokerageAmt) || 0,
        tcs: parseFloat(r.tcs) || 0,
        bank_amt1: parseFloat(r.bankAmt1) || 0,
        bank_date1: r.bankDate1,
        bank_name1: r.bankName1,
        bank_amt2: parseFloat(r.bankAmt2) || 0,
        bank_date2: r.bankDate2,
        bank_name2: r.bankName2,
        bank_amt3: parseFloat(r.bankAmt3) || 0,
        bank_date3: r.bankDate3,
        bank_name3: r.bankName3,
        ref_a: r.refA,
        ref_b: r.refB,
        note: r.note,
        _tds: parseFloat(r._tds) || 0,
        _shortage: parseFloat(r._shortage) || 0,
        _half_kg_qty: parseFloat(r._halfKgQty) || 0,
        _net_qty: parseFloat(r._netQty) || 0,
        _net_amt1: parseFloat(r._netAmt1) || 0,
        _cd_amt: parseFloat(r._cdAmt) || 0,
        _net_amt: parseFloat(r._netAmt) || 0,
        _brokerage_amt: parseFloat(r._brokerageAmt) || 0,
        _final_amt: parseFloat(r._finalAmt) || 0,
        _balance: parseFloat(r._balance) || 0
      }));
      
      const { error: purchasesErr } = await supabase.from('purchases').insert(purchaseRows);
      if (purchasesErr) throw new Error(`Purchases: ${purchasesErr.message}`);
      console.log(`✅ Migrated ${purchases.length} purchase records`);
    }

    // 5. MIGRATE SALES FLASH
    const salesFlash = JSON.parse(localStorage.getItem('ik_salesFlash') || '[]');
    if (salesFlash.length > 0) {
      const flashRows = salesFlash.map(r => ({
        ref_no: r.refNo,
        date: r.date,
        party_name: r.partyName,
        broker: r.broker,
        item_name: r.itemName,
        po_no: r.poNo,
        truck_no: r.truckNo,
        qty: parseFloat(r.qty) || 0,
        rate: parseFloat(r.rate) || 0,
        net_bill_amt: parseFloat(r.netBillAmt) || 0
      }));
      
      const { error: flashErr } = await supabase.from('sales_flash').insert(flashRows);
      if (flashErr) throw new Error(`Sales Flash: ${flashErr.message}`);
      console.log(`✅ Migrated ${salesFlash.length} sales flash entries`);
    }

    // 6. MIGRATE SALES WORKING
    const salesWorking = JSON.parse(localStorage.getItem('ik_salesWorking') || '[]');
    if (salesWorking.length > 0) {
      const workingRows = salesWorking.map(r => ({
        ref_no: r.refNo,
        date: r.date,
        party_name: r.partyName,
        broker: r.broker,
        item_name: r.itemName,
        po_no: r.poNo,
        truck_no: r.truckNo,
        qty: parseFloat(r.qty) || 0,
        rate: parseFloat(r.rate) || 0,
        received_weight: parseFloat(r.receivedWeight) || 0,
        shortage: parseFloat(r.shortage) || 0,
        shortage_amount: parseFloat(r.shortageAmount) || 0,
        claim_pct: parseFloat(r.claimPct) || 0,
        claim: parseFloat(r.claim) || 0,
        cd_pct: parseFloat(r.cdPct) || 0,
        cd: parseFloat(r.cd) || 0,
        tds_received: parseFloat(r.tdsReceived) || 0,
        net_amt: parseFloat(r.netAmt) || 0,
        bank_date1: r.bankDate1,
        bank_pmt1: parseFloat(r.bankPmt1) || 0,
        bank_date2: r.bankDate2,
        bank_pmt2: parseFloat(r.bankPmt2) || 0,
        bank_date3: r.bankDate3,
        bank_pmt3: parseFloat(r.bankPmt3) || 0,
        pending_amt: parseFloat(r.pendingAmt) || 0,
        days: parseInt(r.days) || 0,
        pmt_id1: r.pmtId1 || '',
        pmt_id2: r.pmtId2 || '',
        pmt_id3: r.pmtId3 || ''
      }));
      
      const { error: workingErr } = await supabase.from('sales_working').insert(workingRows);
      if (workingErr) throw new Error(`Sales Working: ${workingErr.message}`);
      console.log(`✅ Migrated ${salesWorking.length} sales working entries`);
    }

    // 7. MIGRATE BANKING DATA
    const bankingData = JSON.parse(localStorage.getItem('ik_banking') || '{"HDFC":[],"SBI":[],"VASB":[]}');
    let totalBanking = 0;
    for (const [bankName, transactions] of Object.entries(bankingData)) {
      if (Array.isArray(transactions) && transactions.length > 0) {
        const bankRows = transactions.map(t => ({
          bank_name: bankName,
          transaction_date: t.date,
          narration: t.narration,
          chq_ref: t.chqRef,
          value_dt: t.valueDt,
          withdrawal_amt: parseFloat(t.withdrawalAmt) || 0,
          deposit_amt: parseFloat(t.depositAmt) || 0,
          closing_balance: parseFloat(t.closingBalance) || 0,
          linked_ref_no: t.linkedRefNo || '',
          party_name: t.partyName || ''
        }));
        
        const { error: bankErr } = await supabase.from('banks').insert(bankRows);
        if (bankErr) throw new Error(`Banks (${bankName}): ${bankErr.message}`);
        totalBanking += transactions.length;
      }
    }
    if (totalBanking > 0) {
      console.log(`✅ Migrated ${totalBanking} bank transactions`);
    }

    // 8. MIGRATE CLAIM MANAGEMENT
    const claimManagement = JSON.parse(localStorage.getItem('ik_claimManagement') || '[]');
    if (claimManagement.length > 0) {
      const claimRows = claimManagement.map(c => ({
        party_name: c.partyName,
        claim_rule: c.claimRule,
        rec_weight_source: c.recWeightSource
      }));
      
      const { error: claimErr } = await supabase.from('claim_management').insert(claimRows);
      if (claimErr) throw new Error(`Claim Management: ${claimErr.message}`);
      console.log(`✅ Migrated ${claimManagement.length} claim rules`);
    }

    // 9. MIGRATE PMT LINKED SLOTS
    const pmtLinkedSlots = JSON.parse(localStorage.getItem('ik_pmtLinkedSlots') || '{}');
    const pmtSlotsArray = Object.entries(pmtLinkedSlots).flatMap(([refNo, slots]) =>
      Array.isArray(slots) ? slots.map(slot => ({ ref_no: refNo, slot_number: slot })) : []
    );
    if (pmtSlotsArray.length > 0) {
      const { error: pmtErr } = await supabase.from('pmt_linked_slots').insert(pmtSlotsArray);
      if (pmtErr) throw new Error(`PMT Linked Slots: ${pmtErr.message}`);
      console.log(`✅ Migrated ${pmtSlotsArray.length} PMT slot links`);
    }

    console.log('✅✅✅ MIGRATION COMPLETE! All data uploaded to Supabase.');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}