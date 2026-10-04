export interface VietQrAccount {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  simulated: true;
}

export class VietQrSimulator {
  static account(): VietQrAccount {
    return {
      bankBin: process.env.VIETQR_BANK_BIN || '970436',
      bankName: process.env.VIETQR_BANK_NAME || 'Vietcombank',
      accountNo: process.env.VIETQR_ACCOUNT_NO || '0000000000',
      accountName: process.env.VIETQR_ACCOUNT_NAME || 'CONG TY CO PHAN CONG NGHE VINSTAY AI',
      simulated: true,
    };
  }
}
