import {render} from "preact";
import {useEffect, useState} from 'preact/hooks';
import { BACKEND_URL } from "./generated-config"; // generated at build-time by /scripts/generate-backend-url.mjs

export default async () => {
  render(<Extension />, document.body)
}


function Extension() {
    
    const [licences, setLicences] = useState(/** @type {{ productId: string, customerId: string, licenceExpires?: string | number | null, videos: Array<{ videoUrl: string, showFrom: string }> }[]} */ ([]));
    const [productNames, setProductNames] = useState(/** @type {{ [key: string]: string }} */ ({}));

    console.log("My Videos page mounting");
    shopify.query(`query {
        node(id: "gid://shopify/Product/8286735368307") {
            ... on Product {
                title
                }
            }
        }`).then(({data}) => console.log(`Got ${JSON.stringify(data)}`));
    console.log("Products got");
    
    const customerId = shopify.authenticatedAccount?.customer?.value?.id;

    const normaliseProductId = (/** @type {string | number | null | undefined} */ productId) => {
      if (!productId) return "";
      return String(productId).replace(/^gid:\/\/shopify\/Product\//, "");
    };

    async function fetchProductNames(/** @type {Array<string | number | null | undefined>} */ productIds) {
      const uniqueIds = [...new Set(productIds.filter(Boolean).map(normaliseProductId).filter(Boolean))];
      if (uniqueIds.length === 0) {
        return {};
      }

      try {
        const queryResult = await shopify.query(
          `query GetProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
              }
            }
          }`,
          {
            variables: {
              ids: uniqueIds.map((id) => `gid://shopify/Product/${id}`),
            },
          },
        );

        /** @type {{ nodes?: Array<{ id?: string | null, title?: string | null }> }} */
        const payload = queryResult?.data ?? {};

        /** @type {{ [key: string]: string }} */
        const names = {};

        for (const node of payload.nodes ?? []) {
          if (node?.title) {
            names[normaliseProductId(node.id)] = node.title;
          }
        }

        return names;
      } catch (error) {
        console.warn('Product name lookup unavailable in this context; falling back to product IDs.', error);
        return {};
      }
    }
    
    async function fetchBackend() {
        if (!customerId) {
            return null;
        }

        const token = await shopify.sessionToken.get();

        const headers = {
            Authorization: `Bearer ${token}`
        };
        
        return await fetch(`${BACKEND_URL}myvideos/${encodeURIComponent(String(customerId))}`, 
            {
                headers,
            });
    }
    
    
    /**
    * Fetch MyVideos when component mounts
    */ 
  useEffect(() => {
    
    async function loadInitialData() {
      try {    
        console.log(`app_Url is ${BACKEND_URL}`);
        
         const response = await fetchBackend();
         
         if (response && response.ok) {
            console.log(`response okay`);
            const payload = await response.json(); 
            const licencesFromBackend = Array.isArray(payload) ? payload : [];
            console.log(`Payload of Product Extension is ${JSON.stringify(licencesFromBackend)}`);
            setLicences(licencesFromBackend);

            const productIds = licencesFromBackend.map((licence) => licence.productId).filter(Boolean);
            const names = await fetchProductNames(productIds);
            setProductNames((prev) => ({ ...prev, ...names }));
        }
      } catch (error) {
        console.error("Failed to fetch all licence and video info:", error);
      }
    }

    loadInitialData();

  }, [customerId]); 
  // a licence is a customer-product combo
  const licencesToRender = Array.isArray(licences) ? licences : [];

  return (
    <s-page heading="My Videos" subheading="Your saved items">
      {licencesToRender.length === 0 ? (
        <s-section heading="No videos yet">
          <s-text>You don't have any licensed videos yet.</s-text>
        </s-section>
      ) : (
        licencesToRender.map((licence, licenceIndex) => {
          const licenceKey = licence.productId || `${licence.customerId || 'customer'}-${licenceIndex}`;
          const productTitle = productNames[normaliseProductId(licence.productId)] || `Product ${licence.productId}`;
          const allVideos = Array.isArray(licence.videos) ? licence.videos : [];

          const expiryText = licence.licenceExpires ? new Date(licence.licenceExpires).toLocaleString() : 'Not specified';

          return (
            <s-section heading={productTitle} key={licenceKey}>
              <s-stack direction="block" gap="base">
                <s-text>Expires: {expiryText}</s-text>
                {allVideos.length ? (
                  allVideos.map((video, index) => {
                    const showFrom = video?.showFrom ? new Date(video.showFrom) : null;
                    const isLocked = !!showFrom && !Number.isNaN(showFrom.getTime()) && showFrom > new Date();

                    return (
                      <s-box key={`${licenceKey}-${index}`} border="base" padding="base">
                        <s-stack direction="block" gap="small-100">
                          <s-text>Video {index + 1}</s-text>
                          {isLocked ? (
                            <s-badge tone="critical">Locked</s-badge>
                          ) : (
                            <s-badge tone="neutral">Available</s-badge>
                          )}
                          <s-text>URL: {video.videoUrl}</s-text>
                          {isLocked ? (
                            <s-text>Locked until: {showFrom.toLocaleString()}</s-text>
                          ) : (
                            <s-text>Available from: {showFrom ? showFrom.toLocaleString() : 'Immediately'}</s-text>
                          )}
                        </s-stack>
                      </s-box>
                    );
                  })
                ) : (
                  <s-text>No videos for this product.</s-text>
                )}
              </s-stack>
            </s-section>
          );
        })
      )}
    </s-page>
  );
}