/**
 * @file Render a Vimeo Player
 */
import jwt from 'jsonwebtoken';
import { isLicenced } from "./licences.js";
import { logger } from './logger.js';


/**
 * Create a short-lived JWT token to be used in a URL to validate an authenticated request
 * to the Player.
 * 
 */
export const createPlayerToken = (customerId, videoUrl, secret) => {
    const payload = {
        customerId: customerId,
        videoUrl: videoUrl
    };

    const token = jwt.sign(payload,secret);
        // {
        //     expiresIn: '30m'
        // }
    //);
    
    //const valid = verifyPlayerToken(token, customerId, videoUrl, secret);
    return token;
}



/**
 * Verify a given JWT token issued by `createPlayerToken`.
 *  
 * @param {string} token to verify
 * @param {string} customerId that should be in the token 
 * @param {string} videoUrl that should be in the token
 * @param {string} clientSecret used to generate the token
 * 
 * @throws {Error}
 */
export const verifyPlayerToken = (token, customerId, videoUrl, secret) => {
    logger.info(`VerifyPlayerToken: secret ${secret}`);
    logger.info(`VerifyPlayerToken: token ${token}`);
    const payload = jwt.verify(token, secret);
    logger.info(`VerifyPlayerToken: ${payload.customerId} = ${customerId} && ${payload.videoUrl} == ${videoUrl}`);
    return (payload.customerId == customerId && payload.videoUrl == videoUrl);
    
}



/**
 * Get the player URL for a video to use with Vimeo SDK
 * @param {string} videoUrl 
 * @returns "https://player.vimeo.com/video/...."
 */
const normaliseVideoUrl = (videoUrl) => {

  const trimmed = videoUrl.trim();
  
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'vimeo.com' || parsed.hostname.endsWith('.vimeo.com')) {
      const match = parsed.pathname.match(/\/+(\d+)(?:\/|$)/);
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }
    return trimmed;
  } catch (err) {
    logger.error(`Unable to normalise URL ${videoUrl} for player: ${err}`);
    return null;
  }
};



/**
 * Render the player page
 * @param {string} customerId to check if there is a licence for this video
 * @param {string} videoUrl what to play
 * @returns {object} containing at least `statusCode` and `body`
 */
