# Shopify Viewpass UI 

This is an Extension-Only Shopify App using [Preact](https://preactjs.com/) and 
[Vite](https://vite.dev/).

There are actually two Apps:
1. viewpass, which is used for development and production
2. viewpass-uat,  to be used for testing and user-acceptance on a development copy of the production website

> [!TIP]   
> NB: for the Bogus Payment gateway/test mode in Shopify payments, the orders/paid webhook won’t trigger
> You can just go into Shopify Admin and create an order and click mark as paid and that will trigger your webhook for > you.

## Prerequisites

1. [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started).
2. The [server backend](../server/README.md) is deployed in a uat and production environment.
3. The `application_url` in [shopify.app.toml](shopify.app.toml) is set to the AWS API Gateway URL in the
production AWS environment.
1. The `application_url` in [shopify.app.uat.toml](shopify.app.uat.toml) is set to the AWS API Gateway URL in the
uat AWS environment

## To run the app locally during development

For dev & production:
```shell
npm run shopify:dev:prod 
```

> [!IMPORTANT]
> NB: avoid `shopify app dev` because it does not generate `/extensions/customer-account-ui-extension/generated-config.ts`
> and calls to `fetch()` will fail in this extension.

Press P to open the URL to your app. Once you click install, you can start development.

Local development is powered by [Shopify CLI](https://shopify.dev/docs/apps/build/cli-for-apps/test-apps-locally). It logs into your account, connects to an app, provides environment variables, updates remote config, creates a tunnel and provides commands to generate extensions.

## To test on a UAT environment
With a clone of the store, install the UAT App on the UAT store using the Dev Dashboard, then run:
```shell
 npm run shopify:deploy:uat
```

You will get a message:
`Network access must be requested and approved in order for the My-Videos extension to be published.`


## Deployment

For dev & production:
```shell
npm run shopify:deploy:prod
```
For UAT, deploy the app and its extensions to the UAT app:
```shell
npm run shopify:deploy:uat
```

Use the scripts above rather than running `shopify app deploy` directly, so the generated extension configuration is refreshed first.

## Showing the extensions in the shop
1. Make sure the app extension has been deployed to the same app installed in the shop. Installing `viewpass-uat` alone does not publish the extension to that app.
2. In the shop's Shopify Admin, open a product, scroll to the bottom of the product details page, choose **Add block**, select **Product Videos**, and save the page.
3. In Settings > Checkout > Edit ... add the My-Videos page with a menu to Profile.

## Notes
Customers get the videos that are configured with the product when they order it. If those videos
change, the customer won't see the new/removed/changed videos.

To test this with the Dummy Payment Gateway, you cannot make an order on the website, you must make the order in Shopify Admin, and Mark the Order as Paid.  Sometimes this stops working and you need to
redeploy the app.

## Uninstalling the App from a Store
In the Shopify Store: Settings > Apps > Viewpass > Uninstall

## How it works

### Authentication

This template uses [Shopify managed installation](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation). Shopify handles the OAuth flow and app installation automatically. Once installed, the app is fully embedded in the Shopify Admin.

### Querying data

This template uses [Direct API access](https://shopify.dev/docs/api/app-home#direct-api-access) — the Shopify Admin API is called directly from the browser using App Bridge. No server-side code is needed.

This template comes pre-configured with examples of querying data using GraphQL with direct API access, and using [metaobjects](https://shopify.dev/docs/apps/custom-data/metaobjects) to store and retrieve structured app data — see [/shared/models/faq.ts](./shared/models/faq.ts).

### App Bridge

[App Bridge](https://shopify.dev/docs/api/app-bridge) is loaded automatically in embedded apps.

### Polaris Web Components

This template uses [Polaris Web Components](https://shopify.dev/docs/api/app-home/web-components) — the native custom element version of Polaris that works in any framework (including Preact). No additional package installation is required as they are provided automatically in the Shopify Admin iframe.

## GraphQL Codegen

This template is pre-configured with [GraphQL Codegen](https://the-guild.dev/graphql/codegen) to generate TypeScript types from your GraphQL queries.

To regenerate types after updating queries:

```shell
npm run codegen
```

To watch for changes:

```shell
npm run codegen:watch
```

## Build

Build the app by running:

```shell
npm run build
```

## Shopify Dev MCP

This template is configured with the Shopify Dev MCP. This instructs [Cursor](https://cursor.com/), [GitHub Copilot](https://github.com/features/copilot), [Claude Code](https://claude.com/product/claude-code), and [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) to use the Shopify Dev MCP.

For more information on the Shopify Dev MCP please read [the documentation](https://shopify.dev/docs/apps/build/devmcp).

## Metafields and Metaobjects

This template uses [metaobjects](https://shopify.dev/docs/apps/custom-data/metaobjects) and [metafields](https://shopify.dev/docs/apps/custom-data/metafields) to store structured app data without a custom database.

### Metaobject: FAQ

The template defines a `faq` metaobject type for storing FAQ entries. Each FAQ has a question, answer, a flag to control visibility on the FAQ page, and optional product associations.

Defined in `shopify.app.toml`:

```toml
[metaobjects.app.faq]
name = "FAQ"

[metaobjects.app.faq.fields.question]
name = "Question"
type = "single_line_text_field"
required = true

[metaobjects.app.faq.fields.answer]
name = "Answer"
type = "multi_line_text_field"
required = true

[metaobjects.app.faq.fields.show_on_faq_page]
name = "Show on FAQ page"
type = "boolean"

[metaobjects.app.faq.fields.products]
name = "Products"
type = "list.product_reference"
```

### Metafield: Product FAQ

A metafield definition links individual products to a FAQ metaobject entry, allowing merchants to associate a FAQ with specific products.

```toml
[product.metafields.app.faq]
name = "FAQ"
description = "FAQ for this product"
type = "metaobject_reference<$app:faq>"
access.admin = "merchant_read_write"
```

These definitions are automatically synced to Shopify when you run `shopify app dev` or `shopify app deploy`. See [/shared/models/faq.ts](./shared/models/faq.ts) for the client-side model that reads and writes these metaobjects via the Admin GraphQL API.

## Resources

Preact & Vite:

- [Preact docs](https://preactjs.com/guide/v10/getting-started)
- [Vite docs](https://vite.dev/)

Shopify:

- [Intro to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [Direct API access](https://shopify.dev/docs/api/app-home#direct-api-access)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [App Bridge](https://shopify.dev/docs/api/app-bridge)
- [Polaris Web Components](https://shopify.dev/docs/api/app-home/web-components)
- [Metaobjects](https://shopify.dev/docs/apps/custom-data/metaobjects)
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
- [Shopify Functions](https://shopify.dev/docs/api/functions)
