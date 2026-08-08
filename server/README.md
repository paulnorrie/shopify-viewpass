
# Building the Shopify-Viewpass Server

## Prequisites

* aws cli
* aws sam cli

## Creating the AWS Stack

### Configure your Shopify Client Secret in your AWS Stack
An AWS Stack needs to be created. If it does not exist you need to first populate the
Shopify Client Secret to be able to authenticate webhook calls from Shopify:
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

