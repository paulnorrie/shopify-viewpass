import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Create a single shared DynamoDB client for the application.
// This is reused across modules so every file gets the same connection/configuration.
const baseClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(baseClient);
