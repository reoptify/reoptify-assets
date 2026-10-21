
import { LEAD_QUALIFICATION_CHECKLIST } from "./constants.js";
import {
  updateLeadSummary,
  convertLeadToSeller,
} from "./sierra-api.js";

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
      // Step 1: Initialize the Lead Qualification Checklist.
      await updateLeadSummary(
        leadId,
        LEAD_QUALIFICATION_CHECKLIST,
        env
      );

      // Step 2: Convert qualifying leads to Seller.
      await convertLeadToSeller(leadId, env);
    }

    return new Response(
      "Lead summary initialized and conversion checked",
      { status: 200 }
    );
  } catch (error) {
    console.error("Sierra webhook error:", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}
