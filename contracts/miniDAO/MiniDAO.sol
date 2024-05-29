// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/// @title MiniDAO Contract
/// @notice This contract implements a minimalistic DAO with governance functionalities.
contract MiniDAO is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    struct ProposalInfo {
        string _against;
        string _for;
        string _abstain;
        string _name;
        string _link;
    }

    mapping(uint256 => ProposalInfo) public info;

    /// @notice Constructs the MiniDAO contract with specified parameters.
    /// @param _token The token used for voting.
    /// @param _timelock The timelock controller contract.
    /// @param _name The name of the DAO.
    /// @param _votingDelay The delay before voting on a proposal can start (in blocks).
    /// @param _votingPeriod The duration in which a proposal can be voted on (in blocks).
    /// @param _quorumValue The quorum value required for a proposal to pass.
    constructor(
        IVotes _token,
        TimelockController _timelock,
        string memory _name,
        uint48 _votingDelay,
        uint32 _votingPeriod,
        uint256 _quorumValue
    )
        Governor(_name)
        GovernorSettings(_votingDelay, _votingPeriod, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumValue)
        GovernorTimelockControl(_timelock)
    {}

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        string[5] memory _info
    ) public returns (uint256) {
        uint256 proposalId = super.propose(
            targets,
            values,
            calldatas,
            description
        );
        info[proposalId] = ProposalInfo({
            _against: _info[0],
            _for: _info[1],
            _abstain: _info[2],
            _name: _info[3],
            _link: _info[4]
        });
        return proposalId;
    }

    // The following functions are overrides required by Solidity.

    /// @notice Returns the delay before voting starts
    /// @dev Returns the value set in GovernorSettings, overriding Governor
    /// @return Delay before voting starts in blocks
    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /// @notice Returns the voting period
    /// @dev Returns the value set in GovernorSettings, overriding Governor
    /// @return Length of voting period in blocks
    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    /// @notice Returns the quorum required to accept proposals on the specified block number
    /// @dev Overrides the quorum function from GovernorVotesQuorumFraction for the specified block number
    /// @param blockNumber Number of the block for which a quorum is required
    /// @return Quorum of votes required
    function quorum(
        uint256 blockNumber
    )
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /// @notice Returns the current state of the proposal
    /// @dev Uses GovernorTimelockControl to check the state of the proposal
    /// @param proposalId Proposal ID
    /// @return Current state of the proposal
    function state(
        uint256 proposalId
    )
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /// @notice Checks if the proposal needs to be queued for execution
    /// @dev Overrides a function from GovernorTimelockControl
    /// @param proposalId Proposal ID
    /// @return true if the proposal requires queuing
    function proposalNeedsQueuing(
        uint256 proposalId
    ) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }

    /// @notice Returns the threshold value for submitting proposals
    /// @dev Returns the value set in GovernorSettings, overriding Governor
    /// @return Threshold value for suggestions in tokens
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /// @notice Sends proposal operations to the execution queue
    /// @dev Overrides function from GovernorTimelockControl, handles the execution of operations
    /// @param proposalId Proposal ID
    /// @param targets Array of target addresses
    /// @param values Array of values for each operation
    /// @param calldatas Array of call data
    /// @param descriptionHash Hash of sentence description
    /// @return Timestamp for the execution of operations
    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return
            super._queueOperations(
                proposalId,
                targets,
                values,
                calldatas,
                descriptionHash
            );
    }

    /// @notice Executes operations queued by suggestion
    /// @dev Overrides a function from GovernorTimelockControl to perform operations
    /// @param proposalId Proposal ID
    /// @param targets Array of target addresses
    /// @param values Array of values for each operation
    //// @param calldatas Array of call data
    /// @param descriptionHash Hash of proposal description
    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(
            proposalId,
            targets,
            values,
            calldatas,
            descriptionHash
        );
    }

    /// @notice Cancels operations queued by suggestion
    /// @dev Overrides a function from GovernorTimelockControl to cancel operations
    /// @param targets Array of target addresses
    /// @param values Array of values for each operation
    /// @param calldatas Array of call data
    /// @param descriptionHash The hash of the sentence description
    /// @return Identifier of the offer that was canceled
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /// @notice Returns the address of the executor of operations
    /// @dev Overrides the function from GovernorTimelockControl to get the address of the executor.
    /// @return Executor address
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
