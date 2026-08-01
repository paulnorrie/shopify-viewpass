import {verifyShopifyHmac} from "./hmac.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

/**
 * Run in the Initialisation Phase (called once only during Cold Start) to cache secrets.
 */

// Initialize Secure Secrets Manager client during the initialization phase
const ssmClient = new SSMClient();
let cachedClientSecret = null;

// 2. Start the fetch immediately outside the handler
const getClientSecret = async () => {
  if (!cachedClientSecret){
    const command = new GetParameterCommand({
        Name: "/shopify/client_secret",
        WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    cachedClientSecret = response.Parameter.Value;
  }
  return cachedClientSecret;
};




/*
 AWS Lambda Entry Point for Node.js handler

 Accepts AWS Gateway HTTP API events (Payload Format 2.0):
 - event.body → raw JSON string (needed for HMAC)
 - event.headers → all HTTP headers
 - event.httpMethod → POST, GET, etc.
 - event.rawPath → route path
*/
export const handler = async (event) => {
  try {
    // Ensure the client secret has been loaded from SSM
    const secret = await getClientSecret(); 

    // Extract raw body and decode it if base64 encoded
    let rawBody = event.body || "";
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    // Validate HMAC
    if (!verifyShopifyHmac(event.headers, rawBody, secret)) {
      return {
        statusCode: 401,
        body: "Invalid HMAC signature",
      };
    }

    // Parse JSON payload (Shopify sends as application/json)
    const payload = JSON.parse(rawBody);
    console.log(`Webhook received at : ${event.rawPath}`);

    // 5. TODO: process the webhook
    // e.g. store in DynamoDB, publish to SQS, etc.

    // 6. Respond quickly (Shopify requires <5s)
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
    
  } catch (err) {
    console.error(`Error handling webhook ${event.path}: ${err});
    return {
      statusCode: 500,
      body: "Server error",
    };
  }
};