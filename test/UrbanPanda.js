const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');

const UrbanPanda = artifacts.require('UrbanPanda');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');

contract('UrbanPanda', (accounts) => {
    let urbanPanda;

    const [alice, bob, curtis, dick] = accounts;

    const init = async (urbanPanda) => {
        const wethAddress = '0x0000000000000000000000000000000000000001';
        await urbanPanda.initialize(alice, wethAddress);
    };

    beforeEach(async () => {
        const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
        const uniswapV2Helper = await UniswapV2Helper.new();
        urbanPanda = await UrbanPanda.new(uniswapV2FactoryAddress, uniswapV2Helper.address);
    });

    it('should prevent direct calls to AccessControl contract public methods', async () => {
        const adminRole = await urbanPanda.DEFAULT_ADMIN_ROLE();
        await shouldThrow(urbanPanda.revokeRole(adminRole, alice));
        await shouldThrow(urbanPanda.renounceRole(adminRole, alice));
        await shouldThrow(urbanPanda.grantRole(adminRole, alice));
    });

    it('should not be initialized after deploy', async () => {
        const isInitialized = await urbanPanda.isInitialized();
        expect(isInitialized).to.equal(false);
    });

    it('should allow initalization only once', async () => {
        await init(urbanPanda);
        const minter = await urbanPanda.getMinter();
        expect(minter).to.equal(alice);
        await shouldThrow(init(urbanPanda));
    });

    it('should not allow minting without minter role', async () => {
        await shouldThrow(urbanPanda.mint(alice, 10000));
    });

    it('should allow minter to mint tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await init(urbanPanda);
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        const bobBalance = await urbanPanda.balanceOf(curtis);
        expect(bobBalance.toNumber()).to.equal(amountToMint);
    });

    it('should prevent sending tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await init(urbanPanda);
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        await shouldThrow(urbanPanda.transfer(dick, amountToMint, { from: curtis }));
    });

    it('should allow minter to send tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await init(urbanPanda);
        const amountToMint = 10000;
        await urbanPanda.mint(alice, amountToMint);
        await urbanPanda.transfer(dick, amountToMint, { from: alice });
        const dickBalance = await urbanPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should allow sending tokens when they are unlocked', async () => {
        await init(urbanPanda);
        await urbanPanda.unlock();
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        await urbanPanda.transfer(dick, amountToMint, { from: curtis });
        const curtisBalance = await urbanPanda.balanceOf(curtis);
        expect(curtisBalance.toNumber()).to.equal(0);
        const dickBalance = await urbanPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should allow minter address tokens to be sent if approved when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await init(urbanPanda);
        const amountToMint = 10000;
        await urbanPanda.mint(alice, amountToMint);
        await urbanPanda.approve(curtis, amountToMint);
        await urbanPanda.transferFrom(alice, dick, amountToMint, {
            from: curtis,
        });
        const aliceBalance = await urbanPanda.balanceOf(alice);
        expect(aliceBalance.toNumber()).to.equal(0);
        const dickBalance = await urbanPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should deny non-minter address tokens to be sent if approved when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await init(urbanPanda);
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        await urbanPanda.approve(dick, amountToMint, { from: curtis });
        await shouldThrow(
            urbanPanda.transferFrom(curtis, alice, amountToMint, {
                from: dick,
            })
        );
    });
});
