const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MontageMetadataDecoder = artifacts.require('./decoder/MontageMetadataDecoder.sol')
contract('MontageMetadataDecoder', accounts => {
    let contract

    beforeEach(async () => {
        contract = await MontageMetadataDecoder.new({ from: accounts[0] })
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
            const creator = accounts[1]
            const name = 'super mario world'
            const description =
                'an italian plumber commits mass genocide of a worlds inhabitants to save a kidnapped princess'
            const canBeUnpacked = true
            const tokenIds = [1337, 69, 420]
            const unlockableContentUri = 'some kind of uri'
            const unlockableContentDescription = 'unlock some stuff, yo!'
            const encodedAddress = accounts[1].slice(2).toLowerCase()
            const data = `0x000000000000000000000000${encodedAddress}00000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000000117375706572206d6172696f20776f726c64000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005d616e206974616c69616e20706c756d62657220636f6d6d697473206d6173732067656e6f63696465206f66206120776f726c647320696e6861626974616e747320746f20736176652061206b69646e6170706564207072696e6365737300000000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000539000000000000000000000000000000000000000000000000000000000000004500000000000000000000000000000000000000000000000000000000000001a40000000000000000000000000000000000000000000000000000000000000010736f6d65206b696e64206f6620757269000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016756e6c6f636b20736f6d652073747566662c20796f2100000000000000000000`

            const endcodedMetadata = web3.utils.hexToBytes(data)

            const returnedDecodedData = await contract.decodeMetadata(endcodedMetadata, {
                from: accounts[0]
            })

            assert.equal(returnedDecodedData.creator, creator)
            assert.equal(returnedDecodedData.name, name)
            assert.equal(returnedDecodedData.description, description)
            assert.equal(returnedDecodedData.canBeUnpacked, canBeUnpacked)
            assert.equal(returnedDecodedData.unlockableContentUri, unlockableContentUri)
            assert.equal(returnedDecodedData.unlockableDescription, unlockableContentDescription)
            assert.equal(returnedDecodedData.tokenIds.length, tokenIds.length)
            assert.isTrue(web3.utils.toBN(returnedDecodedData.tokenIds[0]).eq(web3.utils.toBN(tokenIds[0])))
            assert.isTrue(web3.utils.toBN(returnedDecodedData.tokenIds[1]).eq(web3.utils.toBN(tokenIds[1])))
            assert.isTrue(web3.utils.toBN(returnedDecodedData.tokenIds[2]).eq(web3.utils.toBN(tokenIds[2])))
        })
    })
})
