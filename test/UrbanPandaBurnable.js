const { expect } = require('chai');
const UrbanPandaBurnableMock = artifacts.require('UrbanPandaBurnableMock');
const { increase, duration } = require('./helpers/time');

contract('UrbanPandaBurnable', (accounts) => {
    let urbanPandaBurnable;
    const [alice] = accounts;

    beforeEach(async () => {
        urbanPandaBurnable = await UrbanPandaBurnableMock.new();
    });

    // TODO - write tests
});

const getListingAndTwapPrices = (twapPriceMultiplier) => {
    return {
        listing: (twapPriceMultiplier * 1e18).toString(),
        twap: (1e18).toString(),
    };
};
