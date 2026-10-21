import { convertLeadToSeller } from "../../../../sites/ElDoradoHillsListings.com/sierra-api.js";

export async function onRequestPost({ request, env }) {
  const token = request.headers.get("X-Test-Token");

  if (
    !env.SIERRA_TEST_TOKEN_001 ||
    token !== env.SIERRA_TEST_TOKEN_001
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const leadId = body?.leadId;

  if (!Number.isSafeInteger(leadId) || leadId <= 0) {
    return Response.json(
      { error: "A numeric leadId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await convertLeadToSeller(leadId, env);

    return Response.json({
      leadId,
      ...result
    });
  } catch (error) {
    console.error("Seller conversion test failed:", error);

    return Response.json(
      { error: "Conversion failed. Check Cloudflare logs." },
      { status: 500 }
    );
  }
}
