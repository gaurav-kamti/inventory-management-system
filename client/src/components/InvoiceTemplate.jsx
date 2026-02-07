import React from 'react';
import { round2, numberToWords } from '../utils/invoiceUtils';

const InvoiceTemplate = ({ sale, customer, company = {} }) => {
    if (!sale) return null;

    const {
        invoiceNumber,
        date,
        items = [],
        subtotal = 0,
        tax = 0,
        cgst = 0,
        sgst = 0,
        igst = 0,
        roundOff = 0,
        total = 0,
        amountPaid = 0,
        amountDue = 0,
        deliveryNote,
        paymentTerms,
        supplierRef,
        buyerOrderNo,
        buyerOrderDate,
        despatchedThrough,
        termsOfDelivery,
        notes,
        type = 'SALE',
        mode
    } = sale;

    const defaultCompany = {
        name: 'YOUR COMPANY NAME',
        address: '123 Business Street, City, State, ZIP',
        gstin: '19ABCDE1234F1Z5',
        phone: '+91 9876543210',
        email: 'contact@company.com',
        ...company
    };

    const isPurchase = type === 'PURCHASE';
    const isReceipt = type === 'RECEIPT';
    const isPayment = type === 'PAYMENT';
    const isVoucher = isReceipt || isPayment;

    const title = isPurchase ? 'PURCHASE BILL' : (isReceipt ? 'RECEIPT VOUCHER' : (isPayment ? 'PAYMENT VOUCHER' : 'TAX INVOICE'));

    // Labels
    const companyLabel = isPurchase ? 'Buyer' : (isReceipt ? 'Received By' : (isPayment ? 'Paid By' : 'Seller'));
    const otherPartyLabel = isPurchase ? 'Seller (Supplier)' : (isReceipt ? 'Received From' : (isPayment ? 'Paid To' : 'Buyer'));

    // Voucher Item Mocking
    const displayItems = isVoucher ? [{
        name: `Being amount ${isReceipt ? 'received' : 'paid'} via ${mode || 'Cash'} ${notes ? `(${notes})` : ''}`,
        hsn: '-',
        gst: 0,
        quantity: 1,
        price: total || sale.amount,
        total: total || sale.amount,
        quantityUnit: 'Nos'
    }] : items;

    const displayTotal = isVoucher ? (sale.amount || total) : total;

    return (
        <div id="invoice-print-template" style={{
            padding: '40px',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            maxWidth: '900px',
            margin: '0 auto',
            border: '1px solid #ddd',
            fontSize: '12px',
            lineHeight: '1.4'
        }}>
            {/* Header / Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{title}</h1>
            </div>

            {/* Company & Invoice Info */}
            <div style={{ display: 'flex', border: '1px solid #000' }}>
                <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #000' }}>
                    <small style={{ color: '#666', textTransform: 'uppercase' }}>{companyLabel}</small>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{defaultCompany.name}</h3>
                    <p style={{ margin: 0 }}>{defaultCompany.address}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>GSTIN/UIN:</strong> {defaultCompany.gstin}</p>
                    <p style={{ margin: 0 }}><strong>Phone:</strong> {defaultCompany.phone}</p>
                    <p style={{ margin: 0 }}><strong>Email:</strong> {defaultCompany.email}</p>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                        <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                            <strong>{isVoucher ? 'Voucher No.' : 'Invoice No.'}</strong><br />
                            {invoiceNumber || sale.id || 'N/A'}
                        </div>
                        <div style={{ flex: 1, padding: '5px' }}>
                            <strong>Dated</strong><br />
                            {new Date(date || sale.createdAt || Date.now()).toLocaleDateString('en-GB')}
                        </div>
                    </div>
                    {!isVoucher && (
                        <>
                            <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                                <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                                    <strong>Delivery Note</strong><br />
                                    {deliveryNote || 'N/A'}
                                </div>
                                <div style={{ flex: 1, padding: '5px' }}>
                                    <strong>Mode/Terms of Payment</strong><br />
                                    {paymentTerms || (amountDue > 0 ? 'Credit' : 'Cash')}
                                </div>
                            </div>
                            <div style={{ display: 'flex' }}>
                                <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                                    <strong>Supplier's Ref.</strong><br />
                                    {supplierRef || 'N/A'}
                                </div>
                                <div style={{ flex: 1, padding: '5px' }}>
                                    <strong>Other Reference(s)</strong><br />
                                    N/A
                                </div>
                            </div>
                        </>
                    )}
                    {isVoucher && (
                        <div style={{ display: 'flex' }}>
                            <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                                <strong>Mode</strong><br />
                                {mode || 'Cash'}
                            </div>
                            <div style={{ flex: 1, padding: '5px' }}>
                                <strong>Reference</strong><br />
                                {notes || 'N/A'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Other Party Info */}
            <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none' }}>
                <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #000' }}>
                    <small style={{ color: '#666', textTransform: 'uppercase' }}>{otherPartyLabel}</small>
                    <h3 style={{ margin: '5px 0', fontSize: '14px' }}>{customer?.name || sale.partyName || 'Cash Sale'}</h3>
                    <p style={{ margin: 0 }}>{customer?.address || 'N/A'}</p>
                    <p style={{ margin: '5px 0 0 0' }}><strong>GSTIN/UIN:</strong> {customer?.gstNumber || 'Unregistered'}</p>
                    <p style={{ margin: 0 }}><strong>State Name:</strong> {customer?.state || 'N/A'}, <strong>Code:</strong> {customer?.stateCode || 'N/A'}</p>
                </div>
                {!isVoucher && (
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                            <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                                <strong>Buyer's Order No.</strong><br />
                                {buyerOrderNo || 'N/A'}
                            </div>
                            <div style={{ flex: 1, padding: '5px' }}>
                                <strong>Dated</strong><br />
                                {buyerOrderDate ? new Date(buyerOrderDate).toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                            <div style={{ flex: 1, padding: '5px', borderRight: '1px solid #000' }}>
                                <strong>Despatched through</strong><br />
                                {despatchedThrough || 'N/A'}
                            </div>
                            <div style={{ flex: 1, padding: '5px' }}>
                                <strong>Destination</strong><br />
                                N/A
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '5px' }}>
                            <strong>Terms of Delivery</strong><br />
                            {termsOfDelivery || 'N/A'}
                        </div>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
                <thead>
                    <tr style={{ background: '#f2f2f2' }}>
                        <th style={{ border: '1px solid #000', padding: '5px', width: '40px' }}>Sl No.</th>
                        <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'left' }}>Description</th>
                        <th style={{ border: '1px solid #000', padding: '5px', width: '80px' }}>HSN/SAC</th>
                        {!isVoucher && <th style={{ border: '1px solid #000', padding: '5px', width: '60px' }}>GST Rate</th>}
                        {!isVoucher && <th style={{ border: '1px solid #000', padding: '5px', width: '80px' }}>Quantity</th>}
                        {!isVoucher && <th style={{ border: '1px solid #000', padding: '5px', width: '80px' }}>Rate</th>}
                        {!isVoucher && <th style={{ border: '1px solid #000', padding: '5px', width: '50px' }}>per</th>}
                        <th style={{ border: '1px solid #000', padding: '5px', width: '100px', textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item, idx) => (
                        <tr key={idx} style={{ height: '30px' }}>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px' }}>{item.Product?.name || item.name}</td>
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.hsn}</td>
                            {!isVoucher && <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.gst}%</td>}
                            {!isVoucher && <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.quantity} {item.quantityUnit || 'Pcs'}</td>}
                            {!isVoucher && <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.price || item.rate).toFixed(2)}</td>}
                            {!isVoucher && <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.quantityUnit || 'Pcs'}</td>}
                            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>{parseFloat(item.total || item.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Totals */}
                    <tr>
                        <td colSpan={isVoucher ? 3 : 7} style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>Total</td>
                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>₹{parseFloat(displayTotal).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Tax Breakdown */}
            <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none' }}>
                <div style={{ flex: 1.5, padding: '10px' }}>
                    <strong>Amount Chargeable (in words)</strong><br />
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{numberToWords(Math.round(displayTotal))}</span>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid #000' }}>
                    {!isVoucher && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px', marginTop: '5px' }}>
                                <span>CGST</span>
                                <span>{parseFloat(cgst).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}>
                                <span>SGST</span>
                                <span>{parseFloat(sgst).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}>
                                <span>IGST</span>
                                <span>{parseFloat(igst).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}>
                                <span>Round Off</span>
                                <span>{parseFloat(roundOff).toFixed(2)}</span>
                            </div>
                        </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderTop: '1px solid #000', fontWeight: 'bold', fontSize: '14px', background: '#f2f2f2' }}>
                        <span>Total</span>
                        <span>₹{parseFloat(displayTotal).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Declaration & Signature */}
            <div style={{ display: 'flex', border: '1px solid #000', borderTop: 'none', minHeight: '100px' }}>
                <div style={{ flex: 1, padding: '10px', borderRight: '1px solid #000' }}>
                    <strong>Declaration:</strong><br />
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <strong>for {defaultCompany.name}</strong>
                    <div style={{ marginTop: '40px' }}>
                        <br />
                        <span>Authorised Signatory</span>
                    </div>
                </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>This is a Computer Generated Invoice</p>
        </div>
    );
};

export default InvoiceTemplate;
