import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { EkycScanResult } from '../tenant/tenant.types';

export const EKYC_CONSENT_VERSION = 'PRIVACY-2026.10-v1';

export interface EkycScanPayload {
  viewingId: string;
  fields: EkycScanResult['fields'];
  confidence: Record<keyof EkycScanResult['fields'], number>;
  lowConfidenceKeys: string[];
  faceMatch: number;
  consentAt: string;
  consentVersion: string;
  exp: number; // Unix timestamp in seconds
  jti: string;
}

export class EkycSimulator {
  private static getSecret(): string {
    return (
      process.env.EKYC_SCAN_SECRET ||
      process.env.JWT_SECRET ||
      'dev_ekyc_scan_secret_vinstay_p010'
    );
  }

  static scan(contactName?: string, contactPhone?: string): Omit<EkycScanResult, 'scanId'> {
    const rawName = (contactName || 'NGUYỄN VĂN AN').trim();
    const fullName = rawName.toUpperCase();
    const cleanPhone = (contactPhone || '0912345678').replace(/\D/g, '');
    const idNumber = '001' + cleanPhone.slice(-9).padStart(9, '7');
    const dob = '12/04/2001';
    const issuedDate = '18/08/2021';
    const address = 'Số 18, Ngõ 42, Phố Vọng, Phường Phương Mai, Quận Đống Đa, Hà Nội';

    const confidence: Record<keyof EkycScanResult['fields'], number> = {
      fullName: 0.99,
      idNumber: 0.98,
      dob: 0.97,
      issuedDate: 0.94,
      address: 0.78,
    };

    const lowConfidenceKeys = Object.entries(confidence)
      .filter(([_, score]) => score < 0.85)
      .map(([key]) => key);

    return {
      fields: {
        fullName,
        idNumber,
        dob,
        issuedDate,
        address,
      },
      confidence,
      lowConfidenceKeys,
      faceMatch: 0.96,
      simulated: true,
    };
  }

  static createScanToken(
    viewingId: string,
    scanData: Omit<EkycScanResult, 'scanId'>,
    consentVersion: string,
    ttlSeconds: number = 15 * 60,
  ): string {
    const payload: EkycScanPayload = {
      viewingId,
      fields: scanData.fields,
      confidence: scanData.confidence,
      lowConfidenceKeys: scanData.lowConfidenceKeys,
      faceMatch: scanData.faceMatch,
      consentAt: new Date().toISOString(),
      consentVersion,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      jti: randomBytes(16).toString('hex'),
    };

    const secret = this.getSecret();
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(payloadB64).digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  static verifyScanToken(token: string): EkycScanPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const secret = this.getSecret();
    const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    try {
      const payload: EkycScanPayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      );
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}
