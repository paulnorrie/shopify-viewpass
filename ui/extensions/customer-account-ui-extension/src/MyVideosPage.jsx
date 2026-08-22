import {render} from "preact";
import {useEffect, useState} from 'preact/hooks';
import { BACKEND_URL } from "./generated-config"; // generated at build-time by /scripts/generate-backend-url.mjs

export default async () => {
  render(<Extension />, document.body)
}


function Extension() {
    const [licences, setLicences] = useState(/** @type {{ productId: string, customerId: string, videos: Array<{ videoUrl: string, showFrom: string }> }[]} */ ([]));

    console.log("My Videos page mounting");
    
    const customerId = shopify.authenticatedAccount?.customer?.value?.id;
    
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
            console.log(`Payload of Product Extension is ${JSON.stringify(payload)}`);
            setLicences(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        console.error("Failed to fetch video data for product:", error);
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
          return (
            <s-section heading={`Product ${licence.productId}`} key={licenceKey}>
              <s-stack direction="block" gap="base">
                {Array.isArray(licence.videos) && licence.videos.length ? (
                  licence.videos.map((video, index) => (
                    <s-box key={`${licenceKey}-${index}`} border="base" padding="base">
                      <s-stack direction="block" gap="small-100">
                        <s-text>Video {index + 1}</s-text>
                        <s-text>URL: {video.videoUrl}</s-text>
                        <s-text>Available from: {new Date(video.showFrom).toLocaleString()}</s-text>
                      </s-stack>
                    </s-box>
                  ))
                ) : (
                  <s-text>No videos for this licence.</s-text>
                )}
              </s-stack>
            </s-section>
          );
        })
      )}
    </s-page>
  );
}