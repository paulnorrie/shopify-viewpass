import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./db.js";

/**
 * @typedef {Object} Video
 * @property {string} videoUrl - URL of the video
 * @property {number} showAfterDays - How many days after purchase to show the video
 */

/**
 * @typedef {Object} Product
 * @property {string} productId - Shopify id of the product
 * @property {number} licenceDurationDays - number of days the product is available for
 * @property {Video[]} videos - The videos in the product
 */


const TABLE_NAME = "products";
const DEFAULT_LICENCE_DAYS = 3;


/**
 * Get the video information associated with the given Shopify product.
 * 
 * @param {string} productId the Shopify Product Id
 * 
 * @returns {Product} either null if no matching record found or the product record
 */
export const getProduct = async (productId) => {

    if (!productId) {
        return null;
    }

    productId = sanitiseProductId(productId);

    const params = {
      TableName: TABLE_NAME,
      Key: {
          productId: productId,
      },
    };

    try {
      const command = new GetCommand(params);
      const response = await docClient.send(command);

      if (response.Item) {
        console.log("Record found:", response.Item);
        response.Item.licenceDurationDays ??= DEFAULT_LICENCE_DAYS;
        return response.Item; 
      } else {
        console.log("No matching record found.");
        return null;
      }
    } catch (error) {
      console.error("Error reading product:", error);
      throw error;
    }
};




/**
 * Save (overwrite) video information for a given Shopify product.  This function ensures
 * the data types of the video information are saved correctly so that the database reliably
 * returns valid data.
 * 
 * @param {Product} product, default value is applied to licenceDurationDays if missing 
 * 
 * @throws {Error} if the given information could not be saved
 */
export const postProduct = async (productId, product) => {
  console.log(`postProduct ${JSON.stringify(product)}`);
  if (!productId || !isValidVideoArray(product.videos)) {
    const errStr = "Expected productId string and Video[]. Got productId=" + productId +
                    " as " +  typeof productId +
                    ", videos=" + product.videos + " as " + typeof product.videos
    throw new Error(errStr);
  }
  product.licenceDurationDays ??= DEFAULT_LICENCE_DAYS;

  productId = sanitiseProductId(productId);

  try {
    const params = {
        TableName: TABLE_NAME,
        Item: {
            productId: productId,
            licenceDurationDays: product.licenceDurationDays,
            videos: product.videos,
        },
    };
    
    const command = new PutCommand(params);
    const response = await docClient.send(command);
    
    console.log("Success! Record written to table.");
    return true;
    } catch (error) {
        console.error("Error saving product:", error);
        throw error;
    }
};


/**
 * Validates if an object matches the Video typedef structure.
 * @param {unknown} obj - The object to check.
 * @returns {obj is Video} True if valid, false otherwise.
 */
function isValidVideo(obj) {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof /** @type {Record<string, unknown>} */ (obj).videoUrl === 'string' &&
    typeof /** @type {Record<string, unknown>} */ (obj).showAfterDays === 'number' &&
    !isNaN(/** @type {Record<string, unknown>} */ (obj).showAfterDays)
  );
}


function isValidVideoArray(arr) {
    return Array.isArray(arr) && arr.every(isValidVideo);
}


/**
 * Shopify APIs can send a GraphQL id (gid://.shopify/Product/1234567890) or just the id
 * 1234567890 and the id can be too large for a safe number so always use the id only but as
 * a string
 * 
 * @param {*} productId 
 */
const sanitiseProductId = (productId) => {
    return stripLeading(String(productId), "gid:/shopify/Product/");   
}
const stripLeading = (str, prefix) => {
    return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}