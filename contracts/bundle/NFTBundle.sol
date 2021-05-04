// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * Wrapper/Bundler for NFTs
 */
contract NFTBundle is ERC721, Ownable, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant BUNDLE_LIMIT = 50;
    using Strings for uint256;

    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    struct Bundle {
        address creator;
        uint256 name;
        uint256[] tokenIds;
        string unlockableContentUri;
    }
    Bundle[] bundles;

    IERC721Metadata erc721Contract;

    event BundleCreated(address indexed creator, uint256 indexed bundleTokenId, uint256[] tokenIds);
    event BundleUnlockableUpdated(uint256 indexed bundleTokenId);
    event BundleUnpacked(uint256 indexed bundleTokenId);

    /**
     * @dev @notice Base URI for NFT Bundle's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view NFT Bundle
     */
    string private viewUriBase;

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

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        IERC721Metadata _NFTAddr,
        address[] memory admins
    ) public ERC721(name, symbol) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        erc721Contract = _NFTAddr;
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each NFT Bundle.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the base URI for the image of each NFT Bundle.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each NFT Bundle
     */
    function setMediaUriBase(string calldata _mediaUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the NFT Bundle
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing an NFT Bundle
     */
    function setViewUriBase(string calldata _viewUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given NFT Bundle's Token ID.
     * @param _tokenId the Token ID of a previously minted NFT Bundle
     * @return uri the off-chain URI to view the data
     */
    function viewURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given NFT Bundle's Token ID.
     * @param _tokenId the Token ID of a previously minted NFT Bundle's
     * @return uri the off-chain URI to the NFT Bundle's image
     */
    function mediaURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get the full contents of the bundle (i.e. name and tokeids) for a given bundle Token ID.
     * @param bundleId the bundle ID of a previously minted bundle
     */
    function getBundle(uint256 bundleId)
        public
        view
        onlyExistingTokens(bundleId)
        returns (string memory name, uint256[] memory tokenIds)
    {
        Bundle memory _bundle = bundles[bundleId];
        tokenIds = _bundle.tokenIds;
        name = bytes32ToString(bytes32(_bundle.name));
    }

    /**
     * @notice Get the contents of the bundle for a given bundle Token ID.
     * @param bundleId the bundle ID of a previously minted bundle
     * @return tokenIds the list of token ids in the bundle
     */
    function getBundleTokenIds(uint256 bundleId)
        public
        view
        onlyExistingTokens(bundleId)
        returns (uint256[] memory tokenIds)
    {
        Bundle memory _bundle = bundles[bundleId];
        tokenIds = _bundle.tokenIds;
    }

    /**
     * @notice Get the contents of the bundle for a given bundle Token ID.
     * @param bundleId the bundle ID of a previously minted bundle
     * @return name the name of the bundle
     */
    function getBundleName(uint256 bundleId) public view onlyExistingTokens(bundleId) returns (string memory name) {
        Bundle memory _bundle = bundles[bundleId];

        name = bytes32ToString(bytes32(_bundle.name));
    }

    /**
     * @notice Get all view URIs for bundled nfts inside a given bundle.
     * @param bundleId the bundle ID of a previously minted NFT Bundle
     * @return metadata the off-chain URIs to view the token metadata of each token in json format
     */
    function viewURIsInBundle(uint256 bundleId)
        public
        view
        onlyExistingTokens(bundleId)
        returns (string memory metadata)
    {
        Bundle memory _bundle = bundles[bundleId];
        uint256 len = _bundle.tokenIds.length;

        // start JSON object
        metadata = strConcat("{\n", '  "uris": [\n');

        // transfer ownership of nfts to this contract
        for (uint256 i = 0; i < len; i++) {
            // Media URI
            metadata = strConcat(metadata, '"');
            metadata = strConcat(metadata, erc721Contract.tokenURI(_bundle.tokenIds[i]));
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
     * creates a bundle of the given token ids
     */
    function bundleNfts(uint256 name, uint256[] memory tokenIds) public {
        uint256 len = tokenIds.length;
        require(len <= BUNDLE_LIMIT && len > 0, "bundle size exceeds limit");
        // transfer ownership of nfts to this contract
        for (uint256 i = 0; i < len; i++) {
            // if the sender is not the owner of the tokens it will cause a revert
            erc721Contract.transferFrom(msg.sender, address(this), tokenIds[i]);
        }

        // create the bundle object
        Bundle memory _bundle = Bundle(msg.sender, name, tokenIds, "");

        // push the bundle to the array
        bundles.push(_bundle);
        uint256 _id = bundles.length - 1;

        _mint(msg.sender, _id);
        emit BundleCreated(msg.sender, _id, tokenIds);
    }

    function setUnlockableContentUri(uint256 bundleId, string memory unlockableContentUri)
        public
        onlyTokenOwner(bundleId)
    {
        Bundle storage _bundle = bundles[bundleId];
        require(_bundle.creator == msg.sender, "Address not token creator");

        _bundle.unlockableContentUri = unlockableContentUri;

        emit BundleUnlockableUpdated(bundleId);
    }

    function getUnlockableContentUri(uint256 bundleId)
        public
        view
        onlyTokenOwner(bundleId)
        returns (string memory unlockableContentUri)
    {
        Bundle memory _bundle = bundles[bundleId];

        return _bundle.unlockableContentUri;
    }

    /*
     * unpacks the bundles, transferring ownership of the individual nfts inside the bundle to the bundle owner before burning the bundle nft
     */
    function unbundleNfts(uint256 bundleId) public onlyTokenOwner(bundleId) {
        Bundle memory _bundle = bundles[bundleId];
        uint256 len = _bundle.tokenIds.length;
        // transfer ownership of nfts from this contract to the sender address
        for (uint256 i = 0; i < len; i++) {
            erc721Contract.transferFrom(address(this), msg.sender, _bundle.tokenIds[i]);
        }

        // delete the bundle from the array
        delete bundles[bundleId];

        _burn(bundleId);
        emit BundleUnpacked(bundleId);
    }

    function exists(uint256 bundleId) external view returns (bool) {
        return _exists(bundleId);
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

    function bytes32ToString(bytes32 x) internal pure returns (string memory) {
        bytes memory bytesString = new bytes(32);
        uint256 charCount = 0;
        uint256 j;
        for (j = 0; j < 32; j++) {
            bytes1 char = bytes1(bytes32(uint256(x) * 2**(8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }
}
