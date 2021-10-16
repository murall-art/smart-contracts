// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFrameTraitManager} from "./IFrameTraitManager.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import {ERC721MintManager} from "../distribution/ERC721MintManager.sol";

/**
 * MurAll Frame contract
 */
contract MurAllFrame is
    AccessControl,
    ReentrancyGuard,
    IERC2981,
    VRFConsumerBase,
    IERC721Receiver,
    ERC1155Receiver,
    ERC721MintManager
{
    using Strings for uint256;
    using ERC165Checker for address;
    /*
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('ownerOf(uint256)')) == 0x6352211e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('getApproved(uint256)')) == 0x081812fc
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) == 0x42842e0e
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)')) == 0xb88d4fde
     *
     *     => 0x70a08231 ^ 0x6352211e ^ 0x095ea7b3 ^ 0x081812fc ^
     *        0xa22cb465 ^ 0xe985e9c ^ 0x23b872dd ^ 0x42842e0e ^ 0xb88d4fde == 0x80ac58cd
     */
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    /*
     *     bytes4(keccak256('balanceOf(address,uint256)')) == 0x00fdd58e
     *     bytes4(keccak256('balanceOfBatch(address[],uint256[])')) == 0x4e1273f4
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,uint256,bytes)')) == 0xf242432a
     *     bytes4(keccak256('safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)')) == 0x2eb2c2d6
     *
     *     => 0x00fdd58e ^ 0x4e1273f4 ^ 0xa22cb465 ^
     *        0xe985e9c5 ^ 0xf242432a ^ 0x2eb2c2d6 == 0xd9b67a26
     */
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

    IFrameTraitManager public frameTraitManager;
    IRoyaltyGovernor public royaltyGovernorContract;

    mapping(uint256 => uint256) private customFrameTraits;

    struct FrameContents {
        address contractAddress;
        uint256 tokenId;
        uint256 amount;
        bool bound;
    }

    mapping(uint256 => FrameContents) public frameContents;

    // for chainlink vrf
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public traitSeed;

    event RandomnessRequested(bytes32 requestId);
    event TraitSeedSet(uint256 seed);

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_exists(_tokenId), "Invalid Token ID");
        _;
    }

    event FrameContentsUpdated(
        uint256 indexed id,
        address indexed contentsContract,
        uint256 contentsId,
        uint256 amount,
        bool bound
    );
    event FrameContentsRemoved(uint256 indexed id);
    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event FrameTraitManagerChanged(address indexed frameTraitManager);

    constructor(
        address[] memory admins,
        address _vrfCoordinator,
        address _linkTokenAddr,
        bytes32 _keyHash,
        uint256 _fee
    )
        public
        ERC721MintManager("Frames by MurAll", "FRAMES", admins, 4444, 436, 1004, 0.144 ether, 0.244 ether)
        VRFConsumerBase(_vrfCoordinator, _linkTokenAddr)
    {
        keyHash = _keyHash;
        fee = _fee;

        _registerInterface(IERC721Receiver(0).onERC721Received.selector);
    }

    function setCustomTraits(uint256[] memory traitHash, uint256 startIndex) public nonReentrant onlyAdmin {
        require(traitSeed != 0, "Trait seed not set yet");

        for (uint256 i = 0; i < traitHash.length; ++i) {
            uint256 randomIndex = (uint256(keccak256(abi.encode(traitSeed, i + startIndex))) % MAX_SUPPLY);
            require(traitHash[i] != 0, "Invalid trait hash");
            customFrameTraits[randomIndex] = traitHash[i];
        }
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each MURALL NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the frame trait manager contract.
     * Only invokable by admin role.
     * @param managerAddress the address of the frame trait image storage contract
     */
    function setFrameTraitManager(IFrameTraitManager managerAddress) public onlyAdmin {
        frameTraitManager = IFrameTraitManager(managerAddress);
        emit FrameTraitManagerChanged(address(managerAddress));
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr the address of the Royalty Governer contract
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    function getTraits(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (uint256 traits) {
        if (customFrameTraits[_tokenId] != 0) {
            return customFrameTraits[_tokenId];
        } else {
            require(traitSeed != 0, "Trait seed not set yet");
            return uint256(keccak256(abi.encode(traitSeed, _tokenId)));
        }
    }

    function setFrameContents(
        uint256 _tokenId,
        address contentContractAddress,
        uint256 contentTokenId,
        uint256 contentAmount,
        bool bindContentToFrame
    ) public {
        require(ownerOf(_tokenId) == msg.sender, "Not token owner"); // this will also fail if the token does not exist
        if (bindContentToFrame) {
            require(!frameContents[_tokenId].bound, "Frame already contains bound content");
            if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
                // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
                IERC721(contentContractAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    contentTokenId,
                    abi.encode(_tokenId, contentContractAddress)
                );
            } else if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC1155)) {
                // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
                IERC1155(contentContractAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    contentTokenId,
                    contentAmount,
                    abi.encode(_tokenId, contentContractAddress)
                );
            } else revert();
        } else {
            if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
                require(IERC721(contentContractAddress).ownerOf(contentTokenId) == msg.sender, "Not token owner");
                createFrameContents(
                    _tokenId,
                    contentContractAddress,
                    contentTokenId,
                    contentAmount,
                    bindContentToFrame
                );
            } else if (contentContractAddress.supportsInterface(_INTERFACE_ID_ERC1155)) {
                require(
                    IERC1155(contentContractAddress).balanceOf(msg.sender, contentTokenId) >= contentAmount,
                    "Not enough tokens"
                );
                createFrameContents(
                    _tokenId,
                    contentContractAddress,
                    contentTokenId,
                    contentAmount,
                    bindContentToFrame
                );
            } else {
                revert();
            }
        }
    }

    function removeFrameContents(uint256 _tokenId) public {
        require(ownerOf(_tokenId) == msg.sender, "Not token owner"); // this will also fail if the token does not exist
        require(hasContentsInFrame(_tokenId), "Frame does not contain any content"); // Also checks token exists
        FrameContents memory _frameContents = frameContents[_tokenId];
        if (_frameContents.bound) {
            if (_frameContents.contractAddress.supportsInterface(_INTERFACE_ID_ERC721)) {
                // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
                IERC721(_frameContents.contractAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    _frameContents.tokenId
                );
            } else {
                // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
                IERC1155(_frameContents.contractAddress).safeTransferFrom(
                    address(this),
                    msg.sender,
                    _frameContents.tokenId,
                    _frameContents.amount,
                    ""
                );
            }
        }

        delete frameContents[_tokenId];
        emit FrameContentsRemoved(_tokenId);
    }

    function hasContentsInFrame(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (bool) {
        return frameContents[_tokenId].contractAddress != address(0);
    }

    /**
     * @dev See {IERC721Receiver-onERC721Received}.
     *
     * Always returns `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(data.length != 0, "Invalid data - must contain target frame token id");
        (uint256 targetFrameTokenId, address contractAddress) = abi.decode(data, (uint256, address));
        require(ownerOf(targetFrameTokenId) == from, "Owner of target frame does not own the contents"); // this will also fail if the token does not exist
        require(!frameContents[targetFrameTokenId].bound, "Frame already contains bound content");
        require(
            contractAddress.supportsInterface(_INTERFACE_ID_ERC721) &&
                IERC721(contractAddress).ownerOf(tokenId) == address(this),
            "Incorrect data"
        );
        createFrameContents(targetFrameTokenId, contractAddress, tokenId, 1, true);

        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(data.length != 0, "Data must contain target frame id, owner and contract address");
        (uint256 targetFrameTokenId, address contractAddress) = abi.decode(data, (uint256, address));
        require(ownerOf(targetFrameTokenId) == from, "Owner of target frame does not own the contents"); // this will also fail if the token does not exist
        require(!frameContents[targetFrameTokenId].bound, "Frame already contains bound content"); // Also checks token exists
        require(
            contractAddress.supportsInterface(_INTERFACE_ID_ERC1155) &&
                IERC1155(contractAddress).balanceOf(address(this), tokenId) == amount,
            "Incorrect data"
        );
        createFrameContents(targetFrameTokenId, contractAddress, tokenId, amount, true);

        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        revert();
    }

    /** Chainlink VRF ****************************/
    function requestTraitSeed() public onlyAdmin nonReentrant {
        require(traitSeed == 0, "Trait seed already requested");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        bytes32 requestId = requestRandomness(keyHash, fee);

        emit RandomnessRequested(requestId);
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        require(traitSeed == 0, "Trait seed already requested");
        traitSeed = randomness;
        emit TraitSeedSet(randomness);
    }

    /** END Chainlink VRF ****************************/

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    )
        external
        override
        returns (
            address _receiver,
            uint256 _royaltyAmount,
            bytes memory _royaltyPaymentData
        )
    {
        return royaltyGovernorContract.royaltyInfo(_tokenId, _value, _data);
    }

    function createFrameContents(
        uint256 _tokenId,
        address contentContractAddress,
        uint256 contentTokenId,
        uint256 contentAmount,
        bool bindContentToFrame
    ) private onlyExistingTokens(_tokenId) {
        FrameContents memory newFrameContents = FrameContents(
            contentContractAddress,
            contentTokenId,
            contentAmount,
            bindContentToFrame
        );
        frameContents[_tokenId] = newFrameContents;

        emit FrameContentsUpdated(_tokenId, contentContractAddress, contentTokenId, contentAmount, bindContentToFrame);
    }

    fallback() external payable {}

    receive() external payable {}
}
