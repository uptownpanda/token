const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');

const UrbanPanda = artifacts.require('UrbanPanda');

contract('UrbanPanda', (accounts) => {
    let urbanPanda;

    const [alice, bob, curtis, dick] = accounts;

    beforeEach(async () => {
        urbanPanda = await UrbanPanda.new();
    });

    it('should prevent direct calls to AccessControl contract public methods', async () => {
        const adminRole = await urbanPanda.DEFAULT_ADMIN_ROLE();
        await shouldThrow(urbanPanda.revokeRole(adminRole, alice));
        await shouldThrow(urbanPanda.renounceRole(adminRole, alice));
        await shouldThrow(urbanPanda.grantRole(adminRole, alice));
    });

    it('should not have minter set after deploy', async () => {
        const isMinterSet = await urbanPanda.isMinterSet();
        expect(isMinterSet).to.equal(false);
    });

    it('should allow setting minter only once', async () => {
        await urbanPanda.setMinter();
        const minter = await urbanPanda.getMinter();
        expect(minter).to.equal(alice);
        await shouldThrow(urbanPanda.setMinter());
    });

    it('should not allow minting without minter role', async () => {
        await shouldThrow(urbanPanda.mint(alice, 10000));
    });

    it('should allow minter to mint tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await urbanPanda.setMinter();
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        const bobBalance = await urbanPanda.balanceOf(curtis);
        expect(bobBalance.toNumber()).to.equal(amountToMint);
    });

    it('should prevent sending tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await urbanPanda.setMinter();
        const amountToMint = 10000;
        await urbanPanda.mint(curtis, amountToMint);
        await shouldThrow(urbanPanda.transfer(dick, amountToMint, { from: curtis }));
    });

    it('should allow minter to send tokens when they are locked', async () => {
        const isPaused = await urbanPanda.paused();
        expect(isPaused).to.equal(true);
        await urbanPanda.setMinter();
        const amountToMint = 10000;
        await urbanPanda.mint(alice, amountToMint);
        await urbanPanda.transfer(dick, amountToMint, { from: alice });
        const dickBalance = await urbanPanda.balanceOf(dick);
        expect(dickBalance.toNumber()).to.equal(amountToMint);
    });

    it('should allow sending tokens when they are unlocked', async () => {
        await urbanPanda.setMinter();
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
        await urbanPanda.setMinter();
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
        await urbanPanda.setMinter();
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
