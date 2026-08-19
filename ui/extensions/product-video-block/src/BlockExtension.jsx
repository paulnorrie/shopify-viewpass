import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
//import { render, useApi, useData, useTarget } from '@shopify/ui-extensions-react/admin';

export default async () => {
  render(<Extension />, document.body);
}

/** @typedef {{ videoUrl: string, showAfterDays: number }} Video */

function Extension() {
  const {data, extension: {target}} = shopify;
  console.log("Product Details Extension mounting");
  const productId = data.selected[0].id;

  
  const [videos, setVideos] = useState(/** @type {Video[]} */ ([]));
  const [licenceDurationDays, setLicenceDurationDays] = useState(3);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  
  /**
   * Fetch initial rows from backend when component mounts if this isn't a new product
   */ 
  useEffect(() => {
    async function loadInitialData() {
      try {    
        // Call your backend API endpoint passing the product ID
        const response = await fetch(`/products/${encodeURIComponent(productId)}`);
        if (response.ok) {
            if (response.status != 204 && response.status != 404 && 
                response.headers.get('content-length') != '0') {
                console.log(`Response ${response.status} ${response.headers.get('content-length')}`);
                const payload = await response.json();  
                console.log(`Payload of Product Extension is ${payload}`);
                setVideos(payload?.videos || []); 
                setLicenceDurationDays(payload?.licenceDurationDays || 3);
            }
        }
      } catch (error) {
        console.error("Failed to fetch video data for product:", error);
      }
    }

    loadInitialData();

  }, [productId]); 


  /**
   * Add a new blank row
   */
  const addRow = () => {
    setVideos(currentRows => [...currentRows, { videoUrl: '', showAfterDays: 0 }]);
    setIsDirty(true);
  };


  /**
   * Delete a specified row.  This relies on the rows never changing order.
   * @param {number} indexToDelete 
   */
  const deleteRow = async (indexToDelete) => {
    setVideos(currentRows => currentRows.filter((_, index) => index !== indexToDelete));
    setIsDirty(true);
  };


  /**
   * Record updated video info
   * 
   * @param {number} index row of the video
   * @param {string} field field to change (e.g. "videoUrl")
   * @param {*} value of the field now
   */
  const onVideoRowChange = (index, field, value) => {
        const updated = /** @type {Video[]} */ ([...videos]);
        const nextRow = {...updated[index], [field]: value};
        updated[index] = nextRow;
        setVideos(updated);
        setIsDirty(true);
  }

   /**
   * Record change in the number of licence days
   * 
   * @param {number} value of the field now
   */
  const onLicenceDaysChange = (value) => {
        setLicenceDurationDays(value);
        setIsDirty(true);
  }

  /**
   * Save the records
   * @param {*} event 
   */ 
  const onSubmit = async (event) => {
    
    console.log("Saving!!! ", videos, " = ", JSON.stringify(videos), " = ", JSON.stringify({videos: videos}));
    setIsSaving(true);
    event.preventDefault(); // stop browser doing default actions

    try {
             
        // Post to backend
        const response = await
            fetch(`/products/${encodeURIComponent(productId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    licenceDurationDays: licenceDurationDays,
                    videos: videos
                })
            })

        if (!response.ok) {
            throw new Error('Failed to save videos');
        }

        // Tell shopify success are all good to hide the save bar
        event.currentTarget.reset();
        setIsDirty(false);


    }catch (error) {
        console.error("Failed to save data:", error);
    }finally {
        setIsSaving(false);
    }
  };




  return (
    <s-admin-block heading="Videos" id="videos-block">
        <s-form id={`videos-form`} data-save-bar onSubmit={onSubmit}>
        
        
        <s-number-field 
            name="licenceDays"
            value={String(licenceDurationDays)}
            min={1} 
            label="Number of days the videos are available for"
            onInput={(event) => {
                        const target = /** @type {{ value?: string | null }} */ (event.target);
                        onLicenceDaysChange(Number(target?.value ?? 0));
                      }}/>
        
        
        {/* Header Grid Line: Video URL, Delay */}
        <s-stack direction="block">
        
            <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
                <s-grid-item gridColumn="span 9">
                    <s-text>Video URL</s-text>
                </s-grid-item>

                <s-grid-item gridColumn="span 3">
                    <s-section>
                    <s-text>Delay (days)</s-text>
                    </s-section>
                </s-grid-item>
            </s-grid>

            {/* Grid with each row being a video */}
            {videos.map((row, index) => (
            
                <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base" rowGap="large-400" >
        
                {/* Video URL */}
                <s-grid-item gridColumn="span 9">
                  <s-box padding="small none none">
                    <s-text-field
                      value={row.videoUrl}
                      name={`videoUrl-${index}`}
                      label="Video URL"
                      labelAccessibilityVisibility='exclusive'
                      onInput={(event) => {
                        const target = /** @type {{ value?: string | null }} */ (event.target);
                        onVideoRowChange(index, "videoUrl", target?.value ?? '');
                      }}
                    />
                  </s-box>
                </s-grid-item>

                {/* Delay (days) */}
                <s-grid-item gridColumn="span 2">
                  <s-box padding="small none none">
                    <s-number-field
                      value={String(row.showAfterDays)}
                      name={`showAfterDays-${index}`}
                      min={0}
                      label="Show after this many days"
                      labelAccessibilityVisibility='exclusive'
                      onInput={(event) => {
                        const target = /** @type {{ value?: string | null }} */ (event.target);
                        onVideoRowChange(index, "showAfterDays", Number(target?.value ?? 0));
                      }}
                    />
                  </s-box>
                </s-grid-item>

                {/* Delete button */}
                <s-grid-item gridColumn="span 1">
                  <s-box padding="small none none">
                    <s-button 
                        id={`delete-${index}`} 
                        type="button" 
                        variant="secondary" 
                        icon="delete" 
                        accessibilityLabel="Delete this video"
                        onClick={() => deleteRow(index)}></s-button>
                  </s-box>
                </s-grid-item>

            </s-grid>
    
        ))}
        </s-stack>


        <s-stack direction="inline" >
            <s-box padding="large none large">
                <s-button id="add-video-btn" variant="primary" type="button" icon="plus" onClick={addRow}>Add another video</s-button>
            </s-box>
        </s-stack>
   
        </s-form>
    </s-admin-block>
  );
}
