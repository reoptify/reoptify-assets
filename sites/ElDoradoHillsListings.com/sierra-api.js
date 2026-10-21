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

  const leadUrl = `${baseUrl}/leads/${encodeURIComponent(leadId)}`;

  async function sierraRequest(url, method, body) {
    const response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Sierra returned a non-JSON response (HTTP ${response.status}).`
      );
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        result.errorMessage ||
        `Sierra API request failed (HTTP ${response.status}).`
      );
    }

    return result;
  }

  // Retrieve lead details and tags.
  const getResult = await sierraRequest(
    `${baseUrl}/leads/get/${encodeURIComponent(leadId)}?includeTags=true`,
    "GET"
  );

  const lead = getResult.data;

  // Only process qualifying Smart Seller Programs leads.
  const hasRequiredTag =
    Array.isArray(lead.tags) &&
    lead.tags.some(
      (tag) =>
        (typeof tag === "string" ? tag : tag?.name) ===
        "Smart Seller Programs"
    );

  const hasRequiredSource = lead.source === "Google PPC";

  if (!hasRequiredTag || !hasRequiredSource) {
    return {
      success: true,
      skipped: true,
      reason: "Lead does not meet conversion conditions",
    };
  }

  // Capture the existing agent before making changes.
  const agentUserId =
    lead.assignedTo?.agentUserId > 0
      ? lead.assignedTo.agentUserId
      : lead.listingAgent?.agentUserId > 0
        ? lead.listingAgent.agentUserId
        : null;

  // Step 1: Change Lead Type to Seller.
  await sierraRequest(leadUrl, "PUT", {
    leadType: 2,
  });

  // Step 2: Assign the existing agent as Listing Agent.
  if (agentUserId) {
    await sierraRequest(leadUrl, "PUT", {
      leadType: 2,
      assignTo: {
        agentUserId,
      },
    });
  }

  // Step 3: Set Lead Status to New.
  await sierraRequest(leadUrl, "PUT", {
    leadType: 2,
    leadStatus: "New",
  });

  return {
    success: true,
    converted: true,
    leadId,
    agentUserId,
  };
}

