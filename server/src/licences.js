/**
 * @file Issue and check licences for customers products
 */

import { docClient } from "./db.js";
import { getProduct } from "./products.js";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = "licences";

/**
 * @typedef {Object} VideoLicence
 * @property {string} videoUrl
 * @property {date} showFrom
 */

/**
 * @typedef {Object} Licence
 * @property {string} customerId
 * @property {string} productId
 * @property {date} licenceCreated
 * @property {date} licenceExpires
 * @property {VideoLicence[]} videos
 */


/**
 * Issue (create) a new licence for a customer to view the videos in a product.  If a licence already
 * exists, it is overwritten.
 * 
 * @param {string} customerId 
 * @param {string} productId 
 * 
 * @returns {Licence} null if productId does not exist, is not configured to be licenced, otherwise returns
 *  
 * @throws {Error} if a licence cannot be saved
 */
export const issueLicence = async (customerId, productId) => {
    const licence = await newLicence(customerId, productId);
    
    if (!licence) {
        return null;
    }

    try {
        const params = {
            TableName: TABLE_NAME,
            Item: licence
        };
        
        const command = new PutCommand(params);
        const response = await docClient.send(command);
        
        console.log("Success! Record written to table.");
        return licence;
    } catch (error) {
        console.error("Error saving licence:", error);
        throw error;
    }
}



//export const revokeLicence = (customerId, productId) => {
//
//}


// TODO: if customer forgets account, and creates a new one they may want a manual licence created?
/**
 * Get all licences for a given customer.
 * @param {string} customerId 
 * @returns {Licence[]} null if no such customer or an array of Licences
 * @throws Error on error reading records
 */
export const getLicences = async (customerId) => {
    if (! customerId) {
        return null;
    }

    try {
        const items = [];
        let ExclusiveStartKey;

        do {
            // QueryCommand may paginate results so call multiple times
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "customerId = :customerId",
                ExpressionAttributeValues: {
                    ":customerId": customerId,
                },
                ExclusiveStartKey,
            });

            const result = await docClient.send(command);

            items.push(...(result.Items ?? []));

            ExclusiveStartKey = result.LastEvaluatedKey;
        } while (ExclusiveStartKey);

        return items;

    } catch (error) {
        console.error(`Error reading licences for customerId=${customerId}:`, error);
        throw error;
    }

    // Product Licence
    // customerId:
    // productId: 
    //   licenceCreated: 
    //   licenceExpires:
    //   licenceRevoked:??
    //   videos[]:
    //     videoUrl:
    //     showFrom: (in order)
}


/**
 * Create a new licence.
 * 
 * @param {string} customerId 
 * @param {string} productId 
 * @returns {Licence} a new licence or null if the productId does not exist or customerId is invalid
 */
const newLicence = async (customerId, productId) => {
    if (! customerId) {
        return null;
    }
    const product = await getProduct(productId);
    
    if (product) {
        const createdDate = new Date();
        const /** @type {Licence} */ licence = {
            customerId: customerId,
            productId: productId,
            licenceCreated: createdDate.toISOString(),
            licenceExpires: addDays(createdDate, product.licenceDurationDays).toISOString(),
            videos: []
        };
        for (const /** @type {Video} */video of product.videos) {
            const showFrom = addDays(createdDate, video.showAfterDays).toISOString();
            licence.videos.push({videoUrl: video.videoUrl, showFrom: showFrom});
        }
        return licence;
    } 
    
    return null;
}



/**
 * Add days to a date
 * 
 * @param {date} date 
 * @param {number} days 
 * @returns 
 */
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


// MyPages
// for customerId, get all licenced products
// iterate through each:
//   if licenceExpires > now && ! licenceRevoked
//      videos.forEach
//         <panel videoUrl="">


// UnwatchedVideos
// customer