// Sierra API integration - Client 001

import { handleSierraWebhook } from "../../../../sites/ElDoradoHillsListings.com/webhook.js";

export async function onRequestPost(context) {
  return handleSierraWebhook(
    context.request,
    context.env
  );
}

export function onRequestGet() {
  return new Response("REOptify Sierra Webhook - Client 001", {
    status: 200,
  });
}
