var MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')
var FrameTraitStorage = artifacts.require('./frames/MurAllFrame.sol')

const FXROOT_GOERLI = '0x3d1d3E34f7fB6D26245E6640E1c50710eFFf15bA'
const FXROOT_ETHEREUM = '0xfe5e5D361b2ad62c541bAb87C45a0B9B018389a2'
const CHECKPOINT_MANAGER_GOERLI = '0x2890bA17EfE978480615e330ecB65333b880928e'
const CHECKPOINT_MANAGER_ETHEREUM = '0x86e4dc95c7fbdbf52e33d563bbdb00823894c287'

module.exports = async function (deployer, network, accounts) {
    const fxRoot = network == 'mainnet' ? FXROOT_ETHEREUM : FXROOT_GOERLI
    const checkpointManager = network == 'mainnet' ? CHECKPOINT_MANAGER_ETHEREUM : CHECKPOINT_MANAGER_GOERLI

    await deployer.deploy(
        FrameTraitStorage,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        checkpointManager,
        fxRoot
    )
    FrameTraitStorageInstance = await FrameTraitStorage.deployed()

    await deployer.deploy(
        MurAllFrame,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        FrameTraitStorageInstance.address
    )

    MurAllFrameInstance = await MurAllFrame.deployed()
    await FrameTraitStorageInstance.transferOwnership(MurAllFrameInstance.address)
}
