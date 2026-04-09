
const GST_STATE_CODES = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '26', '27', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38'
];

const validateGSTIN = (gstin) => {
  if (!gstin) return { isValid: true };
  
  const cleanGst = gstin.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  if (cleanGst.length !== 15) {
    return { isValid: false, error: `GSTIN must be exactly 15 characters long (got ${cleanGst.length})` };
  }
  
  // 1. State Code (01-38) - positions 1-2
  const stateCode = cleanGst.substring(0, 2);
  if (!/^[0-9]{2}$/.test(stateCode) || !GST_STATE_CODES.includes(stateCode)) {
    return { isValid: false, error: 'Invalid state code in positions 1-2' };
  }
  
  // 2. PAN Format (Digits 3-12) - positions 3-12
  const panPart = cleanGst.substring(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panPart)) {
    return { isValid: false, error: 'Invalid PAN format in positions 3-12' };
  }
  
  // 3. Entity Code (Digit 13) - 13th digit
  const entityCode = cleanGst[12];
  if (!/^[0-9]$/.test(entityCode)) {
    return { isValid: false, error: '13th digit must be a number' };
  }
  
  // 4. Default character (Digit 14) - 14th digit
  if (cleanGst[13] !== 'Z') {
    return { isValid: false, error: "14th digit must be 'Z'" };
  }
  
  // 5. Checksum (Digit 15) - 15th digit
  if (!/^[A-Z0-9]$/.test(cleanGst[14])) {
    return { isValid: false, error: '15th digit must be alphanumeric' };
  }
  
  return { isValid: true };
};

module.exports = { validateGSTIN };
