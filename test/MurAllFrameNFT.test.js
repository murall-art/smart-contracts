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

        it('presale minting disallowed when value passed is less than presale minting value', async () => {
            contract.setMintingMode(MINT_MODE_PRESALE, {
                from: owner
            })
            await expectRevert(
                contract.mintPresale(1, randomer, [], {
                    from: randomer
                }),
                'Insufficient funds'
            )
        })

        it('presale minting disallowed when value passed is less than presale minting value', async () => {
            contract.setMintingMode(MINT_MODE_PRESALE, {
                from: owner
            })
            
            await expectRevert(
                contract.mintPresale(1, randomer, [], {
                    from: user,
                    value: web3.utils.toWei('0.15', 'ether')
                }),
                'Account is not the presale account'
            )
        })
    })
})
