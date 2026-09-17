/* eslint-disable no-undef */
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { jest } from '@jest/globals';

// The module under test
import { getLicences } from '../licences.js';

// Create a mock for DynamoDBDocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);


beforeEach(() => {
  ddbMock.reset();
});




test('getLicences returns empty array for falsy customerId', async () => {
  let res = await getLicences('');
  expect(res).toEqual([]);

  res = await getLicences(null);
  expect(res).toEqual([]);
});





test('getLicences aggregates paginated QueryCommand responses', async () => {
  // First call returns one item and a LastEvaluatedKey
  ddbMock.on(QueryCommand).resolvesOnce({ Items: [{ productId: 'p1' }], LastEvaluatedKey: { id: '1' } });
  // Second call returns another item and no LastEvaluatedKey
  ddbMock.on(QueryCommand).resolvesOnce({ Items: [{ productId: 'p2' }] });

  const res = await getLicences('cust-123');

  expect(Array.isArray(res)).toBe(true);
  expect(res.length).toBe(2);
  expect(res).toEqual(expect.arrayContaining([{ productId: 'p1' }, { productId: 'p2' }]));

  // Ensure QueryCommand was called twice (pagination)
  const calls = ddbMock.calls();
  expect(calls.length).toBe(2);
  expect(calls[0].args[0].input.TableName).toBe('licences');
});
