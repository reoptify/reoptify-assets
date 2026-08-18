import { handleSierraWebhook } from "../../../../sites/ElDoradoHillsListings.com/webhook.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "GET") {
    return new Response("REOptify Sierra Webhook - Client 001", {
      status: 200,
    });
  }

  if (request.method === "POST") {
    return handleSierraWebhook(request, env);
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      Allow: "GET, POST",
    },
  });
}
