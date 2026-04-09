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
    return w.trim() + ' Only';
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
const InvoiceHeader = ({ sale, customer, company = {}, copyType = "Buyer's Copy", pageNumber = null, totalPages = null, totalCols = 8 }) => {
    const co = {
        name: company.name || 'M/s. R.M. TRADING',
        address: company.address || '2 & 3 Mahendra Nath Roy Lane, Mullick Fatak, Ground Floor, Howrah \u2013 711 101',
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

    const sellerCols = isVoucher ? 2 : Math.floor(totalCols / 2);
    const metaCols = totalCols - sellerCols;
    const metaLeft = 2;
    const metaRight = metaCols - metaLeft;
    const sellerRSpan = isVoucher ? 1 : 4;

    return (
        <React.Fragment>
            <tr className="inv-tr-topbar">
                <td colSpan={totalCols} className="inv-td-topbar">
                    <div className="inv-topbar-flex">
                        <span className="inv-credit-memo">{sale.creditMemo ? 'Credit Memo' : ''}</span>
                        <span className="inv-copy-badge">{copyType}</span>
                    </div>
                </td>
            </tr>

            <tr className="inv-tr-title">
                <td colSpan={totalCols} className="inv-td-title">
                    <div className="inv-title-container">
                        <span className="inv-title-text">{docTitle}</span>
                        {pageNumber && (
                            <span className="inv-page-number-text">
                                [Page {pageNumber}{totalPages ? ` of ${totalPages}` : ''}]
                            </span>
                        )}
                    </div>
                </td>
            </tr>

            <tr className="inv-tr-header">
                <td colSpan={sellerCols} rowSpan={sellerRSpan} className="inv-td-seller">
                    <div className="inv-seller-info">
                        <div className="inv-seller-name">{co.name}</div>
                        <div className="inv-seller-sub">{co.address}, {co.pincode}</div>
                        <div className="inv-seller-sub">GSTIN/UIN: {co.gstin}</div>
                        <div className="inv-seller-sub">Contact No.: {co.phone}{co.altPhone ? ` / ${co.altPhone}` : ''}</div>
                        <div className="inv-seller-sub">E-Mail: {co.email}</div>
                    </div>
                </td>
                <td colSpan={metaLeft} className="inv-meta-cell">
                    <div className="meta-label">{isVoucher ? 'Doc No.' : 'Invoice No.'}</div>
                    <div className="meta-val">{sale.invoiceNumber || sale.id || '—'}</div>
                </td>
                <td colSpan={metaRight} className="inv-meta-cell">
                    <div className="meta-label">Dated</div>
                    <div className="meta-val">{fmtDate(sale.date || sale.createdAt)}</div>
                </td>
            </tr>

            {!isVoucher && (
                <React.Fragment>
                    <tr className="inv-tr-meta">
                        <td colSpan={metaLeft} className="inv-meta-cell">
                            <div className="meta-label">Delivery Note</div>
                            <div className="meta-val light">{sale.deliveryNote || '—'}</div>
                        </td>
                        <td colSpan={metaRight} className="inv-meta-cell">
                            <div className="meta-label">Mode / Terms of Payment</div>
                            <div className="meta-val light">
                                {sale.paymentTerms || (sale.amountDue > 0 ? 'Credit' : 'Cash')}
                            </div>
                        </td>
                    </tr>
                    <tr className="inv-tr-meta">
                        <td colSpan={metaLeft} className="inv-meta-cell">
                            <div className="meta-label">Supplier's Ref.</div>
                            <div className="meta-val light">{sale.supplierRef || '—'}</div>
                        </td>
                        <td colSpan={metaRight} className="inv-meta-cell">
                            <div className="meta-label">Buyer's Order No. &amp; Date</div>
                            <div className="meta-val light">
                                {sale.buyerOrderNo
                                    ? `${sale.buyerOrderNo}${sale.buyerOrderDate ? ' / ' + fmtDate(sale.buyerOrderDate) : ''}`
                                    : '—'}
                            </div>
                        </td>
                    </tr>
                    <tr className="inv-tr-meta">
                        <td colSpan={metaCols} className="inv-meta-cell inv-meta-last">
                            <div className="meta-label">Terms of Delivery</div>
                            <div className="meta-val light">{sale.termsOfDelivery || '—'}</div>
                        </td>
                    </tr>
                </React.Fragment>
            )}

            <tr className="inv-tr-buyer">
                <td colSpan={sellerCols} className="inv-td-buyer-left">
                    <div className="meta-label">{otherPartyLabel} Details</div>
                    <div className="party-name">{customer?.name || sale.partyName || 'Cash Sale'}</div>
                    <div className="party-line">Address: {customer?.address || '—'}</div>
                    <div className="party-line">GSTIN/UIN: {customer?.gstin || customer?.gstNumber || (sale.type === 'SALE' ? sale.partyGst || 'Unregistered' : 'Unregistered')}</div>
                    <div className="party-line">
                        State: {customer?.state || '—'} &nbsp;|&nbsp;
                        Code: {customer?.stateCode || '—'} &nbsp;|&nbsp;
                        Ph: {customer?.phone || '—'}
                    </div>
                </td>
                <td colSpan={metaCols} className="inv-td-buyer-right">
                    {!isVoucher && (
                        <div className="inv-buyer-delivery-info">
                            <div className="inv-delivery-top">
                                <div className="meta-label">Delivery By</div>
                                <div>VAN / TRANSPORT / SELF</div>
                            </div>
                            <div className="inv-delivery-bottom">
                                Delivery At :- ______________________ Do _______________________
                            </div>
                        </div>
                    )}
                </td>
            </tr>
        </React.Fragment>
    );
};

// ── Page layout constants ────────────────────────────────────────────────────
const MAX_PAGE_UNITS = 28;
const WEIGHTS = {
    ITEM: 1,
    SUBTOTAL: 3,
    HSN: 4,
    BANK: 5
};

const ColGroup = ({ isVoucher }) => (
    <colgroup>
        <col style={{ width: 35 }} />
        <col />
        <col style={{ width: 50 }} />
        <col style={{ width: 44 }} />
        {!isVoucher && <col style={{ width: 68 }} />}
        {!isVoucher && <col style={{ width: 92 }} />}
        <col style={{ width: 45 }} />
        <col style={{ width: 110 }} />
    </colgroup>
);

// ── Column Header Row (shared across all pages) ──────────────────────────────
const ColHeaders = ({ isVoucher }) => (
    <tr className="inv-col-header-row">
        <th className="sl-col c" style={{ width: 35 }}>Sl</th>
        <th className="desc-col" style={{ textAlign: 'left' }}>Description of Goods</th>
        <th className="hsn-col c">HSN</th>
        <th className="size-col c">Size</th>
        {!isVoucher && <th className="qty-col r">Quantity</th>}
        {!isVoucher && <th className="rate-col r">Rate</th>}
        <th className="unit-col c">per</th>
        <th className="amt-col r">Amount</th>
    </tr>
);

// ── Main Component ──
const InvoiceTemplate = ({ sale, customer, company = {}, copyType = "Buyer's Copy" }) => {
    if (!sale) return null;

    const {
        items = [], gstPercent = 18, total = 0, saleTax = sale.tax || 0,
        saleSubtotal = sale.subtotal || 0, taxableAmount = sale.taxableAmount || saleSubtotal || 0,
        roundOff = 0, discountAmount = 0, discountPercent = 0, type = 'SALE'
    } = sale;

    const isVoucher = type === 'RECEIPT' || type === 'PAYMENT';
    const totalCols = isVoucher ? 6 : 8;

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

    // ── GROUP renderers (Defined inside to access local scope) ──────────────────

    const SubtotalGroup = () => (
        <React.Fragment>
            {!isVoucher && (
                <React.Fragment>
                    <tr className="subtotal-row border-top-thick">
                        <td colSpan={7} className="subtotal-label">Base Amount</td>
                        <td className="r subtotal-val font-mono">{fmt2(saleSubtotal || taxableAmount)}</td>
                    </tr>
                    {discountAmount > 0 && (
                        <React.Fragment>
                            <tr className="subtotal-row tax-row">
                                <td colSpan={7} className="subtotal-label">Discount ({discountPercent}%)</td>
                                <td className="r subtotal-val font-mono">-{fmt2(discountAmount)}</td>
                            </tr>
                            <tr className="subtotal-row">
                                <td colSpan={7} className="subtotal-label">Taxable Value</td>
                                <td className="r subtotal-val font-mono">{fmt2(taxableAmount)}</td>
                            </tr>
                        </React.Fragment>
                    )}
                    <tr className="subtotal-row tax-row">
                        <td colSpan={7} className="subtotal-label">GST ({gstPercent}%)</td>
                        <td className="r subtotal-val font-mono">+{fmt2(saleTax)}</td>
                    </tr>
                    <tr className="subtotal-row">
                        <td colSpan={7} className="subtotal-label bold-label">Rounded Off</td>
                        <td className="r subtotal-val font-mono">{roundOff >= 0 ? '+' : '-'}{fmt2(Math.abs(roundOff))}</td>
                    </tr>
                    <tr className="total-row border-bottom-thick">
                        <td colSpan={6} className="total-label">Total Invoice Value</td>
                        <td className="r total-rs">₹</td>
                        <td className="r total-val font-mono bold">{fmt2(displayTotal)}</td>
                    </tr>
                </React.Fragment>
            )}
            {isVoucher && (
                <tr className="total-row border-top-thick border-bottom-thick">
                    <td colSpan={4} className="total-label">Total</td>
                    <td className="r total-val font-mono bold">₹ {fmt2(displayTotal)}</td>
                </tr>
            )}
            <tr className="words-row">
                <td colSpan={totalCols} style={{ padding: 0 }}>
                    <div className="inv-words-inner">
                        <div className="inv-words-left">
                            <div className="meta-label">Amount Chargeable Indian Rupees (in words)</div>
                            <div className="inv-words-text">({numWords(Math.round(displayTotal))})</div>
                        </div>
                        <div className="inv-eoe">E. &amp; O.E</div>
                    </div>
                </td>
            </tr>
        </React.Fragment>
    );

    const HSNGroup = () => (
        !isVoucher && hsnGroups.length > 0 ? (
            <tr className="hsn-row">
                <td colSpan={8} style={{ padding: 0 }}>
                    <div className="hsn-container-inner">
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
                                        <td className="r font-mono">{fmt2(row.taxable)}</td>
                                        {isIGST ? (
                                            <>
                                                <td className="c">{gstPercent}%</td>
                                                <td className="r font-mono">{fmt2(row.cgstAmt + row.sgstAmt)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="c">{row.cgstRate}%</td>
                                                <td className="r font-mono">{fmt2(row.cgstAmt)}</td>
                                                <td className="c">{row.sgstRate}%</td>
                                                <td className="r font-mono">{fmt2(row.sgstAmt)}</td>
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
                                <tr className="hsn-tax-words-row">
                                    <td colSpan={isIGST ? 4 : 6}>
                                        <span className="meta-label" style={{ marginRight: 6 }}>TAX AMOUNT (IN WORDS) INR:</span>
                                        <span>({numWords(Math.round(saleTax))})</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
        ) : null
    );

    const BankGroup = () => (
        <tr className="footer-row">
            <td colSpan={totalCols} style={{ padding: 0 }}>
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
                        <div className="inv-jurisdiction">Subject to {company.jurisdiction || 'Howrah'}.</div>
                    </div>
                    <div className="footer-right">
                        <div className="sig-for">for {company.name || 'M/s. R.M. TRADING'}</div>
                        <div className="sig-line">Authorised Signatory</div>
                    </div>
                </div>
            </td>
        </tr>
    );

    // ── PAGINATION ENGINE ───────────────────────────────────────────────────
    const pages = [];
    let currentPage = { items: [], groups: [], weight: 0 };

    const pushPage = () => {
        if (currentPage.items.length > 0 || currentPage.groups.length > 0) {
            pages.push({ ...currentPage });
            currentPage = { items: [], groups: [], weight: 0 };
        }
    };

    // 1. Distribute Items
    displayItems.forEach((item, idx) => {
        if (currentPage.weight + WEIGHTS.ITEM > MAX_PAGE_UNITS) {
            pushPage();
        }
        currentPage.items.push({ ...item, originalIdx: idx + 1 });
        currentPage.weight += WEIGHTS.ITEM;
    });

    // 2. Distribute Groups
    if (!isVoucher) {
        const groupsToProcess = [
            { id: 'subtotal', weight: WEIGHTS.SUBTOTAL },
            { id: 'hsn', weight: WEIGHTS.HSN },
            { id: 'bank', weight: WEIGHTS.BANK }
        ];

        groupsToProcess.forEach(group => {
            if (currentPage.weight + group.weight > MAX_PAGE_UNITS) {
                pushPage();
            }
            currentPage.groups.push(group.id);
            currentPage.weight += group.weight;
        });
    } else {
        // Vouchers put everything on the same page
        currentPage.groups.push('subtotal', 'bank');
    }
    pushPage();

    const totalPages = pages.length;

    return (
        <div className={`inv-wrap ${sale.draft ? 'inv-draft' : ''} ${copyType === "Seller's Copy" ? 'seller-copy-start' : ''}`}>
            {pages.map((page, pageIdx) => {
                const pageNum = pageIdx + 1;
                const pageClass = pageIdx === 0 ? 'inv-print-page' : 'inv-print-page inv-page-break';

                return (
                    <div key={pageIdx} className={pageClass}>
                        <table className="main-print-table">
                            <ColGroup isVoucher={isVoucher} />
                            <tbody>
                                <InvoiceHeader
                                    sale={sale}
                                    customer={customer}
                                    company={company}
                                    copyType={copyType}
                                    pageNumber={pageNum}
                                    totalPages={totalPages}
                                    totalCols={totalCols}
                                />
                                <ColHeaders isVoucher={isVoucher} />

                                {page.items.map((item, i) => (
                                    <tr key={i} className="item-row">
                                        <td className="c">{item.originalIdx}</td>
                                        <td style={{ wordBreak: 'break-word', textAlign: 'left' }}>
                                            {item.Product?.name || item.name}
                                        </td>
                                        <td className="c">{item.hsn || '—'}</td>
                                        <td className="c">
                                            {item.size ? `${item.size} ${item.sizeUnit || item.Product?.sizeUnit || 'mm'}` : '—'}
                                        </td>
                                        {!isVoucher && (
                                            <td className="r">{item.qty ?? item.quantity} {item.unit || item.quantityUnit || 'Pcs'}</td>
                                        )}
                                        {!isVoucher && <td className="r font-mono">{fmt2(item.rate ?? item.price)}</td>}
                                        <td className="c">{item.unit || item.quantityUnit || 'Pcs'}</td>
                                        <td className="r font-mono">{fmt2(item.amount ?? item.total)}</td>
                                    </tr>
                                ))}

                                {page.groups.includes('subtotal') && <SubtotalGroup />}
                                {page.groups.includes('hsn') && <HSNGroup />}
                                {page.groups.includes('bank') && <BankGroup />}
                            </tbody>
                        </table>
                        <div className="inv-computer">This is a Computer Generated Invoice</div>
                    </div>
                );
            })}
        </div>
    );
};

export default InvoiceTemplate;