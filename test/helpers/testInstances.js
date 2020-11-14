const UptownPanda = artifacts.require('UptownPanda');
const UniswapV2Helper = artifacts.require('UniswapV2Helper');
const UniswapV2Router02Mock = artifacts.require('UniswapV2Router02Mock');
const UniswapV2OracleMock = artifacts.require('UniswapV2OracleMock');

const getUptownPandaTestInstanceWithDependencies = async () => {
    const uniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
    const uniswapV2Router02Mock = await UniswapV2Router02Mock.new();
    const uniswapV2OracleMock = await UniswapV2OracleMock.new();
    const uniswapV2Helper = await UniswapV2Helper.new(
        uniswapV2FactoryAddress,
        uniswapV2Router02Mock.address,
        uniswapV2OracleMock.address
    );
    const uptownPanda = await UptownPanda.new(uniswapV2Helper.address);
    return { uptownPanda, uniswapV2Helper, uniswapV2Router02Mock };
};

module.exports = {
    getUptownPandaTestInstanceWithDependencies,
};
