const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MurAllDataValidator = artifacts.require('./validator/MurAllDataValidator.sol')

contract('MurAllDataValidator', ([owner, user]) => {
    beforeEach(async () => {
        this.contract = await MurAllDataValidator.new({ from: owner })
    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.contract.address

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })
    })

    describe('Individual pixel group validation', async () => {
        it('returns correct pixel count for individual pixels', async () => {
            // given
            const pixel = web3.utils.toBN('0x000000000012d61F0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F')
            const pixel2 = web3.utils.toBN('0x000000000012d61F0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F')
            const pixel3 = web3.utils.toBN('0x000000000012d61F0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F')

            const pixelData = [pixel, pixel2, pixel3]

            const pixelCount = await this.contract.validateSinglePixelData(pixelData)
            assert.isTrue(web3.utils.toBN(pixelCount).eq(web3.utils.toBN(23)))
        })
    })

    describe('Full group validation', async () => {
        it('returns pixel count including all colours', async () => {
            // given
            const pixelGroup = web3.utils.toBN('0x00a4d3a4007ad100efa1004d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab')
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            )

            const pixelGroups = [pixelGroup]
            const pixelGroupIndexes = [pixelGroupIndex]

            const pixelCount = await this.contract.validatePixelGroupData(pixelGroups, pixelGroupIndexes)
            assert.isTrue(web3.utils.toBN(pixelCount).eq(web3.utils.toBN(32)))
        })

        it('does not allow group index data with unexpected size', async () => {
            // given
            // 17 groups
            const pixelGroups = Array(17).fill(0)

            // pixel groups should have length of 2 (16 group indexes per item in array, and there are 17 groups)
            const pixelGroupIndexes = Array(1).fill(0)

            await expectRevert(
                this.contract.validatePixelGroupData(pixelGroups, pixelGroupIndexes),
                'unexpected group index array length'
            )
        })
    })

    describe('Transparent group validation', async () => {
        it('returns pixel count minus transparent pixels from group when alpha is enabled', async () => {
            // given
            const pixelGroup = web3.utils.toBN('0x00a4d3a4007ad100efa1004d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab')
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            )

            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000001'
            ]

            const pixelGroups = [pixelGroup]
            const pixelGroupIndexes = [pixelGroupIndex]

            const pixelCount = await this.contract.validateTransparentPixelGroupData(
                pixelGroups,
                pixelGroupIndexes,
                metadata
            )

            assert.isTrue(web3.utils.toBN(pixelCount).eq(web3.utils.toBN(28)))
        })

        it('returns pixel count including all colours when alpha is disabled', async () => {
            // given
            const pixelGroup = web3.utils.toBN('0x00a4d3a4007ad100efa1004d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab')
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            )

            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000000'
            ]

            const pixelGroups = [pixelGroup]
            const pixelGroupIndexes = [pixelGroupIndex]

            const pixelCount = await this.contract.validateTransparentPixelGroupData(
                pixelGroups,
                pixelGroupIndexes,
                metadata
            )
            assert.isTrue(web3.utils.toBN(pixelCount).eq(web3.utils.toBN(32)))
        })

        it('does not allow group index data with unexpected size', async () => {
            // given

            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000001'
            ]

            // 17 groups
            const pixelGroups = Array(17).fill(0)

            // pixel groups should have length of 2 (16 group indexes per item in array, and there are 17 groups)
            const pixelGroupIndexes = Array(1).fill(0)

            await expectRevert(
                this.contract.validateTransparentPixelGroupData(pixelGroups, pixelGroupIndexes, metadata),
                'unexpected group index array length'
            )
        })

        it('prevents misuse by enforcing groups greater than individual pixel group size', async () => {
            // given
            const pixelGroup = web3.utils.toBN('0x68656c6c6f20776f000000000000000000000000000000000000000000000000')
            const pixelGroupIndex = web3.utils.toBN(
                '0x3039303930393039303930393039303930393039303930393039303930393039'
            )

            const metadata = [
                '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',
                '0x0004D200162E0000000000000000000000000000000000000000000000000001'
            ]

            const pixelGroups = [pixelGroup]
            const pixelGroupIndexes = [pixelGroupIndex]

            await expectRevert(
                this.contract.validateTransparentPixelGroupData(pixelGroups, pixelGroupIndexes, metadata),
                'Misuse of transparency detected'
            )
        })
    })
})
