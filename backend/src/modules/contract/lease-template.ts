export const LEASE_TEMPLATE_VERSION = 'LEASE-2026.10-v1';

export interface LeaseTemplateData {
  contractNumber: string;
  establishedDate: string; // DD/MM/YYYY
  unit: {
    unitCode: string;
    buildingCode: string;
    floorNumber: number;
    doorNumber: string;
    carpetAreaM2: number;
    layoutType: string;
    furnishing: string;
    amenities: string[];
    managementFee: number;
    parkingFeeEstimate: number;
    utilityCostEstimate: number;
  };
  landlord: {
    fullName: string;
    phoneMasked: string; // "[đã mã hoá bảo mật]"
    bankAccountMasked: string; // "[cung cấp qua nền tảng]"
    mandateContractNumber?: string;
  };
  tenant: {
    fullName: string;
    idNumber: string;
    dob: string;
    issuedDate: string;
    address: string;
    contactPhone: string;
  };
  terms: {
    leaseTermMonths: number;
    startDate: string; // DD/MM/YYYY
    endDate: string; // DD/MM/YYYY
    monthlyRentPrice: number;
    paymentCycleMonths: number;
    securityDepositAmount: number;
    convertedHoldingAmount: number; // 2000000
    depositTopUp: number;
    firstRentAmount: number;
    totalFirstPayment: number;
    firstPaymentTransferContent: string;
  };
  deposit: {
    depositCode: string;
    amount: number;
    transferContent: string;
    paidAt: string;
    holdHours: number;
    expiresAt: string;
    termsVersion: string;
    termsAcceptedAt: string;
  };
  verifiedAt: string;
}
