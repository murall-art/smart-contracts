const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const MontageDataStorage = artifacts.require('./storage/MontageDataStorage.sol')
contract('MontageDataStorage', accounts => {
  const setUnlockableContentUri = async (
    tokenId,
    uri,
    description,
    fromAddress = accounts[0]
  ) => {
    await contract.setUnlockableContentUri(tokenId, uri, description, {
      from: fromAddress
    })
  }

  let contract

  beforeEach(async () => {
    contract = await MontageDataStorage.new({ from: accounts[0] })
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

  describe('createMontage', async () => {
    it('createMontage disallowed from account that is not contract owner', async () => {
      const name = 'some kind of name'
      const description = 'some kind of description'
      const canBeUnpacked = true
      const tokenIds = [1, 2, 3, 4]

      await expectRevert(
        contract.createMontage(
          accounts[1],
          name,
          description,
          canBeUnpacked,
          tokenIds,
          {
            from: accounts[1]
          }
        ),
        'caller is not the owner'
      )
    })

    it('createArtwork allowed from contract owner', async () => {
      const name = 'some kind of name'
      const description = 'some kind of description'
      const canBeUnpacked = true
      const tokenIds = [web3.utils.toBN(123), web3.utils.toBN(456)]

      await contract.createMontage(
        accounts[0],
        name,
        description,
        canBeUnpacked,
        tokenIds,
        {
          from: accounts[0]
        }
      )
      const montageInformation = await contract.getMontageInformation(0)
      assert.equal(montageInformation.creator, accounts[0])
      assert.equal(montageInformation.name, name)
      assert.equal(montageInformation.description, description)
      assert.equal(montageInformation.canBeUnpacked, canBeUnpacked)
      assert.equal(montageInformation.tokenIds.length, tokenIds.length)
      assert.isTrue(montageInformation.tokenIds[0].eq(tokenIds[0]))
      assert.isTrue(montageInformation.tokenIds[1].eq(tokenIds[1]))
    })
  })
  describe('getting info', async () => {
    beforeEach(async () => {
      this.name = 'some kind of name'
      this.description = 'some kind of description'
      this.canBeUnpacked = true
      this.tokenIds = [web3.utils.toBN(123), web3.utils.toBN(456)]

      await contract.createMontage(
        accounts[0],
        this.name,
        this.description,
        this.canBeUnpacked,
        this.tokenIds,
        {
          from: accounts[0]
        }
      )
    })

    it('getTokenIds returns token ids', async () => {
      const returnedTokenIds = await contract.getTokenIds(0)

      assert.equal(returnedTokenIds.length, this.tokenIds.length)
      assert.isTrue(returnedTokenIds[0].eq(this.tokenIds[0]))
      assert.isTrue(returnedTokenIds[1].eq(this.tokenIds[1]))
    })
    it('getTokenIds reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.getTokenIds(invalidTokenId),
        'Invalid Token ID'
      )
    })
    it('getName returns name', async () => {
      const returnedName = await contract.getName(0)

      assert.equal(returnedName, this.name)
    })
    it('getName reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(contract.getName(invalidTokenId), 'Invalid Token ID')
    })
    it('getDescription returns name', async () => {
      const returnedDescription = await contract.getDescription(0)

      assert.equal(returnedDescription, this.description)
    })
    it('getDescription reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.getDescription(invalidTokenId),
        'Invalid Token ID'
      )
    })
    it('getCreator returns creator address', async () => {
      const returnedCreator = await contract.getCreator(0)

      assert.equal(returnedCreator, accounts[0])
    })
    it('getCreator reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.getCreator(invalidTokenId),
        'Invalid Token ID'
      )
    })

    it('canBeUnpacked returns if montage can be unpacked', async () => {
      const canBeUnpacked = await contract.canBeUnpacked(0)

      assert.equal(canBeUnpacked, this.canBeUnpacked)
    })
    it('canBeUnpacked reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.canBeUnpacked(invalidTokenId),
        'Invalid Token ID'
      )
    })
  })
  describe('unlockable content uri', async () => {
    beforeEach(async () => {
      this.name = 'some kind of name'
      this.description = 'some kind of description'
      this.canBeUnpacked = true
      this.tokenIds = [web3.utils.toBN(123), web3.utils.toBN(456)]

      await contract.createMontage(
        accounts[0],
        this.name,
        this.description,
        this.canBeUnpacked,
        this.tokenIds,
        {
          from: accounts[0]
        }
      )
    })

    it('hasUnlockableContentUri reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.hasUnlockableContentUri(invalidTokenId),
        'Invalid Token ID'
      )
    })

    it('hasUnlockableContentUri returns false if token has no unlockable content uri', async () => {
      assert.isFalse(await contract.hasUnlockableContentUri(0))
    })

    it('hasUnlockableContentUri returns true if token has unlockable content uri', async () => {
      setUnlockableContentUri(0, 'some uri', 'some Description')

      assert.isTrue(await contract.hasUnlockableContentUri(0))
    })

    it('getUnlockableDescription reverts if token id does not exist', async () => {
      const invalidTokenId = 1

      await expectRevert(
        contract.getUnlockableDescription(invalidTokenId),
        'Invalid Token ID'
      )
    })

    it('getUnlockableDescription returns description', async () => {
      const uri = 'some uri'
      const description = 'uri description'
      setUnlockableContentUri(0, uri, description)

      assert.equal(await contract.getUnlockableDescription(0), description)
    })

    it('getUnlockableContentUri from address that is not owner reverts', async () => {
      const uri = 'some uri'
      const description = 'uri description'
      setUnlockableContentUri(0, uri, description)

      await expectRevert(
        contract.getUnlockableContentUri(0, { from: accounts[1] }),
        'caller is not the owner'
      )
    })

    it('getUnlockableContentUri from owner returns correct uri', async () => {
      const uri = 'some uri'
      const description = 'uri description'
      setUnlockableContentUri(0, uri, description)

      assert.equal(
        await contract.getUnlockableContentUri(0, { from: accounts[0] }),
        uri
      )
    })
  })
})
