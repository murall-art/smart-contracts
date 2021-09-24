const { time, BN, expectRevert, expectEvent, constants } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
require('chai').should()
const { expect } = require('chai')

const MurAll = artifacts.require('./MurAll.sol')
const MurAllNFT = artifacts.require('./MurAllNFT.sol')
const PaintToken = artifacts.require('./PaintToken.sol')
const DataValidator = artifacts.require('./validator/MurAllDataValidator.sol')
const NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol')

const MurAllRolesNFT = artifacts.require('./roles/MurAllRolesNFT')

contract('MurAllRolesNFT', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }

    const toBn = value => new BN(value)
    const PRICE_PER_PIXEL = 500000000000000000
    const setAllowance = async (address, pixelCount) => {
        const requiredTokens = web3.utils.toBN(PRICE_PER_PIXEL).mul(web3.utils.toBN(pixelCount))
        await this.paintToken.transfer(address, requiredTokens, { from: owner })
        await this.paintToken.approve(this.murAllContract.address, requiredTokens, { from: address })
    }

    const mintOnMurAll = async fromAddress => {
        // given
        const colourIndexValue = web3.utils.toBN('0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899')
        const pixel = web3.utils.toBN('0x0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F0012d61F')
        const pixelGroup = web3.utils.toBN('0x26a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab')
        const pixelGroupIndex = web3.utils.toBN('0x3039303930393039303930393039303930393039303930393039303930393039')
        const transparentPixelGroup = web3.utils.toBN(
            '0x36a4d3a4217ad135efa1f04d7e4ef6a2f0a240be135e17a75fa2414eb2fad6ab'
        )
        const transparentPixelGroupIndex = web3.utils.toBN(
            '0x4039303930393039303930393039303930393039303930393039303930393039'
        )

        const colourIndexes = [colourIndexValue]
        const pixelData = [pixel]
        const pixelGroups = [pixelGroup]
        const pixelGroupIndexes = [pixelGroupIndex]
        const transparentPixelGroups = [transparentPixelGroup]
        const transparentPixelGroupIndexes = [transparentPixelGroupIndex]
        const metadata = [
            '0x68656c6c6f20776f726c64210000000000000000000000000000000000000000',

            '0x0004D200162E0000000000000000000000000000000000000000000000000000'
        ]

        await setAllowance(fromAddress, 72)

        await this.murAllContract.setPixels(
            colourIndexes,
            pixelData,
            pixelGroups,
            pixelGroupIndexes,
            transparentPixelGroups,
            transparentPixelGroupIndexes,
            metadata,

            {
                from: fromAddress
            }
        )
    }

    const BASE_URI = 'https://example.com'
    const TYPE_PAINTER = 1
    const TYPE_MURALLIST = 2

    const merkleProof = {
        merkleRoot: '0x0cb9c784398ca4068b481b7b7bd55e5f4d4172af144e6afa2ce198c122df25b0',
        tokenTotal: '0x7e',
        claims: {
            '0x6F1737ec98d201F5562330d8E34E311559d30c5A': {
                index: 0,
                amount: '0x7b',
                proof: [
                    '0x1d5ee70027162ef9dc744f12a4419a656ebf27d320ca033be999a80a289b0385',
                    '0xb639487c506b5aa1493aaed75f470ee2232cc671ac684aab32ec463e54418ff9'
                ]
            },
            '0x6d9a80f7FC4270787643f46250344Cc0D90384F6': {
                index: 1,
                amount: '0x02',
                proof: ['0x291f19e5d647b447d0fc26999f55dc6c40c576e12c26e152ff7c9d91b8c3f675']
            },
            '0xf533897fd7A5E2bCF72e920b6333dDf75c0B7fdE': {
                index: 2,
                amount: '0x01',
                proof: [
                    '0x855846339247e0af414e34b538429a9028d0396144deb55fb9a616ccda1e45c6',
                    '0xb639487c506b5aa1493aaed75f470ee2232cc671ac684aab32ec463e54418ff9'
                ]
            }
        }
    }

    beforeEach(async () => {
        this.NftImageDataStorage = await NftImageDataStorage.new({ from: owner })
        this.murAllNFT = await MurAllNFT.new([owner], this.NftImageDataStorage.address, { from: owner })
        await this.NftImageDataStorage.transferOwnership(this.murAllNFT.address)

        this.paintToken = await PaintToken.new({ from: owner })
        this.dataValidator = await DataValidator.new({ from: owner })
        this.murAllContract = await MurAll.new(
            this.paintToken.address,
            this.murAllNFT.address,
            this.dataValidator.address,
            [owner],
            {
                from: owner
            }
        )
        await this.murAllNFT.transferOwnership(this.murAllContract.address, { from: owner })

        this.murAllRolesNFT = await MurAllRolesNFT.new([owner], BASE_URI, this.murAllContract.address, { from: owner })

        this.startBlock = await time.latestBlock()
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = this.murAllRolesNFT.address

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('adds painter role by default', async () => {
            const address = this.murAllRolesNFT.address

            assert.equal(await this.murAllRolesNFT.TYPE_PAINTER(), TYPE_PAINTER)
            assert.isTrue(await this.murAllRolesNFT.roleExists(TYPE_PAINTER))
        })

        it('adds MurAllist role by default', async () => {
            const address = this.murAllRolesNFT.address

            assert.equal(await this.murAllRolesNFT.TYPE_MURALLIST(), TYPE_MURALLIST)
            assert.isTrue(await this.murAllRolesNFT.roleExists(TYPE_MURALLIST))
        })
    })
    describe('claimPainterRoleL1', async () => {
        beforeEach(async () => {
            await mintOnMurAll(user)
        })

        it('from account that has not painted on MurAll fails', async () => {
            await expectRevert(
                this.murAllRolesNFT.claimPainterRoleL1({
                    from: randomer
                }),
                'Only painter can claim painter role'
            )
        })

        it('from account who has painted on MurAll succeeds', async () => {
            const receipt = await this.murAllRolesNFT.claimPainterRoleL1({
                from: user
            })

            await expectEvent(receipt, 'RoleClaimed', {
                id: TYPE_PAINTER.toString(),
                owner: user
            })

            assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, TYPE_PAINTER))
            assert.equal(await this.murAllRolesNFT.balanceOf(user, TYPE_PAINTER), 1)
        })

        it('cannot claim once already claimed', async () => {
            await this.murAllRolesNFT.claimPainterRoleL1({
                from: user
            })

            await expectRevert(
                this.murAllRolesNFT.claimPainterRoleL1({
                    from: user
                }),
                'Role already claimed'
            )
        })
    })

    describe('claimRole', async () => {
        beforeEach(async () => {
            await this.murAllRolesNFT.setupClaimMerkleRootForRole(TYPE_PAINTER, merkleProof.merkleRoot, {
                from: owner
            })
        })

        it('with role id that does not exist fails', async () => {
            const claimProof = merkleProof.claims[user]
            await expectRevert(
                this.murAllRolesNFT.claimRole(claimProof.index, 123, claimProof.proof, {
                    from: user
                }),
                'Role does not exist.'
            )
        })

        it('with invalid proof fails', async () => {
            const claimProof = merkleProof.claims[user]
            await expectRevert(
                this.murAllRolesNFT.claimRole(claimProof.index, claimProof.amount, merkleProof.claims[randomer].proof, {
                    from: user
                }),
                'Invalid proof.'
            )
        })

        it('with valid proof from address not matching proofs fails', async () => {
            const claimProof = merkleProof.claims[user]
            await expectRevert(
                this.murAllRolesNFT.claimRole(claimProof.index, claimProof.amount, claimProof.proof, {
                    from: randomer
                }),
                'Invalid proof.'
            )
        })

        it('with valid proof from address matching proofs succeeds', async () => {
            const claimProof = merkleProof.claims[user]
            const receipt = await this.murAllRolesNFT.claimRole(claimProof.index, claimProof.amount, claimProof.proof, {
                from: user
            })

            await expectEvent(receipt, 'RoleClaimed', {
                id: TYPE_PAINTER.toString(),
                owner: user
            })

            assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, claimProof.amount))
        })

        it('with valid proof from address matching proofs but has already been claimed fails', async () => {
            const claimProof = merkleProof.claims[user]

            await this.murAllRolesNFT.claimRole(claimProof.index, claimProof.amount, claimProof.proof, {
                from: user
            })
            await expectRevert(
                this.murAllRolesNFT.claimRole(claimProof.index, claimProof.amount, claimProof.proof, {
                    from: user
                }),
                'Role already claimed'
            )
        })
    })

    describe('Admin functions', async () => {
        let newRoleId = 123
        let merkleRoot = '0x53a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776c'
        describe('addRole', async () => {
            it('from account that is not admin fail', async () => {
                await expectRevert(
                    this.murAllRolesNFT.addRole(newRoleId, merkleRoot, {
                        from: user
                    }),
                    'Does not have admin role'
                )
            })

            it('with role id that already exists fail', async () => {
                await expectRevert(
                    this.murAllRolesNFT.addRole(TYPE_MURALLIST, merkleRoot, {
                        from: owner
                    }),
                    'Role already exists'
                )
            })

            it('from admin account succeeds', async () => {
                const receipt = await this.murAllRolesNFT.addRole(newRoleId, merkleRoot, {
                    from: owner
                })

                await expectEvent(receipt, 'RoleAdded', {
                    id: newRoleId.toString()
                })

                assert.isTrue(await this.murAllRolesNFT.roleExists(newRoleId))
            })
        })

        describe('setupClaimMerkleRootForRole', async () => {
            beforeEach(async () => {
                await this.murAllRolesNFT.addRole(
                    newRoleId,
                    '0x53a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776d',
                    {
                        from: owner
                    }
                )
            })

            it('with account that is not admin fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.setupClaimMerkleRootForRole(newRoleId, merkleRoot, {
                        from: user
                    }),
                    'Does not have admin role'
                )
            })

            it('for role that doesnt exist fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.setupClaimMerkleRootForRole(newRoleId + 1, merkleRoot, {
                        from: owner
                    }),
                    'Role does not exist'
                )
            })

            it('succeeds for admin address with role that exists', async () => {
                await this.murAllRolesNFT.setupClaimMerkleRootForRole(newRoleId, merkleRoot, {
                    from: owner
                })
                const role = await this.murAllRolesNFT.roles(newRoleId)
                assert.equal(await role.merkleRoot, merkleRoot)
            })
        })

        describe('mintRole', async () => {
            beforeEach(async () => {
                await this.murAllRolesNFT.addRole(newRoleId, merkleRoot, {
                    from: owner
                })
            })

            it('with account that is not admin fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.mintRole(user, newRoleId, {
                        from: user
                    }),
                    'Does not have admin role'
                )
            })

            it('with role id that does not exist fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.mintRole(user, newRoleId + 1, {
                        from: owner
                    }),
                    'Role does not exist'
                )
            })

            it('with existing role id from admin account succeeds', async () => {
                const receipt = await this.murAllRolesNFT.mintRole(user, newRoleId, {
                    from: owner
                })

                await expectEvent(receipt, 'RoleClaimed', {
                    id: newRoleId.toString(),
                    owner: user
                })

                assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, newRoleId))
                assert.equal(await this.murAllRolesNFT.balanceOf(user, newRoleId), 1)
            })

            it('does not allow minting role id if already claimed', async () => {
                await this.murAllRolesNFT.mintRole(user, newRoleId, {
                    from: owner
                })

                await expectRevert(
                    this.murAllRolesNFT.mintRole(user, newRoleId, {
                        from: owner
                    }),
                    'Role already claimed'
                )

                assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, newRoleId))
                assert.equal(await this.murAllRolesNFT.balanceOf(user, newRoleId), 1)
            })
        })

        describe('mintMultiple', async () => {
            beforeEach(async () => {
                await this.murAllRolesNFT.addRole(newRoleId, merkleRoot, {
                    from: owner
                })
            })

            it('with account that is not admin fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.mintMultiple([user], [newRoleId], {
                        from: user
                    }),
                    'Does not have admin role'
                )
            })

            it('with role id that does not exist fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.mintMultiple([user], [newRoleId + 1], {
                        from: owner
                    }),
                    'Role does not exist'
                )
            })

            it('with existing role id from admin account succeeds', async () => {
                const receipt = await this.murAllRolesNFT.mintMultiple([user, randomer], [newRoleId, TYPE_PAINTER], {
                    from: owner
                })

                await expectEvent(receipt, 'RoleClaimed', {
                    id: newRoleId.toString(),
                    owner: user
                })
                await expectEvent(receipt, 'RoleClaimed', {
                    id: TYPE_PAINTER.toString(),
                    owner: randomer
                })

                assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, newRoleId))
                assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(randomer, TYPE_PAINTER))
                assert.equal(await this.murAllRolesNFT.balanceOf(user, newRoleId), 1)
                assert.equal(await this.murAllRolesNFT.balanceOf(randomer, TYPE_PAINTER), 1)
            })

            it('does not allow minting role id if already claimed', async () => {
                await this.murAllRolesNFT.mintMultiple([user], [newRoleId], {
                    from: owner
                })

                await expectRevert(
                    this.murAllRolesNFT.mintMultiple([user], [newRoleId], {
                        from: owner
                    }),
                    'Role already claimed'
                )

                assert.isTrue(await this.murAllRolesNFT.hasClaimedRole(user, newRoleId))
                assert.equal(await this.murAllRolesNFT.balanceOf(user, newRoleId), 1)
            })
        })
        describe('setURI', async () => {
            beforeEach(async () => {
                await this.murAllRolesNFT.addRole(newRoleId, merkleRoot, {
                    from: owner
                })
                await this.murAllRolesNFT.mintRole(user, newRoleId, {
                    from: owner
                })
            })

            it('with account that is not admin fails', async () => {
                await expectRevert(
                    this.murAllRolesNFT.setURI(BASE_URI, {
                        from: user
                    }),
                    'Does not have admin role'
                )
            })

            it('with admin account succeeds', async () => {
                await this.murAllRolesNFT.setURI(BASE_URI, {
                    from: owner
                })

                assert.equal(await this.murAllRolesNFT.uri(newRoleId), BASE_URI)
            })
        })
    })
})
