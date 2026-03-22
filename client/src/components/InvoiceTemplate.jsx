import React from 'react';
import './InvoiceTemplate.css';

// ── Utilities ────────────────────────────────────────────────────────────────
function numWords(n) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
        'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (!n) return 'Zero';
    function h(x) {
        if (!x) return '';
        if (x < 20) return ones[x] + ' ';
        return tens[Math.floor(x / 10)] + ' ' + (ones[x % 10] ? ones[x % 10] + ' ' : '');
    }
    let w = '', r = Math.floor(n);
    if (r >= 10000000) { w += h(Math.floor(r / 10000000)) + 'Crore '; r %= 10000000; }
    if (r >= 100000)   { w += h(Math.floor(r / 100000)) + 'Lakh '; r %= 100000; }
    if (r >= 1000)     { w += h(Math.floor(r / 1000)) + 'Thousand '; r %= 1000; }
    if (r >= 100)      { w += h(Math.floor(r / 100)) + 'Hundred '; r %= 100; }
    if (r > 0) w += h(r);
    return 'INR ' + w.trim() + ' Only';
}

function fmt2(n) {
    return parseFloat(n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtDate(d) {
    try {
        const date = new Date(d);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch { return d; }
}

// Group items by HSN for the tax breakdown table at bottom
function groupByHSN(items, gstPercent) {
    const map = {};
    items.forEach(item => {
        const hsn = item.hsn || '—';
        const taxable = parseFloat(item.amount ?? item.total ?? 0);
        if (!map[hsn]) map[hsn] = { hsn, taxable: 0 };
        map[hsn].taxable += taxable;
    });
    
    return Object.values(map).map(row => {
        const cgstRate = gstPercent / 2;
        const sgstRate = gstPercent / 2;
        return {
            ...row,
            cgstRate,
            cgstAmt: parseFloat((row.taxable * cgstRate / 100).toFixed(2)),
            sgstRate,
            sgstAmt: parseFloat((row.taxable * sgstRate / 100).toFixed(2)),
        };
    });
}

// ── InvoiceTemplate ───────────────────────────────────────────────────────────
/**
 * Props:
 *  sale       – invoice data object (see shape below)
 *  customer   – buyer/supplier details
 *  company    – override seller defaults
 *  copyType   – "Buyer's Copy" | "Seller's Copy"
 *
 * sale shape:
 *  invoiceNumber, date, type ('SALE'|'PURCHASE'|'RECEIPT'|'PAYMENT'),
 *  items[], cgst, sgst, roundOff, total, amountDue,
 *  deliveryNote, paymentTerms, supplierRef,
 *  buyerOrderNo, buyerOrderDate, despatchedThrough, termsOfDelivery,
 *  notes, mode, creditMemo (bool)
 *
 * items[] shape:
 *  name (or Product.name), hsn, size,
 *  qty (or quantity), unit (or quantityUnit),
 *  rate (or price), amount (or total)
 *
 * customer shape:
 *  name, address, gstNumber, phone, state, stateCode
 */
const InvoiceTemplate = ({ sale, customer, company = {}, copyType = "Buyer's Copy" }) => {
    if (!sale) return null;

    const {
        invoiceNumber, date, items = [],
        cgst = 0, sgst = 0, roundOff = 0, total = 0,
        amountDue = 0,
        deliveryNote, paymentTerms, supplierRef,
        buyerOrderNo, buyerOrderDate,
        despatchedThrough, termsOfDelivery,
        notes, type = 'SALE', mode,
        creditMemo = false,
        subtotal: saleSubtotal = 0,
        discountPercent = 0,
        discountAmount = 0,
        gstPercent = 18,
    } = sale;

    // Derived fields with safe fallbacks
    const taxableAmount = sale.taxableAmount || saleSubtotal || 0;
    const saleTax = sale.tax || 0;
    const saleAfterGST = sale.afterGST || (Number(taxableAmount) + Number(saleTax));

    const co = {
        name:      'M/s. R.M. TRADING',
        address:   '2 & 3 Mahendra Nath Roy Lane, Mullick Fatak, Ground Floor, Howrah – 711 101',
        gstin:     '19ABKFR7112F1Z3',
        pan:       'ABKFR7112F',
        phone:     '+91 7003866764 / 8013388430',
        email:     'rmtrading65@gmail.com',
        bank:      'IDBI BANK',
        accno:     '0359102000049443',
        ifsc:      'IBKL0000359',
        branch:    'Roy Villa, 240, Panchanantala Road, Howrah Branch',
        state:     'West Bengal',
        stateCode: '19',
        ...company,
    };

    const isIGST = customer?.stateCode && customer.stateCode !== co.stateCode;
    const isPurchase = type === 'PURCHASE';
    const isReceipt  = type === 'RECEIPT';
    const isPayment  = type === 'PAYMENT';
    const isVoucher  = isReceipt || isPayment;

    const docTitle = isVoucher ? (isReceipt ? 'Receipt Voucher' : 'Payment Voucher') : 'Tax Invoice';

    const otherPartyLabel = isVoucher ? (isReceipt ? 'Received From' : 'Paid To') : (isPurchase ? 'Supplier' : 'Buyer');

    const displayItems = isVoucher
        ? [{
            name:   `Amount ${isReceipt ? 'received' : 'paid'} via ${mode || 'Cash'}${notes ? ` (${notes})` : ''}`,
            hsn: '—', size: '', qty: 1, unit: 'Nos',
            rate: sale.amount || total,
            amount: sale.amount || total,
        }]
        : items;



    const displayTotal = isVoucher ? (sale.amount || total) : total;
    
    // HSN tax breakdown groups
    const hsnGroups       = !isVoucher ? groupByHSN(displayItems, gstPercent) : [];
    const hsnTotalTaxable = hsnGroups.reduce((s, r) => s + r.taxable, 0);
    const hsnTotalCgst    = hsnGroups.reduce((s, r) => s + r.cgstAmt, 0);
    const hsnTotalSgst    = hsnGroups.reduce((s, r) => s + r.sgstAmt, 0);

    return (
        <div className="inv-wrap">

            {/* ── Top bar: Credit Memo label + Copy badge ── */}
            <div className="inv-topbar">
                <span className="inv-credit-memo">{creditMemo ? 'Credit Memo' : ''}</span>
                <span className="inv-copy-badge">{copyType}</span>
            </div>

            {/* ── Main title ── */}
            <div className="inv-title-row">
                {docTitle}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                HEADER: Seller (left) + Invoice meta grid (right)
                NO separate seller party block below — seller is ONLY here
            ══════════════════════════════════════════════════════════════ */}
            <div className="inv-header">

                {/* Seller block — left side of header */}
                <div className="inv-seller">
                    <div className="inv-seller-name">{co.name}</div>
                    <div className="inv-seller-sub">{co.address}</div>
                    <div className="inv-seller-sub">GSTIN/UIN: {co.gstin}</div>
                    <div className="inv-seller-sub">Contact No.: {co.phone}</div>
                    <div className="inv-seller-sub">E-Mail: {co.email}</div>
                </div>

                {/* Invoice meta — right side of header */}
                <div className="inv-meta">
                    <div className="inv-meta-row">
                        <div className="inv-meta-cell">
                            <div className="meta-label">Invoice No.</div>
                            <div className="meta-val">{invoiceNumber || sale.id || '—'}</div>
                        </div>
                        <div className="inv-meta-cell no-right">
                            <div className="meta-label">Dated</div>
                            <div className="meta-val">{fmtDate(date || sale.createdAt)}</div>
                        </div>
                    </div>

                    {!isVoucher && (
                        <>
                            <div className="inv-meta-row">
                                <div className="inv-meta-cell">
                                    <div className="meta-label">Delivery Note</div>
                                    <div className="meta-val light">{deliveryNote || '—'}</div>
                                </div>
                                <div className="inv-meta-cell no-right">
                                    <div className="meta-label">Mode / Terms of Payment</div>
                                    <div className="meta-val light">
                                        {paymentTerms || (amountDue > 0 ? 'Credit' : 'Cash')}
                                    </div>
                                </div>
                            </div>
                            <div className="inv-meta-row">
                                <div className="inv-meta-cell">
                                    <div className="meta-label">Supplier's Ref.</div>
                                    <div className="meta-val light">{supplierRef || '—'}</div>
                                </div>
                                <div className="inv-meta-cell no-right">
                                    <div className="meta-label">Buyer's Order No. & Date</div>
                                    <div className="meta-val light">
                                        {buyerOrderNo
                                            ? `${buyerOrderNo}${buyerOrderDate ? ' / ' + fmtDate(buyerOrderDate) : ''}`
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="inv-meta-row no-bottom">
                                <div className="inv-meta-cell full-span">
                                    <div className="meta-label">Terms of Delivery</div>
                                    <div className="meta-val light">{termsOfDelivery || '—'}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                BUYER section — only buyer here, seller already in header
            ══════════════════════════════════════════════════════════════ */}
            <div className="inv-buyer">
                <div className="inv-buyer-left">
                    <div className="meta-label">{otherPartyLabel} Details</div>
                    <div className="party-name">{customer?.name || sale.partyName || 'Cash Sale'}</div>
                    <div className="party-line">Address: {customer?.address || '—'}</div>
                    <div className="party-line">GSTIN/UIN: {customer?.gstNumber || 'Unregistered'}</div>
                    <div className="party-line">
                        State: {customer?.state || '—'} &nbsp;|&nbsp;
                        Code: {customer?.stateCode || '—'} &nbsp;|&nbsp;
                        Ph: {customer?.phone || '—'}
                    </div>
                </div>
                {!isVoucher && (
                    <div className="inv-buyer-right">
                        <div className="buyer-rcell buyer-rcell--top">
                            <span className="meta-label">Delivery By</span>
                            <div>{despatchedThrough || 'VAN / TRANSPORT / SELF'}</div>
                        </div>
                        <div className="buyer-rcell">
                            Delivery At :- ————— Do —————
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ITEMS TABLE
                Columns: Sl | Description | HSN/SAC | Size | Qty | Rate | per | Amount
                NO GST% column
            ══════════════════════════════════════════════════════════════ */}
            <table className="inv-table">
                <thead>
                    <tr>
                        <th className="c" style={{ width: 28 }}>Sl</th>
                        <th style={{ textAlign: 'left' }}>Description of Goods</th>
                        <th className="c" style={{ width: 60 }}>HSN/SAC</th>
                        <th className="c" style={{ width: 48 }}>Size</th>
                        {!isVoucher && <th className="r" style={{ width: 65 }}>Quantity</th>}
                        {!isVoucher && <th className="r" style={{ width: 68 }}>Rate</th>}
                        {!isVoucher && <th className="c" style={{ width: 36 }}>per</th>}
                        <th className="r" style={{ width: 90 }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Line items */}
                    {displayItems.map((item, i) => (
                        <tr key={i}>
                            <td className="c">{i + 1}</td>
                            <td>{item.Product?.name || item.name}</td>
                            <td className="c">{item.hsn || '—'}</td>
                            <td className="c">{item.size || '—'}</td>
                            {!isVoucher && (
                                <td className="r">{item.qty ?? item.quantity} {item.unit || item.quantityUnit || 'Pcs'}</td>
                            )}
                            {!isVoucher && <td className="r">{fmt2(item.rate ?? item.price)}</td>}
                            {!isVoucher && <td className="c">{item.unit || item.quantityUnit || 'Pcs'}</td>}
                            <td className="r">{fmt2(item.amount ?? item.total)}</td>
                        </tr>
                    ))}


                    {/* ── Inline totals ── */}
                    {!isVoucher && (
                        <>
                            <tr className="subtotal-row">
                                <td colSpan={7} className="subtotal-label">Taxable Value</td>
                                <td className="r subtotal-val">{fmt2(taxableAmount)}</td>
                            </tr>
                            <tr className="subtotal-row">
                                <td colSpan={7} className="subtotal-label">GST ({gstPercent}%)</td>
                                <td className="r subtotal-val">{fmt2(saleTax)}</td>
                            </tr>
                            <tr className="subtotal-row">
                                <td colSpan={7} className="subtotal-label">After GST</td>
                                <td className="r subtotal-val">{fmt2(saleAfterGST)}</td>
                            </tr>
                            {discountAmount > 0 && (
                                <tr className="subtotal-row">
                                    <td colSpan={7} className="subtotal-label">Discount ({discountPercent}%)</td>
                                    <td className="r subtotal-val" style={{ color: '#ff4757' }}>-{fmt2(discountAmount)}</td>
                                </tr>
                            )}
                             <tr className="subtotal-row">
                                <td colSpan={7} className="subtotal-label bold-label">Rounded Off</td>
                                <td className="r subtotal-val">{roundOff >= 0 ? '+' : '-'}{fmt2(Math.abs(roundOff))}</td>
                            </tr>
                            <tr className="total-row">
                                <td colSpan={6} className="total-label">Total Invoice Value</td>
                                <td className="r total-rs">Rs.</td>
                                <td className="r total-val">{fmt2(displayTotal)}</td>
                            </tr>
                        </>
                    )}

                    {/* Voucher total */}
                    {isVoucher && (
                        <tr className="total-row">
                            <td colSpan={4} className="total-label">Total</td>
                            <td className="r total-val">₹ {fmt2(displayTotal)}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* ══════════════════════════════════════════════════════════════
                AMOUNT IN WORDS + E. & O.E
            ══════════════════════════════════════════════════════════════ */}
            <div className="inv-words-row">
                <div className="inv-words-left">
                    <div className="meta-label">Amount Chargeable Indian Rupees (in words)</div>
                    <div className="inv-words-text">
                        (Rupees: {numWords(Math.round(displayTotal))})
                    </div>
                </div>
                <div className="inv-eoe">E. & O.E</div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                HSN/SAC TAX BREAKDOWN TABLE
            ══════════════════════════════════════════════════════════════ */}
            {!isVoucher && hsnGroups.length > 0 && (
                <table className="inv-hsn-table">
                    <thead>
                        {isIGST ? (
                            <tr>
                                <th style={{ width: 100 }}>HSN/SAC</th>
                                <th className="r" style={{ width: 120 }}>Taxable Value</th>
                                <th colSpan={2} className="c">IGST</th>
                            </tr>
                        ) : (
                            <tr>
                                <th rowSpan={2} style={{ width: 100 }}>HSN/SAC</th>
                                <th rowSpan={2} className="r" style={{ width: 120 }}>Taxable Value</th>
                                <th colSpan={2} className="c">CGST</th>
                                <th colSpan={2} className="c">SGST</th>
                            </tr>
                        )}
                        {!isIGST && (
                            <tr>
                                <th className="c" style={{ width: 60 }}>Rate</th>
                                <th className="r" style={{ width: 90 }}>Amount</th>
                                <th className="c" style={{ width: 60 }}>Rate</th>
                                <th className="r" style={{ width: 90 }}>Amount</th>
                            </tr>
                        )}
                        {isIGST && (
                            <tr>
                                <th className="c" style={{ width: 60 }}>Rate</th>
                                <th className="r" style={{ width: 240 }}>Amount</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {hsnGroups.map((row, i) => (
                            <tr key={i}>
                                <td>{row.hsn}</td>
                                <td className="r">{fmt2(row.taxable)}</td>
                                {isIGST ? (
                                    <>
                                        <td className="c">{gstPercent}%</td>
                                        <td className="r">{fmt2(row.cgstAmt + row.sgstAmt)}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="c">{row.cgstRate}%</td>
                                        <td className="r">{fmt2(row.cgstAmt)}</td>
                                        <td className="c">{row.sgstRate}%</td>
                                        <td className="r">{fmt2(row.sgstAmt)}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                        <tr className="hsn-total-row">
                            <td><strong>Total</strong></td>
                            <td className="r"><strong>{fmt2(hsnTotalTaxable)}</strong></td>
                            {isIGST ? (
                                <>
                                    <td></td>
                                    <td className="r"><strong>{fmt2(hsnTotalCgst + hsnTotalSgst)}</strong></td>
                                </>
                            ) : (
                                <>
                                    <td></td>
                                    <td className="r"><strong>{fmt2(hsnTotalCgst)}</strong></td>
                                    <td></td>
                                    <td className="r"><strong>{fmt2(hsnTotalSgst)}</strong></td>
                                </>
                            )}
                        </tr>
                    </tbody>
                </table>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAX AMOUNT IN WORDS
            ══════════════════════════════════════════════════════════════ */}
            {!isVoucher && saleTax > 0 && (
                <div className="inv-tax-words-row">
                    <span className="meta-label" style={{ marginRight: 6 }}>Tax Amount (in words) INR:</span>
                    <span>({numWords(Math.round(saleTax))})</span>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                BANK DETAILS + FIRM PAN + DECLARATION + SIGNATURE
            ══════════════════════════════════════════════════════════════ */}
            <div className="inv-footer">
                <div className="footer-left">
                    <div className="meta-label">NEFT / RTGS / Transfer Bank Details</div>
                    <div className="bank-name">{co.bank}</div>
                    <div className="bank-line">
                        A/c No.: {co.accno} &nbsp;|&nbsp; IFSC Code: {co.ifsc}
                    </div>
                    <div className="bank-line">{co.branch}</div>
                    <div className="firm-pan">Firm PAN: {co.pan}</div>
                    <div className="inv-decl">
                        <strong>Declaration</strong><br />
                        We declare that this invoice shows the actual price of the goods described
                        and that all particulars are true and correct.
                    </div>
                    <div className="inv-jurisdiction">
                        Subject to {customer?.state || co.state} Jurisdiction.
                    </div>
                </div>
                <div className="footer-right">
                    <div className="sig-for">for {co.name}</div>
                    <div className="sig-line">Authorised Signatory</div>
                </div>
            </div>

            <div className="inv-computer">This is a Computer Generated Invoice</div>
        </div>
    );
};

export default InvoiceTemplate;
