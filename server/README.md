
# Building the Shopify-Viewpass Server

## Prequisites

* aws cli
* aws sam cli

## Creating the AWS Stack

### Configure your Shopify Client Secret in your AWS Stack
An AWS Stack needs to be created. If it does not exist you need to first populate the
Shopify Client Secret to be able to authenticate webhook calls from Shopify:
```bash
aws ssm put-parameter --name "/shopify/client_secret" --value "YOUR_ACTUAL_SHOPIFY_CLIENT_SECRET" \
    --type "SecureString" --overwrite --profile <your-aws-profile>
```

The Client Secret can be obtained from your [Shopify App Dev Dashboard](https://dev.shopify.com/dashboard)
in the **Settings** menu under **Secret**.

### Create or update the AWS Stack
```bash
sam deploy --guided --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --profile <your-aws-profile>
```

