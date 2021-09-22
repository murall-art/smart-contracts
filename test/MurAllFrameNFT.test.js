const { expectEvent, expectRevert, BN, balance } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
const timeMachine = require('ganache-time-traveler')
const MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')
const MockERC721 = artifacts.require('./mock/MockERC721.sol')
const MockERC1155 = artifacts.require('./mock/MockERC1155.sol')
const MockERC20 = artifacts.require('./mock/MockERC20.sol')
const TimeHelper = artifacts.require('./mock/TimeHelper.sol')

contract('MurAllFrame', ([owner, user, randomer]) => {
    const to18DP = value => {
        return new BN(value).mul(new BN('10').pow(new BN('18')))
    }
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

    const mintTestERC721Token = async fromAddress => {
        await this.mockERC721.mintTestTokens(1, {
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
        contract = await MurAllFrame.new(
            [owner],
            VRF_COORDINATOR_RINKEBY,
            LINK_TOKEN_RINKEBY,
            KEYHASH_RINKEBY,
            BigInt(FEE_RINKEBY),
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

        it('has a name', async function () {
            assert.equal(await contract.name(), 'MurAll Frame')
        })

        it('has a symbol', async function () {
            assert.equal(await contract.symbol(), 'FRAME')
        })
    })
    describe('Minting', async () => {
        it('public minting disallowed when public minting flag is false', async () => {
            await expectRevert(
                contract.mint({
                    from: randomer
                }),
                'Public minting not enabled'
            )
        })

        it('presale minting disallowed when presale minting flag is false', async () => {
            await expectRevert(
                contract.mintPresale(1, randomer, [], {
                    from: randomer
                }),
                'Presale minting not enabled'
            )
        })

        describe('Public minting', async () => {
            beforeEach(async () => {
                contract.setMintingMode(MINT_MODE_PUBLIC, {
                    from: owner
                })
            })

            it('public minting disallowed when no value passed', async () => {
                await expectRevert(
                    contract.mint({
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting disallowed when value passed is less than public minting value', async () => {
                await expectRevert(
                    contract.mint({
                        from: randomer,
                        value: web3.utils.toWei('0.2499999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('public minting allowed when value passed is equal to public minting value', async () => {
                await contract.mint({
                    from: randomer,
                    value: web3.utils.toWei('0.25', 'ether')
                })

                assert.equal(await contract.ownerOf(0), randomer)
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

            it('presale minting disallowed when no value is passed', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed when value passed is less than presale minting value', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer,
                        value: web3.utils.toWei('0.149999999999', 'ether')
                    }),
                    'Insufficient funds'
                )
            })

            it('presale minting disallowed account passed does not match account used for transaction', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: user,
                        value: web3.utils.toWei('0.15', 'ether')
                    }),
                    'Account is not the presale account'
                )
            })
            it('presale minting disallowed account when proofs do not match', async () => {
                await expectRevert(
                    contract.mintPresale(1, randomer, [], {
                        from: randomer,
                        value: web3.utils.toWei('0.15', 'ether')
                    }),
                    'Invalid proof.'
                )
            })

            it('presale minting allowed when account passed matches account used for transaction and proofs match', async () => {
                const claimData = merkleData.claims[randomer]

                assert.equal(await contract.balanceOf(randomer), 0)
                await contract.mintPresale(claimData.index, randomer, claimData.proof, {
                    from: randomer,
                    value: web3.utils.toWei('0.15', 'ether')
                })
                assert.equal(await contract.balanceOf(randomer), 1)
                assert.equal(await contract.ownerOf(0), randomer)
            })

            it('presale minting disallowed after account has already minted', async () => {
                const claimData = merkleData.claims[randomer]

                await contract.mintPresale(claimData.index, randomer, claimData.proof, {
                    from: randomer,
                    value: web3.utils.toWei('0.15', 'ether')
                })

                await expectRevert(
                    contract.mintPresale(claimData.index, randomer, claimData.proof, {
                        from: randomer,
                        value: web3.utils.toWei('0.15', 'ether')
                    }),
                    'Address already minted'
                )

                assert.equal(await contract.ownerOf(0), randomer)
                assert.equal(await contract.balanceOf(randomer), 1)
            })
        })
    })
})
