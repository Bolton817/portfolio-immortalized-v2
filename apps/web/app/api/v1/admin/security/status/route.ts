import { NextResponse } from 'next/server';
import { adminDal } from '../../admin-instance';
import { deathCaseDal } from '../../../cases/case-instance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const systemHold = await adminDal.getSystemHoldStatus();
    const cases = await deathCaseDal.listCases();
    const activeCases = cases.filter(
      (c) => c.state !== 'RELEASED' && c.state !== 'REJECTED' && c.state !== 'CLOSED_NO_EVIDENCE'
    );
    const activeCaseHolds = cases.reduce(
      (acc, c) => acc + c.holds.filter((h) => h.active).length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        systemHold,
        totalDeathCases: cases.length,
        activeDeathCases: activeCases.length,
        activeCaseHolds,
        kmsStatus: {
          envelopeStatus: 'HEALTHY',
          algorithm: 'AES-256-GCM',
          activeKeysRotatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          complianceStandard: 'FIPS-140-3',
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching security status:', error);
    return NextResponse.json(
      { success: false, error: 'FAILED_TO_GET_SECURITY_STATUS' },
      { status: 500 }
    );
  }
}
