const { expectEvent, expectRevert, BN, balance } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants')
const MintManager = artifacts.require('./distribution/MintManager.sol')
const MockERC721 = artifacts.require('./mock/MockERC721.sol')
const MockERC1155 = artifacts.require('./mock/MockERC1155.sol')
const MockERC20 = artifacts.require('./mock/MockERC20.sol')
const TimeHelper = artifacts.require('./mock/TimeHelper.sol')
require('chai').should()
const { expect } = require('chai')

contract('MintManager', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }
    const CONTRACT_NAME = 'some name'
    const CONTRACT_SYMBOL = 'SYMBOL'
    const MAX_SUPPLY = 10000
    const INITIAL_MINTABLE = 5
    const NUM_PRESALE_MINTABLE = 10
    const PRESALE_MINT_PRICE = web3.utils.toWei('0.15', 'ether')
    const PUBLIC_MINT_PRICE = web3.utils.toWei('0.25', 'ether')
    const ONE_MILLION_TOKENS = to18DP('1000000')
    const SECONDS_IN_1_DAY = 86400 //86400 seconds in a day
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

    const mintTestERC721Token = async (fromAddress, amount = 1) => {
        await this.mockERC721.mintTestTokens(amount, {
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
        contract = await MintManager.new(
            [owner],
            INITIAL_MINTABLE,
            NUM_PRESALE_MINTABLE,
            PRESALE_MINT_PRICE,
            PUBLIC_MINT_PRICE,
            {
                from: owner
            }
        )

        this.mockERC721 = await MockERC721.new('Return of the mock', 'ROTM', {
            from: owner
        })

        await contract.setToken(this.mockERC721.address, { from: owner })

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

        it('has a max number initially mintable by admins', async function () {
            assert.equal(await contract.NUM_INITIAL_MINTABLE(), INITIAL_MINTABLE)
        })

        it('has a max number mintable by presale', async function () {
            assert.equal(await contract.NUM_PRESALE_MINTABLE(), NUM_PRESALE_MINTABLE)
        })

        it('has a max number public mintable by address', async function () {
            assert.equal(await contract.MAX_MINTABLE_PUBLIC(), 40)
        })

        it('has a max number public mintable per tx', async function () {
            assert.equal(await contract.MAX_MINTABLE_PER_TX(), 4)
        })

        it('has presale mint price', async function () {
            const presaleMintPrice = await contract.mintPricePresale()
            presaleMintPrice.should.be.bignumber.equal(PRESALE_MINT_PRICE)
        })

        it('has public mint price', async function () {
            const publicMintPrice = await contract.mintPricePublic()
            publicMintPrice.should.be.bignumber.equal(PUBLIC_MINT_PRICE)
        })
    })
    describe('Minting', async () => {
        it('public minting disallowed when public minting flag is false', async () => {
            await expectRevert(
                contract.checkCanMintPublic(randomer, 1, 1, {
                    from: randomer
                }),
                'Public minting not enabled'
            )
        })

        it('presale minting disallowed when presale minting flag is false', async () => {
            await expectRevert(
                contract.checkCanMintPresale(randomer, 1, 1, 1, [], 1, {
                    from: randomer
                }),
                'Presale minting not enabled'
            )
        })

        it('presale minting disallowed when merkle root has not been set', async () => {
            contract.setMintingMode(MINT_MODE_PRESALE, {
                from: owner
            })

            await expectRevert(
                contract.checkCanMintPresale(randomer, 1, 1, 1, [], 1, {
                    from: randomer
                }),
                'Merkle root not set'
            )
        })

        it('initial minting disallowed when amount exceeds initial', async () => {
            await mintTestERC721Token(randomer, INITIAL_MINTABLE)

            await expectRevert(
                contract.checkCanMintInitial(1, {
                    from: randomer
                }),
                'Amount will exceed maximum number of initial NFTs'
            )
        })

        describe('Initial minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                    from: owner
                })
            })

            it('mintInitial allowed if amount less than set initial amount', async () => {
                const mintAmount = INITIAL_MINTABLE - 1
                await contract.checkCanMintInitial(mintAmount, {
                    from: owner
                })
            })
        })

        describe('Public minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
            })

            it('public minting disallowed when amount is 0', async () => {
                await expectRevert(
                    contract.checkCanMintPublic(randomer, PUBLIC_MINT_PRICE, 0, {
                        from: randomer
                    }),
                    'Amount must be greater than 0'
                )
            })

            it('public minting disallowed when value passed is less than public minting value', async () => {
                await expectRevert(
                    contract.checkCanMintPublic(randomer, web3.utils.toWei('0.2399999999', 'ether'), 1, {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting disallowed when attempting to mint more than 4 in a transaction', async () => {
                await expectRevert(
                    contract.checkCanMintPublic(randomer, PUBLIC_MINT_PRICE, 5, {
                        from: randomer
                    }),
                    'Amount exceeds allowance per tx'
                )
            })

            it('public minting disallowed when attempting to mint more than allowance per address', async () => {
                const amountToMint = await contract.MAX_MINTABLE_PUBLIC()
                await mintTestERC721Token(randomer, amountToMint)

                await expectRevert(
                    contract.checkCanMintPublic(randomer, PUBLIC_MINT_PRICE, 4, {
                        from: randomer
                    }),
                    'Amount requested will exceed address allowance'
                )
            })

            it('public minting allowed when value passed is equal to public minting value', async () => {
                await contract.checkCanMintPublic(randomer, web3.utils.toWei('0.25', 'ether'), 1, {
                    from: randomer
                })
            })
        })

        describe('Presale minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PRESALE, {
                    from: owner
                })
                contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
            })

            it('presale minting disallowed when value passed is less than presale minting value', async () => {
                await expectRevert(
                    contract.checkCanMintPresale(randomer, web3.utils.toWei('0.139999999999', 'ether'), 1, 1, [], 1, {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed when amount desired is 0', async () => {
                await expectRevert(
                    contract.checkCanMintPresale(randomer, PRESALE_MINT_PRICE, 1, 1, [], 0, {
                        from: randomer
                    }),
                    'Amount must be greater than 0'
                )
            })

            it('presale minting disallowed account when proofs do not match', async () => {
                await expectRevert(
                    contract.checkCanMintPresale(randomer, PRESALE_MINT_PRICE, 1, 1, [], 1, {
                        from: randomer
                    }),
                    'Invalid proof.'
                )
            })

            it('presale minting disallowed when presale amount has been reached', async () => {
                await mintTestERC721Token(randomer, NUM_PRESALE_MINTABLE + INITIAL_MINTABLE)

                await expectRevert(
                    contract.checkCanMintPresale(randomer, PRESALE_MINT_PRICE, 1, 1, [], 1, {
                        from: randomer
                    }),
                    'Amount will exceed maximum number of presale NFTs'
                )
            })
            // TODO These tests pass when merkle data is correct but the addresses change when launching new ganache cli so need consistent addresses
            // it('presale minting allowed when account passed matches account used for transaction and proofs match', async () => {
            //     const claimData = merkleData.claims[randomer]

            //     assert.equal(await contract.balanceOf(randomer), 0)
            //     const receipt = await contract.checkCanMintPresale(claimData.index, randomer, claimData.proof, {
            //         from: randomer,
            //         value: web3.utils.toWei('0.15', 'ether')
            //     })

            //     await expectEvent(receipt, 'Minted', {
            //         id: '0',
            //         owner: randomer
            //     })
            //     assert.equal(await contract.balanceOf(randomer), 1)
            //     assert.equal(await contract.ownerOf(0), randomer)
            // })

            // it('presale minting disallowed after account has already minted', async () => {
            //     const claimData = merkleData.claims[randomer]

            //     await contract.checkCanMintPresale(claimData.index, randomer, claimData.proof, {
            //         from: randomer,
            //         value: web3.utils.toWei('0.15', 'ether')
            //     })

            //     await expectRevert(
            //         contract.checkCanMintPresale(claimData.index, randomer, claimData.proof, {
            //             from: randomer,
            //             value: web3.utils.toWei('0.15', 'ether')
            //         }),
            //         'Address already minted'
            //     )

            //     assert.equal(await contract.ownerOf(0), randomer)
            //     assert.equal(await contract.balanceOf(randomer), 1)
            // })
        })
    })

    describe('Admin functions', async () => {
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

        describe('setPresaleMintingMerkleRoot', async () => {
            it('setPresaleMintingMerkleRoot disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setPresaleMintingMerkleRoot allowed from admin account', async () => {
                const receipt = await contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
                await expectEvent(receipt, 'PresaleMerkleRootSet', {
                    merkleRoot: merkleData.merkleRoot
                })
            })

            it('setPresaleMintingMerkleRoot not allowed to be changed once it has been set', async () => {
                await contract.setPresaleMintingMerkleRoot(merkleData.merkleRoot, {
                    from: owner
                })
                await expectRevert(
                    contract.setPresaleMintingMerkleRoot(
                        '0x63a727f718138b0a08d032346812ae97b7c5dbf4d1a4f1da857c4d7dadff776c',
                        {
                            from: owner
                        }
                    ),
                    'Merkle root already set'
                )
            })
        })

        describe('setMintingMode', async () => {
            it('setMintingMode disallowed from non admin account', async () => {
                await expectRevert(
                    contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                        from: randomer
                    }),
                    'Does not have admin role'
                )
            })

            it('setMintingMode fails if trying to set unsupported mode', async () => {
                await expectRevert(
                    contract.setMintingMode(4, {
                        from: owner
                    }),
                    'invalid opcode'
                )
            })

            it('setMintingMode to MINT_MODE_PRESALE sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PRESALE, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_PRESALE)
            })

            it('setMintingMode to MINT_MODE_PUBLIC sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_PUBLIC)
            })

            it('setMintingMode to MINT_MODE_DEVELOPMENT sets mode successfully', async () => {
                await contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
                await contract.setMintingMode(MINT_MODE_DEVELOPMENT, {
                    from: owner
                })
                assert.equal(await contract.mintMode(), MINT_MODE_DEVELOPMENT)
            })
        })
    })
})
