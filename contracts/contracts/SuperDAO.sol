// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./miniDAO/MiniDAO.sol";
import "./miniDAO/TimeLock.sol";
import "./miniDAO/TokenDAO.sol";
import "./miniDAO/Treasury.sol";

/// @title SuperDAO Contract
/// @notice This contract represents a super DAO that integrates multiple DAO components.
contract SuperDAO {
    TimeLock public immutable timeLock;
    TokenDAO public immutable token;
    MiniDAO public immutable governor;
    Treasury public immutable treasury;

    /// @notice Constructs the SuperDAO contract with specified parameters.
    /// @param _minDelay The minimum delay for a proposal to be executed in the TimeLock contract (in timestamp).
    /// @param _nameToken The name of the token used in the TokenDAO contract.
    /// @param _symbolToken The symbol of the token used in the TokenDAO contract.
    /// @param _nameDAO The name of the DAO used in the MiniDAO contract.
    /// @param _mintAmount The amount of tokens to mint for the initial supply in the TokenDAO contract.
    /// @param _votingDelay The delay before voting on a proposal can start in the MiniDAO contract (in blocks).
    /// @param _votingPeriod The duration in which a proposal can be voted on in the MiniDAO contract (in blocks).
    /// @param _quorumValue The quorum value required for a proposal to pass in the MiniDAO contract.
    constructor(
        uint256 _minDelay,
        string memory _nameToken,
        string memory _symbolToken,
        string memory _nameDAO,
        uint256 _mintAmount,
        uint48 _votingDelay,
        uint32 _votingPeriod,
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
            msg.sender,
            _mintAmount
        );

        MiniDAO _governor = new MiniDAO(
            token,
            timeLock,
            _nameDAO,
            _votingDelay,
            _votingPeriod,
            _quorumValue
        );

        bytes32 proposerRole = _timeLock.PROPOSER_ROLE();
        bytes32 executorRole = _timeLock.EXECUTOR_ROLE();
        _timeLock.grantRole(proposerRole, address(_governor));
        _timeLock.grantRole(executorRole, address(_governor));

        bytes32 DEFAULT_ADMIN_ROLE = 0x00;
        _timeLock.grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        timeLock = _timeLock;
        governor = _governor;

        treasury = new Treasury(address(_timeLock));
    }
}
