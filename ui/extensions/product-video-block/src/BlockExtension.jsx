import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
//import { render, useApi, useData, useTarget } from '@shopify/ui-extensions-react/admin';

export default async () => {
  render(<Extension />, document.body);
}

/** @typedef {{ videoUrl: string, showAfterDays: number }} VideoRow */

function Extension() {
  const {data, extension: {target}} = shopify;
  console.log("Product Details Extension mounting");
  const productId = data.selected[0].id;

  // initially there are no videos
  const [rows, setRows] = useState(/** @type {VideoRow[]} */ ([]));
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
                setRows(payload?.videos || []); 
            }
        }
      } catch (error) {
        console.error("Failed to fetch video data for product:", error);
      }
    }

    loadInitialData();

  }, []); 


  /**
   * Add a new blank row
   */
  const markDirty = () => setIsDirty(true);

  const createVideoRow = () => ({ videoUrl: '', showAfterDays: 0 });

  const addRow = () => {
    setRows(currentRows => [...currentRows, createVideoRow()]);
    markDirty();
  };


  /**
   * Delete a specified row.
   * @param {number} indexToDelete 
   */
  const deleteRow = async (indexToDelete) => {
    setRows(currentRows => currentRows.filter((_, index) => index !== indexToDelete));
    markDirty();
  };


  /**
   * Record updated video info
   * 
   * @param {number} index row of the video
   * @param {string} field field to change (e.g. "videoUrl")
   * @param {*} value of the field now
   */
  const handleInputChange = (index, field, value) => {
        const updated = /** @type {VideoRow[]} */ ([...rows]);
        const nextRow = {...updated[index], [field]: value};
        updated[index] = nextRow;
        setRows(updated);
        setIsDirty(true);
  }


  /**
   * Save the records
   * @param {*} event 
   */ 
  const onSubmit = async (event) => {
    
    console.log("Saving!!! ", rows, " = ", JSON.stringify(rows), " = ", JSON.stringify({videos: rows}));
    setIsSaving(true);
    event.preventDefault(); // stop browser doing default actions

    try {
             
        // Post to backend
        //const response = event.waitUntil(
        const response = await
            fetch(`/products/${encodeURIComponent(productId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videos: rows
                })
            })
        //);

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
            {rows.map((row, index) => (
            
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
                        handleInputChange(index, "videoUrl", target?.value ?? '');
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
                        handleInputChange(index, "showAfterDays", Number(target?.value ?? 0));
                      }}
                    />
                  </s-box>
                </s-grid-item>

                {/* Delete button */}
                <s-grid-item gridColumn="span 1">
                  <s-box padding="small none none">
                    <s-button id={`delete-${index}`} type="button" variant="secondary" icon="delete" onClick={() => deleteRow(index)}></s-button>
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
