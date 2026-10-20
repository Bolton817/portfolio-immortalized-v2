import { NextRequest, NextResponse } from 'next/server';
import { makeReleaseGrantId, makeAssetId } from '@portfolio-immortalized/domain';
import { DalAuthorizationError } from '@portfolio-immortalized/server';
import { releaseService } from '@/app/api/v1/cases/case-instance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { id, assetId } = await params;
    const requesterId = req.headers.get('x-user-id') || 'beneficiary_demo';

    const downloaded = await releaseService.downloadReleasedAsset(
      makeReleaseGrantId(id),
      requesterId,
      makeAssetId(assetId)
    );

    const filename = downloaded.title.includes('.')
      ? downloaded.title
      : `${downloaded.title}.pdf`;

    return new NextResponse(new Uint8Array(downloaded.plaintext), {
      status: 200,
      headers: {
        'Content-Type': downloaded.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': downloaded.plaintext.length.toString(),
        'X-Asset-SHA256': downloaded.sha256,
        'X-Asset-Version': downloaded.versionNumber.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    if (error instanceof DalAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    console.error('Error downloading released asset:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
