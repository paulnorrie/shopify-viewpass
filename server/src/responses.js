/**
 * @file Standard Responses
 * 
 */


/**
 * HTTP 403 Forbidden
 */
export const StdRespBadRequest = {
    statusCode: 401,
    body: "Bad Request",
};

/**
 * HTTP 404 Not Found
 */
export const StdRespNotFound = {
    statusCode:404, 
    body:"Not Found"
};


/**
 * HTTP 403 Forbidden
 */
export const StdRespForbidden = {
                            statusCode: 403,
                            body: "Forbidden",
                        };

/**
 * HTTP 500 Not Found
 */
export const StdRespServerError = {
    statusCode:500, 
    body:"Server Error"
};



/** 
 * Create a standard Okay (200) response
 * @param {string} contentType
 * @param {string} body
 */
export const StdRespOk = (contentType, body) => {
    if (contentType == undefined || body == undefined) {
        throw Error(`Undefined parameter to StdRespOk`);
    }
    return {
        statusCode:200,
        "Content-Type": contentType,
        body:body
    };
}