export const renderPlayer = async (customerId, videoUrl) => {
  if (! customerId || !videoUrl) {
    logger.warn(`Cannot render Player: Expected customerId and videoUrl but got ${customerId}, ${videoUrl}`);
    return {status: 400, body: "Unable to play video"};
  }

  try {
    
    //TODO: expired?
    if (!isLicenced(customerId, videoUrl)) {
        logger.warn(`Will not render Player: CustomerId '${customerId}' has no current licence for videoUrl '${videoUrl}'`);
        return {status:401, body: "Content has no valid unexpired licence."};
    }
    
  } catch (err) {
    logger.error(`Cannot render Player: ${err}`);
    return {status: 500, body:"Unable to play video"};
  }

  
  const finalUrl = normaliseVideoUrl(videoUrl);
  logger.info(`[Player.js] Normalised ${videoUrl} to ${finalUrl}`);
  
  if (!finalUrl) {
    logger.error(`Cannot render Player: videoUrl '${videoUrl}' cannot be normalised`);
    return {status: 500, body: "Unable to play video"};
  }

  return {
    statusCode: 200, 
    headers: {
        'Content-Type': 'text/html'
    },
    body:`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Video Player</title>
        <style>
          html, body {
            margin: 0;
            min-height: 100%;
            background: #000;
            font-family: Arial, sans-serif;
          }

          body {
            display: block;
            background: #82cfea;
          }

          .player-shell {
            width: min(90vw, 960px);
            margin: 24px auto 0;
            aspect-ratio: 16 / 9;
            background: #111;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
          }

          iframe {
            width: 100%;
            height: 100%;
            border: 0;
          }
        
          .icon {
            width: 20px;
            height: 20px;
            display: inline-block;
            vertical-align: middle;
          }
            /* 1. Announcement bar container & light blue background */
announcement-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #d9ecf5; /* Empower Therapies light blue bar */
  color: #121212;
  padding: 8px 24px;
  font-family: inherit;
  font-size: 14px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

/* 2. Arrange social media icons horizontally */
announcement-bar ul,
announcement-bar .list-social {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}

announcement-bar .list-social__item {
  display: flex;
  align-items: center;
}

/* 3. Size and color the social SVGs */
announcement-bar .list-social__link {
  display: inline-flex;
  align-items: center;
  color: #121212;
  text-decoration: none;
}

announcement-bar .icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* 4. Hide the screen-reader-only text labels ("Facebook", "YouTube", "Instagram") */
announcement-bar .visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 5. Center the announcement message & style arrows */
announcement-bar .announcement-bar__message,
announcement-bar a:not(.list-social__link) {
  color: #121212;
  text-decoration: none;
  font-weight: 500;
}

announcement-bar button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #121212;
  padding: 4px 8px;
}
        </style>
      </head>
      <body>
        <announcement-bar id="section-id-sections--22355422052492__announcement-bar" class="announcement-bar announcement-bar--with-announcement cc-animate-init cc-animate-in" data-cc-animate="">
            <style data-shopify="">
                #section-id-sections--22355422052492__announcement-bar {
                --bg-color: #82cfea;
                --heading-color: 255 255 255;
                --text-color: 255 255 255;
                --link-color: 255 255 255;
                --announcement-font-size: 14px;
            }
            </style>

            <div class="container container--no-max">
            <div class="announcement-bar__left desktop-only">
        
                <ul class="social inline-flex flex-wrap">
                
                    <li><a><button onclick="history.back()">◀ Return to My Videos</button></a></li>

                    <li><a class="social__link flex items-center justify-center" href="https://www.facebook.com/empowertherapies" target="_blank" rel="noopener" title="Empower Therapies on Facebook"><svg aria-hidden="true" class="icon icon-facebook" viewBox="2 2 16 16" focusable="false" role="presentation"><path fill="currentColor" d="M18 10.049C18 5.603 14.419 2 10 2c-4.419 0-8 3.603-8 8.049C2 14.067 4.925 17.396 8.75 18v-5.624H6.719v-2.328h2.03V8.275c0-2.017 1.195-3.132 3.023-3.132.874 0 1.79.158 1.79.158v1.98h-1.009c-.994 0-1.303.621-1.303 1.258v1.51h2.219l-.355 2.326H11.25V18c3.825-.604 6.75-3.933 6.75-7.951Z"></path></svg><span class="visually-hidden">Facebook</span>
                    </a></li>
                
                    <li><a class="social__link flex items-center justify-center" href="http://www.youtube.com/user/empowertherapies" target="_blank" rel="noopener" title="Empower Therapies on YouTube"><svg class="icon" width="48" height="34" viewBox="0 0 48 34" aria-hidden="true" focusable="false" role="presentation"><path d="m19.044 23.27-.001-13.582 12.968 6.814-12.967 6.768ZM47.52 7.334s-.47-3.33-1.908-4.798C43.787.61 41.74.601 40.803.49 34.086 0 24.01 0 24.01 0h-.02S13.914 0 7.197.49C6.258.6 4.213.61 2.387 2.535.947 4.003.48 7.334.48 7.334S0 11.247 0 15.158v3.668c0 3.912.48 7.823.48 7.823s.468 3.331 1.906 4.798c1.827 1.926 4.226 1.866 5.294 2.067C11.52 33.885 24 34 24 34s10.086-.015 16.803-.505c.938-.113 2.984-.122 4.809-2.048 1.439-1.467 1.908-4.798 1.908-4.798s.48-3.91.48-7.823v-3.668c0-3.911-.48-7.824-.48-7.824Z" fill="currentColor" fill-rule="evenodd"></path></svg><span class="visually-hidden">YouTube</span>
                    </a></li>
                
                    <li><a class="social__link flex items-center justify-center" href="https://www.instagram.com/empowertherapies" target="_blank" rel="noopener" title="Empower Therapies on Instagram"><svg class="icon" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false" role="presentation"><path d="M24 0c-6.518 0-7.335.028-9.895.144-2.555.117-4.3.523-5.826 1.116-1.578.613-2.917 1.434-4.25 2.768C2.693 5.362 1.872 6.701 1.26 8.28.667 9.806.26 11.55.144 14.105.028 16.665 0 17.482 0 24s.028 7.335.144 9.895c.117 2.555.523 4.3 1.116 5.826.613 1.578 1.434 2.917 2.768 4.25 1.334 1.335 2.673 2.156 4.251 2.77 1.527.592 3.271.998 5.826 1.115 2.56.116 3.377.144 9.895.144s7.335-.028 9.895-.144c2.555-.117 4.3-.523 5.826-1.116 1.578-.613 2.917-1.434 4.25-2.768 1.335-1.334 2.156-2.673 2.77-4.251.592-1.527.998-3.271 1.115-5.826.116-2.56.144-3.377.144-9.895s-.028-7.335-.144-9.895c-.117-2.555-.523-4.3-1.116-5.826-.613-1.578-1.434-2.917-2.768-4.25-1.334-1.335-2.673-2.156-4.251-2.769-1.527-.593-3.271-1-5.826-1.116C31.335.028 30.518 0 24 0Zm0 4.324c6.408 0 7.167.025 9.698.14 2.34.107 3.61.498 4.457.827 1.12.435 1.92.955 2.759 1.795.84.84 1.36 1.64 1.795 2.76.33.845.72 2.116.827 4.456.115 2.53.14 3.29.14 9.698s-.025 7.167-.14 9.698c-.107 2.34-.498 3.61-.827 4.457-.435 1.12-.955 1.92-1.795 2.759-.84.84-1.64 1.36-2.76 1.795-.845.33-2.116.72-4.456.827-2.53.115-3.29.14-9.698.14-6.409 0-7.168-.025-9.698-.14-2.34-.107-3.61-.498-4.457-.827-1.12-.435-1.92-.955-2.759-1.795-.84-.84-1.36-1.64-1.795-2.76-.33-.845-.72-2.116-.827-4.456-.115-2.53-.14-3.29-.14-9.698s.025-7.167.14-9.698c.107-2.34.498-3.61.827-4.457.435-1.12.955-1.92 1.795-2.759.84-.84 1.64-1.36 2.76-1.795.845-.33 2.116-.72 4.456-.827 2.53-.115 3.29-.14 9.698-.14Zm0 7.352c-6.807 0-12.324 5.517-12.324 12.324 0 6.807 5.517 12.324 12.324 12.324 6.807 0 12.324-5.517 12.324-12.324 0-6.807-5.517-12.324-12.324-12.324ZM24 32a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm15.691-20.811a2.88 2.88 0 1 1-5.76 0 2.88 2.88 0 0 1 5.76 0Z" fill="currentColor" fill-rule="evenodd"></path></svg><span class="visually-hidden">Instagram</span>
                    </a></li>

                    <li><a><img class="logo__image" src="//empowertherapies.co.nz/cdn/shop/files/empower-alt_1.png?v=1701997849&amp;width=206" alt="Empower Therapies" itemprop="logo" width="206" height="40" loading="eager"></a></li>
                </ul>
                
            </div>

    </announcement-bar>

        <div class="player-shell">
          <iframe
            id="vimeo-player"
            src="${finalUrl}"
            allow="autoplay; fullscreen; picture-in-picture"
            allowfullscreen
            title="Vimeo video player"
          ></iframe>
        </div>

        <script src="https://player.vimeo.com/api/player.js"></script>
        <script>
            let lastSavedTime = 0;
            const SAVE_INTERVAL_SECONDS = 15; // Only write to DB every 15 seconds
    
            async function shipAnalyticsToDynamoDB(player, isFinalCall = false) {
                try {
                    // Fetch the current ranges and total duration from Vimeo
                    const [playedRanges, duration] = await Promise.all([
                        player.getPlayed(),
                        player.getDuration()
                    ]);

                    // Calculate unique seconds watched
                    let uniqueSeconds = 0;
                    playedRanges.forEach(range => {
                        uniqueSeconds += (range[1] - range[0]);
                    });
                    
                    // must match StepFunction
                    //const payload = JSON.stringify({
                    //    "customerId": { "S": "${customerId}" },
                    //    "videoUrl": { "S": "${finalUrl}" },
                    //    "uniqueSeconds": { "N" : String(Math.round(uniqueSeconds)) },
                    //    "coveragePercent":{ "N": String(Math.round((uniqueSeconds / duration) * 100)) },
                    //    "timestamp": { "N": String(Date.now()) }
                    //});
                    const payload = JSON.stringify({
                        customerId: "${customerId}",
                        videoUrl: "${finalUrl}",
                        uniqueSeconds: Math.round(uniqueSeconds),
                        coveragePercent:Math.round((uniqueSeconds / duration) * 100),
                        timestamp: String(Date.now())
                    });

                    const url = '/viewstats';

                    if (isFinalCall) {
                        // fetch() will fail if the tab is closing.
                        // sendBeacon runs asynchronously in the background and is guaranteed to finish.
                        const blob = new Blob([payload], { type: 'application/json' });
                        navigator.sendBeacon(url, blob);
                        console.log('Final analytics queued via sendBeacon.');
                    } else {
                        // Standard light network request during normal playback
                        await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: payload
                        });
                        console.log('Throttled analytics written to DynamoDB.');
                    }
                } catch (error) {
                    console.error('Analytics sync failed:', error);
                }
            }

          try {
            const iframe = document.getElementById('vimeo-player');
            if (iframe && window.Vimeo && window.Vimeo.Player) {
              const player = new Vimeo.Player(iframe);
              player.ready().then(() => {
                try { player.play(); } catch (error) { console.warn('Autoplay was blocked:', error); }
              });

              // POST viewing stats every 15 seconds
              player.on('timeupdate', function(data) {
                  // If the user has progressed 15s past our last save point, write to DB
                  if (data.seconds - lastSavedTime >= SAVE_INTERVAL_SECONDS) {
                      lastSavedTime = data.seconds;
                      shipAnalyticsToDynamoDB(player, false);
                  }
              });

              // also save immediately when they pause or finish the video
              player.on('pause', () => shipAnalyticsToDynamoDB(player, false));
              player.on('ended', () => shipAnalyticsToDynamoDB(player, false));

              // also when tab or window closes or back button fires
              document.addEventListener('visibilitychange', function() {
                  if (document.visibilityState === 'hidden') {
                      shipAnalyticsToDynamoDB(player, true); // true flags it to use sendBeacon
                  }
              });
            }
          } catch (error) {
            console.warn('Unable to initialise Vimeo Player SDK:', error);
          }
        </script>
      </body>
    </html>`
    };
}


const renderBadArgs = () => {
    return {
        statusCode: 401,
        body:`<html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Video Player</title>
      </head>
      <body>
        <button onclick="history.back()">Go Back</button>
        Unable to play this video.
      </body>
    </html>`
    };
}