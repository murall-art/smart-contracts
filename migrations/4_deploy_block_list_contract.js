var MurAllBlockList = artifacts.require('./MurAllBlockList.sol')

module.exports = async function (deployer) {
    await deployer.deploy(MurAllBlockList)
}
