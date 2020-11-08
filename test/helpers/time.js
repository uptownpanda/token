const increase = async (duration) => {
    const web3Send = (method, params) =>
        new Promise((resolve, reject) => {
            const sendData = {
                jsonrpc: '2.0',
                method,
                params,
                id: new Date().getTime(),
            };
            const sendCallback = (error, result) => {
                if (!!error) {
                    return reject(error);
                }
                return resolve(result);
            };
            web3.currentProvider.send(sendData, sendCallback);
        });

    await web3Send('evm_increaseTime', [duration]);
    await web3Send('evm_mine', []);
};

const duration = {
    seconds: function (val) {
        return val;
    },
    minutes: function (val) {
        return val * this.seconds(60);
    },
    hours: function (val) {
        return val * this.minutes(60);
    },
    days: function (val) {
        return val * this.hours(24);
    },
};

module.exports = {
    increase,
    duration,
};
