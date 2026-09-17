/**
 * @file Database connectivity
 * 
 * @description Exposes AWS DynamoDb client
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// single shared DynamoDB client for the application
const baseClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(baseClient);
