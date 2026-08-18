// Sierra API integration - Client 001

export async function updateLeadSummary(leadId, shortSummary, env) {
  const baseUrl = "https://api.sierrainteractivedev.com";

  const response = await fetch(
    `${baseUrl}/leads/${encodeURIComponent(leadId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Sierra-ApiKey": env.SIERRA_API_KEY_001,
        "Sierra-OriginatingSystemName": "REOptify",
      },
      body: JSON.stringify({
        shortSummary,
      }),
    }
  );

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Sierra returned HTTP ${response.status} with a non-JSON response: ${responseText.slice(0, 200)}`
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.errorMessage ||
        `Sierra API request failed with status ${response.status}`
    );
  }

  return result;
}
