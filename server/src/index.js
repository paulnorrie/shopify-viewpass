/**
 * @file AWS Lambda entry point for calls routed via AWS API Gateway.
 * @description The API Gateway has pre-defined routes it accepts and all such routes lead here.
 * The `route` function is where the most interesting action happens.
 */

import {authenticate} from "./shopify_auth.js";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {getProduct, postProduct} from "./products.js"
import { issueLicence, getLicences } from "./licences.js";
import { createPlayerToken, verifyPlayerToken, renderPlayer } from "./player.js";
import { logger } from './logger.js';
import { logStorage } from './logger.js';

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
export const handler = async (event, context) => {
  
    return await logStorage.run({ awsRequestId: context.awsRequestId }, async () => {
        try {
            // Ensure the client secret and id has been loaded from SSM
            const secret = await getClientSecret(); 
            const clientId = await getClientId(); 

            const httpMethod = event.requestContext?.http?.method;
            switch(httpMethod) {
                case 'OPTIONS':
                    return handleOptions();

                case 'POST':
                case 'GET':
                    let rawBody = event.body || "";
                    if (event.isBase64Encoded) {
                        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
                    }

                    // handle the request depending on the route
                    const params = event.pathParameters || {};
                    const routeKey = event.routeKey; 
                    const queryParams = event.queryStringParameters || {};
                    const result = await route(routeKey, params, event.headers, rawBody, queryParams);
                    // return addAccessControlHeadersTo({
                    //     statusCode: result.statusCode,
                    //     body: JSON.stringify(result.body),
                    // });
                    return addAccessControlHeadersTo(result);
                    break;

                default:
                    return addAccessControlHeadersTo({
                        statusCode: 405,
                        body: JSON.stringify({ ok: false }),
                    });
                }
            } catch (err) {
                logger.error(`Error handling request ${event}: ${err}`);
                return addAccessControlHeadersTo({
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
    return addAccessControlHeadersTo({
       statusCode: 204,
       body: JSON.stringify({ ok: true }),
    });
}


const authShopifyRequest = async (headers, body) => {
    return authenticate(headers, body, await getClientId(), await getClientSecret());
}

const StdRespForbidden = {
                            statusCode: 403,
                            body: "Forbidden",
                        };

const StdRespOk = (contentType, body) => {
    return {
        statusCode:200,
        'Content-Type': contentType,
        body:body
    };
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
const route = async (routeKey, params, headers, body, queryParams = {}) => {
    logger.debug(`Routing ${routeKey} with ${JSON.stringify(params)}\n${body}\n${JSON.stringify(queryParams)}`);
    try {
        switch (routeKey) {
            
            case "GET /products/{productId+}": {
                if (! await authShopifyRequest(headers, body) ) return StdRespForbidden; 
                
                const product = await getProduct(params.productId);
                if (product) {
                    return {statusCode:200, body:JSON.stringify(product)};
                } else {
                    return {statusCode:404, body:"Not Found"};
                }
                break;
            }

            case "POST /products/{productId+}": {
                if (! await authShopifyRequest(headers, body) ) return StdRespForbidden;
                const product = JSON.parse(body);
                const ok = await postProduct(String(params.productId), product);
                return {statusCode:200, body:""};
                break;
            }

            case "POST /webhooks/orders/paid": {
                if (! await authShopifyRequest(headers, body) ) return StdRespForbidden;
                const payload = JSON.parse(body);
                const customerId = String(payload?.customer?.id);
                for (const lineItem of payload?.line_items) {
                    await issueLicence(customerId, String(lineItem.product_id));
                }
                
                return {statusCode:200, body:""};
                break;
            }

            case "POST /webhooks/orders/refund": {
                //TODO: 
            }

            case "GET /myvideos/{customerId}": {
                logger.info(`GET /myvideos/${params.customerId}\n\n${headers}\n\n${body}`)
                if (! await authShopifyRequest(headers, body) ) return StdRespForbidden;
                const licences = await getLicences(params.customerId);
                return {
                    statusCode:200, 
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body:JSON.stringify(licences)}; //TODO: always 200?
                }

            case "GET /player/{customerId}": {
                logger.info(`GET /player/${params.customerId}?videoUrl=${queryParams?.videoUrl}&token=${queryParams?.token}`);
                const videoUrl = queryParams?.videoUrl || "";
                logger.info(`INDEX.JS QueryParams.token: ${queryParams.token}`);
                logger.info(`INDEX.JS QueryParams.token: ${decodeURIComponent(queryParams.token)}`);
                const validToken = verifyPlayerToken(queryParams.token, params.customerId, queryParams.videoUrl, await getClientSecret());
                if (validToken) {
                    const player = await renderPlayer(params.customerId, queryParams.videoUrl);
                    logger.info(`RENDER PLAYER:\n${JSON.stringify(player)}`);
                    return player;
                } else {
                    return {
                        statusCode: 403,
                        body: "Forbidden"
                    }
                }
            }

            case "GET /player-token": {
                if (! await authShopifyRequest(headers, body) ) return StdRespForbidden;
                logger.info(`GET /player-token?customerId=${queryParams?.customerId}&videoUrl=${queryParams?.videoUrl}`);
                const videoUrl = queryParams?.videoUrl || "";
                const customerId = queryParams?.customerId || "";
                if (customerId && videoUrl) {
                    const token = createPlayerToken(customerId, videoUrl, await getClientSecret());
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                        },
                        body: token,
                    }
                } else {
                    return {
                        statusCode: 400,
                        body: "Bad request"
                    }
                }
            }

            default:
                logger.error(`No routing for ${routeKey}`);
                return {statusCode:404, body:"Not Found"};
        }
    } catch (error) {
        logger.error(`Error: ${error}`)
        return {statusCode:500, body: "Server Error"};
    }
    
}