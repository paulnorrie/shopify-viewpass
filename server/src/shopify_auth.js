import crypto from "crypto";
import jwt from 'jsonwebtoken';


export const authenticate = (headers, body, clientId, clientSecret) => {
    // Webhooks use HMAC for authentication, while browser requests use authorization header
    console.log(`Authenticating on ${JSON.stringify(headers)}\n${body}`);
    if (headers.authorization) {
        console.log('Checking JWT');
        // Shopify request from browser with JWT Authorization
        return verifyShopifyToken(headers, clientId, clientSecret)
    } else {
        console.log('Checking HMAC');
        return verifyShopifyHmac(headers, body, clientSecret);
        
    }

}

/**
 * Verify HMAC to see if a HTTP request is really coming from the Shopify App, i.e. is it
 * sgined by a secret known only to the App and this function.
 * 
 * @param {readonly Object} headers - key:value pairs for each HTTP header
 * @param {readonly string | undefined} body - the body of the HTTP request
 * @param {readonly string} clientSecret - Shopify App Client Secret. See
 *        https://shopify.dev/docs/apps/build/authentication-authorization/client-secrets
 * 
 * @returns {boolean} true if the HMAC signature is valid (i.e. comes from the Shopify App)
*/
const verifyShopifyHmac = (headers, body, clientSecret) => {

    try {
        let isHmacValid = false;
        if (body && headers && clientSecret) {
            const shopifyHmac =
                headers["x-shopify-hmac-sha256"] ||
                headers["X-Shopify-Hmac-Sha256"];

            // Compute HMAC using your app's shared secret
            const digest = crypto
                .createHmac("sha256", clientSecret) 
                .update(body, "utf8")
                .digest("base64");

            // digest == shopifyHmac isn't timing safe so use crypto.timingSafeEqual
            isHmacValid = crypto.timingSafeEqual(
                Buffer.from(digest, 'base64'),
                Buffer.from(shopifyHmac, 'base64'));
        }
        
        return isHmacValid;
    
    } catch (err) {
        console.error("Unable to verify HMAC Signature: ", err.message);
        return false;
    }
    
}


export function verifyShopifyToken(headers, clientId, clientSecret) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Missing token');
    return false; // missing token
  }

  const token = authHeader.split(' ')[1];
  
  // Verify signature, audience, and expiration boundaries in one pass
  jwt.verify(token, clientSecret, { audience: clientId }, (err, decoded) => {
    if (err) {
        console.log(`Invalid token parameters: ${err}`);
      return false; // invalid token parameters
    }
    return true;
  });

  return true;
}