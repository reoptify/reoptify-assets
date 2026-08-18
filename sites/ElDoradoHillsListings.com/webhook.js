import { LEAD_QUALIFICATION_CHECKLIST } from "./constants.js";
import { updateLeadSummary } from "./sierra-api.js";

export async function handleSierraWebhook(request, env) {
  try {
    const payload = await request.json();

    // Ignore any Sierra event other than a newly created lead.
    if (payload.eventType !== "LeadCreated") {
      return new Response("Ignored", { status: 200 });
    }

    const leadIds = payload.resourceList;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response("No lead ID supplied", { status: 400 });
    }

    for (const leadId of leadIds) {
      await updateLeadSummary(
        leadId,
        LEAD_QUALIFICATION_CHECKLIST,
        env
      );
    }

    return new Response("Lead summary initialized", { status: 200 });
  } catch (error) {
    console.error("Sierra webhook error:", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}
