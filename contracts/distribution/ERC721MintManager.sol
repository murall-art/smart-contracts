// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleTokenClaimDataManager} from "../distribution/MerkleTokenClaimDataManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ERC721MintManager is ERC721, AccessControl, ReentrancyGuard {
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint64 private constant MINT_MODE_DEVELOPMENT = 0;
    uint64 private constant MINT_MODE_PUBLIC = 2;
    uint64 private constant MINT_MODE_PRESALE = 1;
    uint64 public mintMode = MINT_MODE_DEVELOPMENT;

    uint256 public immutable MAX_SUPPLY;

    uint256 public immutable MINT_PRICE_PRESALE;
    uint256 public immutable MINT_PRICE_PUBLIC;

    uint128 public immutable NUM_INITIAL_MINTABLE;
    uint128 public immutable NUM_PRESALE_MINTABLE;

    MerkleTokenClaimDataManager public presaleManager;

    event PresaleMerkleRootSet(bytes32 merkleRoot);
    event Minted(uint256 indexed id, address indexed owner);

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address[] memory admins,
        uint256 _maxSupply,
        uint128 _numInitialMintable,
        uint128 _numPresaleMintable,
        uint256 _presaleMintPrice,
        uint256 _publicMintPrice
    ) public ERC721(name, symbol) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }

        MAX_SUPPLY = _maxSupply;
        NUM_INITIAL_MINTABLE = _numInitialMintable;
        NUM_PRESALE_MINTABLE = _numPresaleMintable;
        MINT_PRICE_PRESALE = _presaleMintPrice;
        MINT_PRICE_PUBLIC = _publicMintPrice;
    }

    function mint(uint256 amount) external payable nonReentrant {
        require(mintMode == MINT_MODE_PUBLIC, "Public minting not enabled");
        require(msg.value >= MINT_PRICE_PUBLIC, "Insufficient funds");
        require(amount <= 4 && balanceOf(msg.sender) <= 40, "Dont be greedy");

        for (uint256 i = 0; i < amount; ++i) {
            mintInternal(msg.sender);
        }
    }

    function mintPresale(
        uint256 index,
        address account,
        uint256 maxAmount,
        bytes32[] calldata merkleProof,
        uint256 amountDesired
    ) external payable nonReentrant {
        require(mintMode == MINT_MODE_PRESALE, "Presale minting not enabled");
        require(address(presaleManager) != address(0), "Merkle root not set");
        require(msg.value >= MINT_PRICE_PRESALE, "Insufficient funds");
        require(msg.sender == account, "Account is not the presale account");
        require(!presaleManager.hasClaimed(index), "Address already minted");
        uint256 maxIdMintable = NUM_INITIAL_MINTABLE + NUM_PRESALE_MINTABLE;

        // Verify the merkle proof.
        presaleManager.verifyAndSetClaimed(index, account, maxAmount, merkleProof);
        uint256 amountToMint = maxAmount < amountDesired ? maxAmount : amountDesired;
        for (uint256 i = 0; i < amountToMint; ++i) {
            require(totalSupply() < maxIdMintable, "Maximum number of presale NFT's reached");
            mintInternal(msg.sender);
        }
    }

    function setPresaleMintingMerkleRoot(bytes32 merkleRoot) public onlyAdmin {
        require(address(presaleManager) == address(0), "Merkle root already set");
        presaleManager = new MerkleTokenClaimDataManager(merkleRoot);
        emit PresaleMerkleRootSet(merkleRoot);
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "rescueTokens: Transfer failed.");
    }

    function setMintingMode(uint64 mode) public onlyAdmin {
        require(mode == MINT_MODE_PRESALE || mode == MINT_MODE_PUBLIC || mode == MINT_MODE_DEVELOPMENT, "Invalid mode");
        mintMode = mode;
    }

    function mintInitial(uint256 amountToMint) public nonReentrant onlyAdmin returns (uint256) {
        for (uint256 i = 0; i < amountToMint; ++i) {
            require(totalSupply() <= NUM_INITIAL_MINTABLE, "Maximum number of initial NFTs reached");
            mintInternal(msg.sender);
        }
    }

    function withdrawFunds(address payable _to) public onlyAdmin {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Failed to transfer the funds, aborting.");
    }

    function mintInternal(address account) internal {
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of NFTs minted");
        // mint a new frame
        uint256 _id = totalSupply();
        _mint(account, _id);
        emit Minted(_id, account);
    }
}
