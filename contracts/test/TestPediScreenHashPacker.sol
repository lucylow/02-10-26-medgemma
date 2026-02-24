// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../PediScreenHashPacker.sol";

/// @dev Test wrapper to expose library functions for gas/unit tests
contract TestPediScreenHashPacker {
    using PediScreenHashPacker for *;

    function packMedicalHash(
        bytes32 dataHash,
        uint32 childAge,
        uint8 riskLevel,
        uint16 domainId,
        uint40 timestamp,
        uint16 clinicId
    ) external pure returns (bytes32, uint256) {
        return PediScreenHashPacker.packMedicalHash(
            dataHash,
            childAge,
            riskLevel,
            domainId,
            timestamp,
            clinicId
        );
    }

    function unpackMedicalHash(uint256 packedMeta)
        external
        pure
        returns (
            uint32 childAge,
            uint8 riskLevel,
            uint16 domainId,
            uint40 timestamp,
            uint16 clinicId
        )
    {
        return PediScreenHashPacker.unpackMedicalHash(packedMeta);
    }

    function hashMedicalRecord(
        address patientId,
        bytes calldata ipfsCid,
        uint32 childAge,
        uint8 riskLevel
    ) external pure returns (bytes32) {
        return PediScreenHashPacker.hashMedicalRecord(patientId, ipfsCid, childAge, riskLevel);
    }
}
