var Token = artifacts.require("./PaintToken.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.deploy(Token, { from: accounts[0] });
};
