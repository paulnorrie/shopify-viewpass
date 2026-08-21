/**
 * @file Build-time script to create a constant called BACKEND_URL
 * @description Non-Admin extensions (e.g. customer-account.page.render) cannot call the backend
 * using relative urls like Admin-extensions.  e.g. fetch("/myvideos/{customerId}") will fail.
 * 
 * Since `shopify.app.toml` contains application_url we can use that same value to create a constant
 * for non-admin extensions at build time (when running `shopify app dev` and `shopify app deploy`).
 * 
 * NB: An App-Proxy can be used to send the call to Shopify for it to redirect but Shopify does not
 * support this for password-protected sites.  
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "@iarna/toml";

console.log(`╭─ creating build time config files ─────────────────────────────────────────────────────────────────────╮`);
console.log(`│                                                                                                        │`);
const projectRoot = process.cwd();

function getConfigName() {
  const args = process.argv;

  const index = args.indexOf("--config");

  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }

  return null;
}

const configName = getConfigName();

const configFile = configName
  ? `shopify.app.${configName}.toml`
  : "shopify.app.toml";

const configPath = path.join(projectRoot, configFile);

if (!fs.existsSync(configPath)) {
  throw new Error(`Shopify app config not found: ${configPath}`);
}

const config = parse(
  fs.readFileSync(configPath, "utf8"),
);

const applicationUrl = config.application_url;

if (!applicationUrl) {
  throw new Error(
    `${configFile} does not contain application_url`,
  );
}

const extensionDir = path.join(
  projectRoot,
  "extensions",
  "customer-account-ui-extension",   /* CHANGE THIS TO MATCH EXTENSION FOLDER */
);

const outputPath = path.join(
  extensionDir,
  "src",
  "generated-config.ts",
);

const source = `// AUTO-GENERATED FILE - DO NOT EDIT

export const BACKEND_URL = ${JSON.stringify(applicationUrl)};
`;

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(outputPath, source);

console.log(
  `│ Generated ${path.relative(projectRoot, outputPath).padEnd(93)}│`,
);

console.log(`│ BACKEND_URL = ${applicationUrl.padEnd(89)}│`);
console.log(`│                                                                                                        │`);
console.log(`╰────────────────────────────────────────────────────────────────────────────────────────────────────────╯`);
