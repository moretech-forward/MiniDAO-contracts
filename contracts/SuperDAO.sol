// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./miniDAO/MiniDAO.sol";
import "./miniDAO/TimeLock.sol";
import "./miniDAO/TokenDAO.sol";
import "./miniDAO/Treasury.sol";

/// @title SuperDAO Contract
/// @notice This contract represents a super DAO that integrates multiple DAO components.
contract SuperDAO {
    /// @notice Auxiliary variable for frontend
    address public immutable myAddr;

    /// @notice The TimeLock component of the DAO used for managing the timing of proposal executions
    TimeLock public immutable timeLock;

    /// @notice The TokenDAO component managing the native token of the DAO
    TokenDAO public immutable token;

    /// @notice The MiniDAO component responsible for governance decisions
    MiniDAO public immutable governor;

    /// @notice The Treasury component managing the financial assets of the DAO
    Treasury public immutable treasury;

    /// @notice Constructs the SuperDAO contract with specified parameters.
    /// @param _minDelay The minimum delay for a proposal to be executed in the TimeLock contract (in timestamp).
    /// @param _nameToken The name of the token used in the TokenDAO contract.
    /// @param _symbolToken The symbol of the token used in the TokenDAO contract.
    /// @param _nameDAO The name of the DAO used in the MiniDAO contract.
    /// @param _votingDelay The delay before voting on a proposal can start in the MiniDAO contract (in blocks).
    /// @param _votingPeriod The duration in which a proposal can be voted on in the MiniDAO contract (in blocks).
    /// @param _quorumValue The quorum value required for a proposal to pass in the MiniDAO contract.
    constructor(
        uint256 _minDelay,
        string memory _nameToken,
        string memory _symbolToken,
        string memory _nameDAO,
        uint48 _votingDelay,
        uint32 _votingPeriod,
        uint256 _quorumValue
    ) payable {
        myAddr = address(this);

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

        TokenDAO _token = new TokenDAO(
            address(_timeLock),
            _nameToken,
            _symbolToken
        );

        MiniDAO _governor = new MiniDAO(
            _token,
            _timeLock,
            _nameDAO,
            _votingDelay,
            _votingPeriod,
            _quorumValue
        );

        // Customizing contract roles
        _timeLock.grantRole(keccak256("PROPOSER_ROLE"), address(_governor));
        _timeLock.grantRole(keccak256("EXECUTOR_ROLE"), address(_governor));
        //  bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
        _timeLock.grantRole(0x00, msg.sender);

        treasury = new Treasury(address(_timeLock));
        timeLock = _timeLock;
        token = _token;
        governor = _governor;
    }
}
