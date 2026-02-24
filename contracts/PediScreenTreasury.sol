// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title PediScreenTreasury — Multi-sig treasury (2/3 clinician approval, PEDISC + native)
/// @notice CHW payments, screening bounties, clinical fund disbursement with time-locked execution
contract PediScreenTreasury is AccessControl, ReentrancyGuard {
    bytes32 public constant CLINICIAN_ROLE = keccak256("CLINICIAN_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public immutable PEDISC_TOKEN;
    address public immutable nativeTreasury;
    address public screeningRegistry; // PediScreenRegistry (ERC721) for CHW NFT ownership check

    uint256 public constant QUORUM_THRESHOLD = 2;
    uint256 public constant MAX_CLINICIANS = 3;
    uint256 public constant PROPOSAL_EXECUTION_DELAY = 2 days;

    uint256 private _proposalIdCounter;
    address[MAX_CLINICIANS] public clinicians;
    uint256 public numClinicians;

    struct PaymentProposal {
        uint256 id;
        address payable recipient;
        uint256 amount;
        string currency; // "PEDISC" or "ETH"
        uint256 screeningId;
        string description;
        address proposer;
        uint256 createdAt;
        uint256 executionTime;
        uint256 approvals;
        bool executed;
        bool cancelled;
    }

    mapping(uint256 => PaymentProposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public proposalApprovals;

    event ClinicianAdded(address indexed clinician, uint256 index);
    event ProposalCreated(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event ProposalApproved(uint256 indexed proposalId, address indexed clinician);
    event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event ProposalCancelled(uint256 indexed proposalId, address indexed proposer);
    event ScreeningRegistrySet(address indexed registry);

    modifier onlyClinician() {
        require(hasRole(CLINICIAN_ROLE, msg.sender), "Not clinician");
        _;
    }

    modifier validProposal(uint256 proposalId) {
        require(proposalId < _proposalIdCounter, "Invalid proposal");
        require(!proposals[proposalId].executed, "Already executed");
        require(!proposals[proposalId].cancelled, "Cancelled");
        _;
    }

    constructor(
        address _pediscToken,
        address _nativeTreasury,
        address _screeningRegistry,
        address[] memory _initialClinicians
    ) {
        require(_initialClinicians.length <= MAX_CLINICIANS, "Too many initial clinicians");
        require(_pediscToken != address(0), "Invalid PEDISC");
        PEDISC_TOKEN = _pediscToken;
        nativeTreasury = _nativeTreasury;
        screeningRegistry = _screeningRegistry;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        for (uint256 i = 0; i < _initialClinicians.length; i++) {
            _addClinician(_initialClinicians[i]);
        }
    }

    function setScreeningRegistry(address _screeningRegistry) external onlyRole(ADMIN_ROLE) {
        screeningRegistry = _screeningRegistry;
        emit ScreeningRegistrySet(_screeningRegistry);
    }

    function addClinician(address clinician) external onlyRole(ADMIN_ROLE) {
        require(numClinicians < MAX_CLINICIANS, "Max clinicians reached");
        require(clinician != address(0), "Invalid address");
        _addClinician(clinician);
    }

    function _addClinician(address clinician) internal {
        require(!hasRole(CLINICIAN_ROLE, clinician), "Already clinician");
        clinicians[numClinicians] = clinician;
        _grantRole(CLINICIAN_ROLE, clinician);
        unchecked {
            numClinicians++;
        }
        emit ClinicianAdded(clinician, numClinicians - 1);
    }

    function _proposePayment(
        address payable recipient,
        uint256 amount,
        string memory currency,
        uint256 screeningId,
        string memory description
    ) internal returns (uint256) {
        uint256 proposalId = _proposalIdCounter;
        unchecked {
            _proposalIdCounter++;
        }

        PaymentProposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.recipient = recipient;
        p.amount = amount;
        p.currency = currency;
        p.screeningId = screeningId;
        p.description = description;
        p.proposer = msg.sender;
        p.createdAt = block.timestamp;
        p.executionTime = block.timestamp + PROPOSAL_EXECUTION_DELAY;

        emit ProposalCreated(proposalId, recipient, amount);
        return proposalId;
    }

    function proposePayment(
        address payable recipient,
        uint256 amount,
        string memory currency,
        uint256 screeningId,
        string memory description
    ) external onlyClinician returns (uint256) {
        return _proposePayment(recipient, amount, currency, screeningId, description);
    }

    function approveProposal(uint256 proposalId)
        external
        onlyClinician
        validProposal(proposalId)
    {
        PaymentProposal storage p = proposals[proposalId];
        require(block.timestamp < p.executionTime, "Execution period passed");
        require(!proposalApprovals[proposalId][msg.sender], "Already voted");

        proposalApprovals[proposalId][msg.sender] = true;
        unchecked {
            p.approvals++;
        }
        emit ProposalApproved(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId)
        external
        nonReentrant
        validProposal(proposalId)
    {
        PaymentProposal storage p = proposals[proposalId];
        require(p.approvals >= QUORUM_THRESHOLD, "Insufficient approvals");
        require(block.timestamp >= p.executionTime, "Too early to execute");
        _executeProposal(proposalId);
    }

    function _executeProposal(uint256 proposalId) internal {
        PaymentProposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        p.executed = true;

        uint256 amount = p.amount;
        address payable recipient = p.recipient;

        if (keccak256(bytes(p.currency)) == keccak256(bytes("PEDISC"))) {
            require(IERC20(PEDISC_TOKEN).transfer(recipient, amount), "Transfer failed");
        } else {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "Native transfer failed");
        }
        emit ProposalExecuted(proposalId, recipient, amount);
    }

    function cancelProposal(uint256 proposalId) external validProposal(proposalId) {
        PaymentProposal storage p = proposals[proposalId];
        require(msg.sender == p.proposer, "Not proposer");
        require(block.timestamp < p.executionTime, "Cannot cancel after delay");
        p.cancelled = true;
        emit ProposalCancelled(proposalId, msg.sender);
    }

    function proposeCHWPayment(
        address chwWallet,
        uint256 screeningTokenId,
        uint256 paymentAmount
    ) external onlyClinician returns (uint256) {
        require(screeningRegistry != address(0), "Registry not set");
        require(
            IERC721(screeningRegistry).ownerOf(screeningTokenId) == chwWallet,
            "CHW doesn't own NFT"
        );
        return
            _proposePayment(
                payable(chwWallet),
                paymentAmount,
                "PEDISC",
                screeningTokenId,
                string(abi.encodePacked("CHW Payment for Screening #", _toString(screeningTokenId)))
            );
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address recipient,
            uint256 amount,
            string memory currency,
            uint256 screeningId,
            string memory description,
            uint256 approvals,
            bool executed,
            bool cancelled,
            uint256 executionTime
        )
    {
        PaymentProposal storage p = proposals[proposalId];
        return (
            p.recipient,
            p.amount,
            p.currency,
            p.screeningId,
            p.description,
            p.approvals,
            p.executed,
            p.cancelled,
            p.executionTime
        );
    }

    function getProposalCount() external view returns (uint256) {
        return _proposalIdCounter;
    }

    function getActiveProposals() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _proposalIdCounter; i++) {
            if (!proposals[i].executed && !proposals[i].cancelled) count++;
        }
        uint256[] memory activeIds = new uint256[](count);
        count = 0;
        for (uint256 i = 0; i < _proposalIdCounter; i++) {
            if (!proposals[i].executed && !proposals[i].cancelled) {
                activeIds[count] = i;
                unchecked {
                    count++;
                }
            }
        }
        return activeIds;
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Withdraw failed");
        } else {
            require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            unchecked {
                digits++;
                temp /= 10;
            }
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            unchecked {
                digits -= 1;
                buffer[digits] = bytes1(uint8(48 + value % 10));
                value /= 10;
            }
        }
        return string(buffer);
    }

    receive() external payable {}
    fallback() external payable {}
}
