// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BatchRegistry — on-chain anchor for PharmTrace NFT batches
contract BatchRegistry {
    address public owner;
    mapping(string => BatchRecord) public batches;
    mapping(address => bool) public authorizedManufacturers;

    struct BatchRecord {
        string batchId;
        string drugName;
        string htsTokenId;
        int64 htsSerialNumber;
        string hcsTopicId;
        address registeredBy;
        uint256 registeredAt;
        bool recalled;
        string recallReason;
    }

    event BatchRegistered(
        string indexed batchId,
        string drugName,
        address indexed mfr,
        uint256 ts
    );
    event BatchRecalled(
        string indexed batchId,
        string reason,
        uint256 ts
    );
    event ManufacturerAuthorized(address indexed mfr);
    event ManufacturerRevoked(address indexed mfr);

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

    function revokeManufacturer(address mfr) external onlyOwner {
        authorizedManufacturers[mfr] = false;
        emit ManufacturerRevoked(mfr);
    }

    function registerBatch(
        string calldata batchId,
        string calldata drugName,
        string calldata htsTokenId,
        int64 serial,
        string calldata topicId
    ) external onlyMfr {
        require(bytes(batches[batchId].batchId).length == 0, "Already registered");
        batches[batchId] = BatchRecord(
            batchId,
            drugName,
            htsTokenId,
            serial,
            topicId,
            msg.sender,
            block.timestamp,
            false,
            ""
        );
        emit BatchRegistered(batchId, drugName, msg.sender, block.timestamp);
    }

    function recallBatch(
        string calldata batchId,
        string calldata reason
    ) external onlyMfr {
        require(bytes(batches[batchId].batchId).length > 0, "Batch not found");
        batches[batchId].recalled = true;
        batches[batchId].recallReason = reason;
        emit BatchRecalled(batchId, reason, block.timestamp);
    }

    function getBatch(string calldata batchId)
        external
        view
        returns (BatchRecord memory)
    {
        return batches[batchId];
    }

    function isBatchRecalled(string calldata batchId)
        external
        view
        returns (bool)
    {
        return batches[batchId].recalled;
    }
}
