/**
 * @file Routing Requests
 * 
 */
import {authenticate} from "./shopify_auth.js";
import {getProduct, postProduct} from "./products.js"
import { issueLicence, getLicences } from "./licences.js";
import { createPlayerToken, verifyPlayerToken, renderPlayer } from "./player.js";
import { StdRespForbidden, StdRespNotFound, StdRespServerError, StdRespOk, StdRespBadRequest } from "./responses.js";
import {logger} from "./logger.js";

/**
 * @typedef {Object} HttpResponse
 * @property {number} statusCode - The HTTP status code of the response.
 * @property {string|Object} body - The response payload.
 * @property {string} [Content-Type] - The optional MIME type of the content.
 */

/**
 * Route and execute requests, including authentication for each request (since authentication
 * mechanism may be different depending on request)
 * 
 * @param {string} routeKey Http method and URL path. Parameters in the path are specified inside
 *                 curly braces and given in the `params` argument.
 *                 e.g. `POST /products`, `GET /thing/{thingId+}` where `thing` is a variable parameter. 
 * @param {object} params key-value pairs for every parameter in `routeKey`
 * @param {object} headers HTTP request headers
 * @param {string} body of the request
 * @param {object} queryParams query parameters in the URL (e.g. `/path?queryParam1=queryValue1`)
 * 
 * @returns {HttpResponse} containing statusCode and body (doesn't need to be string), with optional
 *                   Content-Type
 */
export const route = async (routeKey, params, headers, body, queryParams, clientId, clientSecret) => {
    
    logger.debug(`Routing ${routeKey} with ${JSON.stringify(params)}\n${body}\n${JSON.stringify(queryParams)}`);
    
    try {
        let result = StdRespNotFound;

        switch (routeKey) {
            
            case "GET /products/{productId+}": {
                if (! await authShopifyRequest(headers, body, clientId, clientSecret) ) return StdRespForbidden; 
                
                try {
                    const product = await getProduct(params.productId); 
                    if (product) {
                       result = {statusCode:200, body:product};
                    } else {
                        result = StdRespNotFound;
                    }   
                }catch (error) {
                    logger.error(`Error reading product: ${error}`);
                }
            }
            break;

            case "POST /products/{productId+}": {
                if (! await authShopifyRequest(headers, body, clientId, clientSecret) ) return StdRespForbidden;
                
                try {
                    const product = JSON.parse(body);
                    await postProduct(String(params.productId), product);
                }catch (error) {
                    logger.error(`Error saving product: ${error}`);
                }
                result = StdRespOk;
            }
            break;

            case "POST /webhooks/orders/paid": {
                if (! await authShopifyRequest(headers, body, clientId, clientSecret) ) return StdRespForbidden;
                
                try {
                    const payload = JSON.parse(body);
                    const customerId = String(payload && payload.customer && payload.customer.id);
                    const lineItems = Array.isArray(payload && payload.line_items) ? payload.line_items : [];
                    for (const lineItem of lineItems) {
                        await issueLicence(customerId, String(lineItem.product_id));
                    }
                
                    result = StdRespOk;
                } catch (error) {
                    logger.error(`Error creating licence on order paid: ${error}`);
                    result = StdRespServerError;
                }
            }
            break;

            case "POST /webhooks/orders/refund": {
                //TODO: 
            }
            break;

            case "GET /myvideos/{customerId}": {
                if (! await authShopifyRequest(headers, body, clientId, clientSecret) ) return StdRespForbidden;
                
                try {
                    const licences = await getLicences(params.customerId);
                    result = StdRespOk("application/json", licences);
                }catch (error) {
                    logger.error(`Error getting videos for customerId=${params.customerId}: ${error}`);
                    result = StdRespServerError;
                }
            }
            break;

            case "GET /player/{customerId}": {
                try {
                    const validToken = verifyPlayerToken(queryParams.token, params.customerId, queryParams.videoUrl, clientSecret);
                    if (validToken) {
                        const player = await renderPlayer(params.customerId, queryParams.videoUrl);
                        result = StdRespOk("text/html", player);
                    } else {
                        result = StdRespForbidden;
                    }
                }catch (error) {
                    logger.error(`Error validating player token or rendering player: ${error}`);
                }
            }
            break;

            case "GET /player-token": {
                if (! await authShopifyRequest(headers, body, clientId, clientSecret) ) return StdRespForbidden;
                
                const videoUrl = queryParams?.videoUrl || "";
                const customerId = queryParams?.customerId || "";
                if (customerId && videoUrl) {
                    const token = createPlayerToken(customerId, videoUrl, clientSecret);
                    result = StdRespOk("text/plain", token);
                } else {
                    result = StdRespBadRequest;
                }
            }
            break;

            default:
                logger.error(`No routing for ${routeKey}`);
                result = StdRespNotFound;
        }

        return result;

    } catch (error) {
        logger.error(`Error routing ${routeKey}: ${error}.\n  params=${JSON.stringify(params)}\n  headers=${JSON.stringify(headers)}\n  body=${body}\n  queryParams=${JSON.stringify(queryParams)}`)
        return StdRespServerError;
    }
    
}



/**
 * Authenticate a request expected from a Shopify store.
 * 
 * @param {object} headers key-value pairs of the HTTP headers in a HTTP Request
 * @param {string} body of the HTTP request
 * @param {string} clientId
 * @param {string} clientSecret Shopify App Client Secret. See
 *        https://shopify.dev/docs/apps/build/authentication-authorization/client-secrets
 * 
 * @returns {boolean} if the request is authenticated
 */
const authShopifyRequest = async (headers, body, clientId, clientSecret) => {
    return authenticate(headers, body, clientId, clientSecret);
}
