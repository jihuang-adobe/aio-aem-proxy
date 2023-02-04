/*
* <license header>
*/

/**
 * This is a sample action showcasing how to access an external API
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */


const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, getReferer, stringParameters, checkMissingRequestInputs, checkInAllowList } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {  
    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // get referrer
    const referer = getReferer(params)

    // get allow list origin
    const allowlistOrigin = params.allowlist_origin

    // get domain and hostname
    const domain = (new URL(referer))
    const hostname = domain.hostname

    // check allow list for origin
    const errorMessageAllowListOrigin = checkInAllowList(allowlistOrigin, hostname)
    if (errorMessageAllowListOrigin) {
      // return and log client errors
      return errorResponse(400, errorMessageAllowListOrigin, logger)
    }

    // return if OPTIONS
    if (params.__ow_method.toLowerCase() == "options") {
      return {
        headers: {
          'Access-Control-Allow-Origin': referer,
          'Access-Control-Allow-Credentials': true,
          'Access-Control-Allow-Headers': 'Authorization, content-type, aem-url'
        },
        statusCode: 200
      }
    }

    // check for missing request input parameters and headers
    const requiredParams = []
    const requiredHeaders = ['aem-url']
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // get allow list destination
    const allowlistDestination = params.allowlist_destination

    // get destination url
    const destUrl = params.__ow_headers['aem-url']

    // check allow list for destination
    const errorMessageAllowListDestination = checkInAllowList(allowlistDestination, destUrl)
    if (errorMessageAllowListDestination) {
      // return and log client errors
      return errorResponse(400, errorMessageAllowListDestination, logger)
    }

    // get authorization
    const authorization = params.__ow_headers.authorization

    // replace this with the api you want to access
    const apiEndpoint = destUrl.replace(/\/+$/, '')
    const persistedQueryPath = params.__ow_path.replace(';', '%3B')

    // fetch content from external api endpoint
    const res = await fetch(
        apiEndpoint + persistedQueryPath, {
          headers: {
            authorization: authorization
          }
        }
    )
    if (!res.ok) {
      throw new Error('request to ' + apiEndpoint + persistedQueryPath + ' with authorization ' +  authorization + ' failed with status code ' + res.status)
    }
    
    logger.debug(apiEndpoint + persistedQueryPath)

    const content = res.headers.get('Content-Type').match(/html/i) ? await res.text() : await res.json();

    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': referer,
        'Access-Control-Allow-Credentials': true,
        'testing': Date.now()
      },
      body: content
    }

    // log the response status code
    logger.info(`${response.statusCode}: successful request`)

    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error: ' + error, logger)
  }
}

exports.main = main