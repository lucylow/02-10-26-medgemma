// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PediScreen AI Screening Registry
/// @notice Stores tamper-proof hashes of pediatric screening results
///         (off-chain data, on-chain integrity). No raw medical text on-chain.
contract PediScreenRegistry {
    struct ScreeningRecord {
        address submittedBy;      // wallet that wrote the record
        bytes32 screeningIdHash;  // keccak256(screeningId string)
        bytes32 reportHash;       // keccak256( canonical JSON report )
        uint64 createdAt;        // block timestamp
        bool   exists;
    }

    // screeningIdHash => ScreeningRecord
    mapping(bytes32 => ScreeningRecord) private records;

    event ScreeningRecorded(
        bytes32 indexed screeningIdHash,
        bytes32 indexed reportHash,
        address indexed submittedBy,
        uint64 createdAt
    );

    /// @notice Write a new screening record.
    /// @dev `screeningIdHash` should be keccak256(screeningId),
    ///      `reportHash` should be keccak256(canonical JSON string).
    function recordScreening(
        bytes32 screeningIdHash,
        bytes32 reportHash
    ) external {
        require(screeningIdHash != bytes32(0), "Invalid screeningIdHash");
        require(reportHash != bytes32(0), "Invalid reportHash");
        require(!records[screeningIdHash].exists, "Already recorded");

        ScreeningRecord memory rec = ScreeningRecord({
            submittedBy: msg.sender,
            screeningIdHash: screeningIdHash,
            reportHash: reportHash,
            createdAt: uint64(block.timestamp),
            exists: true
        });

        records[screeningIdHash] = rec;

        emit ScreeningRecorded(
            screeningIdHash,
            reportHash,
            msg.sender,
            rec.createdAt
        );
    }

    /// @notice Read a record by screeningId hash.
    function getScreening(bytes32 screeningIdHash)
        external
        view
        returns (
            address submittedBy,
            bytes32 _screeningIdHash,
            bytes32 _reportHash,
            uint64 createdAt,
            bool exists
        )
    {
        ScreeningRecord memory rec = records[screeningIdHash];
        return (
            rec.submittedBy,
            rec.screeningIdHash,
            rec.reportHash,
            rec.createdAt,
            rec.exists
        );
    }

    /// @notice True if a screeningId hash has already been recorded.
    function exists(bytes32 screeningIdHash) external view returns (bool) {
        return records[screeningIdHash].exists;
    }
}
