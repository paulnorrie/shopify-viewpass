import '@shopify/ui-extensions/preact';
import {render} from "preact";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {

  const shopId = shopify.shop.id;
  const numericShopId = shopId.replace('gid://shopify/Shop/', '');
  console.log(`Numeric Shop Id is` + numericShopId);
  const accountUrl = `https://shopify.com/` + numericShopId + `/account/orders`;


  return (
    <s-section heading='Videos now available in your account'>
    <s-stack>
        <s-paragraph>Watch these videos in <s-text type="strong">My Videos</s-text> in your account</s-paragraph>
        <s-button href={accountUrl} variant='primary'>
            Goto My Videos
        </s-button>
    </s-stack>
    </s-section>
  );

}