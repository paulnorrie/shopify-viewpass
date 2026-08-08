import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  const {i18n, data, extension: {target}} = shopify;
  console.log("Product Details Extension mounting");
  const productId = data.selected[0].id;

  // initially there are no videos
  const [rows, setRows] = useState([
    { videoUrl: 'a', showAfterDays: 0 },
    { videoUrl: 'b', showAfterDays: 1 }
  ]);

  const [isLoading, setIsLoading] = useState(true);
  
  // 
  // Fetch initial rows from backend when component mounts 
  //
  useEffect(() => {
    async function loadInitialData() {
      try {
        
        // Call your backend API endpoint passing the product ID
        console.log(`Product Details Extension: /api/productvideos/${encodeURIComponent(productId)}`);
        const response = await fetch(`/api/productvideos/${encodeURIComponent(productId)}`);

        if (response.ok) {
          const payload = await response.json();
          // Expecting an array payload like: [{ videoUrl: '...', showAfterDays: 0 }]
          setRows(payload.videos || []); 
        }
      } catch (error) {
        console.error("Failed to fetch initial video data:", error);
      } finally {
        setIsLoading(false); // Clear the loading state
      }
    }

    loadInitialData();
  }, []); //


  //
  // add a row
  //
  const addRow = () => {
    setRows([...rows, { videoUrl: 'c', showAfterDays: 2 }]);
  };


  // 
  // Save is triggered when user clicks the Save button for the product
  //
  const handleSave = async (event) => {
    event.preventDefault(); // stop browser doing default actions

    try {
        
        
        // Post to backend
        const response = await fetch(`/api/productvideos/${encodeURIComponent(productId)}`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videos: rows
            })
        });

        if (!response.ok) {
            throw new Error('Backend failed to process video metadata sync');
        }

        // Tell shopify success are all good to hide the save bar
        event.target.reset();

    }catch (error) {
        console.error("API Save Failure: ", error);
    }
  };




  return (
    <s-admin-block heading="Videos" id="videos-block">
        <form data-save-bar onSubmit={handleSave}>

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
                      onInput={(event) => {
                        const updated = [...rows];
                        updated[index].videoUrl = event.target.value;
                        setRows(updated);
                      }}
                    />
                  </s-box>
                </s-grid-item>

                {/* Delay (days) */}
                <s-grid-item gridColumn="span 3">
                  <s-box padding="small none none">
                    <s-number-field
                      value={row.showAfterDays}
                      min="0"
                      onInput={(event) => {
                        const updated = [...rows];
                        updated[index].showAfterDays = Number(event.target.value);
                        setRows(updated);
                      }}
                    />
                  </s-box>
                </s-grid-item>

            </s-grid>
    
        ))}
        </s-stack>


        <s-stack direction="inline" align="start">
            <s-box padding="large none large">
                <s-button id="add-video-btn" variant="plain" icon="plus" onClick={addRow}>Add another video</s-button>
            </s-box>
        </s-stack>
   
    </form>
    </s-admin-block>
  );
}
/*
        {rows.map((row, index) => (
        <s-box key={index}>
        <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
            
            <s-grid-item gridColumn="span 9" gridRow="span 1">
                <s-section>
                    <s-text-field 
                        label="Video URL" 
                        details="The URL of the Vimeo video" 
                        value={row.videoUrl}
                        onInput={(event) => {
                            const updated = [...rows];
                            updated[index].videoUrl = event.target.value;
                            setRows(updated);
                            }}
                    />
                </s-section>
            </s-grid-item>
  
            <s-grid-item gridColumn="span 3" gridRow="span 1">
                <s-section>
                    <s-number-field label="Show after days" 
                        defaultValue="0" 
                        value={row.showAfterDays}
                        inputMode="numeric" 
                        min="0" 
                        onInput={(event) => {
                            const updated = [...rows];
                            updated[index].showAfterDays = Number(event.target.value);
                            setRows(updated);
                        }}
                    />
                </s-section>
            </s-grid-item>
        </s-grid>
        </s-box>
        ))}

*/