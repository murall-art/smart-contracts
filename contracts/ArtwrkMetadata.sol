pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import {MurAllNFT} from "./MurAllNFT.sol";

contract ArtwrkMetadata is Ownable {
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
    function getArtwrkMetadata(uint256 _tokenId) external view returns (string memory metadata) {
        require(_tokenId < murAllNFT.totalSupply(), INVALID_TOKEN_ID);

        // Name
        string memory name = bytes32ToString(bytes32(murAllNFT.getName(_tokenId)));
        metadata = strConcat('{\n  "name": "', name);
        metadata = strConcat(metadata, '",\n');

        // Description: Artist
        string memory artist = toAsciiString(murAllNFT.getArtist(_tokenId));
        metadata = strConcat(metadata, '  "description": "By Artist ');
        metadata = strConcat(metadata, artist);

        // Description: Number
        metadata = strConcat(metadata, ", Number ");
        metadata = strConcat(metadata, uintToStr(murAllNFT.getNumber(_tokenId)));

        // Description: Series
        metadata = strConcat(metadata, " from Series ");
        metadata = strConcat(metadata, uintToStr(murAllNFT.getSeriesId(_tokenId)));

        if (murAllNFT.hasAlphaChannel(_tokenId)) {
            // Description: Alpha Channel
            metadata = strConcat(metadata, ", with alpha (RGB565 channel ");
            metadata = strConcat(metadata, uintToStr(murAllNFT.getAlphaChannel(_tokenId)));
            metadata = strConcat(metadata, ")");
        }

        metadata = strConcat(metadata, '",\n');

        // View URI
        // metadata = strConcat(metadata, '  "external_url": "');
        // metadata = strConcat(metadata, viewURI(_tokenId));
        // metadata = strConcat(metadata, '",\n');

        // Media URI
        // metadata = strConcat(metadata, '  "image": "');
        // metadata = strConcat(metadata, mediaURI(_tokenId));
        // metadata = strConcat(metadata, '",\n');

        // Attributes (ala OpenSea)
        metadata = strConcat(metadata, '  "attributes": [\n');

        // Name
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "trait_type": "name",\n');
        metadata = strConcat(metadata, '      "value": "');
        metadata = strConcat(metadata, name);
        metadata = strConcat(metadata, '"\n    },\n');

        // Artist
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "trait_type": "artist",\n');
        metadata = strConcat(metadata, '      "value": "');
        metadata = strConcat(metadata, artist);
        metadata = strConcat(metadata, '"\n    },\n');

        if (murAllNFT.hasAlphaChannel(_tokenId)) {
            // Alpha Channel
            metadata = strConcat(metadata, "    {\n");
            metadata = strConcat(metadata, '      "display_type": "number",\n');
            metadata = strConcat(metadata, '      "trait_type": "Alpha channel (RGB565)",\n');
            metadata = strConcat(metadata, '      "value": ');
            metadata = strConcat(metadata, uintToStr(murAllNFT.getAlphaChannel(_tokenId)));
            metadata = strConcat(metadata, "\n    },\n");
        }

        // Number
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "display_type": "number",\n');
        metadata = strConcat(metadata, '      "trait_type": "number",\n');
        metadata = strConcat(metadata, '      "value": ');
        metadata = strConcat(metadata, uintToStr(murAllNFT.getNumber(_tokenId)));
        metadata = strConcat(metadata, "\n    },\n");

        // Series Id
        metadata = strConcat(metadata, "    {\n");
        metadata = strConcat(metadata, '      "display_type": "number",\n');
        metadata = strConcat(metadata, '      "trait_type": "Series Id",\n');
        metadata = strConcat(metadata, '      "value": ');
        metadata = strConcat(metadata, uintToStr(murAllNFT.getSeriesId(_tokenId)));
        metadata = strConcat(metadata, "\n    }\n");

        // Finish JSON object
        metadata = strConcat(metadata, "  ]\n}");

        return metadata;
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

    /**
     * @notice Convert a `uint` value to a `string`
     * via OraclizeAPI - MIT licence
     * https://github.com/provable-things/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol#L896
     * @param _i the `uint` value to be converted
     * @return result the `string` representation of the given `uint` value
     */
    function uintToStr(uint256 _i) internal pure returns (string memory result) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (_i != 0) {
            bstr[k--] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        result = string(bstr);
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
