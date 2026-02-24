// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PediScreenXrayRegistry — X-ray IPFS hashes on Polygon (immutable audit trail)
/// @notice Store IPFS CID per screening; content is off-chain (Pinata), only hash on-chain.
contract PediScreenXrayRegistry {
    struct XrayRecord {
        bytes32 screeningId;
        string ipfsCid;
        address uploader;
        uint256 timestamp;
        string riskLevel;
    }

    mapping(bytes32 => XrayRecord) public xrays;
    uint256 public recordCount;

    event XrayStored(bytes32 indexed screeningId, string ipfsCid, string riskLevel);

    function storeXrayHash(
        bytes32 screeningId,
        string calldata ipfsCid,
        string calldata riskLevel
    ) external {
        xrays[screeningId] = XrayRecord({
            screeningId: screeningId,
            ipfsCid: ipfsCid,
            uploader: msg.sender,
            timestamp: block.timestamp,
            riskLevel: riskLevel
        });

        recordCount++;
        emit XrayStored(screeningId, ipfsCid, riskLevel);
    }

    function getXray(bytes32 screeningId) external view returns (
        bytes32 id,
        string memory ipfsCid,
        address uploader,
        uint256 timestamp,
        string memory riskLevel
    ) {
        XrayRecord storage r = xrays[screeningId];
        return (r.screeningId, r.ipfsCid, r.uploader, r.timestamp, r.riskLevel);
    }
}
