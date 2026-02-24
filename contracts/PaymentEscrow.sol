// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IPediScreen.sol";

/// @title PaymentEscrow — USDC Micropayments for AI screening ($0.05/screening)
/// @notice 2% platform fee; HIPAA-compliant medical NFT payments
contract PaymentEscrow is AccessControl, ReentrancyGuard, IPaymentEscrow {
    bytes32 public constant CLINICIAN_ROLE = keccak256("CLINICIAN_ROLE");

    IERC20 public immutable usdc;
    uint256 public constant FEE_BASIS_POINTS = 200; // 2% platform fee
    uint256 public constant BASIS_POINTS = 10000;

    mapping(address => uint256) public clinicianBalances;
    mapping(uint256 => uint256) public screeningPayments; // screeningId => amount

    address public feeRecipient;

    constructor(address _usdc, address _feeRecipient) {
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Internal: pay one clinician for a screening
     */
    function _payClinician(
        uint256 screeningId,
        uint256 amount,
        address clinician
    ) internal {
        require(amount > 0, "Amount must be > 0");
        require(hasRole(CLINICIAN_ROLE, clinician), "Not clinician");

        uint256 fee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS;
        uint256 clinicianShare = amount - fee;

        screeningPayments[screeningId] = clinicianShare;

        require(usdc.transferFrom(msg.sender, clinician, clinicianShare), "USDC transfer failed");
        require(usdc.transferFrom(msg.sender, feeRecipient, fee), "Fee transfer failed");

        emit PaymentReleased(screeningId, clinicianShare, clinician);
    }

    /**
     * @dev Pay clinician for screening ($0.05 USDC typical)
     */
    function payClinician(
        uint256 screeningId,
        uint256 amount,
        address clinician
    ) external nonReentrant {
        _payClinician(screeningId, amount, clinician);
    }

    /**
     * @dev Batch payments for CHW incentives
     */
    function batchPayClinicians(
        uint256[] calldata screeningIds,
        uint256[] calldata amounts,
        address[] calldata clinicians
    ) external nonReentrant {
        require(
            screeningIds.length == amounts.length && amounts.length == clinicians.length,
            "Array mismatch"
        );
        for (uint256 i = 0; i < screeningIds.length; i++) {
            _payClinician(screeningIds[i], amounts[i], clinicians[i]);
        }
    }

    /**
     * @dev Withdraw clinician balance (if escrowed)
     */
    function withdraw(address clinician) external nonReentrant {
        uint256 balance = clinicianBalances[clinician];
        require(balance > 0, "No balance");
        clinicianBalances[clinician] = 0;
        require(usdc.transfer(clinician, balance), "Transfer failed");
    }
}
