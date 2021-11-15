const { expectEvent, expectRevert, BN, balance } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const TestTraitSeedManager = artifacts.require('./frames/TestTraitSeedManager.sol')
const TraitSeedManager = artifacts.require('./frames/TraitSeedManager.sol')
const MockERC721 = artifacts.require('./mock/MockERC721.sol')
const MockERC1155 = artifacts.require('./mock/MockERC1155.sol')
const MockERC20 = artifacts.require('./mock/MockERC20.sol')
const TimeHelper = artifacts.require('./mock/TimeHelper.sol')

require('chai').should()
const { expect } = require('chai')

contract('TraitSeedManager', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }
    const toBN = value => {
        return new BN(value)
    }
    const ONE_MILLION_TOKENS = to18DP('1000000')
    const SECONDS_IN_1_DAY = 86400 //86400 seconds in a day

    const MAX_SUPPLY = 4444
    const RANGE_SIZE = 252
    const RANGE_START = 436
    const NUM_PRESALE_MINTABLE = 1004
    const PRESALE_MINT_PRICE = web3.utils.toWei('0.144', 'ether')
    const PUBLIC_MINT_PRICE = web3.utils.toWei('0.244', 'ether')

    const MINT_MODE_DEVELOPMENT = 0
    const MINT_MODE_PUBLIC = 2
    const MINT_MODE_PRESALE = 1

    const VRF_COORDINATOR_RINKEBY = '0x8C7382F9D8f56b33781fE506E897a4F1e2d17255'
    const LINK_TOKEN_RINKEBY = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
    const KEYHASH_RINKEBY = '0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4'
    const FEE_RINKEBY = '100000000000000000' // 0.1 * 10**18 LINK for test chain
    const merkleData = {
        merkleRoot: '0x53a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776c',
        tokenTotal: '0x03',
        claims: {
            '0x05dC289004121f99cd304Dc81897Ad2d4e534891': {
                index: 0,
                amount: '0x01',
                proof: [
                    '0x786d1d729082a078b96bf9b3b620f90d94b1a2a90cb53f7b40207176602cad26',
                    '0xe1aa9f70c713fd69cbc021cbb0505a48e85e379c5eb310b4ae9b9e5ea2b4209b'
                ]
            },
            '0x75E9a490D61f5eBCfFcB3d72391035d8D3a3AdbE': {
                index: 1,
                amount: '0x01',
                proof: ['0xfa99f9a5da53d341ca5ff589e76f1958fc19b395b09a89f15ed42d46aba41630']
            },
            '0xD48f118342ef5B50eF4Fa963554B552bfbFAE1d2': {
                index: 2,
                amount: '0x01',
                proof: [
                    '0xac99f3534f8c759fa3345208ba6eca73130d96f6754546c898156262d09a34d3',
                    '0xe1aa9f70c713fd69cbc021cbb0505a48e85e379c5eb310b4ae9b9e5ea2b4209b'
                ]
            }
        }
    }
    const approveERC721Transfer = async (fromAddress, toAddress) => {
        await this.mockERC721.setApprovalForAll(toAddress, true, {
            from: fromAddress
        })
    }

    const approveERC1155Transfer = async (fromAddress, toAddress) => {
        await this.mockERC1155.setApprovalForAll(toAddress, true, {
            from: fromAddress
        })
    }

    const mintTestERC721Token = async fromAddress => {
        await this.mockERC721.mintTestTokens(1, {
            from: fromAddress
        })
    }

    const mintTestERC721TokenWithId = async (fromAddress, id = 0) => {
        await this.mockERC721.mintTokenForId(id, {
            from: fromAddress
        })
    }

    const mintTestERC1155Token = async (fromAddress, id = 0, amount = 1) => {
        await this.mockERC1155.mint(fromAddress, id, amount, {
            from: fromAddress
        })
    }

    const obtainTotalGasUsedForTransaction = async receipt => {
        // Obtain gas used
        const gasUsed = receipt.receipt.gasUsed

        // Obtain gasPrice from the transaction
        const tx = await web3.eth.getTransaction(receipt.tx)
        const gasPrice = tx.gasPrice

        // Calculate total gas used at gas price
        return web3.utils.toBN(gasPrice).mul(web3.utils.toBN(gasUsed))
    }

    const fundAccount = async (account, amount) => {
        await this.mockERC20.setBalance(account, amount)
    }

    const approveERC20Transfer = async (account, amount) => {
        await this.mockERC20.approve(this.contract.address, amount, {
            from: account
        })
    }

    let contract

    beforeEach(async () => {
        contract = await TraitSeedManager.new(
            [owner],

            VRF_COORDINATOR_RINKEBY,
            LINK_TOKEN_RINKEBY,
            KEYHASH_RINKEBY,
            BigInt(FEE_RINKEBY),
            RANGE_SIZE,
            RANGE_START,
            {
                from: owner
            }
        )

        this.mockERC721 = await MockERC721.new('Return of the mock', 'ROTM', {
            from: owner
        })

        this.mockERC1155 = await MockERC1155.new('some uri', {
            from: owner
        })

        this.mockERC20 = await MockERC20.new('The Mocktagon', 'TM', ONE_MILLION_TOKENS, {
            from: owner
        })
        this.TimeHelper = await TimeHelper.new({ from: owner })
    })

    describe('Deployment', async () => {
        it('deploys successfully', async () => {
            const address = contract.address

            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('sets admin role correctly', async function () {
            assert.isTrue(await contract.hasRole(web3.utils.sha3('ADMIN_ROLE'), owner))
        })

        it('has a rangeSize', async function () {
            assert.equal(await contract.rangeSize(), RANGE_SIZE)
        })

        it('has a rangeStart', async function () {
            assert.equal(await contract.rangeStart(), RANGE_START)
        })
    })

    describe('VRF tests', async () => {
        beforeEach(async () => {
            contract = await TestTraitSeedManager.new(
                [owner],
                VRF_COORDINATOR_RINKEBY,
                LINK_TOKEN_RINKEBY,
                KEYHASH_RINKEBY,
                BigInt(FEE_RINKEBY),
                RANGE_SIZE,
                RANGE_START,
                {
                    from: owner
                }
            )
        })

        it('addTraitSeedForRange disallowed from non admin address', async () => {
            await expectRevert(
                contract.addTraitSeedForRange(1, {
                    from: randomer
                }),
                'Does not have admin role'
            )
        })
        it('addTraitSeedForRange disallowed when first trait seed is not set', async () => {
            await expectRevert(
                contract.addTraitSeedForRange(1, {
                    from: owner
                }),
                'Must have at least 1 trait seed'
            )
        })

        describe('When seed request fulfilled', async () => {
            let randomness = 4321
            let randomnessId = '0x0000000000000000000000000000000000000000000000000000000000000001'
            beforeEach(async () => {
                contract = await TestTraitSeedManager.new(
                    [owner],
                    VRF_COORDINATOR_RINKEBY,
                    LINK_TOKEN_RINKEBY,
                    KEYHASH_RINKEBY,
                    BigInt(FEE_RINKEBY),
                    RANGE_SIZE,
                    RANGE_START,
                    {
                        from: owner
                    }
                )

                await contract.testFulfillRandomness(randomnessId, randomness, { from: owner })
            })

            it('addTraitSeedForRange from admin account sets traits randomising from trait seed', async () => {
                const receipt = await contract.addTraitSeedForRange(1, {
                    from: owner
                })
                const newTraitSeed = await contract.getTraitSeedAt(1)
                await expectEvent(receipt, 'TraitSeedSet', {
                    seed: newTraitSeed
                })
                assert.notEqual(newTraitSeed, 0)

                expect(newTraitSeed).to.be.bignumber.not.equal(toBN(randomness))
                assert.equal(await contract.getTraitSeedsLength(), 2)
            })

            it('addTraitSeedForRange for amount adds that amount of trait seeds', async () => {
                const amountToAdd = 2
                const receipt = await contract.addTraitSeedForRange(amountToAdd, {
                    from: owner
                })

                assert.equal(await contract.getTraitSeedsLength(), 1 + amountToAdd)

                const newTraitSeed1 = await contract.getTraitSeedAt(1)
                const newTraitSeed2 = await contract.getTraitSeedAt(2)

                expect(newTraitSeed1).to.be.bignumber.not.equal(toBN(randomness))
                expect(newTraitSeed2).to.be.bignumber.not.equal(toBN(randomness))
            })

            it('getTraitSeed for token id less than range start returns original seed', async () => {
                expect(
                    await contract.getTraitSeed(RANGE_START - 1, {
                        from: owner
                    })
                ).to.be.bignumber.equal(toBN(await contract.getTraitSeedAt(0)))
                expect(
                    await contract.getTraitSeed(0, {
                        from: owner
                    })
                ).to.be.bignumber.equal(toBN(await contract.getTraitSeedAt(0)))
            })

            it('getTraitSeed for token id more than range start returns correct seed for given range', async () => {
                const receipt = await contract.addTraitSeedForRange(2, {
                    from: owner
                })

                expect(
                    await contract.getTraitSeed(RANGE_START, {
                        from: owner
                    })
                ).to.be.bignumber.equal(toBN(await contract.getTraitSeedAt(1)))
                expect(
                    await contract.getTraitSeed(RANGE_START + RANGE_SIZE - 1, {
                        from: owner
                    })
                ).to.be.bignumber.equal(toBN(await contract.getTraitSeedAt(1)))
                expect(
                    await contract.getTraitSeed(RANGE_START + RANGE_SIZE, {
                        from: owner
                    })
                ).to.be.bignumber.equal(toBN(await contract.getTraitSeedAt(2)))
            })
        })
    })

    describe('Admin functions', async () => {
        it('requestTraitSeed disallowed from non admin account', async () => {
            await expectRevert(
                contract.requestTraitSeed({
                    from: randomer
                }),
                'Does not have admin role'
            )
        })

        describe('rescueTokens', async () => {
            beforeEach(async () => {
                fundAccount(randomer, ONE_MILLION_TOKENS)
                this.mockERC20.transfer(contract.address, ONE_MILLION_TOKENS, {
                    from: randomer
                })
            })

            it('rescueTokens disallowed from non admin account', async () => {
                await expectRevert(
                    contract.rescueTokens(this.mockERC20.address, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('rescueTokens allowed from admin account and transfers tokens to sender', async () => {
                const ownerBalance = await this.mockERC20.balanceOf(owner)
                await contract.rescueTokens(this.mockERC20.address, {
                    from: owner
                })

                const contractBalanceAfter = await this.mockERC20.balanceOf(contract.address)
                const ownerBalanceAfter = await this.mockERC20.balanceOf(owner)

                contractBalanceAfter.should.be.bignumber.equal(new BN('0'))

                ownerBalanceAfter.sub(ownerBalance).should.be.bignumber.equal(ONE_MILLION_TOKENS)
            })
        })
    })
})
