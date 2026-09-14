/**
 * @file Render a Vimeo Player
 */
import jwt from 'jsonwebtoken';
import { getLicences, isLicenced } from "./licences.js";
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
    logger.info(`CreatePlayerToken: secret ${secret}`);
    logger.info(`CreatePlayerToken: token ${token}`);

    const valid = verifyPlayerToken(token, customerId, videoUrl, secret);
    logger.info(`CreatePlayerToken: valid ${valid}`);
    return token;
}



/**
 * Verify a given JWT token issued by `createPlayerToken`.
 *  
 * @param {string} token to verify
 * @param {string} customerId that should be in the token 
 * @param {string} videoUrl that should be in the token
 * @param {string} clientSecret used to generate the token
 */
export const verifyPlayerToken = (token, customerId, videoUrl, secret) => {
    try {
        logger.info(`VerifyPlayerToken: secret ${secret}`);
        logger.info(`VerifyPlayerToken: token ${token}`);
        const payload = jwt.verify(token, secret);
        logger.info(`VerifyPlayerToken: ${payload.customerId} = ${customerId} && ${payload.videoUrl} == ${videoUrl}`);
        return (payload.customerId == customerId && payload.videoUrl == videoUrl);
    } catch (error) {
        logger.error(`Error Verifying Player Token: ${error}`);
        return false;
    }
    
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
    logger.error(`Unable to normalise URL ${videoUrl} for player`);
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
            background: #000;
          }

          .header {
            width: 100vw;
            margin-left: calc(50% - 50vw);
            background: #777777;
            padding: 16px 24px;
            box-sizing: border-box;
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
        </style>
      </head>
      <body>
        <div class="header">
            <button onclick="history.back()">Go Back</button>
        </div>
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
          try {
            const iframe = document.getElementById('vimeo-player');
            if (iframe && window.Vimeo && window.Vimeo.Player) {
              const player = new Vimeo.Player(iframe);
              player.ready().then(() => {
                try { player.play(); } catch (error) { console.warn('Autoplay was blocked:', error); }
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