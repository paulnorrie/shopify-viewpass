import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

/**
 * @typedef {Object} Video
 * @property {string} videoUrl - URL of the video
 * @property {number} showAfterDays - How many days after purchase to show the video
 */

/**
 * @typedef {Object} Product
 * @property {string} productId - Shopify id of the product
 * @property {Video[]} videos - The videos in the product
 */

// initialise and cache immediately when imported
const baseClient = new DynamoDBClient({}); // use the same region this is running in
const docClient = DynamoDBDocumentClient.from(baseClient);

const TABLE_NAME = "products";



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
 * @param {string} productId the Shopify Product Id
 * @param {Video[]} videos an array of videos in the product. If any element in the array is not of
 * of type Video no elements are saved and an Error is thrown.
 * 
 * @throws {Error} if the given information could not be saved
 */
export const postProduct = async (productId, videos) => {
  console.log(`postProduct ${JSON.stringify(videos)}`);
  if (!productId || !isValidVideoArray(videos)) {
    const errStr = "Expected productId string and Video[]. Got productId=" + productId +
                    " as " +  typeof productId +
                    ", videos=" + videos + " as " + typeof videos
    throw new Error(errStr);
  }

  try {
    const params = {
        TableName: TABLE_NAME,
        Item: {
            productId: productId,
            videos: videos,
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
