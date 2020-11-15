const { expect } = require('chai');
const { shouldThrow } = require('./helpers/utils');
const { getUptownPandaTestInstanceWithDependencies } = require('./helpers/testInstances');
const { BN, expectEvent } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const UptownPandaLiquidityLock = artifacts.require('UptownPandaLiquidityLock');
const UptownPandaPresale = artifacts.require('UptownPandaPresale');
const { getFarmMocks } = require('./helpers/testInstances');

contract('UptownPandaPresale', (accounts) => {
    const ethPresaleSupply = 400;
    const [alice, bob, curtis, dick, emma] = accounts;
    const teamAddress = bob;
    const whitelistAddresses = [curtis, dick];
    let uptownPandaPresale;
    let uptownPanda;
    let uniswapV2router02;
    let upFarm;
    let upEthFarm;
    let wethFarm;
    let wbtcFarm;

    beforeEach(async () => {
        [
            uptownPandaPresale,
            uptownPanda,
            uniswapV2router02,
            upFarm,
            upEthFarm,
            wethFarm,
            wbtcFarm,
        ] = await beforeEachReset(ethPresaleSupply, teamAddress, whitelistAddresses);
    });

    it('should have 2 addresses on whitelist', async () => {
        expect(await uptownPandaPresale.whitelistAddresses(alice)).to.equal(false);
        expect(await uptownPandaPresale.whitelistAddresses(bob)).to.equal(false);
        expect(await uptownPandaPresale.whitelistAddresses(curtis)).to.equal(true);
        expect(await uptownPandaPresale.whitelistAddresses(dick)).to.equal(true);
    });

    it('should allow only owner to add whitelist addresses', async () => {
        await shouldThrow(uptownPandaPresale.addWhitelistAddresses([emma], { from: bob }));
        await uptownPandaPresale.addWhitelistAddresses([emma], { from: alice });
        const isEmmaWhitelisted = await uptownPandaPresale.whitelistAddresses(emma);
        expect(isEmmaWhitelisted).to.equal(true);
    });

    it('should reject an investment if presale is deactivated', async () => {
        await shouldThrow(uptownPandaPresale.send(2 * 1e18, { from: curtis }));
    });

    it('should reject an investment if account is not whitelisted', async () => {
        await activatePresale(uptownPandaPresale);
        await shouldThrow(uptownPandaPresale.send(2 * 1e18, { from: alice }));
        await shouldThrow(uptownPandaPresale.send(2 * 1e18, { from: bob }));
    });

    it('should reject an investment if investment amount is too big', async () => {
        await activatePresale(uptownPandaPresale);
        const maxInvestment = await uptownPandaPresale.INVESTMENT_LIMIT();
        const overMaxInvestment = maxInvestment.add(new BN(1));
        await shouldThrow(uptownPandaPresale.send(overMaxInvestment, { from: curtis }));
    });

    it('should accept investments from whitelisted addresses only', async () => {
        await activatePresale(uptownPandaPresale);
        await uptownPandaPresale.send(2 * 1e18, { from: curtis });
        await uptownPandaPresale.send(2 * 1e18, { from: dick });
        await shouldThrow(uptownPandaPresale.send(2 * 1e18, { from: alice }));
    });

    it('should reject ending presale from everyone but the owner', async () => {
        await activatePresale(uptownPandaPresale);
        await shouldThrow(uptownPandaPresale.endPresale({ from: bob }));
        await shouldThrow(uptownPandaPresale.endPresale({ from: curtis }));
        await uptownPandaPresale.endPresale();
    });

    it('should accept investments, create liquidty, fund farms, start them and end presale successfully', async () => {
        await activatePresale(uptownPandaPresale);
        await uptownPandaPresale.send(2 * 1e18, { from: curtis });
        const teamEthBalanceBeforePresaleEnd = await web3.eth.getBalance(teamAddress);
        await uptownPandaPresale.endPresale();
        const teamEthBalanceAfterPresaleEnd = await web3.eth.getBalance(teamAddress);
        const teamEthProfit = (teamEthBalanceAfterPresaleEnd - teamEthBalanceBeforePresaleEnd) / Math.pow(10, 18);
        expect(teamEthProfit).to.equal(0.8);
        const curtisUpBalance = await uptownPanda.balanceOf(curtis);
        expect(curtisUpBalance.toString()).to.equal('66000000000000000000');
        const routerUpBalance = await uptownPanda.balanceOf(uniswapV2router02.address);
        expect(routerUpBalance.toString()).to.equal('13200000000000000000');
        const routerEthBalance = await web3.eth.getBalance(uniswapV2router02.address);
        expect(routerEthBalance.toString()).to.equal('1200000000000000000');

        const upFarmExpectedBalance = await uptownPandaPresale.UP_FARM_INITIAL_SUPPLY();
        const upFarmActualBalance = await uptownPanda.balanceOf(upFarm.address);
        expect(upFarmExpectedBalance.toString()).to.equal(upFarmActualBalance.toString());
        const hasUpFarmingStarted = await upFarm.hasFarmingStarted();
        expect(hasUpFarmingStarted).to.equal(true);

        const upEthFarmExpectedBalance = await uptownPandaPresale.UP_ETH_FARM_INITIAL_SUPPLY();
        const upEthFarmActualBalance = await uptownPanda.balanceOf(upEthFarm.address);
        expect(upEthFarmExpectedBalance.toString()).to.equal(upEthFarmActualBalance.toString());
        const hasUpEthFarmingStarted = await upEthFarm.hasFarmingStarted();
        expect(hasUpEthFarmingStarted).to.equal(true);

        const wethFarmExpectedBalance = await uptownPandaPresale.WETH_FARM_INITIAL_SUPPLY();
        const wethFarmActualBalance = await uptownPanda.balanceOf(wethFarm.address);
        expect(wethFarmExpectedBalance.toString()).to.equal(wethFarmActualBalance.toString());
        const hasWethFarmingStarted = await wethFarm.hasFarmingStarted();
        expect(hasWethFarmingStarted).to.equal(true);

        const wbtcFarmExpectedBalance = await uptownPandaPresale.WBTC_FARM_INITIAL_SUPPLY();
        const wbtcFarmActualBalance = await uptownPanda.balanceOf(wbtcFarm.address);
        expect(wbtcFarmExpectedBalance.toString()).to.equal(wbtcFarmActualBalance.toString());
        const hasWbtcFarmingStarted = await wbtcFarm.hasFarmingStarted();
        expect(hasWbtcFarmingStarted).to.equal(true);
    });
});

