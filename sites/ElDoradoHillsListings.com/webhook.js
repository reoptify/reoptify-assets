
import { LEAD_QUALIFICATION_CHECKLIST } from "./constants.js";
import {
  updateLeadSummary,
  convertLeadToSeller,
} from "./sierra-api.js";

const RETRY_DELAYS_MS = [2000, 4000, 6000];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processSellerConversion(leadId, env) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await convertLeadToSeller(leadId, env);

      console.log(
        `Seller conversion attempt ${attempt + 1} for lead ${leadId}:`,
        JSON.stringify(result)
      );

      if (!result.skipped) {
        return result;
      }

      // The lead may still be receiving its source,
      // tags, or initial agent assignment.
      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
      }
    } catch (error) {
      console.error(
        `Seller conversion attempt ${attempt + 1} failed for lead ${leadId}:`,
        error
      );

      // Stop on API errors rather than repeating
      // potentially successful updates.
      return {
        success: false,
        error: error.message,
      };
    }
  }

  console.log(
    `Seller conversion skipped after retries for lead ${leadId}.`
  );

  return {
    success: true,
    skipped: true,
    reason: "Conversion conditions not met after retries",
  };
}

export async function handleSierraWebhook(request, env) {
  try {
    const payload = await request.json();

    if (payload.eventType !== "LeadCreated") {
      return new Response("Ignored", { status: 200 });
    }

    const leadIds = payload.resourceList;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response("No lead ID supplied", { status: 400 });
    }

    for (const leadId of leadIds) {
      // Step 1: Add the qualification checklist.
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

      // Step 2: Convert qualifying Seller leads.
      try {
        await processSellerConversion(leadId, env);
      } catch (error) {
        console.error(
          `Seller processing failed for lead ${leadId}:`,
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
