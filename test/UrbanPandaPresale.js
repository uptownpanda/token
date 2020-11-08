const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');
const { BN, expectEvent } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const UrbanPanda = artifacts.require('UrbanPanda');
const UrbanPandaLiquidityLock = artifacts.require('UrbanPandaLiquidityLock');
const UrbanPandaPresale = artifacts.require('UrbanPandaPresale');
const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');

contract('UrbanPandaPresale', (accounts) => {
    const ethPresaleSupply = 400;
    const [alice, bob, curtis, dick] = accounts;
    const teamAddress = bob;
    const whitelistAddresses = [curtis, dick];
    let urbanPandaPresale;
    let urbanPanda;
    let uniswapV2router02;

    beforeEach(async () => {
        [urbanPandaPresale, urbanPanda, uniswapV2router02] = await beforeEachReset(
            ethPresaleSupply,
            teamAddress,
            whitelistAddresses
        );
    });

    it('should have 2 addresses on whitelist', async () => {
        expect(await urbanPandaPresale.whitelistAddresses(alice)).to.equal(false);
        expect(await urbanPandaPresale.whitelistAddresses(bob)).to.equal(false);
        expect(await urbanPandaPresale.whitelistAddresses(curtis)).to.equal(true);
        expect(await urbanPandaPresale.whitelistAddresses(dick)).to.equal(true);
    });

    it('should reject an investment if presale is deactivated', async () => {
        await shouldThrow(urbanPandaPresale.send(2 * 1e18, { from: curtis }));
    });

    it('should reject an investment if account is not whitelisted', async () => {
        await activatePresale(urbanPandaPresale);
        await shouldThrow(urbanPandaPresale.send(2 * 1e18, { from: alice }));
        await shouldThrow(urbanPandaPresale.send(2 * 1e18, { from: bob }));
    });

    it('should reject an investment if investment amount is too big', async () => {
        await activatePresale(urbanPandaPresale);
        await shouldThrow(urbanPandaPresale.send(2.000001 * 1e18, { from: curtis }));
    });

    it('should accept investments from whitelisted addresses only', async () => {
        await activatePresale(urbanPandaPresale);
        await urbanPandaPresale.send(2 * 1e18, { from: curtis });
        await urbanPandaPresale.send(2 * 1e18, { from: dick });
        await shouldThrow(urbanPandaPresale.send(2 * 1e18, { from: alice }));
    });

    it('should reject ending presale from everyone but the owner', async () => {
        await activatePresale(urbanPandaPresale);
        await shouldThrow(urbanPandaPresale.endPresale({ from: bob }));
        await shouldThrow(urbanPandaPresale.endPresale({ from: curtis }));
        await urbanPandaPresale.endPresale();
    });

    it('should accept investments, create liquidty and end presale successfully', async () => {
        await activatePresale(urbanPandaPresale);
        await urbanPandaPresale.send(2 * 1e18, { from: curtis });
        const teamEthBalanceBeforePresaleEnd = await web3.eth.getBalance(teamAddress);
        await urbanPandaPresale.endPresale();
        const teamEthBalanceAfterPresaleEnd = await web3.eth.getBalance(teamAddress);
        const teamEthProfit = (teamEthBalanceAfterPresaleEnd - teamEthBalanceBeforePresaleEnd) / Math.pow(10, 18);
        expect(teamEthProfit).to.equal(0.8);
        const curtisUpBalance = await urbanPanda.balanceOf(curtis);
        expect(curtisUpBalance.toString()).to.equal('66000000000000000000');
        const routerUpBalance = await urbanPanda.balanceOf(uniswapV2router02.address);
        expect(routerUpBalance.toString()).to.equal('13200000000000000000');
        const routerEthBalance = await web3.eth.getBalance(uniswapV2router02.address);
        expect(routerEthBalance.toString()).to.equal('1200000000000000000');
    });
});

contract('UrbanPandaPresale', (accounts) => {
    const ethPresaleSupply = 1;
    const [alice, bob, curtis] = accounts;
    const teamAddress = bob;
    const whitelistAddresses = [];
    let urbanPandaPresale;

    beforeEach(async () => {
        [urbanPandaPresale] = await beforeEachReset(ethPresaleSupply, teamAddress, whitelistAddresses);
    });

    it('should reject an investment if investment amount exceeds available supply', async () => {
        await activatePresale(urbanPandaPresale);
        await allowPresaleForEverybody(urbanPandaPresale);
        await shouldThrow(urbanPandaPresale.send(1.1 * 1e18, { from: curtis }));
    });

    it('should accept an investment that empties the presale supply', async () => {
        await activatePresale(urbanPandaPresale);
        await allowPresaleForEverybody(urbanPandaPresale);
        const result = await urbanPandaPresale.send(ethPresaleSupply * 1e18, { from: curtis });
        expect(result.receipt.status).to.equal(true);
        expectEvent(result, 'InvestmentSucceeded', {
            sender: curtis,
            weiAmount: new BN('1000000000000000000'), // 1e18
            upAmount: new BN('33000000000000000000'), // 33 * 1e18
        });
    });
});

const beforeEachReset = async (ethPresaleSupply, teamAddress, whitelistAddresses) => {
    const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const uniswapV2Helper = await UniswapV2Helper.new();
    urbanPanda = await UrbanPanda.new(uniswapV2FactoryAddress, uniswapV2Helper.address);
    const urbanPandaLiquidityLock = await UrbanPandaLiquidityLock.new(
        urbanPanda.address,
        Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2
    );
    uniswapV2Router02Mock = await UniswapV2Router02Mock.new();
    urbanPandaPresale = await UrbanPandaPresale.new(
        urbanPanda.address,
        uniswapV2Router02Mock.address,
        urbanPandaLiquidityLock.address,
        teamAddress,
        ethPresaleSupply,
        whitelistAddresses
    );
    return [urbanPandaPresale, urbanPanda, uniswapV2Router02Mock];
};

const activatePresale = (urbanPandaPresale) => urbanPandaPresale.setIsPresaleActive(true);

const allowPresaleForEverybody = (urbanPandaPresale) => urbanPandaPresale.setAllowWhitelistAddressesOnly(false);
