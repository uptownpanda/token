const UrbanPanda = artifacts.require('UrbanPanda');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');

const getUrbanPandaTestInstanceWithDependencies = async () => {
    const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    uniswapV2Router02Mock = await UniswapV2Router02Mock.new();
    const uniswapV2Helper = await UniswapV2Helper.new(uniswapV2FactoryAddress, uniswapV2Router02Mock.address);
    urbanPanda = await UrbanPanda.new(uniswapV2Helper.address);
    return { urbanPanda, uniswapV2Helper, uniswapV2Router02Mock };
};

module.exports = {
    getUrbanPandaTestInstanceWithDependencies,
};
