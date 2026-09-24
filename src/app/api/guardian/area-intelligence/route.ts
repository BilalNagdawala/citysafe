import { handleIntelligence } from '../intelligence/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleIntelligence(request);
}
