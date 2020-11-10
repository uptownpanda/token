const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');

const UrbanPandaTwapableMock = artifacts.require('UrbanPandaTwapableMock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');

contract('UrbanPandaTwapable', () => {
    let urbanPandaTwapable;
    let uniswapV2Oracle;

    const initializeAndSetListingTwap = async () => {
        await urbanPandaTwapable.initializeTwap(uniswapV2Oracle.address);
        await urbanPandaTwapable.setListingTwap();
    };

    beforeEach(async () => {
        urbanPandaTwapable = await UrbanPandaTwapableMock.new();
        uniswapV2Oracle = await UniswapV2OracleMock.new();
    });

    it('should throw if it not initialized', async () => {
        await shouldThrow(urbanPandaTwapable.updateTwap());
    });

    it('should throw if it list twap not set', async () => {
        await urbanPandaTwapable.initializeTwap(uniswapV2Oracle.address);
        await shouldThrow(urbanPandaTwapable.updateTwap());
    });

    it('should run update twap successfully after initialization and listing price set', async () => {
        await initializeAndSetListingTwap();
        const result = await urbanPandaTwapable.updateTwap();
        expect(result.receipt.status).to.equal(true);
    });

    it('should skip twap calculation if ran inside twap calculation interval', async () => {
        await initializeAndSetListingTwap();
        const twapCalculationInterval = (await urbanPandaTwapable.TWAP_CALCULATION_INTERVAL()).toNumber();
        expect(twapCalculationInterval).to.be.above(1);
        const currentTwapTimestamp = (await urbanPandaTwapable.currentTwapTimestamp()).toNumber();
        await uniswapV2Oracle.setTestData(0, currentTwapTimestamp + 1);
        const result = await urbanPandaTwapable.updateTwap();
        expect(result.logs).to.be.empty;
    });

    it('should recalculate twap correctly if twap calculation interval passed', async () => {
        const priceCumulativeStart = 2000 * 1e18;
        const timestampStart = Math.floor(Date.now() / 1000);
        await uniswapV2Oracle.setTestData(priceCumulativeStart, timestampStart);
        await initializeAndSetListingTwap();
        const twapCalculationInterval = (await urbanPandaTwapable.TWAP_CALCULATION_INTERVAL()).toNumber(); // this is set to 10 minutes in source code
        const priceCumulativeEnd = 14000 * 1e18;
        const timestampEnd = timestampStart + twapCalculationInterval;
        await uniswapV2Oracle.setTestData(priceCumulativeEnd, timestampEnd);
        const result = await urbanPandaTwapable.updateTwap();
        expect(result.logs).to.have.lengthOf(1);
        const newTwap = (priceCumulativeEnd - priceCumulativeStart) / (timestampEnd - timestampStart);
        console.log(
            'data',
            newTwap,
            result.logs[0].args.newTwap.toNumber(),
            result.logs[0].args.priceCumulative.toNumber(),
            result.logs[0].args.blockTimestamp.toNumber()
        );
    });
});
