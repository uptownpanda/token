const { expect } = require('chai');
const UptownPandaBurnableMock = artifacts.require('UptownPandaBurnableMock');
const { increase, duration } = require('./helpers/time');

contract('UptownPandaBurnable', (accounts) => {
    let uptownPandaBurnable;
    const [alice] = accounts;

    beforeEach(async () => {
        uptownPandaBurnable = await UptownPandaBurnableMock.new();
    });

    it('should retrieve single amount to burn if no log entries added', async () => {
        const prices = getListingAndTwapPrices(2);
        await uptownPandaBurnable.setTestData(false, prices.listing, prices.twap);
        const result = await uptownPandaBurnable.getAmountsToBurn(alice, (1e18).toString());
        expect(result.logs).to.have.lengthOf(1);
    });

    it('should retrieve two amounts to burn if single log entry added that is smaller than sell amount', async () => {
        const prices = getListingAndTwapPrices(2);
        await uptownPandaBurnable.setTestData(false, prices.listing, prices.twap);
        const buyResult = await uptownPandaBurnable.logBuy(alice, (1e18).toString());
        expect(buyResult.logs).to.have.lengthOf(1);
        const sellResult = await uptownPandaBurnable.getAmountsToBurn(alice, (2e18).toString());
        expect(sellResult.logs).to.have.lengthOf(2);
    });

    it('should calculate burn as max if sell penalty interval has not passed yet', async () => {
        const priceMultiplier = await uptownPandaBurnable.MAX_BURN_PRICE_MULTIPLIER();
        const prices = getListingAndTwapPrices(priceMultiplier + 1); // this must be set, otherwise max burn would be calculated anyway
        await uptownPandaBurnable.setTestData(false, prices.listing, prices.twap);
        const sellResult = await uptownPandaBurnable.getAmountsToBurn(alice, (1e18).toString());
        const maxBurn = await uptownPandaBurnable.MAX_BURN_PERCENT() * 1e16;
        expect(sellResult.logs).to.have.lengthOf(1);
        expect(sellResult.logs[0].args.buyAmount.toString()).to.equal('1000000000000000000');
        expect(sellResult.logs[0].args.burnAmount.toString()).to.equal(maxBurn.toString());
    });

    it('should calculate wallet to wallet burn if wallets transfer happened after sell penalty', async () => {
        const prices = getListingAndTwapPrices(1);
        await uptownPandaBurnable.setTestData(true, prices.listing, prices.twap);
        const sellPenaltyInterval = await uptownPandaBurnable.SELL_PENALTY_INTERVAL();
        await increase(sellPenaltyInterval);
        const sellAmount = (1e18).toString();
        const sellResult = await uptownPandaBurnable.getAmountsToBurn(alice, sellAmount);
        const walletToWalletBurn = await uptownPandaBurnable.WALLET_TO_WALLET_BURN_PERCENT() * 1e16;
        expect(sellResult.logs).to.have.lengthOf(1);
        expect(sellResult.logs[0].args.buyAmount.toString()).to.equal(sellAmount);
        expect(sellResult.logs[0].args.burnAmount.toString()).to.equal(walletToWalletBurn.toString());
    });

    it('should calculate max burn if the current price is under twap calculation treshold', async () => {
        const priceMultiplier = await uptownPandaBurnable.MAX_BURN_PRICE_MULTIPLIER();
        const prices = getListingAndTwapPrices(priceMultiplier);
        await uptownPandaBurnable.setTestData(false, prices.listing, prices.twap);
        const sellPenaltyInterval = await uptownPandaBurnable.SELL_PENALTY_INTERVAL();
        //await increase(sellPenaltyInterval);
        //const sellAmount = (1e18).toString();
        //const sellResult = await uptownPandaBurnable.getAmountsToBurn(alice, sellAmount);
        //const maxBurn = await uptownPandaBurnable.MAX_BURN_PERCENT() * 1e16;
        //expect(sellResult.logs[0].args.buyAmount.toString()).to.equal(sellAmount);
        //expect(sellResult.logs[0].args.burnAmount.toString()).to.equal(maxBurn.toString());
    });
});

const getListingAndTwapPrices = (twapPriceMultiplier) => {
    return {
        listing: (twapPriceMultiplier * 1e18).toString(),
        twap: (1e18).toString(),
    };
};
