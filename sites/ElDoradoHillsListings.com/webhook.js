
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
        return;
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        await wait(RETRY_DELAYS_MS[attempt]);
      }
    } catch (error) {
      console.error(
        `Seller conversion failed for lead ${leadId}:`,
        error
      );
      return;
    }
  }

  console.warn(
    `Seller conversion skipped after all retries for lead ${leadId}`
  );
}

async function processLead(leadId, env) {
  // Add the qualification checklist.
  try {
    const result = await updateLeadSummary(
      leadId,
      LEAD_QUALIFICATION_CHECKLIST,
      env
    );

    console.log(
      `Checklist result for lead ${leadId}:`,
      JSON.stringify(result)
    );
  } catch (error) {
    console.error(
      `Checklist failed for lead ${leadId}:`,
      error
    );
  }

  // Convert qualifying leads to Seller.
  await processSellerConversion(leadId, env);
}

export async function handleSierraWebhook(request, env, context) {
  try {
    const payload = await request.json();

    if (payload.eventType !== "LeadCreated") {
      return new Response("Ignored", { status: 200 });
    }

    const leadIds = payload.resourceList;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return new Response("No lead ID supplied", { status: 400 });
    }

    if (typeof context?.waitUntil !== "function") {
      console.error("Cloudflare waitUntil unavailable");
      return new Response(
        "Background processing unavailable",
        { status: 500 }
      );
    }

    context.waitUntil(
      (async () => {
        for (const leadId of leadIds) {
          try {
            await processLead(leadId, env);
          } catch (error) {
            console.error(
              `Processing failed for lead ${leadId}:`,
              error
            );
          }
        }
      })()
    );

    return new Response("LeadCreated accepted", {
      status: 200,
    });
  } catch (error) {
    console.error("Sierra webhook error:", error);

    return new Response("Webhook processing failed", {
      status: 500,
    });
  }
}
