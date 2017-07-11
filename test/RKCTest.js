let BigNumber = require("bignumber.js");
let {_contract, atto, failed, callFunction, sendFunction, assertVariable, assertNumberVariable, BN, attoBN, promiseShouldThrow, functionShouldThrow} = require('./test-helpers');

// testrpc --account="0x07e5c9513ee195edffd3fe77a4ae4af67da4a0884b03671cd9099bea80d355b4, 1000000000000000000000" --account="0x5f0443851368ce73912a59d3a9101806c36181e0368659580888e81c7423735e, 100"

const PRESOLD = 600;

const TEAM_WALLET = '0x365c9a1ea2370c7573f0c61c0f5917920472be91';

contract('RKCToken', (accounts) => {
    it("should initialize correctly", (done) => {
        assertNumberVariable('current_supply', attoBN(15000000));
        assertNumberVariable('ico_starting_supply', attoBN(15000000).sub(PRESOLD));

        assertVariable('preSoldSharesDistributed', true);
        assertVariable('isICOOpened', false);
        assertVariable('isICOClosed', false);

        assertNumberVariable('current_price_atto_tokens_per_wei', BN(2500));
        assertNumberVariable(['getAttoTokensAmountPerWei', 1], BN(2500));
        assertNumberVariable(['getAttoTokensAmountPerWei', 2], BN(5000));

        done();
    });

    it("should not allow doing much until ICO is started", (done) => {
        assertVariable('isICOOpened', false);
        assertVariable('isICOClosed', false);

        functionShouldThrow('closeICO');
        functionShouldThrow('distributePreSoldShares');
        functionShouldThrow('pullEtherFromContract');
        functionShouldThrow('sendPremiumPack', 100);
        functionShouldThrow('transferFrom', '123', '456', 100);
        functionShouldThrow('transfer', '123', 100);

        done();
    });

    it("should not allow to buy when ICO is not opened", function(done) {
        web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 10}, () => {
            assertNumberVariable('getAttoTokensBoughtInICO', 0, () => {
                done();
            });
        });
    });

    it("should correctly open ICO", function(done) {
        sendFunction('openICO').then(() => {
            // Some functions should still be unavailable
            functionShouldThrow('distributePreSoldShares');
            functionShouldThrow('pullEtherFromContract');
            functionShouldThrow('sendPremiumPack', 100);
            functionShouldThrow('transferFrom', '0x0b6ba1237df73204f5bea7e1a5f6faa79626f1d5', '0x365c9a1ea2370c7573f0c61c0f5917920472be91', 100);
            functionShouldThrow('transfer', '0x0b6ba1237df73204f5bea7e1a5f6faa79626f1d5', 100);
            functionShouldThrow('openICO');

            assertVariable('isICOOpened', true);
            assertVariable('isICOClosed', false, () => {
                done();
            });
        });
    });

    it("should sell correctly but not allow to buy more than 1% with one transaction", (done) => {
        web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 61 * 1000000000000000000}, () => {
            assertNumberVariable('getAttoTokensBoughtInICO', 0, () => {
                assertNumberVariable('current_price_atto_tokens_per_wei', 2500, () => {
                    web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 60 * 1000000000000000000}, () => {
                        assertNumberVariable('current_price_atto_tokens_per_wei', BN(1182), () => {
                            assertNumberVariable('getAttoTokensBoughtInICO', BN(150000 * 1000000000000000000), () => {
                                assertNumberVariable(['getBalance', web3.eth.accounts[0]], 150000 * 1000000000000000000);

                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    it("should follow the pricing formula for selling", (done) => {
        assertNumberVariable('getAttoTokensBoughtInICO', BN(150000 * 1000000000000000000), () => {
            assertNumberVariable('current_price_atto_tokens_per_wei', BN(1182), () => {
                web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 128 * 1000000000000000000}, () => {
                    assertNumberVariable('getAttoTokensBoughtInICO', BN(150000 * 1000000000000000000), () => {
                        web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 126 * 1000000000000000000}, () => {
                            assertNumberVariable('getAttoTokensBoughtInICO', BN("298932000000000000000000"), () => {
                                assertNumberVariable('current_price_atto_tokens_per_wei', BN(744), () => {
                                    assertNumberVariable(['getBalance', web3.eth.accounts[0]], BN("298932000000000000000000"), () => {
                                        assertNumberVariable('getPremiumCount', 0, () => {
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it("should correctly close ICO and transfer funds to the team", (done) => {
        assert.equal(web3.fromWei(web3.eth.getBalance(TEAM_WALLET), 'ether').valueOf(), 0);

        assertNumberVariable('getAttoTokensBoughtInICO', BN("298932000000000000000000"), () => {
            sendFunction('closeICO').then(() => {
                assert.equal(web3.fromWei(web3.eth.getBalance(TEAM_WALLET), 'ether').valueOf(), 0);
                sendFunction('pullEtherFromContract').then(() => {
                    assert.equal(web3.fromWei(web3.eth.getBalance(TEAM_WALLET), 'ether').valueOf(), 186);

                    functionShouldThrow('distributePreSoldShares');
                    functionShouldThrow('openICO');
                    functionShouldThrow('closeICO');

                    done();
                });
            });
        });
    });

    it("should create a premium pack to redistribute the amount not bought in the ICO", (done) => {
        assertVariable('isICOClosed', true, () => {
            assertNumberVariable('getPremiumCount', 1, () => {
                assertNumberVariable(['getPremiumPack', 0], BN("14701067999999999999999400"), () => {
                    done();
                });
            });
        });
    });

    it("should allow people to do the transfers after ICO is closed", (done) => {
        assertVariable('isICOOpened', false, () => {
            assertVariable('isICOClosed', true, () => {
                assertNumberVariable(['getBalance', web3.eth.accounts[0]], BN("298932000000000000000000"), () => {
                    assertNumberVariable(['getBalance', web3.eth.accounts[1]], BN(0), () => {
                        sendFunction('transfer', web3.eth.accounts[1], 100).then(() => {
                            //                                                                    .
                            assertNumberVariable(['getBalance', web3.eth.accounts[0]], BN("591906643958399999999888"), () => { // after premiums
                                assertNumberVariable(['getBalance', web3.eth.accounts[1]], BN(100), () => {
                                    assertNumberVariable(['getBalancePremiumsPaid', web3.eth.accounts[0]], BN(1), () => {
                                        assertNumberVariable(['getBalancePremiumsPaid', web3.eth.accounts[1]], BN(1), () => {
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it("should not allow to buy when ICO is closed", function(done) {
        assertNumberVariable('getAttoTokensBoughtInICO', BN("14999999999999999999999400"), () => {
            let oldBalance = web3.eth.getBalance(TEAM_WALLET);
            web3.eth.sendTransaction({from: web3.eth.accounts[0], to: _contract.address, value: 10}, () => {
                assertNumberVariable('getAttoTokensBoughtInICO', BN("14999999999999999999999400"), () => {
                    let newBalance = web3.eth.getBalance(TEAM_WALLET);
                    assert.equal(oldBalance.valueOf(), newBalance.valueOf());
                    done();
                });
            });
        });
    });

    it("should limit the quick dump possibility but follow the percentage formula", function(done) {
        functionShouldThrow('transfer', web3.eth.accounts[1], 750000 * 1000000000000000000);
        sendFunction('transfer', web3.eth.accounts[1], 150000 * 1000000000000000000).then(() => {
            //                                                                   .
            assertNumberVariable(['getBalance', web3.eth.accounts[0]], BN("591906643958399999999888").sub(BN(150000 * 1000000000000000000)), () => {
                assertNumberVariable(['getBalance', web3.eth.accounts[1]], BN(100).add(BN(150000 * 1000000000000000000)), () => {
                    done();
                });
            });
        });
    });

    it("should send premiums correctly", function(done) {
        sendFunction('sendPremiumPack', 100 * 1000000000000000000).then(() => {
            assertNumberVariable('getPremiumCount', 2, () => {
                assertNumberVariable(['getPremiumPack', 0], BN("14701067999999999999999400"), () => {
                    let premiumAmount = BN(100 * 1000000000000000000);
                    assertNumberVariable(['getPremiumPack', 1], premiumAmount, () => {
                        let previous = BN("591906643958399999999888").sub(BN(150000 * 1000000000000000000));
                        previous = previous.sub(premiumAmount); // because premiums paid from this account
                        assertNumberVariable(['getBalance', web3.eth.accounts[0]], previous, () => {
                            sendFunction('transfer', web3.eth.accounts[1], 100).then(() => {
                                let premiums = previous.mul(premiumAmount).div(BN(15000000 * 1000000000000000000)).round(0, 3); // 3 == ROUND_FLOOR
                                previous = previous.sub(100); // adjust for sending
                                assertNumberVariable(['getBalance', web3.eth.accounts[0]], previous.add(premiums), () => {
                                    previous = BN(100).add(BN(150000 * 1000000000000000000));
                                    let premiums = previous.mul(premiumAmount).div(BN(15000000 * 1000000000000000000)).round(0, 3); // 3 == ROUND_FLOOR
                                    previous = previous.add(100); // adjust for receiving
                                    assertNumberVariable(['getBalance', web3.eth.accounts[1]], previous.add(premiums), () => {
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

});
