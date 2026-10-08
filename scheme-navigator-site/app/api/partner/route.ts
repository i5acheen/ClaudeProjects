import type { NextRequest } from 'next/server';
import { handleSubmission } from '@/lib/server/submit';
import { partnerSchema } from '@/lib/server/schemas';

export async function POST(req: NextRequest) {
  return handleSubmission(req, 'partner', partnerSchema);
}
