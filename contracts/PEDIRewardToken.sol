// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PEDIRewardToken — Federated learning contribution rewards ($PEDI)
/// @notice Only PediScreenFedCoordinator can mint; used to reward hospitals/CHWs for gradient contributions
contract PEDIRewardToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address fedCoordinator) ERC20("PediScreen Federated", "PEDI") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, fedCoordinator);
    }

    /// @notice Mint reward to a federated client (only callable by FedCoordinator)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /// @notice Revoke minter from an address (e.g. old coordinator)
    function revokeMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }
}
