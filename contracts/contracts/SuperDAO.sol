// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./miniDAO/MiniDAO.sol";
import "./miniDAO/TimeLock.sol";
import "./miniDAO/TokenDAO.sol";
import "./miniDAO/Treasury.sol";

contract SuperDAO {
    TimeLock public immutable timeLock;
    TokenDAO public immutable token;
    MiniDAO public immutable governor;
    Treasury public immutable treasury;

    constructor(
        uint256 _minDelay,
        string memory _nameToken,
        string memory _symbolToken,
        address[] memory to,
        uint256[] memory amount,
        string memory _nameDAO,
        uint48 _votingDelay,
        uint32 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumValue
    ) payable {
        address[] memory _proposers = new address[](1);
        address[] memory _executors = new address[](1);
        _proposers[0] = msg.sender;
        _executors[0] = msg.sender;

        TimeLock _timeLock = new TimeLock(
            _minDelay,
            _proposers,
            _executors,
            address(this)
        );

        token = new TokenDAO(
            address(_timeLock),
            _nameToken,
            _symbolToken,
            to,
            amount
        );

        MiniDAO _governor = new MiniDAO(
            token,
            timeLock,
            _nameDAO,
            _votingDelay,
            _votingPeriod,
            _proposalThreshold,
            _quorumValue
        );

        bytes32 proposerRole = _timeLock.PROPOSER_ROLE();
        bytes32 executorRole = _timeLock.EXECUTOR_ROLE();
        _timeLock.grantRole(proposerRole, address(_governor));
        _timeLock.grantRole(executorRole, address(_governor));

        timeLock = _timeLock;
        governor = _governor;
    }
}
