// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IMontage} from "../montage/IMontage.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import {IMontageMetadataDecoder} from "../decoder/IMontageMetadataDecoder.sol";
import {IMintableERC721} from "./IMintableERC721.sol";

/**
 * Wrapper/Bundler for NFTs
 */
contract MontageNFTL2 is IMontage, ERC721, AccessControl, IERC2981, IMintableERC721 {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    ///@dev bytes4(keccak256("royaltyInfo(uint256,uint256,bytes)")) == 0xc155531d
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0xc155531d;
    uint256 public constant BUNDLE_LIMIT = 50;
    using Strings for uint256;

    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    mapping(uint256 => bool) public withdrawnTokens;

    IERC721Metadata public erc721Contract;
    IRoyaltyGovernor public royaltyGovernorContract;
    IMontageMetadataDecoder public montageMetadataDecoder;
    struct MontageData {
        address creator;
        string name;
        string description;
        bool canBeUnpacked;
        uint256[] tokenIds;
        string unlockableContentUri;
        string unlockableDescription;
    }
    MontageData[] montageDatas;

    // keeping it for checking, whether deposit being called by valid address or not
    address public mintableERC721PredicateProxy;

    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event MontageCreated(address indexed creator, uint256 indexed tokenId, uint256[] tokenIds);
    event MontageUnlockableUpdated(uint256 indexed tokenId);
    event MontageUnpacked(uint256 indexed tokenId);
    event NewMetadataDecoderSet(address metadataDecoder);
    event TransferWithMetadata(address indexed from, address indexed to, uint256 indexed tokenId, bytes metaData);

    /**
     * @dev @notice Base URI for Montage NFT's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view Montage NFT
     */
    string private viewUriBase;

    /** @dev Checks if sender is childChainManagerProxy
     */
    modifier onlyMintableERC721PredicateProxy() {
        require(msg.sender == mintableERC721PredicateProxy, "Address is not MintableERC721PredicateProxy");
        _;
    }

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_exists(_tokenId), INVALID_TOKEN_ID);
        _;
    }

    /** @dev Checks if sender is token owner
     * @param _tokenId The token id to check ownership
     */
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "Address not token owner");
        _;
    }

    /** @dev Checks if sender is token creator
     * @param _tokenId The token id to check creation
     */
    modifier onlyTokenCreator(uint256 _tokenId) {
        require(montageDatas[_tokenId].creator == msg.sender, "Address not token creator");
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        address _mintableERC721PredicateProxy,
        string memory name,
        string memory symbol,
        IERC721Metadata _NFTAddr,
        IMontageMetadataDecoder _montageMetadataDecoderAddr,
        address[] memory admins
    ) public ERC721(name, symbol) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        erc721Contract = _NFTAddr;
        montageMetadataDecoder = _montageMetadataDecoderAddr;
        mintableERC721PredicateProxy = _mintableERC721PredicateProxy;
        _registerInterface(_INTERFACE_ID_ERC2981);
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr base for the ERC721 tokenURI
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the base URI for the image of each Montage NFT.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each Montage NFT
     */
    function setMediaUriBase(string calldata _mediaUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the Montage NFT
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing a Montage NFT
     */
    function setViewUriBase(string calldata _viewUriBase) external override onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given Montage NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted Montage NFT
     * @return uri the off-chain URI to view the data
     */
    function viewURI(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given Montage NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted Montage NFT's
     * @return uri the off-chain URI to the Montage NFT's image
     */
    function mediaURI(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get the full contents of the montage (i.e. name and tokeids) for a given token ID.
     * @param _tokenId the id of a previously minted montage
     */
    function getMontageInformation(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds
        )
    {
        MontageData memory _montage = montageDatas[_tokenId];
        creator = _montage.creator;
        name = _montage.name;
        creator = _montage.creator;
        description = _montage.description;
        canBeUnpacked = _montage.canBeUnpacked;
        tokenIds = _montage.tokenIds;
    }

    /**
     * @notice Get the contents of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return tokenIds the list of token ids in the montage
     */
    function getTokenIds(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (uint256[] memory tokenIds)
    {
        return montageDatas[_tokenId].tokenIds;
    }

    /**
     * @notice Get the creator of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return creator the address of the creator of the montage
     */
    function getCreator(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (address creator) {
        return montageDatas[_tokenId].creator;
    }

    /**
     * @notice Get the name of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return name the name of the montage
     */
    function getName(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (string memory name) {
        return montageDatas[_tokenId].name;
    }

    /**
     * @notice Get the description of the montage for a given token ID.
     * @param _tokenId the id of a previously minted montage
     * @return description the description of the montage
     */
    function getDescription(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (string memory description)
    {
        return montageDatas[_tokenId].description;
    }

    /**
     * @notice Whether a montage for a given token ID can be unpacked.
     * @param _tokenId the id of a previously minted montage
     * @return true if the montage can be unpacked
     */
    function canBeUnpacked(uint256 _tokenId) public override view onlyExistingTokens(_tokenId) returns (bool) {
        return montageDatas[_tokenId].canBeUnpacked;
    }

    /**
     * @notice Get all view URIs for all nfts inside a given montage.
     * @param _tokenId the id of a previously minted Montage NFT
     * @return metadata the off-chain URIs to view the token metadata of each token in json format
     */
    function viewURIsInMontage(uint256 _tokenId)
        public
        override
        view
        onlyExistingTokens(_tokenId)
        returns (string memory metadata)
    {
        uint256[] memory tokenIds = getTokenIds(_tokenId);
        uint256 len = tokenIds.length;

        // start JSON object
        metadata = strConcat("{\n", '  "uris": [\n');

        // transfer ownership of nfts to this contract
        for (uint256 i = 0; i < len; i++) {
            // Media URI
            metadata = strConcat(metadata, '"');
            metadata = strConcat(metadata, erc721Contract.tokenURI(tokenIds[i]));
            metadata = strConcat(metadata, '"');
            if (i < len - 1) {
                metadata = strConcat(metadata, ", ");
            }
        }
        //close array
        metadata = strConcat(metadata, "\n  ]");

        // Finish JSON object
        metadata = strConcat(metadata, "\n}");
    }

    /*
     * creates a montage of the given token ids
     */
    function createMontage(
        string memory _name,
        string memory _description,
        bool _canBeUnpacked,
        uint256[] memory _tokenIds
    ) external override {
        revert("createMontage: only montages from L2 can be minted here");
    }

    function setUnlockableContentUri(
        uint256 _tokenId,
        string memory unlockableContentUri,
        string memory unlockableDescription
    ) public override onlyTokenOwner(_tokenId) onlyTokenCreator(_tokenId) {
        MontageData storage _montageData = montageDatas[_tokenId];
        _montageData.unlockableContentUri = unlockableContentUri;
        _montageData.unlockableDescription = unlockableDescription;

        emit MontageUnlockableUpdated(_tokenId);
    }

    function hasUnlockableContentUri(uint256 _tokenId) external override view returns (bool) {
        bytes memory uriBytes = bytes(montageDatas[_tokenId].unlockableContentUri);
        return uriBytes.length != 0;
    }

    function getUnlockableContentUri(uint256 _tokenId)
        public
        override
        view
        onlyTokenOwner(_tokenId)
        returns (string memory unlockableContentUri)
    {
        return montageDatas[_tokenId].unlockableContentUri;
    }

    function getUnlockableDescription(uint256 _tokenId)
        public
        override
        view
        returns (string memory unlockableDescription)
    {
        return montageDatas[_tokenId].unlockableDescription;
    }

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

    /*
     * unpacks the montage, transferring ownership of the individual nfts inside the montage to the montage owner before burning the montage nft
     */
    function unpackMontage(uint256 _tokenId) external override onlyTokenOwner(_tokenId) {
        revert("unpackMontage: cannot unpack this montage on L1 - move to L2");
    }

    function exists(uint256 tokenId) external override view returns (bool) {
        return _exists(tokenId);
    }

    // being proxified smart contract, most probably childChainManagerProxy contract's address
    // is not going to change ever, but still, lets keep it
    function updateMintableERC721PredicateProxy(address newMintableERC721PredicateProxy) external onlyAdmin {
        require(newMintableERC721PredicateProxy != address(0), "Bad MintableERC721PredicateProxy address");

        mintableERC721PredicateProxy = newMintableERC721PredicateProxy;
    }

    function setMetadataDecoder(IMontageMetadataDecoder newMetadataDecoder) external onlyAdmin {
        montageMetadataDecoder = newMetadataDecoder;
        emit NewMetadataDecoderSet(address(montageMetadataDecoder));
    }

    /**
     * @dev See {IMintableERC721-mint}.
     *
     * If you're attempting to bring metadata associated with token
     * from L2 to L1, you must implement this method
     */
    function mint(
        address user,
        uint256 tokenId,
        bytes calldata metaData
    ) external override onlyMintableERC721PredicateProxy {
        _mint(user, tokenId);

        setTokenMetadata(tokenId, metaData);
    }

    /**
     * @dev See {IMintableERC721-mint}.
     */
    function mint(address user, uint256 tokenId) external override onlyMintableERC721PredicateProxy {
        _mint(user, tokenId);
    }

    /**
     * If you're attempting to bring metadata associated with token
     * from L2 to L1, you must implement this method, to be invoked
     * when minting token back on L1, during exit
     */
    function setTokenMetadata(uint256 _tokenId, bytes memory data) internal virtual {
        // This function should decode metadata obtained from L2
        // and attempt to set it for this `tokenId`
        //
        // Following is just a default implementation, feel
        // free to define your own encoding/ decoding scheme
        // for L2 -> L1 token metadata transfer
        (
            address _creator,
            string memory _name,
            string memory _description,
            bool _canBeUnpacked,
            uint256[] memory _tokenIds,
            string memory _unlockableContentUri,
            string memory _unlockableDescription
        ) = montageMetadataDecoder.decodeMetadata(data);
        MontageData memory _montage = MontageData(
            _creator,
            _name,
            _description,
            _canBeUnpacked,
            _tokenIds,
            _unlockableContentUri,
            _unlockableDescription
        );
        montageDatas[_tokenId] = _montage;
    }

    /**
     * @notice Concatenate two strings
     * @param _a the first string
     * @param _b the second string
     * @return result the concatenation of `_a` and `_b`
     */
    function strConcat(string memory _a, string memory _b) internal pure returns (string memory result) {
        result = string(abi.encodePacked(bytes(_a), bytes(_b)));
    }
}
