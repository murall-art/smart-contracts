const { expectEvent, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const PaintToken = artifacts.require('./PaintToken.sol');

const INITIAL_SUPPLY = 21772800000;
const DECIMALS = 18;

contract('PaintToken', function ([owner, user]) {
    beforeEach(async function () {
        this.paintToken = await PaintToken.new();
    });

    it('has a name', async function () {
        assert.equal(await this.paintToken.name(), 'Paint');
    });

    it('has a symbol', async function () {
        assert.equal(await this.paintToken.symbol(), 'PAINT');
    });

    it('has correct total supply', async function () {
        const totalSupply = await this.paintToken.totalSupply();
        assert.equal(parseInt(totalSupply), INITIAL_SUPPLY * (10 ** DECIMALS));
    });

    it('assigns the initial total supply to the creator', async function () {
        const totalSupply = await this.paintToken.totalSupply();
        const creatorBalance = await this.paintToken.balanceOf(owner);

        assert.equal(parseInt(creatorBalance), parseInt(totalSupply));

        await expectEvent.inConstruction(this.paintToken, 'Transfer', {
          from: ZERO_ADDRESS,
          to: owner,
          value: totalSupply,
        });
    });

    it('should transfer right token', async function () {
        const amountToTransfer = 500000;
        await this.paintToken.transfer(user, amountToTransfer);
        const ownerBalance = await this.paintToken.balanceOf.call(owner);
        const userBalance = await this.paintToken.balanceOf.call(user);
        
        const expectedOwnerBalance = BigInt((BigInt(INITIAL_SUPPLY) * BigInt(10 ** DECIMALS)) - BigInt(amountToTransfer));
        assert.equal(BigInt(ownerBalance), expectedOwnerBalance);
        assert.equal(userBalance.toNumber(), amountToTransfer);
    });

    it('allows burning tokens yourself', async function () {
        const amountToBurn = BigInt(BigInt(1) * BigInt(10 ** DECIMALS));
        await this.paintToken.burn(amountToBurn.toString(), { from: owner });

        const creatorBalance = await this.paintToken.balanceOf(owner)
        const expected = BigInt((BigInt(INITIAL_SUPPLY) - BigInt(1)) * BigInt(10 ** DECIMALS))
        assert.equal(BigInt(creatorBalance), expected);
    });

    it('allows burning user tokens', async function () {
        const amountToTransfer = 1000000000
        await this.paintToken.transfer(user, amountToTransfer)
        const userBalance = await this.paintToken.balanceOf(user)
        assert.equal(userBalance, amountToTransfer)

        const amountToBurn = 500000000
        await this.paintToken.approve(owner, amountToBurn, { from: user })
        await this.paintToken.burnFrom(user, amountToBurn)

        const newUserBalance = await this.paintToken.balanceOf(user)
        const expected = amountToTransfer - amountToBurn
        assert.equal(newUserBalance, expected);
    });
});