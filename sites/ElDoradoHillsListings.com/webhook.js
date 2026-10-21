
import { LEAD_QUALIFICATION_CHECKLIST } from "./constants.js";

import {
  updateLeadSummary,
  convertLeadToSeller,
} from "./sierra-api.js";

export async function handleSierraWebhook(request, env) {
  try {
    const payload = await request.json();

    // Process newly registered leads only.
    if (payload.eventType !== "LeadCreated") {
      return new Response("Ignored", { status: 200 });
    }

    const leadIds = payload.resourceList;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response("No lead ID supplied", {
        status: 400,
      });
    }

    for (const leadId of leadIds) {

      // Step 1: Initialize the qualification checklist.
      try {
        await updateLeadSummary(
          leadId,
          LEAD_QUALIFICATION_CHECKLIST,
          env
        );
      } catch (error) {
        console.error(
          `Checklist failed for lead ${leadId}:`,
          error
        );
      }

      // Step 2: Convert eligible leads to Seller.
      try {
        const result = await convertLeadToSeller(
          leadId,
          env
        );

        console.log(
          `Seller conversion result for lead ${leadId}:`,
          JSON.stringify(result)
        );

      } catch (error) {
        console.error(
          `Seller conversion failed for lead ${leadId}:`,
          error
        );
      }
    }

    return new Response(
      "Lead processing completed",
      { status: 200 }
    );

  } catch (error) {
    console.error("Sierra webhook error:", error);

    return new Response(
      "Webhook processing failed",
      { status: 500 }
    );
  }
}
