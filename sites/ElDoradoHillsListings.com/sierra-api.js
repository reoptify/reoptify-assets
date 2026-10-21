// Sierra API integration - Client 001

export async function updateLeadSummary(leadId, checklist, env) {
  const baseUrl = "https://api.sierrainteractivedev.com";

  const headers = {
    "Content-Type": "application/json",
    "Sierra-ApiKey": env.SIERRA_API_KEY_001,
    "Sierra-OriginatingSystemName": "REOptify",
  };

  // Step 1: Retrieve the current lead
  const getResponse = await fetch(
    `${baseUrl}/leads/get/${encodeURIComponent(leadId)}`,
    {
      method: "GET",
      headers,
    }
  );

  const getText = await getResponse.text();

  let getResult;

  try {
    getResult = JSON.parse(getText);
  } catch {
    throw new Error(
      `Sierra returned HTTP ${getResponse.status} with a non-JSON response while retrieving lead ${leadId}.`
    );
  }

  if (!getResponse.ok || getResult.success !== true) {
    throw new Error(
      getResult.errorMessage ||
        `Unable to retrieve Sierra lead ${leadId}.`
    );
  }

  const existingSummary = (getResult.data.shortSummary || "").trim();

  // Step 2: If the checklist already exists, do nothing.
  if (existingSummary.includes("LEAD QUALIFICATION CHECKLIST")) {
    return {
      success: true,
      skipped: true,
      reason: "Checklist already exists",
    };
  }

  // Step 3: Preserve anything Sierra already placed in the Summary.
  const newSummary = existingSummary
    ? `${existingSummary}\n\n${checklist}`
    : checklist;

  // Step 4: Write the checklist one time.
  const updateResponse = await fetch(
    `${baseUrl}/leads/${encodeURIComponent(leadId)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        shortSummary: newSummary,
      }),
    }
  );

  const updateText = await updateResponse.text();

  let updateResult;

  try {
    updateResult = JSON.parse(updateText);
  } catch {
    throw new Error(
      `Sierra returned HTTP ${updateResponse.status} with a non-JSON response while updating lead ${leadId}.`
    );
  }

  if (!updateResponse.ok || updateResult.success !== true) {
    throw new Error(
      updateResult.errorMessage ||
        `Sierra API update failed with status ${updateResponse.status}`
    );
  }

  return updateResult;
}


export async function convertLeadToSeller(leadId, env) {
  const baseUrl = "https://api.sierrainteractivedev.com";

  const headers = {
    "Content-Type": "application/json",
    "Sierra-ApiKey": env.SIERRA_API_KEY_001,
    "Sierra-OriginatingSystemName": "REOptify",
  };

  // Step 1: Retrieve the newly registered lead.
  const getResponse = await fetch(
    `${baseUrl}/leads/get/${encodeURIComponent(leadId)}?includeTags=true`,
    {
      method: "GET",
      headers,
    }
  );

  const getText = await getResponse.text();

  let getResult;

  try {
    getResult = JSON.parse(getText);
  } catch {
    throw new Error(
      `Sierra returned HTTP ${getResponse.status} with a non-JSON response while retrieving lead ${leadId}.`
    );
  }

  if (!getResponse.ok || getResult.success !== true) {
    throw new Error(
      getResult.errorMessage ||
        `Unable to retrieve Sierra lead ${leadId}.`
    );
  }

  const lead = getResult.data;

  // Step 2: Check the required tag and lead source.
  const hasRequiredTag =
    Array.isArray(lead.tags) &&
    lead.tags.some((tag) => {
      const tagName =
        typeof tag === "string" ? tag : tag?.name;

      return tagName === "Smart Seller Programs";
    });

  const hasRequiredSource = lead.source === "Google PPC";

console.log(
  `Seller eligibility for lead ${leadId}:`,
  JSON.stringify({
    source: lead.source ?? null,
    tags: Array.isArray(lead.tags)
      ? lead.tags.map((tag) =>
          typeof tag === "string" ? tag : tag?.name
        )
      : [],
    hasRequiredTag,
    hasRequiredSource,
  })
);
  
  if (!hasRequiredTag || !hasRequiredSource) {
    return {
      success: true,
      skipped: true,
      reason: "Lead does not meet conversion conditions",
    };
  }

  // Step 3: Update only the Lead Type to Seller.
  const updateResponse = await fetch(
    `${baseUrl}/leads/${encodeURIComponent(leadId)}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
  leadType: 2,
  leadStatus: "New",
}),
    }
  );

  const updateText = await updateResponse.text();

  let updateResult;

  try {
    updateResult = JSON.parse(updateText);
  } catch {
    throw new Error(
      `Sierra returned HTTP ${updateResponse.status} with a non-JSON response while converting lead ${leadId}.`
    );
  }

  if (!updateResponse.ok || updateResult.success !== true) {
    throw new Error(
      updateResult.errorMessage ||
        `Unable to convert Sierra lead ${leadId} to Seller.`
    );
  }

  return {
    success: true,
    converted: true,
    leadId,
  };
}
