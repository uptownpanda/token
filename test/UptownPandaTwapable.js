const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');

const UptownPandaTwapableMock = artifacts.require('UptownPandaTwapableMock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');

contract('UptownPandaTwapable', () => {
    let uptownPandaTwapable;
    let uniswapV2Oracle;

    const initializeAndSetListingTwap = async () => {
        await uptownPandaTwapable.initializeTwap(uniswapV2Oracle.address);
        await uptownPandaTwapable.setListingTwap();
    };

    beforeEach(async () => {
        uptownPandaTwapable = await UptownPandaTwapableMock.new();
        uniswapV2Oracle = await UniswapV2OracleMock.new();
    });

    it('should throw if it not initialized', async () => {
        await shouldThrow(uptownPandaTwapable.updateTwap());
    });

    it('should throw if it list twap not set', async () => {
        await uptownPandaTwapable.initializeTwap(uniswapV2Oracle.address);
        await shouldThrow(uptownPandaTwapable.updateTwap());
    });

    it('should run update twap successfully after initialization and listing price set', async () => {
        await initializeAndSetListingTwap();
        const result = await uptownPandaTwapable.updateTwap();
        expect(result.receipt.status).to.equal(true);
    });

    it('should skip twap calculation if ran inside twap calculation interval', async () => {
        await initializeAndSetListingTwap();
        const twapCalculationInterval = (await uptownPandaTwapable.TWAP_CALCULATION_INTERVAL()).toNumber();
        expect(twapCalculationInterval).to.be.above(1);
        const currentTwapTimestamp = (await uptownPandaTwapable.currentTwapTimestamp()).toNumber();
        await uniswapV2Oracle.setTestData(0, currentTwapTimestamp + 1);
        const result = await uptownPandaTwapable.updateTwap();
        expect(result.logs).to.be.empty;
    });

    it('should recalculate twap correctly if twap calculation interval passed', async () => {
        const priceCumulativeStart = '151071394281116726775700896169707761235';
        const timestampStart = Math.floor(Date.now() / 1000);
        await uniswapV2Oracle.setTestData(priceCumulativeStart, timestampStart);
        await initializeAndSetListingTwap();
        const twapCalculationInterval = (await uptownPandaTwapable.TWAP_CALCULATION_INTERVAL()).toNumber(); // this is set to 10 minutes in source code
        const priceCumulativeEnd = '161071394281116726775700896169707761235';
        const timestampEnd = timestampStart + twapCalculationInterval;
        await uniswapV2Oracle.setTestData(priceCumulativeEnd, timestampEnd);
        const result = await uptownPandaTwapable.updateTwap();
        expect(result.logs).to.have.lengthOf(1);
        // this is hard to validate since numbers get converted to fixed points in the background
        // this test is used just to check that twap calculation actually occures!
    });
});
