// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "./ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../MurAll.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MurAllRolesNFT is ERC1155Supply, ReentrancyGuard, AccessControl, Ownable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Role {
        bool exists;
        bytes32 merkleRoot;
        string uri;
        mapping(address => bool) claimedRole;
    }
    uint256 public constant TYPE_PAINTER = 1;
    uint256 public constant TYPE_MURALLIST = 2;

    MurAll public murAll;

    mapping(uint256 => Role) public roles;

    event RoleClaimed(uint256 indexed id, address owner);
    event RoleAdded(uint256 indexed id);
    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        address[] memory admins,
        string memory painterUri,
        string memory murAllistUri,
        MurAll _murAllAddr
    ) public ERC1155("") {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        murAll = _murAllAddr;
        Role memory role = Role(true, "", painterUri);
        roles[TYPE_PAINTER] = role;

        Role memory role2 = Role(true, "", murAllistUri);
        roles[TYPE_MURALLIST] = role2;
    }

    function addRole(
        uint256 id,
        bytes32 _root,
        string memory uri
    ) public onlyAdmin {
        require(!roles[id].exists, "Role already exists");

        Role memory role = Role(true, _root, uri);

        roles[id] = role;
        emit RoleAdded(id);
    }

    function setupClaimMerkleRootForRole(uint256 id, bytes32 _root) public onlyAdmin {
        Role storage role = roles[id];
        require(role.exists, "Role does not exist");

        role.merkleRoot = _root;
    }

    function setupUriForRole(uint256 id, bytes32 _root) public onlyAdmin {
        Role storage role = roles[id];
        require(role.exists, "Role does not exist");

        role.merkleRoot = _root;
    }

    function mintRole(address _to, uint256 _id) public onlyAdmin {
        Role storage role = roles[_id];
        require(role.exists, "Role does not exist");
        require(role.claimedRole[_to] == false, "Role already claimed");

        role.claimedRole[_to] = true;
        _mint(_to, _id, 1, "");
        emit RoleClaimed(_id, _to);
    }

    function mintMultiple(address[] memory _to, uint256[] memory _ids) public onlyAdmin {
        for (uint256 i = 0; i < _ids.length; i++) {
            Role storage role = roles[_ids[i]];
            require(role.exists, "Role does not exist");
            require(role.claimedRole[_to[i]] == false, "Role already claimed");

            role.claimedRole[_to[i]] = true;
            _mint(_to[i], _ids[i], 1, "");
            emit RoleClaimed(_ids[i], _to[i]);
        }
    }

    function claimPainterRoleL1() public nonReentrant {
        require(murAll.isArtist(msg.sender), "Only painter can claim painter role");
        Role storage role = roles[TYPE_PAINTER];

        require(role.claimedRole[msg.sender] == false, "Role already claimed");

        role.claimedRole[msg.sender] = true;
        _mint(msg.sender, TYPE_PAINTER, 1, "");
        emit RoleClaimed(TYPE_PAINTER, msg.sender);
    }

    function claimRole(
        uint256 index,
        uint256 roleId,
        bytes32[] calldata merkleProof
    ) public nonReentrant {
        Role storage role = roles[roleId];
        require(role.exists, "Role does not exist");
        require(role.claimedRole[msg.sender] == false, "Role already claimed");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, msg.sender, roleId));
        require(MerkleProof.verify(merkleProof, role.merkleRoot, node), "Invalid proof.");

        role.claimedRole[msg.sender] = true;

        _mint(msg.sender, roleId, 1, "");
        emit RoleClaimed(roleId, msg.sender);
    }

    function hasClaimedRole(address _to, uint256 roleId) public view returns (bool) {
        Role storage role = roles[roleId];
        return role.exists && role.claimedRole[_to];
    }

    function roleExists(uint256 roleId) public view returns (bool) {
        return roles[roleId].exists;
    }

    function setURI(uint256 roleId, string memory newuri) public onlyAdmin {
        Role storage role = roles[roleId];
        require(role.exists, "Role does not exist");

        role.uri = newuri;
        emit URI(newuri, roleId);
    }

    function uri(uint256 roleId) external override view returns (string memory) {
        return roles[roleId].uri;
    }
}
