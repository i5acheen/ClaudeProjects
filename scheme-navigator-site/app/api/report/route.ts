import type { NextRequest } from 'next/server';
import { handleSubmission } from '@/lib/server/submit';
import { reportSchema } from '@/lib/server/schemas';

export async function POST(req: NextRequest) {
  return handleSubmission(req, 'report', reportSchema);
}
