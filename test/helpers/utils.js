const { assert } = require('chai');

const shouldThrow = async (promise) => {
    try {
        await promise;
    } catch (err) {
        assert(true);
        return;
    }
    assert(false, 'The contract did not throw.');
};

module.exports = {
    shouldThrow,
};
