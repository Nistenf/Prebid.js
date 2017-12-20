import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'eplanning';
const rnd = Math.random();
const DEFAULT_SV = 'ads.us.e-planning.net';
const PARAMS = ['ci', 'sv', 'isv', 't'];
const DOLLARS = 'USD';
const NET_REVENUE = true;
const TTL = 360;
const NULL_SIZE = '1x1';
const FILE = 'file';

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return Boolean(bid.params.ci);
  },
  buildRequests: function(bidRequests) {
    const method = 'GET';
    const dfpClientId = '1';
    const sec = 'ROS';
    const urlConfig = getUrlConfig(bidRequests);
    const url = '//' + (urlConfig.sv || DEFAULT_SV) + '/hb/1/' + urlConfig.ci + '/' + dfpClientId + '/' + (utils.getTopWindowLocation().hostname || FILE) + '/' + sec;
    const referrerUrl = utils.getTopWindowReferrer();
    const spacesString = getSpacesString(bidRequests);
    let params = {
      rnd: rnd,
      e: spacesString,
      ur: utils.getTopWindowUrl() || FILE,
      r: 'pbjs',
      pbv: '$prebid.version$',
    };
    if (referrerUrl) {
      params.fr = referrerUrl;
    }

    return {
      method: method,
      url: url,
      data: params,
    };
  },
  interpretResponse: function(serverResponse, request) {
    const response = serverResponse.body;
    let bidResponses = [];

    if (response && !utils.isEmpty(response.sp)) {
      response.sp.forEach(space => {
        if (!utils.isEmpty(space.a)) {
          space.a.forEach(ad => {
            const bidResponse = {
              requestId: ad.i,
              cpm: ad.pr,
              width: ad.w,
              height: ad.h,
              ad: ad.adm,
              ttl: TTL,
              creativeId: ad.crid,
              netRevenue: NET_REVENUE,
              currency: DOLLARS,
            };
            bidResponses.push(bidResponse);
          });
        }
      });
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    const response = serverResponses[0].body;

    if (response && !utils.isEmpty(response.cs)) {
      const responseSyncs = response.cs;
      responseSyncs.forEach(sync => {
        if (typeof sync === 'string' && syncOptions.pixelEnabled) {
          syncs.push({
            type: 'image',
            url: 'sync',
          });
        } else if (typeof sync === 'object' && sync.ifr && syncOptions.iframeEnabled) {
          syncs.push({
            type: 'iframe',
            url: sync.u,
          })
        }
      });
    }

    return syncs;
  },
}

function getUrlConfig(bidRequests) {
  let config = {};
  bidRequests.forEach(bid => {
    PARAMS.forEach(param => {
      if (bid.params[param] && !config[param]) {
        config[param] = bid.params[param];
      }
    });
  });

  if (config.sv) {
    config.sv = '//' + config.sv;
  }

  return config;
}
function getSpacesString(bids) {
  const spacesString = bids.map(bid =>
    bid.adUnitCode + ':' + (bid.sizes && bid.sizes.length ? utils.parseSizesInput(bid.sizes).join(',') : NULL_SIZE)
  ).join('+');

  return spacesString;
}

registerBidder(spec);
