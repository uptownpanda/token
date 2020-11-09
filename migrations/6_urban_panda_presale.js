const UrbanPanda = artifacts.require('UrbanPanda');
const UrbanPandaLiquidityLock = artifacts.require('UrbanPandaLiquidityLock');
const UrbanPandaPresale = artifacts.require('UrbanPandaPresale');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const LineByLine = require('n-readlines');
const fs = require('fs');

module.exports = async (deployer, network, accounts) => {
    const urbanPanda = await UrbanPanda.deployed();
    const uniswapV2Helper = await UniswapV2Helper.deployed();
    const urbanPandaLiquidityLock = await UrbanPandaLiquidityLock.deployed();
    const teamAddress = getTeamAddress(network, accounts);
    const ethPresaleSupply = 400;
    const whitelistAddresses = getWhitelistAddresses(network);

    await deployer.deploy(
        UrbanPandaPresale,
        urbanPanda.address,
        uniswapV2Helper.address,
        urbanPandaLiquidityLock.address,
        teamAddress,
        ethPresaleSupply
    );
    const urbanPandaPresale = await UrbanPandaPresale.deployed();
    await urbanPandaPresale.addWhitelistAddresses(whitelistAddresses);

    console.log(`Urban Panda token contract address: ${urbanPanda.address}`);
    console.log(`Urban Panda presale contract address: ${urbanPandaPresale.address}`);
    console.log(`Urban Panda liquidity lock contract address: ${urbanPandaLiquidityLock.address}`);
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
