import { expect } from 'chai';
import { spec } from 'modules/eplanningBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('E-Planning Adapter', () => {
  const adapter = newBidder('spec');
  const CI = '12345';
  const ADUNIT_CODE = 'adunit-code';
  const CPM = 1.3;
  const W = '300';
  const H = '250';
  const ADM = '<div>This is an ad</div>';
  const I_ID = '7854abc56248f873';
  const CRID = '1234567890';
  const validBid = {
    'bidder': 'eplanning',
    'params': {
      'ci': CI,
    },
    'adUnitCode': ADUNIT_CODE,
    'sizes': [[300, 250], [300, 600]],
  };
  const invalidBid = {
    'bidder': 'eplanning',
    'params': {
    },
    'adUnitCode': 'adunit-code',
    'sizes': [[300, 250], [300, 600]],
  };
  const response = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': 'spname',
        'a': [{
          'adm': ADM,
          'id': '7854abc56248f874',
          'i': I_ID,
          'fi': '7854abc56248f872',
          'ip': '45621afd87462104',
          'w': W,
          'h': H,
          'crid': CRID,
          'pr': CPM
        }],
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseWithNoAd = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'sp': [{
        'k': 'spname',
      }],
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };
  const responseWithNoSpace = {
    body: {
      'sI': {
        'k': '12345'
      },
      'sec': {
        'k': 'ROS'
      },
      'cs': [
        'http://a-sync-url.com/',
        {
          'u': 'http://another-sync-url.com/test.php?&partner=123456&endpoint=us-east',
          'ifr': true
        }
      ]
    }
  };

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true when bid has ci parameter', () => {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when bid does not have ci parameter', () => {
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [validBid];

    it('should create the url correctly', () => {
      const url = spec.buildRequests(bidRequests).url;
      expect(url).to.equal('//ads.us.e-planning.net/hb/1/' + CI + '/1/localhost/ROS');
    });

    it('should return GET method', () => {
      const method = spec.buildRequests(bidRequests).method;
      expect(method).to.equal('GET');
    });

    it('should return r parameter with value pbjs', () => {
      const r = spec.buildRequests(bidRequests).data.r;
      expect(r).to.equal('pbjs');
    });

    it('should return pbv parameter with value prebid version', () => {
      const pbv = spec.buildRequests(bidRequests).data.pbv;
      expect(pbv).to.equal('$prebid.version$');
    });

    it('should return e parameter with value according to the adunit sizes', () => {
      const e = spec.buildRequests(bidRequests).data.e;
      expect(e).to.equal(ADUNIT_CODE + ':300x250,300x600');
    });

    it('should return correct e parameter with more than one adunit', () => {
      const NEW_CODE = ADUNIT_CODE + '2';
      const anotherBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
        },
        'adUnitCode': NEW_CODE,
        'sizes': [[100, 100]],
      };
      bidRequests.push(anotherBid);

      const e = spec.buildRequests(bidRequests).data.e;
      expect(e).to.equal(ADUNIT_CODE + ':300x250,300x600+' + NEW_CODE + ':100x100');
    });

    it('should return correct e parameter when the adunit has no size', () => {
      const noSizeBid = {
        'bidder': 'eplanning',
        'params': {
          'ci': CI,
        },
        'adUnitCode': ADUNIT_CODE,
      };

      const e = spec.buildRequests([noSizeBid]).data.e;
      expect(e).to.equal(ADUNIT_CODE + ':1x1');
    });

    it('should return ur parameter with current window url', () => {
      const ur = spec.buildRequests(bidRequests).data.ur;
      expect(ur).to.equal(utils.getTopWindowUrl());
    });

    it('should return fr parameter when there is a referrer', () => {
      const referrer = 'thisisafakereferrer';
      const stubGetReferrer = sinon.stub(utils, 'getTopWindowReferrer').returns(referrer);

      const fr = spec.buildRequests(bidRequests).data.fr;
      expect(fr).to.equal(referrer);

      stubGetReferrer.restore();
    });
  });

  describe('interpretResponse', () => {
    it('should return an empty array when there is no ads in the response', () => {
      const bidResponses = spec.interpretResponse(responseWithNoAd);
      expect(bidResponses).to.be.empty;
    });

    it('should return an empty array when there is no spaces in the response', () => {
      const bidResponses = spec.interpretResponse(responseWithNoSpace);
      expect(bidResponses).to.be.empty;
    });

    it('should correctly map the parameters in the response', () => {
      const bidResponse = spec.interpretResponse(response)[0];
      const expectedResponse = {
        requestId: I_ID,
        cpm: CPM,
        width: W,
        height: H,
        ad: ADM,
        ttl: 360,
        creativeId: CRID,
        netRevenue: true,
        currency: 'USD',
      };

      expect(bidResponse).to.deep.equal(expectedResponse);
    });
  });

  describe('getUserSyncs', () => {
    const sOptionsAllEnabled = {
      pixelEnabled: true,
      iframeEnabled: true
    };
    const sOptionsAllDisabled = {
      pixelEnabled: false,
      iframeEnabled: false
    };
    const sOptionsOnlyPixel = {
      pixelEnabled: true,
      iframeEnabled: false
    };
    const sOptionsOnlyIframe = {
      pixelEnabled: false,
      iframeEnabled: true
    };

    it('should return an empty array if the response has no syncs', () => {
      const noSyncsResponse = { cs: [] };
      const syncs = spec.getUserSyncs(sOptionsAllEnabled, [noSyncsResponse]);
      expect(syncs).to.be.empty;
    });

    it('should return an empty array if there is no sync options enabled', () => {
      const syncs = spec.getUserSyncs(sOptionsAllDisabled, [response]);
      expect(syncs).to.be.empty;
    });

    it('should only return pixels if iframe is not enabled', () => {
      const syncs = spec.getUserSyncs(sOptionsOnlyPixel, [response]);
      syncs.forEach(sync => expect(sync.type).to.equal('image'));
    });

    it('should only return iframes if pixel is not enabled', () => {
      const syncs = spec.getUserSyncs(sOptionsOnlyIframe, [response]);
      syncs.forEach(sync => expect(sync.type).to.equal('iframe'));
    });
  });
});
