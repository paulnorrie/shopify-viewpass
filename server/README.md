
# Building the Shopify-Viewpass Server

## Prequisites

* aws cli
* aws sam cli

## Creating the AWS Stack

### Configure your Shopify Client Secret and Id in your AWS Stack
An AWS Stack needs to be created. If it does not exist you need to first populate the
Shopify Client Secret to be able to authenticate requests.

The Client Secret authenticates the app with JWT Tokens.  The JWT Token contains the Client Id indicating
that it is the Viewpass app making the request (not someone else). 
Additionally Shopify sends webhooks to the app backend using the Client Secret to ensure the 
backend can authenticate the request as from Shopify.

```bash
aws ssm put-parameter --name "/shopify/secret" --value "YOUR_ACTUAL_SHOPIFY_SECRET" \
    --type "SecureString" --overwrite --profile <your-aws-profile>

aws ssm put-parameter --name "/shopify/client_id" --value "YOUR_ACTUAL_SHOPIFY_CLIENT_ID" \
    --type "SecureString" --overwrite --profile <your-aws-profile>
```

These can be obtained from your [Shopify App Dev Dashboard](https://dev.shopify.com/dashboard)
in the **Settings** menu under **Credentials**:
  - Client ID
  - Secret 

### Create or update the AWS Stack
```bash
sam deploy --guided --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --profile <your-aws-profile>
```

## Running Unit Tests
```bash
npm test
```