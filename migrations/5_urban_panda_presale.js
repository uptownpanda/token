const UrbanPanda = artifacts.require('UrbanPanda');
const UrbanPandaLiquidityLock = artifacts.require('UrbanPandaLiquidityLock');
const UrbanPandaPresale = artifacts.require('UrbanPandaPresale');
const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const LineByLine = require('n-readlines');
const fs = require('fs');

module.exports = async (deployer, network, accounts) => {
    const urbanPanda = await UrbanPanda.deployed();
    const uniswapV2Router02Address = await getUniswapV2Router02Address(deployer, network);
    const urbanPandaLiquidityLock = await UrbanPandaLiquidityLock.deployed();
    const teamAddress = getTeamAddress(network, accounts);
    const ethPresaleSupply = 400;
    const whitelistAddresses = getWhitelistAddresses(network);

    await deployer.deploy(
        UrbanPandaPresale,
        urbanPanda.address,
        uniswapV2Router02Address,
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

const getUniswapV2Router02Address = async (deployer, network) => {
    if (network !== 'development') {
        return '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    }
    await deployer.deploy(UniswapV2Router02Mock);
    const uniswapV2Router02 = await UniswapV2Router02Mock.deployed();
    return uniswapV2Router02.address;
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
