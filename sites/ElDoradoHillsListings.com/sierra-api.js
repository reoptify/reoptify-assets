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
        shortSummary: shortSummary,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.errorMessage ||
        `Sierra API request failed with status ${response.status}`
    );
  }

  return result;
}
