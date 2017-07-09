let BigNumber = require("bignumber.js");

let RKCToken = artifacts.require("./contracts/RKCToken.sol");

function rkc() {
    return RKCToken.deployed();
}
let _rkc;
let _contract = exports._contract = {
    rkc: null,
    address: null
};
rkc().then(function(c) {
    _contract.address = c.address;
    _contract.rkc = c;
    _rkc = _contract.rkc;
});

let atto = exports.atto = 1000000000000000000;

let failed = exports.failed = function(reason) {
    assert.isTrue(false, 'PROMISE FAILED: '+reason);
};
let callFunction = exports.callFunction = function(functionName, ...args) {
    return _rkc[functionName].call(...args);
};
let sendFunction = exports.sendFunction = function(functionName, ...args) {
    return _rkc[functionName](...args);
};
let assertVariable = exports.assertVariable = function(variableName, expectedValue, callback) {
    let args = [];
    if (typeof variableName === 'object') {
        args = variableName.slice(1);
        variableName = variableName[0];
    }
    callFunction(variableName, ...args).then(function(value) {
        assert.equal(value, expectedValue, "Variable/Function "+variableName+" has value of "+value+", not expected "+expectedValue);
        if (typeof callback === 'function') {
            callback();
        }
    });
}
let assertNumberVariable = exports.assertNumberVariable = function(variableName, expectedBigNumber, callback) {
    let args = [];
    if (typeof variableName === 'object') {
        args = variableName.slice(1);
        variableName = variableName[0];
    }
    callFunction(variableName, ...args).then(function(bigNumber) {
        assert.isTrue(bigNumber.cmp(expectedBigNumber) === 0, "BN Variable/Function "+variableName+" has a value of "+bigNumber.toFixed(0)+", not expected "+expectedBigNumber.toFixed(0)+" are not equal");
        if (typeof callback === 'function') {
            callback();
        }
    });
}

let BN = exports.BN = function(value) {
    return new BigNumber(value);
};
let attoBN = exports.attoBN = function(value) {
    return BN(value).mul(atto);
};

let promiseShouldThrow = exports.promiseShouldThrow = function(promise, fnName) {
    promise.then(function() {
        assert(false, "function "+fnName+" was supposed to throw but didn't.");
    }).catch(function(e) {
        if (e.toString().indexOf("invalid JUMP") != -1 || e.toString().indexOf("invalid opcode") != -1) {
            // test succeeded
        } else {
            // if the error is something else (e.g., the assert from previous promise), then we fail the test
            assert(false, e.toString());
        }
    });
};
let functionShouldThrow = exports.functionShouldThrow = function(fnName, ...args) {
    promiseShouldThrow(sendFunction(fnName, ...args), fnName);
}

let _sequence = [];
let _currentSequenceIndex = 0;
let next = exports.next = function(fn) {
    if (_sequence[_currentSequenceIndex]) {
        if (typeof _sequence[_currentSequenceIndex] !== 'function') {
            console.log(_sequence[_currentSequenceIndex]);
            throw Error("sequence index "+_currentSequenceIndex+" is not a function: "+_sequence[_currentSequenceIndex]);
        }
        _sequence[_currentSequenceIndex]();
        _currentSequenceIndex++;
    }
}
let sequence = exports.sequence = function(fn) {
    _sequence.push(fn);
}