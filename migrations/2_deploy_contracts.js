// var ConvertLib = artifacts.require("./ConvertLib.sol");
var RKCToken = artifacts.require("./RKCToken.sol");


var Web3 = require("../node_modules/web3/");
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));


/*
 * migrations/2_deploy_contracts.js:
 */
module.exports = function(deployer) {
    // deployer.deploy(ConvertLib);

    // deployer.link(ConvertLib, RKCToken);
    deployer.deploy(RKCToken);

    // deployer.deploy(RKCToken, "123", {from:web3.eth.accounts[0], value:1000000});

    // RKCToken.deployed().then(function(contract) {
    //     web3.eth.sendTransaction({from: web3.eth.accounts[0], to: contract.address, value:1000000});
    // });

};
