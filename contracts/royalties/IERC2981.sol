// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;
import "@openzeppelin/contracts/introspection/IERC165.sol";

///
/// @dev Interface for the NFT Royalty Standard
///
interface IERC2981 is IERC165 {
    /// ERC165 bytes to add to interface array - set in parent contract
    /// implementing this standard
    ///
    /// bytes4(keccak256("royaltyInfo(uint256,uint256,bytes)")) == 0xc155531d
    /// bytes4 private constant _INTERFACE_ID_ERC2981 = 0xc155531d;
    /// _registerInterface(_INTERFACE_ID_ERC2981);

    /// @notice Called with the sale price to determine how much royalty
    //          is owed and to whom.
    /// @param _tokenId - the NFT asset queried for royalty information
    /// @param _value - the sale price of the NFT asset specified by _tokenId
    /// @param _data - information used by extensions of this ERC.
    ///                Must not to be used by implementers of EIP-2981
    ///                alone.
    /// @return _receiver - address of who should be sent the royalty payment
    /// @return _royaltyAmount - the royalty payment amount for _value sale price
    /// @return _royaltyPaymentData - information used by extensions of this ERC.
    ///                               Must not to be used by implementers of
    ///                               EIP-2981 alone.
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    )
        external
        returns (
            address _receiver,
            uint256 _royaltyAmount,
            bytes memory _royaltyPaymentData
        );
}
