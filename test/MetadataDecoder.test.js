const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MetadataDecoder = artifacts.require('./decoder/MetadataDecoder.sol')
contract('MetadataDecoder', accounts => {
    const mintTestToken = async (fromAddress, tokenId = 0) => {
        // Given minted token

        const metadata = web3.utils.hexToBytes(
            '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae000000000000000000000000' +
                fromAddress.slice(2).toLowerCase() +
                '68656c6c6f20776f726c642100000000000000000000000000000000000000000004d200162e0000000000000000000000000000000000000000000000000001'
        )

        await contract.methods['mint(address,uint256,bytes)'](fromAddress, tokenId, metadata, {
            from: accounts[0]
        })
    }

    let contract

    beforeEach(async () => {
        contract = await MetadataDecoder.new({ from: accounts[0] })
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address
            //console.log(address)

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('decodeMetadata', async () => {
        it('decodes metadata correctly', async () => {
            const name = '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000'
            const otherInfo = '0x0004D200162E0000000000000000000000000000000000000000000000000001'
            const dataHash = '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae'

            const endcodedMetadata = web3.utils.hexToBytes(
                '0x49930065f0061848b051b234fc58bd7a43db72fd07512ebb749eddd1a43a7dae000000000000000000000000' +
                    accounts[0].slice(2).toLowerCase() +
                    '68656c6c6f20776f726c642100000000000000000000000000000000000000000004d200162e0000000000000000000000000000000000000000000000000001'
            )

            const returnedDecodedData = await contract.decodeMetadata(endcodedMetadata, {
                from: accounts[0]
            })

            assert.equal(returnedDecodedData.dataHash, dataHash)
            assert.equal(returnedDecodedData.artist, accounts[0])
            assert.isTrue(web3.utils.toBN(name).eq(returnedDecodedData.name))
            assert.isTrue(web3.utils.toBN(otherInfo).eq(returnedDecodedData.metadata))
        })
    })
})
