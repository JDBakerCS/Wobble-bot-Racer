import { env } from "cloudflare:workers";
import { handleGameRequest } from "../../../../backend/server/game/handler.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleGameRequest(request, env.DB);
}
