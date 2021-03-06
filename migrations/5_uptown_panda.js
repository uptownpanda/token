const UptownPanda = artifacts.require('UptownPanda');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');

module.exports = async (deployer) => {
    const uniswapV2HelperAddress = await getUniswapV2HelperAddress();
    await deployer.deploy(UptownPanda, uniswapV2HelperAddress);
};

const getUniswapV2HelperAddress = async () => {
    const uniswapV2Helper = await UniswapV2Helper.deployed();
    return uniswapV2Helper.address;
};
