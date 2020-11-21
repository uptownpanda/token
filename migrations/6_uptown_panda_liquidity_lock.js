const { Token, ChainId, WETH, Pair } = require('@uniswap/sdk');
const UptownPanda = artifacts.require('UptownPanda');
const UptownPandaLiquidityLock = artifacts.require('UptownPandaLiquidityLock');

module.exports = async (deployer, network) => {
    const uptownPanda = await UptownPanda.deployed();
    const releaseTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 2;
    const liquidityTokenAddress = getLiquidityTokenAddress(uptownPanda.address, network);
    await deployer.deploy(UptownPandaLiquidityLock, liquidityTokenAddress, releaseTime);
};

const getLiquidityTokenAddress = (uptownPandaAddress, network) => {
    let chainId;
    switch (network) {
        case 'development':
            return uptownPandaAddress; // in development this is never needed so we can return fake IERC20 address!

        case 'rinkeby':
            chainId = ChainId.RINKEBY;
            break;

        case 'kovan':
            chainId = ChainId.KOVAN;
            break;

        default:
            chainId = ChainId.MAINNET;
    }

    const uptownPandaToken = new Token(chainId, uptownPandaAddress, 18);
    const wethToken = WETH[chainId];
    const isUptownPandaTokenFirst = uptownPandaToken.sortsBefore(wethToken);
    const token0 = isUptownPandaTokenFirst ? uptownPandaToken : wethToken;
    const token1 = isUptownPandaTokenFirst ? wethToken : uptownPandaToken;
    return Pair.getAddress(token0, token1);
};
