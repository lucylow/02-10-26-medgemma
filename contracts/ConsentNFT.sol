// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ConsentNFT — Patient-centric consent via NFT ownership
/// @notice MedGemma record → patient signs → NFT minted; grant/revoke viewer access with expiry
contract ConsentNFT is ERC721, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct MedicalRecord {
        string encryptedIPFSHash;
        string dataKeyHash;
        uint256 boneAgeMonths;
        bool hasFracture;
        string aiModelVersion;
        uint256 confidence; // 0-10000 (4 decimals)
        address clinician;
        uint256 createdAt;
    }

    uint256 private _tokenIds;
    mapping(uint256 => MedicalRecord) public records;
    mapping(uint256 => bool) public consentActive;
    mapping(uint256 => uint256) public consentExpiresAt;
    mapping(uint256 => mapping(address => uint256)) public viewerExpiry;
    mapping(address => uint256[]) private _ownerTokens;

    event ConsentNFTMinted(
        uint256 indexed tokenId,
        address indexed patient,
        string ipfsHash,
        uint256 expiresAt
    );
    event AccessGranted(
        uint256 indexed tokenId,
        address indexed patient,
        address indexed viewer,
        uint256 expiresAt
    );
    event AccessRevoked(
        uint256 indexed tokenId,
        address indexed patient,
        address indexed viewer
    );
    event ConsentRevoked(uint256 indexed tokenId, address indexed patient);

    constructor() ERC721("PediScreenConsent", "PSCONSENT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Patient mints own consent NFT (signature over record hash)
    function mintConsentNFT(
        MedicalRecord calldata record,
        uint256 consentExpirySeconds,
        bytes calldata patientSignature
    ) external {
        bytes32 messageHash = keccak256(
            abi.encode(
                record.encryptedIPFSHash,
                record.dataKeyHash,
                record.boneAgeMonths,
                record.hasFracture,
                consentExpirySeconds
            )
        );
        bytes32 ethSigned = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address signer = ECDSA.recover(ethSigned, patientSignature);
        require(signer == msg.sender, "Invalid patient signature");

        uint256 tokenId = _tokenIds;
        unchecked {
            _tokenIds++;
        }

        _safeMint(msg.sender, tokenId);
        records[tokenId] = record;
        consentActive[tokenId] = true;
        consentExpiresAt[tokenId] = block.timestamp + consentExpirySeconds;
        _ownerTokens[msg.sender].push(tokenId);

        emit ConsentNFTMinted(
            tokenId,
            msg.sender,
            record.encryptedIPFSHash,
            consentExpiresAt[tokenId]
        );
    }

    /// @notice Patient grants a viewer access with expiry
    function grantViewerAccess(
        uint256 tokenId,
        address viewer,
        uint256 viewerExpirySeconds
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(consentActive[tokenId], "Consent inactive");
        require(
            block.timestamp < consentExpiresAt[tokenId],
            "Global consent expired"
        );

        uint256 expiry = block.timestamp + viewerExpirySeconds;
        viewerExpiry[tokenId][viewer] = expiry;
        emit AccessGranted(tokenId, msg.sender, viewer, expiry);
    }

    /// @notice Patient revokes a viewer's access
    function revokeViewerAccess(uint256 tokenId, address viewer) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        delete viewerExpiry[tokenId][viewer];
        emit AccessRevoked(tokenId, msg.sender, viewer);
    }

    /// @notice Patient revokes all consent for a token (emergency)
    function revokeAllConsent(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        consentActive[tokenId] = false;
        emit ConsentRevoked(tokenId, msg.sender);
    }

    /// @notice Gas-free view: can this address view the record?
    function canViewRecord(
        uint256 tokenId,
        address viewer
    ) external view returns (bool) {
        if (ownerOf(tokenId) == viewer) return true;
        if (!consentActive[tokenId]) return false;
        if (block.timestamp >= consentExpiresAt[tokenId]) return false;
        return block.timestamp < viewerExpiry[tokenId][viewer];
    }

    function getPatientTokens(
        address patient
    ) external view returns (uint256[] memory) {
        return _ownerTokens[patient];
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
