/**
 * @file AWS Lambda entry point for calls routed via AWS API Gateway.
 * 
 * @description The API Gateway has pre-defined routes it accepts and all such routes lead here.
 * The `route` function is where the most interesting action happens.
 */

import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger, logStorage } from "./logger.js";
import { route } from "./route.js";


// initialize Secure Secrets Manager client during the initialization phase
const ssmClient = new SSMClient();
let cachedClientSecret = null;
let cachedClientId = null;



/**
 * AWS Lambda Entry Point for Node.js handler
 *  
 * @param {object} event AWS API Gateway HTTP API Events (Payload Format 2.0)
 * 
 * @returns a JSON Object with the body as a string required by API HTTP Gateway
 */
export const handler = async (event, context) => {
  
    // run function so as to automatically log AWS Request Id's in all loggers so
    // logs can reflect which entry is for which request.
    return await logStorage.run({ awsRequestId: context.awsRequestId }, async () => {
        try {
            // Ensure the client secret and id has been loaded from SSM
            const secret = await getClientSecret(); 
            const clientId = await getClientId(); 

            // parse request from HTTP Gateway
            const httpMethod = event.requestContext?.http?.method;
            const params = event.pathParameters || {};
            const routeKey = event.routeKey; 
            const queryParams = event.queryStringParameters || {};
            let rawBody = event.body || "";
            if (event.isBase64Encoded) {
                // eslint-disable-next-line no-undef
                rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
            }

            if (httpMethod == "OPTIONS") {
                const result = {statusCode: 204}; // handle CORS Options pre-flight
                return normalise(result);
            } else {
                const result = await route(routeKey, params, event.headers, rawBody, queryParams, clientId, secret);
                return normalise(result);  
            }

        } catch (err) {
            logger.error(`Error handling request ${event.routeKey}: ${err}\n\nEvent:${JSON.stringify(event)}`);
            return normalise({
                statusCode: 500,
                body: "Server error",
            }); 
        }  
    });      
};




/**
 * Get the Shopify Client Secret from the Secure Secrets Manager. 
 * This is cached between calls to the same lambda instance.
 */
const getClientSecret = async () => {
  if (!cachedClientSecret) {
    try {
        const command = new GetParameterCommand({
            Name: "/shopify/secret",
            WithDecryption: true,
        });
        const response = await ssmClient.send(command);
        cachedClientSecret = response.Parameter?.Value;
        if (!cachedClientSecret) {
            throw Error;
        }
    } catch {
        logger.fatal(`Cannot load Client Secret of Shopify App. Unable to process any requests.  \
            Add the Client Secret to the Secret Store Manager, \
            e.g. aws ssm put-parameter --name "/shopify/secret" --value "YOUR_ACTUAL_SHOPIFY_SECRET"  \
             --type "SecureString" --overwrite --profile <your-aws-profile>.  \
            The secret can be found in the Dev Dashboard  (https://dev.shopify.com/dashboard) in
            App Settings > Credentials`);
    }
    
  }
  return cachedClientSecret;
};


/**
 * Get the Shopify Client Id from the Secure Secrets Manager. 
 * This is cached between calls to the same lambda instance.
 */
const getClientId = async () => {
  if (!cachedClientId){
    try {
        const command = new GetParameterCommand({
            Name: "/shopify/client_id",
            WithDecryption: true,
        });
        const response = await ssmClient.send(command);
        cachedClientId = response.Parameter?.Value;
        if (!cachedClientId) {
            throw Error;
        }
    } catch {
        logger.fatal(`Cannot load Client Id of Shopify App. Unable to process any requests.  \
            Add the Client Id to the Secret Store Manager, \
            e.g. aws ssm put-parameter --name "/shopify/client_id" --value "YOUR_ACTUAL_CLIENT_ID"  \
             --type "SecureString" --overwrite --profile <your-aws-profile>.  \
            The secret can be found in the Dev Dashboard  (https://dev.shopify.com/dashboard) in
            App Settings > Credentials`);
    }
  }
  return cachedClientId;
};


/**
 * Format a Javascript object into the format required by HTTP Gateway.
 * - Access Control Headers
 * - body should be a string
 * 
 * @param {object} obj an object
 */
const normalise = (obj) => {
    if (obj) {
        if (typeof obj.body !== "string") {
            obj.body = JSON.stringify(obj.body);
        }
        return addAccessControlHeadersTo(obj);
    } else {
        return {
            statusCode: 500,
            body: "Server Error. Unknown response."
        }
    }
    
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

