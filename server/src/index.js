import {authenticate} from "./shopify_auth.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

/**
 * Run in the Initialisation Phase (called once only during Cold Start) to cache secrets.
 */

// Initialize Secure Secrets Manager client during the initialization phase
const ssmClient = new SSMClient();
let cachedClientSecret = null;
let cachedClientId = null;

// 2. Start the fetch immediately outside the handler
const getClientSecret = async () => {
  if (!cachedClientSecret){
    const command = new GetParameterCommand({
        Name: "/shopify/secret",
        WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    cachedClientSecret = response.Parameter.Value;
  }
  return cachedClientSecret;
};

const getClientId = async () => {
  if (!cachedClientId){
    const command = new GetParameterCommand({
        Name: "/shopify/client_id",
        WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    cachedClientId = response.Parameter.Value;
  }
  return cachedClientId;
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

    // Ensure the client secret and id has been loaded from SSM
    const secret = await getClientSecret(); 
    const clientId = await getClientId(); 

    console.log(`Welcome to the lambda\n${secret}\n${clientId}`);

    const httpMethod = event.requestContext?.http?.method;
    switch(httpMethod){
        case 'OPTIONS':
            return handleOptions();
        case 'POST':
            return handlePost(event, clientId, secret);
        case 'GET':
            return handleGet(event, clientId, secret);
        default:
            return {
                statusCode: 405,
                    headers: {
                    "Access-Control-Allow-Origin": "*", // "https://extensions.shopifycdn.com"
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Shopify-Api-Client-Id",
                    },
                body: JSON.stringify({ ok: false }),
            };
    }
    
  } catch (err) {
    console.error(`Error handling request ${event}: ${err}`);
    return {
      statusCode: 500,
      body: "Server error",
    };   
  }
}



/*
 * Handle HTTP OPTIONS request
 */
const handleOptions = () => {
    console.log(`OPTIONS`);
    return {
      statusCode: 204,
       headers: {
          "Access-Control-Allow-Origin": "*", // "https://extensions.shopifycdn.com"
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Shopify-Api-Client-Id",
        },
      body: JSON.stringify({ ok: true }),
    };
}



/**
 * 
 * @param {object} event 
 * @param {string} secret 
 */
const handleGet = (event, clientId, secret) => {

    console.log(`GET: ${JSON.stringify(event)}`);

    let rawBody = event.body || "";
    if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    if (!authenticate(event.headers, rawBody,clientId, secret)) {
      return {
        statusCode: 401,
        body: "Invalid HMAC signature or JWT Token",
      };
    }
    console.log('authenticate good');
    
    return {
      statusCode: 200,
       headers: {
          "Access-Control-Allow-Origin": "*", // "https://extensions.shopifycdn.com"
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Shopify-Api-Client-Id",
        },
      body: JSON.stringify({ ok: true }),
    };

}




/**
 * Handle HTTP POST Requests
 * @param {object} event 
 * @param {string} secret 
 * @returns 
 */
const handlePost = (event, clientId, secret) => {
    
    console.log(`POST: ${JSON.stringify(event)}`);
    let rawBody = event.body || "";
    if (event.isBase64Encoded) {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    if (!authenticate(event.headers, rawBody, clientId, secret)) {
      return {
        statusCode: 401,
        body: "Invalid HMAC signature or JWT Token",
      };
    }
    
    return {
      statusCode: 200,
       headers: {
          "Access-Control-Allow-Origin": "*", // "https://extensions.shopifycdn.com"
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Shopify-Api-Client-Id",
        },
      body: JSON.stringify({ ok: true }),
    };

}