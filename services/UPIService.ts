// services/UPIService.ts
// Generates UPI payment deeplinks and QR data strings.
// Pure client-side — no backend needed. Works offline.
// Spec: https://www.npci.org.in/PDF/npci/upi/circular-and-guidelines/UPI-Linking-Specs-ver-1.6.pdf

import { UPIParams } from '@/types';

export function generateUPILink(params: UPIParams): string {
  const {
    vpa,           // e.g. "shopkeeper@upi"
    name,          // Payee display name
    amount,        // INR, 2 decimal places
    description,   // Transaction note
    transactionId, // Unique ID for reconciliation
  } = params;

  const amountStr = amount.toFixed(2);

  // UPI URL scheme (NPCI standard)
  const urlParams = new URLSearchParams({
    pa:  vpa,
    pn:  name,
    am:  amountStr,
    tn:  description,
    tr:  transactionId,
    cu:  'INR',
    mc:  '5411',  // MCC for grocery stores
  });

  return `upi://pay?${urlParams.toString()}`;
}

// Returns the string to encode into a QR code
// Pass this to react-native-qrcode-svg's value prop
export function generateQRValue(params: UPIParams): string {
  return generateUPILink(params);
}

// Generate a simple unique transaction ID
export function generateTransactionId(): string {
  const ts     = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BS${ts}${random}`;
}

// Format ₹ amount for display — Indian numbering system
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
