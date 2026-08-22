/**
 * @file AWS Lambda entry point for calls routed via AWS API Gateway.
 * @description The API Gateway has pre-defined routes it accepts and all such routes lead here.
 * The `route` function is where the most interesting action happens.
 */

import {authenticate} from "./shopify_auth.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {getProduct, postProduct} from "./products.js"
import { issueLicence, getLicences } from "./licences.js";


// initialize Secure Secrets Manager client during the initialization phase
const ssmClient = new SSMClient();
let cachedClientSecret = null;
let cachedClientId = null;


/**
 * AWS Lambda Entry Point for Node.js handler
 *  
 * @param {object} event AWS API Gateway HTTP API Events (Payload Format 2.0)
 * 
 * @returns a JSON Object with the body as a string
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
        case 'GET':
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
            console.log('Authenticated');
            
            // handle the request depending on the route
            const params = event.pathParameters || {};
            const routeKey = event.routeKey; 
            const result = await route(routeKey, params, rawBody);
            return addAccessControlHeadersTo({
                statusCode: result.statusCode,
                body: JSON.stringify(result.body),
            });
            break;
        
        default:
            return addAccessControlHeadersTo({
                statusCode: 405,
                body: JSON.stringify({ ok: false }),
            });
    }
    
  } catch (err) {
    console.error(`Error handling request ${event}: ${err}`);
    return addAccessControlHeadersTo({
      statusCode: 500,
      body: "Server error",
    });   
  }
}


/**
 * Get the Shopify Client Secret from the Secure Secrets Manager. 
 * This is cached between calls to the same lambda instance.
 */
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


/**
 * Get the Shopify Client Id from the Secure Secrets Manager. 
 * This is cached between calls to the same lambda instance.
 */
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
 * Handle HTTP OPTIONS request
 */
const handleOptions = () => {
    console.log(`OPTIONS`);
    return addAccessControlHeadersTo({
       statusCode: 204,
       body: JSON.stringify({ ok: true }),
    });
}


/**
 * Add standard Access-Control-Allow-x headers to a response sent to the API Gateway.
 */
const addAccessControlHeadersTo = (obj) => {
    if (obj) {
        obj.headers ??= {}; 
        Object.assign(obj.headers, {
            "Access-Control-Allow-Origin": "https://extensions.shopifycdn.com",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Topic, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256, X-Shopify-Api-Client-Id",
        });
    }
    return obj;
}


/**
 * Route API Gateway Routes     
 * 
 * @param {string} routeKey from the API Gateway
 * @param {object} params from any API Gateway {variable} in the route
 * @param {string} body of the request as object, string, nu
 * 
 * @returns {object} containing statusCode and body (doesn't need to be string)
 */
const route = async (routeKey, params, body) => {
    console.log(`Routing ${routeKey} with ${JSON.stringify(params)}\n${body}`);
    try {
        switch (routeKey) {
            case "GET /products/{productId+}": {
                const product = await getProduct(params.productId);
                if (product) {
                    return {statusCode:200, body:product};
                } else {
                    return {statusCode:404, body:"Not Found"};
                }
                break;
            }

            case "POST /products/{productId+}": {
                //const videos = JSON.parse(body)?.videos || [];
                const product = JSON.parse(body);
                const ok = await postProduct(String(params.productId), product);
                return {statusCode:200, body:""};
                break;
            }

            case "POST /webhooks/orders/paid": {
                console.log(`Orders/paid webhook with body ${body}`);
                const payload = JSON.parse(body);
                const customerId = String(payload?.customer?.id);
                for (const lineItem of payload?.line_items) {
                    console.log(`Issue Licence for customer id ${customerId}, product ${lineItem.product_id}`);
                    await issueLicence(customerId, String(lineItem.product_id));
                }
                
                return {statusCode:200, body:""};
                break;
            }

            case "POST /webhooks/orders/refund": {
            }

            case "GET /myvideos/{customerId}": {
                console.log(`MyVideos for ${params.customerId}`);
                const licences = await getLicences(params.customerId);
                return {statusCode:200, body:licences};
            }


            default:
                return {statusCode:404, body:"Not Found"};
        }
    } catch (error) {
        console.error(`Error: ${error}`)
        return {statusCode:500, body: "Server Error"};
    }
    
}