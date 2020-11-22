const UptownPanda = artifacts.require('UptownPanda');
const UptownPandaLiquidityLock = artifacts.require('UptownPandaLiquidityLock');
const UptownPandaPresale = artifacts.require('UptownPandaPresale');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const LineByLine = require('n-readlines');
const fs = require('fs');
const { constants } = require('@openzeppelin/test-helpers');

module.exports = async (deployer, network, accounts) => {
    const uptownPanda = await UptownPanda.deployed();
    const uniswapV2Helper = await UniswapV2Helper.deployed();
    const uptownPandaLiquidityLock = await UptownPandaLiquidityLock.deployed();
    const teamAddress = getTeamAddress(network, accounts);
    const {
        up: upFarmAddress,
        upEth: upEthFarmAddress,
        weth: wethFarmAddress,
        wbtc: wbtcFarmAddress,
    } = getFarmAddresses();
    const wbtcAddress =
        network !== 'rinkeby'
            ? '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'  // mainnet wbtc address
            : '0x64ed1291fe07ade7bb261c7aa8491e4bc0e8de1c'; // rinkeby wbtc address
    const ethPresaleSupply = 400;
    const whitelistAddresses = getWhitelistAddresses(network);

    await deployer.deploy(
        UptownPandaPresale,
        uptownPanda.address,
        uniswapV2Helper.address,
        uptownPandaLiquidityLock.address,
        teamAddress,
        upFarmAddress,
        upEthFarmAddress,
        wethFarmAddress,
        wbtcFarmAddress,
        wbtcAddress,
        ethPresaleSupply
    );
    const uptownPandaPresale = await UptownPandaPresale.deployed();
    await uptownPandaPresale.addWhitelistAddresses(whitelistAddresses);

    console.log(`Uptown Panda token contract address: ${uptownPanda.address}`);
    console.log(`Uptown Panda presale contract address: ${uptownPandaPresale.address}`);
    console.log(`Uptown Panda liquidity lock contract address: ${uptownPandaLiquidityLock.address}`);
    console.log(`Uptown Panda $UP farm contract address: ${upFarmAddress}`);
    console.log(`Uptown Panda $UP/ETH farm contract address: ${upEthFarmAddress}`);
    console.log(`Uptown Panda WETH farm contract address: ${wethFarmAddress}`);
    console.log(`Uptown Panda WBTC farm contract address: ${wbtcFarmAddress}`);
};

const getTeamAddress = (network, accounts) => {
    return network === 'development' ? accounts[0] : fs.readFileSync('.team-wallet-address').toString().trim();
};

const getWhitelistAddresses = (network) => {
    const whitelistAddresses = [];

    if (network === 'development') {
        return whitelistAddresses;
    }

    const networkSuffixToCut = '-fork';
    const fileSuffix = network.endsWith(networkSuffixToCut)
        ? network.substring(0, network.length - networkSuffixToCut.length)
        : network;
    const fileToRead = `.whitelist.${fileSuffix}`;
    const liner = new LineByLine(fileToRead);

    let line;
    while ((line = liner.next())) {
        const whitelistAddress = line.toString('utf-8').trim();
        !!whitelistAddress && whitelistAddresses.push(whitelistAddress);
    }

    return whitelistAddresses;
};

const getFarmAddresses = () => {
    const addresses = {
        up: constants.ZERO_ADDRESS,
        upEth: constants.ZERO_ADDRESS,
        weth: constants.ZERO_ADDRESS,
        wbtc: constants.ZERO_ADDRESS,
    };

    const addressesFile = 'farm-addresses.txt';
    const farmAddressPairs = fs.readFileSync(addressesFile, 'utf8').trim().split(',');
    for (let i = 0; i < farmAddressPairs.length; i++) {
        const parts = farmAddressPairs[i].split(':');
        const farm = parts[0];
        const address = parts[1];
        addresses[farm] = address;
    }
    fs.unlinkSync(addressesFile);

    return addresses;
};
