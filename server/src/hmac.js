import crypto from "crypto";

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
export const verifyShopifyHmac = (headers, body, clientSecret) => {

    try {
        const shopifyHmac =
            headers["x-shopify-hmac-sha256"] ||
            headers["X-Shopify-Hmac-Sha256"];

        // Compute HMAC using your app's shared secret
        const digest = crypto
            .createHmac("sha256", clientSecret) 
            .update(body, "utf8")
            .digest("base64");

        // digest == shopifyHmac isn't timing safe so use crypto.timingSafeEqual
        const isHmacValid = crypto.timingSafeEqual(
            Buffer.from(digest, 'base64'),
            Buffer.from(shopifyHmac, 'base64'));

        return isHmacValid;
    
    } catch (err) {
        console.error("Unable to verify HMAC Signature: ", err.message);
        return false;
    }
    
}