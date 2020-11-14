const UptownPanda = artifacts.require('UptownPanda');
const UptownPandaLiquidityLock = artifacts.require('UptownPandaLiquidityLock');
const UptownPandaPresale = artifacts.require('UptownPandaPresale');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const LineByLine = require('n-readlines');
const fs = require('fs');

module.exports = async (deployer, network, accounts) => {
    const uptownPanda = await UptownPanda.deployed();
    const uniswapV2Helper = await UniswapV2Helper.deployed();
    const uptownPandaLiquidityLock = await UptownPandaLiquidityLock.deployed();
    const teamAddress = getTeamAddress(network, accounts);
    const ethPresaleSupply = 400;
    const whitelistAddresses = getWhitelistAddresses(network);

    await deployer.deploy(
        UptownPandaPresale,
        uptownPanda.address,
        uniswapV2Helper.address,
        uptownPandaLiquidityLock.address,
        teamAddress,
        ethPresaleSupply
    );
    const uptownPandaPresale = await UptownPandaPresale.deployed();
    await uptownPandaPresale.addWhitelistAddresses(whitelistAddresses);

    console.log(`Uptown Panda token contract address: ${uptownPanda.address}`);
    console.log(`Uptown Panda presale contract address: ${uptownPandaPresale.address}`);
    console.log(`Uptown Panda liquidity lock contract address: ${uptownPandaLiquidityLock.address}`);
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
