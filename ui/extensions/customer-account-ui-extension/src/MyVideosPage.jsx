import {render} from "preact";
import {useEffect, useState} from 'preact/hooks';
import { BACKEND_URL } from "./generated-config"; // generated at build-time by /scripts/generate-backend-url.mjs

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
    
    console.log("My Videos page mounting");
    const customerId = shopify.authenticatedAccount?.customer?.value?.id;
    
    async function fetchBackend() {
        const token = await shopify.sessionToken.get();

        const headers = {
            Authorization: `Bearer ${token}`
        };
        
        return await fetch(`${BACKEND_URL}myvideos/${encodeURIComponent(customerId)}`, 
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
         if (response.ok) {
        //     if (response.status != 204 && response.status != 404 && 
        //         response.headers.get('content-length') != '0') {
        //         console.log(`Response ${response.status} ${response.headers.get('content-length')}`);
        //         const payload = await response.json();  
        //         console.log(`Payload of Product Extension is ${payload}`);
        //         setVideos(payload?.videos || []); 
        //         setLicenceDurationDays(payload?.licenceDurationDays || 3);
        //     }
        }
      } catch (error) {
        console.error("Failed to fetch video data for product:", error);
      }
    }

    loadInitialData();

  }, [customerId]); 
  return (
    <s-page heading="My Videos" subheading="Your saved items">
        
    </s-page>
  );
}