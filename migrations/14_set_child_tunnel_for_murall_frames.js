var FrameTraitStorage = artifacts.require('./frames/FrameTraitStorage.sol')

const CHILD_TUNNEL_MUMBAI = '0xc1eC714490cbc6ADaA0AA45Fee8Ad6d7e557953e'
const CHILD_TUNNEL_MATIC = '0xfe5e5D361b2ad62c541bAb87C45a0B9B018389a2'

module.exports = async function (deployer, network, accounts) {
    const childTunnel = network == 'mainnet' ? CHILD_TUNNEL_MATIC : CHILD_TUNNEL_MUMBAI

    FrameTraitStorageInstance = await FrameTraitStorage.deployed()
    await FrameTraitStorageInstance.setFxChildTunnel(childTunnel)
}
