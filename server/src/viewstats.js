import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./db.js";
import {logger} from "./logger.js";


/**
 * @typedef {Object} ViewStat
 * @property {string} customerId
 * @property {string} videoUrl
 * @property {number} coveragePercent
 * @property {number} timestamp
 * @property {number} uniqueSeconds
 */

export const getViewStats = async (customerId) => {
    if (!customerId) {
        return null;
    }
    const items = [];
    let exclusiveStartKey;

    do {
        const command = new QueryCommand({
          TableName: "view_stats",
          KeyConditionExpression: "#customerId = :customerId",
          ExpressionAttributeNames: {
            "#customerId": "customerId",
          },
          ExpressionAttributeValues: {
            ":customerId": String(customerId),
          },
          ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
        });

        const response = await docClient.send(command);
        if (response.Items) {
          items.push(...response.Items);
        }

        exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);
    
  
    return items;
}



