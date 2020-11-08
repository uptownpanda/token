const UrbanPanda = artifacts.require('UrbanPanda');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');

module.exports = async (deployer) => {
    const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const uniswapV2HelperAddress = await getUniswapV2HelperAddress();
    await deployer.deploy(UrbanPanda, uniswapV2FactoryAddress, uniswapV2HelperAddress);
};

const getUniswapV2HelperAddress = async () => {
    const uniswapV2Helper = await UniswapV2Helper.deployed();
    return uniswapV2Helper.address;
};
