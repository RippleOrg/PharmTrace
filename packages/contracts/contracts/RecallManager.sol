// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RecallManager — manages drug recall events with manufacturer auth
contract RecallManager {
    address public owner;
    mapping(address => bool) public authorizedManufacturers;

    struct RecallRecord {
        string batchId;
        string reason;
        address initiatedBy;
        uint256 initiatedAt;
        RecallStatus status;
        string[] affectedLots;
    }

    enum RecallStatus { PENDING, ACTIVE, COMPLETED, CANCELLED }

    mapping(string => RecallRecord) public recalls;
    string[] public recallIds;

    event RecallInitiated(
        string indexed batchId,
        string reason,
        address indexed initiatedBy,
        uint256 ts
    );
    event RecallStatusUpdated(
        string indexed batchId,
        RecallStatus status,
        uint256 ts
    );
    event ManufacturerAuthorized(address indexed mfr);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    modifier onlyMfr() {
        require(authorizedManufacturers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function authorizeManufacturer(address mfr) external onlyOwner {
        authorizedManufacturers[mfr] = true;
        emit ManufacturerAuthorized(mfr);
    }

    function initiateRecall(
        string calldata batchId,
        string calldata reason,
        string[] calldata affectedLots
    ) external onlyMfr {
        require(bytes(recalls[batchId].batchId).length == 0, "Recall already exists");
        recalls[batchId] = RecallRecord({
            batchId: batchId,
            reason: reason,
            initiatedBy: msg.sender,
            initiatedAt: block.timestamp,
            status: RecallStatus.ACTIVE,
            affectedLots: affectedLots
        });
        recallIds.push(batchId);
        emit RecallInitiated(batchId, reason, msg.sender, block.timestamp);
    }

    function updateRecallStatus(
        string calldata batchId,
        RecallStatus status
    ) external onlyMfr {
        require(bytes(recalls[batchId].batchId).length > 0, "Recall not found");
        recalls[batchId].status = status;
        emit RecallStatusUpdated(batchId, status, block.timestamp);
    }

    function getRecall(string calldata batchId)
        external
        view
        returns (RecallRecord memory)
    {
        return recalls[batchId];
    }

    function getActiveRecallCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < recallIds.length; i++) {
            if (recalls[recallIds[i]].status == RecallStatus.ACTIVE) {
                count++;
            }
        }
        return count;
    }

    function isRecalled(string calldata batchId) external view returns (bool) {
        return recalls[batchId].status == RecallStatus.ACTIVE;
    }
}
