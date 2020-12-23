// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {MurAllNFT} from "./../MurAllNFT.sol";
import {IArtwrkMetadata} from "./IArtwrkMetadata.sol";

contract ArtwrkMetadata is Ownable, IArtwrkMetadata {
    using Strings for uint256;
    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    MurAllNFT public murAllNFT;

    constructor(MurAllNFT _murAllNFTAddr) public {
        murAllNFT = _murAllNFTAddr;
    }

    /**
     * @notice Get human-readable metadata for a given ARTWRK by Token ID.
     * @param _tokenId the token id of the given ARTWRK
     * @return metadata the MurAll ARTWRK's human-readable metadata
     */
    function getArtwrkMetadata(uint256 _tokenId) external override view returns (string memory metadata) {
        require(_tokenId < murAllNFT.totalSupply(), INVALID_TOKEN_ID);

        // Name
        string memory name = murAllNFT.getName(_tokenId);
        metadata = strConcat('{\n  "name": "', name);
        metadata = strConcat(metadata, '",\n');

        // Description: Artist
        string memory artist = toAsciiString(murAllNFT.getArtist(_tokenId));
        metadata = strConcat(metadata, '  "description": "By Artist ');
        metadata = strConcat(metadata, artist);

        // Description: Number
        metadata = strConcat(metadata, ", Number ");
        metadata = strConcat(metadata, murAllNFT.getNumber(_tokenId).toString());

        // Description: Series
        metadata = strConcat(metadata, " from Series ");
        metadata = strConcat(metadata, murAllNFT.getSeriesId(_tokenId).toString());
        metadata = strConcat(metadata, '",\n');

        // View URI
        metadata = strConcat(metadata, '  "external_url": "');
        metadata = strConcat(metadata, murAllNFT.viewURI(_tokenId));
        metadata = strConcat(metadata, '",\n');

        // Media URI
        metadata = strConcat(metadata, '  "image": "');
        metadata = strConcat(metadata, murAllNFT.mediaURI(_tokenId));
        metadata = strConcat(metadata, '",\n');

        // Attributes (ala OpenSea)
        metadata = strConcat(metadata, '  "attributes": [\n');

        // Name
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "trait_type": "Name",\n');
        metadata = strConcat(metadata, '      "value": "');
        metadata = strConcat(metadata, name);
        metadata = strConcat(metadata, '"\n    },\n');

        // Artist
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "trait_type": "Artist",\n');
        metadata = strConcat(metadata, '      "value": "');
        metadata = strConcat(metadata, artist);
        metadata = strConcat(metadata, '"\n    },\n');

        // Filled
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "trait_type": "Filled",\n');
        metadata = strConcat(metadata, '      "value": "');
        if (murAllNFT.isArtworkFilled(_tokenId)) {
            metadata = strConcat(metadata, "Filled");
        } else {
            metadata = strConcat(metadata, "Not filled");
        }
        metadata = strConcat(metadata, '"\n    },\n');

        // Number
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "display_type": "number",\n');
        metadata = strConcat(metadata, '      "trait_type": "Number",\n');
        metadata = strConcat(metadata, '      "value": ');
        metadata = strConcat(metadata, murAllNFT.getNumber(_tokenId).toString());
        metadata = strConcat(metadata, "\n    },\n");

        // Series Id
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "display_type": "number",\n');
        metadata = strConcat(metadata, '      "trait_type": "Series Id",\n');
        metadata = strConcat(metadata, '      "value": ');
        metadata = strConcat(metadata, murAllNFT.getSeriesId(_tokenId).toString());
        metadata = strConcat(metadata, "\n    }\n");

        // Finish JSON object
        metadata = strConcat(metadata, "  ]\n}");

        return metadata;
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

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(x) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
