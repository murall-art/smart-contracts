// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface INFTBundle {
    function setTokenUriBase(string calldata _tokenUriBase) external;

    function setMediaUriBase(string calldata _tokenUriBase) external;

    function setViewUriBase(string calldata _tokenUriBase) external;

    function viewURI(uint256 _tokenId) external view returns (string memory uri);

    function mediaURI(uint256 _tokenId) external view returns (string memory uri);

    function getBundle(uint256 bundleId) external view returns (string memory name, uint256[] memory tokenIds);

    function getBundleTokenIds(uint256 bundleId) external view returns (uint256[] memory tokenIds);

    function getBundleName(uint256 bundleId) external view returns (string memory name);

    function viewURIsInBundle(uint256 bundleId) external view returns (string memory metadata);

    function bundleNfts(uint256 name, uint256[] memory tokenIds) external;

    function setUnlockableContentUri(uint256 bundleId, string memory unlockableContentUri) external;

    function hasUnlockableContentUri(uint256 bundleId) external view returns (bool);

    function getUnlockableContentUri(uint256 bundleId) external view returns (string memory unlockableContentUri);

    function unbundleNfts(uint256 bundleId) external;

    function exists(uint256 bundleId) external view returns (bool);
}