contract('UptownPandaPresale', (accounts) => {
    const ethPresaleSupply = 1;
    const [alice, bob, curtis] = accounts;
    const teamAddress = bob;
    const whitelistAddresses = [];
    let uptownPandaPresale;

    beforeEach(async () => {
        [uptownPandaPresale] = await beforeEachReset(ethPresaleSupply, teamAddress, whitelistAddresses);
    });

    it('should reject an investment if investment amount exceeds available supply', async () => {
        await activatePresale(uptownPandaPresale);
        await allowPresaleForEverybody(uptownPandaPresale);
        await shouldThrow(uptownPandaPresale.send(1.1 * 1e18, { from: curtis }));
    });

    it('should accept an investment that empties the presale supply', async () => {
        await activatePresale(uptownPandaPresale);
        await allowPresaleForEverybody(uptownPandaPresale);
        const result = await uptownPandaPresale.send(ethPresaleSupply * 1e18, { from: curtis });
        expect(result.receipt.status).to.equal(true);
        expectEvent(result, 'InvestmentSucceeded', {
            sender: curtis,
            weiAmount: new BN('1000000000000000000'), // 1e18
            upAmount: new BN('33000000000000000000'), // 33 * 1e18
        });
    });
});

const beforeEachReset = async (ethPresaleSupply, teamAddress, whitelistAddresses) => {
    const testInstances = await getUptownPandaTestInstanceWithDependencies();

    const uptownPanda = testInstances.uptownPanda;
    const uniswapV2Helper = testInstances.uniswapV2Helper;
    const uniswapV2Router02Mock = testInstances.uniswapV2Router02Mock;
    const uptownPandaLiquidityLock = await UptownPandaLiquidityLock.new(
        uptownPanda.address,
        Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2
    );
    const { upFarmMock, upEthFarmMock, wethFarmMock, wbtcFarmMock } = await getFarmMocks();
    const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';

    const uptownPandaPresale = await UptownPandaPresale.new(
        uptownPanda.address,
        uniswapV2Helper.address,
        uptownPandaLiquidityLock.address,
        teamAddress,
        upFarmMock.address,
        upEthFarmMock.address,
        wethFarmMock.address,
        wbtcFarmMock.address,
        wbtcAddress,
        ethPresaleSupply
    );
    await uptownPandaPresale.addWhitelistAddresses(whitelistAddresses);

    return [
        uptownPandaPresale,
        uptownPanda,
        uniswapV2Router02Mock,
        upFarmMock,
        upEthFarmMock,
        wethFarmMock,
        wbtcFarmMock,
    ];
};

const activatePresale = (uptownPandaPresale) => uptownPandaPresale.setIsPresaleActive(true);

const allowPresaleForEverybody = (uptownPandaPresale) => uptownPandaPresale.setAllowWhitelistAddressesOnly(false);
