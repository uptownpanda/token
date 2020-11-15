const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');
const { time } = require('@openzeppelin/test-helpers');
const { getUptownPandaTestInstanceWithDependencies, getFarmMocks } = require('./helpers/testInstances');

contract('UptownPanda', (accounts) => {
    let uptownPanda;

    const [alice, bob, curtis, dick] = accounts;

    const init = async (uptownPanda) => {
        const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        const { upFarmMock, upEthFarmMock, wethFarmMock, wbtcFarmMock } = await getFarmMocks();
        await uptownPanda.initialize(
            alice,
            wethAddress,
            upFarmMock.address,
            upEthFarmMock.address,
            wethFarmMock.address,
            wbtcFarmMock.address
        );
    };

    beforeEach(async () => {
        const testInstance = await getUptownPandaTestInstanceWithDependencies();
        uptownPanda = testInstance.uptownPanda;
    });

    it('should prevent direct calls to AccessControl contract public methods', async () => {
        const adminRole = await uptownPanda.DEFAULT_ADMIN_ROLE();
        await shouldThrow(uptownPanda.revokeRole(adminRole, alice));
        await shouldThrow(uptownPanda.renounceRole(adminRole, alice));
        await shouldThrow(uptownPanda.grantRole(adminRole, alice));
    });

    it('should not be initialized after deploy', async () => {
        const isInitialized = await uptownPanda.isInitialized();
        expect(isInitialized).to.equal(false);
    });

    it('should allow initalization only once', async () => {
        await init(uptownPanda);
        const minter = await uptownPanda.getMinter();
        expect(minter).to.equal(alice);
        await shouldThrow(init(uptownPanda));
    });

    it('should not allow minting without minter role', async () => {
        await shouldThrow(uptownPanda.mint(alice, 10000));
    });

    it('should allow minter to mint tokens when they are locked', async () => {
        const isPaused = await uptownPanda.paused();
        expect(isPaused).to.equal(true);
        await init(uptownPanda);
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        const bobBalance = await uptownPanda.balanceOf(curtis);
        expect(bobBalance.toNumber()).to.equal(amountToMint);
    });

    it('should prevent sending tokens when they are locked', async () => {
        const isPaused = await uptownPanda.paused();
        expect(isPaused).to.equal(true);
        await init(uptownPanda);
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        await shouldThrow(uptownPanda.transfer(dick, amountToMint, { from: curtis }));
    });

    it('should allow minter to send tokens when they are locked', async () => {
        const isPaused = await uptownPanda.paused();
        expect(isPaused).to.equal(true);
        await init(uptownPanda);
        const amountToMint = 10000;
        await uptownPanda.mint(alice, amountToMint);
        await uptownPanda.transfer(dick, amountToMint, { from: alice });
        const dickBalance = await uptownPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should allow sending tokens when they are unlocked', async () => {
        await init(uptownPanda);
        await uptownPanda.unlock();
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        const result = await uptownPanda.transfer(dick, amountToMint, { from: curtis });
        expect(result.receipt.status).to.equal(true);
    });

    it('should calculate full burn percent on wallet to wallet send under sell penalty interval', async () => {
        await init(uptownPanda);
        await uptownPanda.unlock();
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        await uptownPanda.transfer(dick, amountToMint, { from: curtis });
        const curtisBalance = await uptownPanda.balanceOf(curtis);
        expect(curtisBalance.toNumber()).to.equal(0);
        const dickBalance = await uptownPanda.balanceOf(dick);
        const maxBurnPercent = await uptownPanda.MAX_BURN_PERCENT();
        const expectedDickBalance = amountToMint - Math.floor((amountToMint * maxBurnPercent) / 100);
        expect(dickBalance.toNumber()).to.equal(expectedDickBalance);
    });

    it('should calculate wallet to wallet burn percent on wallet to wallet send after sell penalty interval', async () => {
        await init(uptownPanda);
        await uptownPanda.unlock();
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        await time.increase(time.duration.minutes(6));
        await uptownPanda.transfer(dick, amountToMint, { from: curtis });
        const curtisBalance = await uptownPanda.balanceOf(curtis);
        expect(curtisBalance.toNumber()).to.equal(0);
        const dickBalance = await uptownPanda.balanceOf(dick);
        const walletToWalletBurnPercent = await uptownPanda.WALLET_TO_WALLET_BURN_PERCENT();
        const expectedDickBalance = amountToMint - Math.floor((amountToMint * walletToWalletBurnPercent) / 100);
        expect(dickBalance.toNumber()).to.equal(expectedDickBalance);
    });

    it('should allow minter address tokens to be sent if approved when they are locked', async () => {
        const isPaused = await uptownPanda.paused();
        expect(isPaused).to.equal(true);
        await init(uptownPanda);
        const amountToMint = 10000;
        await uptownPanda.mint(alice, amountToMint);
        await uptownPanda.approve(curtis, amountToMint);
        await uptownPanda.transferFrom(alice, dick, amountToMint, {
            from: curtis,
        });
        const aliceBalance = await uptownPanda.balanceOf(alice);
        expect(aliceBalance.toNumber()).to.equal(0);
        const dickBalance = await uptownPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should deny non-minter address tokens to be sent if approved when they are locked', async () => {
        const isPaused = await uptownPanda.paused();
        expect(isPaused).to.equal(true);
        await init(uptownPanda);
        const amountToMint = 10000;
        await uptownPanda.mint(curtis, amountToMint);
        await uptownPanda.approve(dick, amountToMint, { from: curtis });
        await shouldThrow(
            uptownPanda.transferFrom(curtis, alice, amountToMint, {
                from: dick,
            })
        );
    });
});
