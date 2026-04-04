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
    if (r >= 100000) { w += h(Math.floor(r / 100000)) + 'Lakh '; r %= 100000; }
    if (r >= 1000) { w += h(Math.floor(r / 1000)) + 'Thousand '; r %= 1000; }
    if (r >= 100) { w += h(Math.floor(r / 100)) + 'Hundred '; r %= 100; }
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

function groupByHSN(items, gstPercent, discountFactor = 1) {
    const map = {};
    items.forEach(item => {
        const hsn = item.hsn || '—';
        const grossAmount = parseFloat(item.amount ?? item.total ?? 0);
        const taxable = grossAmount * discountFactor;
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

// ── Reusable Header Component ──
const InvoiceHeader = ({ sale, customer, company = {}, copyType = "Buyer's Copy", pageNumber = null }) => {
    const co = {
        name: company.name || 'M/s. R.M. TRADING',
        address: company.address || '2 & 3 Mahendra Nath Roy Lane, Mullick Fatak, Ground Floor, Howrah – 711 101',
        pincode: company.pincode || company.pinCode || '711 101',
        gstin: company.gstin || company.gstNumber || '19ABKFR7112F1Z3',
        pan: company.pan || company.panNumber || 'ABKFR7112F',
        phone: company.phone || '+91 7003866764',
        altPhone: company.altPhone || company.alternatePhone || '8013388430',
        email: company.email || 'rmtrading65@gmail.com',
        altEmail: company.altEmail || '',
        bank: company.bankName || company.bank || 'IDBI BANK',
        accNo: company.accNo || company.accno || '0359102000049443',
        ifsc: company.ifsc || company.ifscCode || 'IBKL0000359',
        branch: company.branch || 'Roy Villa, 240, Panchanantala Road, Howrah Branch',
        state: company.state || 'West Bengal',
        stateCode: company.stateCode || '19',
        jurisdiction: company.jurisdiction || 'Howrah',
    };

    const isVoucher = sale.type === 'RECEIPT' || sale.type === 'PAYMENT';
    const isReceipt = sale.type === 'RECEIPT';
    const docTitle = isVoucher ? (isReceipt ? 'Receipt Voucher' : 'Payment Voucher') : 'Tax Invoice';
    const otherPartyLabel = isVoucher ? (isReceipt ? 'Received From' : 'Paid To') : (sale.type === 'PURCHASE' ? 'Supplier' : 'Buyer');

    return (
        <React.Fragment>
            <div className="inv-topbar">
                <span className="inv-credit-memo">{sale.creditMemo ? 'Credit Memo' : ''}</span>
                <span className="inv-copy-badge">{copyType}</span>
            </div>
            <div className="inv-title-row">
                {docTitle}
                {pageNumber && <span className="inv-page-number">[Page {pageNumber}]</span>}
            </div>

            <div className="inv-header">
                <div className="inv-seller">
                    <div className="inv-seller-name">{co.name}</div>
                    <div className="inv-seller-sub">{co.address}, {co.pincode}</div>
                    <div className="inv-seller-sub">GSTIN/UIN: {co.gstin}</div>
                    <div className="inv-seller-sub">Contact No.: {co.phone}{co.altPhone ? ` / ${co.altPhone}` : ''}</div>
                    <div className="inv-seller-sub">E-Mail: {co.email}</div>
                </div>

                <div className="inv-meta">
                    <div className="inv-meta-row">
                        <div className="inv-meta-cell">
                            <div className="meta-label">Invoice No.</div>
                            <div className="meta-val">{sale.invoiceNumber || sale.id || '—'}</div>
                        </div>
                        <div className="inv-meta-cell no-right">
                            <div className="meta-label">Dated</div>
                            <div className="meta-val">{fmtDate(sale.date || sale.createdAt)}</div>
                        </div>
                    </div>

                    {!isVoucher && (
                        <React.Fragment>
                            <div className="inv-meta-row">
                                <div className="inv-meta-cell">
                                    <div className="meta-label">Delivery Note</div>
                                    <div className="meta-val light">{sale.deliveryNote || '—'}</div>
                                </div>
                                <div className="inv-meta-cell no-right">
                                    <div className="meta-label">Mode / Terms of Payment</div>
                                    <div className="meta-val light">
                                        {sale.paymentTerms || (sale.amountDue > 0 ? 'Credit' : 'Cash')}
                                    </div>
                                </div>
                            </div>
                            <div className="inv-meta-row">
                                <div className="inv-meta-cell">
                                    <div className="meta-label">Supplier's Ref.</div>
                                    <div className="meta-val light">{sale.supplierRef || '—'}</div>
                                </div>
                                <div className="inv-meta-cell no-right">
                                    <div className="meta-label">Buyer's Order No. & Date</div>
                                    <div className="meta-val light">
                                        {sale.buyerOrderNo
                                            ? `${sale.buyerOrderNo}${sale.buyerOrderDate ? ' / ' + fmtDate(sale.buyerOrderDate) : ''}`
                                            : '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="inv-meta-row no-bottom">
                                <div className="inv-meta-cell full-span">
                                    <div className="meta-label">Terms of Delivery</div>
                                    <div className="meta-val light">{sale.termsOfDelivery || '—'}</div>
                                </div>
                            </div>
                        </React.Fragment>
                    )}
                </div>
            </div>

            <div className="inv-buyer">
                <div className="inv-buyer-left">
                    <div className="meta-label">{otherPartyLabel} Details</div>
                    <div className="party-name">{customer?.name || sale.partyName || 'Cash Sale'}</div>
                    <div className="party-line">Address: {customer?.address || '—'}</div>
                    <div className="party-line">GSTIN/UIN: {customer?.gstin || customer?.gstNumber || (sale.type === 'SALE' ? sale.partyGst || 'Unregistered' : 'Unregistered')}</div>
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
                            <div>VAN / TRANSPORT / SELF</div>
                        </div>
                        <div className="buyer-rcell">
                            Delivery At :- ______________________________ Do _______________________
                        </div>
                    </div>
                )}
            </div>
        </React.Fragment>
    );
};

// ── Main Component ──
const InvoiceTemplate = ({ sale, customer, company = {}, copyType = "Buyer's Copy" }) => {
    if (!sale) return null;

    const {
        items = [], gstPercent = 18, total = 0, saleTax = sale.tax || 0,
        saleSubtotal = sale.subtotal || 0, taxableAmount = sale.taxableAmount || saleSubtotal || 0,
        roundOff = 0, discountAmount = 0, discountPercent = 0, type = 'SALE'
    } = sale;

    const isVoucher = type === 'RECEIPT' || type === 'PAYMENT';
    const displayItems = isVoucher
        ? [{
            name: `Amount ${type === 'RECEIPT' ? 'received' : 'paid'} via ${sale.mode || 'Cash'}${sale.notes ? ` (${sale.notes})` : ''}`,
            hsn: '—', size: '', qty: 1, unit: 'Nos',
            rate: sale.amount || total,
            amount: sale.amount || total,
        }]
        : items;

    const displayTotal = isVoucher ? (sale.amount || total) : total;
    const discountFactor = (saleSubtotal > 0) ? (taxableAmount / saleSubtotal) : 1;
    const hsnGroups = !isVoucher ? groupByHSN(displayItems, gstPercent, discountFactor) : [];
    const hsnTotalTaxable = hsnGroups.reduce((s, r) => s + r.taxable, 0);
    const hsnTotalCgst = hsnGroups.reduce((s, r) => s + r.cgstAmt, 0);
    const hsnTotalSgst = hsnGroups.reduce((s, r) => s + r.sgstAmt, 0);

    const isIGST = customer?.stateCode && customer.stateCode !== (company.stateCode || '19');

    return (
        <div className={`inv-wrap ${sale.draft ? 'inv-draft' : ''} ${copyType === "Seller's Copy" ? 'seller-copy-start' : ''}`}>

            <table className="main-print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* GROUP 1: Header - automatically repeats on every printed page */}
                <thead>
                    <tr>
                        <td>
                            <InvoiceHeader
                                sale={sale}
                                customer={customer}
                                company={company}
                                copyType={copyType}
                            />
                        </td>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td>
                            <div className="inv-table-container">
                                <table className="inv-table">
                                    {/* Column Headers */}
                                    <thead>
                                        <tr>
                                            <th className="c" style={{ width: 28 }}>Sl</th>
                                            <th style={{ textAlign: 'left' }}>Description of Goods</th>
                                            <th className="c" style={{ width: 45 }}>HSN/SAC</th>
                                            <th className="c" style={{ width: 35 }}>Size</th>
                                            {!isVoucher && <th className="r" style={{ width: 65 }}>Quantity</th>}
                                            {!isVoucher && <th className="r" style={{ width: 95 }}>Rate</th>}
                                            {!isVoucher && <th className="c" style={{ width: 40 }}>per</th>}
                                            <th className="r" style={{ width: 110 }}>Amount</th>
                                        </tr>
                                    </thead>
                                    {/* GROUP 2: Items List */}
                                    <tbody>
                                        {displayItems.map((item, i) => (
                                            <tr key={i}>
                                                <td className="c" style={{ width: 28 }}>{i + 1}</td>
                                                <td style={{ wordBreak: 'break-word' }}>
                                                    {item.Product?.name || item.name}
                                                </td>
                                                <td className="c" style={{ width: 45 }}>{item.hsn || '—'}</td>
                                                <td className="c" style={{ width: 35 }}>{item.size || '—'}</td>
                                                {!isVoucher && (
                                                    <td className="r" style={{ width: 65 }}>{item.qty ?? item.quantity} {item.unit || item.quantityUnit || 'Pcs'}</td>
                                                )}
                                                {!isVoucher && <td className="r" style={{ width: 95 }}>{fmt2(item.rate ?? item.price)}</td>}
                                                {!isVoucher && <td className="c" style={{ width: 40 }}>{item.unit || item.quantityUnit || 'Pcs'}</td>}
                                                <td className="r" style={{ width: 110 }}>{fmt2(item.amount ?? item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>

                                    {/* GROUP 3: Subtotals (Inside table for alignment) */}
                                    <tbody className="print-group-3" style={{ pageBreakInside: 'avoid' }}>
                                        {!isVoucher && (
                                            <React.Fragment>
                                                <tr className="subtotal-row">
                                                    <td colSpan={7} className="subtotal-label">Base Amount</td>
                                                    <td className="r subtotal-val">{fmt2(saleSubtotal || taxableAmount)}</td>
                                                </tr>
                                                {discountAmount > 0 && (
                                                    <React.Fragment>
                                                        <tr className="subtotal-row tax-row">
                                                            <td colSpan={7} className="subtotal-label">Discount ({discountPercent}%)</td>
                                                            <td className="r subtotal-val">-{fmt2(discountAmount)}</td>
                                                        </tr>
                                                        <tr className="subtotal-row">
                                                            <td colSpan={7} className="subtotal-label">Taxable Value</td>
                                                            <td className="r subtotal-val">{fmt2(taxableAmount)}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                )}
                                                <tr className="subtotal-row tax-row">
                                                    <td colSpan={7} className="subtotal-label">GST ({gstPercent}%)</td>
                                                    <td className="r subtotal-val">+{fmt2(saleTax)}</td>
                                                </tr>
                                                <tr className="subtotal-row">
                                                    <td colSpan={7} className="subtotal-label bold-label">Rounded Off</td>
                                                    <td className="r subtotal-val">{roundOff >= 0 ? '+' : '-'}{fmt2(Math.abs(roundOff))}</td>
                                                </tr>
                                                <tr className="total-row">
                                                    <td colSpan={6} className="total-label">Total Invoice Value</td>
                                                    <td className="r total-rs">Rs.</td>
                                                    <td className="r total-val">{fmt2(displayTotal)}</td>
                                                </tr>
                                            </React.Fragment>
                                        )}

                                        {isVoucher && (
                                            <tr className="total-row">
                                                <td colSpan={4} className="total-label">Total</td>
                                                <td className="r total-val">₹ {fmt2(displayTotal)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* GROUP 3b: Amount Chargeable Indian Rupees (Now outside table to avoid double borders) */}
                                <div className="inv-words-row">
                                    <div className="inv-words-left">
                                        <div className="meta-label">Amount Chargeable Indian Rupees (in words)</div>
                                        <div className="inv-words-text">
                                            (Rupees: {numWords(Math.round(displayTotal))})
                                        </div>
                                    </div>
                                    <div className="inv-eoe">E. & O.E</div>
                                </div>
                            </div>

                            {/* REPEATING HEADER: Show before GROUP 4 if it flows to new page */}
                            <div className="inv-repeating-header-before-group4">
                                <InvoiceHeader
                                    sale={sale}
                                    customer={customer}
                                    company={company}
                                    copyType={copyType}
                                    pageNumber={2}
                                />
                            </div>

                            <div className="inv-financials" style={{ borderTop: 'none', marginTop: '2px' }}>
                                {/* GROUP 4: HSN Table & Tax Words */}
                                <div className="print-group-4" style={{ pageBreakInside: 'avoid', marginBottom: '0' }}>
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

                                    {!isVoucher && saleTax > 0 && (
                                        <div className="inv-tax-words-row">
                                            <span className="meta-label" style={{ marginRight: 6 }}>Tax Amount (in words) INR:</span>
                                            <span>({numWords(Math.round(saleTax))})</span>
                                        </div>
                                    )}
                                </div>

                                {/* GROUP 5: Bank Details, Declaration, Signatures */}
                                <div className="print-group-5" style={{ pageBreakInside: 'avoid' }}>
                                    <div className="inv-footer">
                                        <div className="footer-left">
                                            <div className="meta-label">NEFT / RTGS / Transfer Bank Details</div>
                                            <div className="bank-name">{company.bankName || company.bank || 'IDBI BANK'}</div>
                                            <div className="bank-line">
                                                A/c No.: {company.accNo || company.accno || '0359102000049443'} &nbsp;|&nbsp; IFSC Code: {company.ifsc || company.ifscCode || 'IBKL0000359'}
                                            </div>
                                            <div className="bank-line">{company.branch || 'Roy Villa, 240, Panchanantala Road, Howrah Branch'}</div>
                                            <div className="firm-pan">Firm PAN: {company.pan || company.panNumber || 'ABKFR7112F'}</div>
                                            <div className="inv-decl">
                                                <strong>Declaration</strong><br />
                                                We declare that this invoice shows the actual price of the goods described
                                                and that all particulars are true and correct.
                                            </div>
                                            <div className="inv-jurisdiction">
                                                Subject to {company.jurisdiction || 'Howrah'}.
                                            </div>
                                        </div>
                                        <div className="footer-right">
                                            <div className="sig-for">for {company.name || 'M/s. R.M. TRADING'}</div>
                                            <div className="sig-line">Authorised Signatory</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </td>
                    </tr>
                </tbody>

                {/* Footer spacer to push content above fixed footer */}
                <tfoot>
                    <tr>
                        <td>
                            <div className="print-footer-space" style={{ height: '8mm' }}></div>
                            <div className="inv-computer">This is a Computer Generated Invoice</div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default InvoiceTemplate;