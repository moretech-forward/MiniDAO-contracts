# Docs

## Contracts

### Opportunities

- Voting (for, against, abstain)
  - Advanced
    - User can write a contract and it will be executed
  - Simple
    - Nothing will be enforced
      - People just vote in favor of staircase repair
  - Voting templates
    - Voting for grant payment
      - Who to pay and how much (in native currency)
      - Who to pay and how much in ERC20 token
    - Additional Mint tokens
- Treasury
  - A contract where tokens can be transferred to be paid out to someone by vote
- TokenDAO
  - Used for voting only, but can be traded as well

### SuperDAO

Since contracts cannot be deployed in stages in Forward Factory, we had to make a contract that will deploy all contracts in one transaction, which turned out to be successful and tested when deploying the template on the marketplace

### MiniDAO

The basis for the DAO, the whole logic of voting and governance

### TimeLock

Contract to create a delay in the execution of the proposal.

### TokenDAO

Voting token contract, `mint` is only available for `owner` which is equal to TimeLock. That is, additional issue is available only after voting.

### Treasury

Contract for fundraising to the DAO, this can be used to disburse money from the fund to specific addresses. Disbursement functions are only available after voting.

## Functions

### `propose`

Create a proposal to be voted on.

- `targets`- array of addresses to be accessed
- `values` - send native tokens
- `calldatas` - array of selectors of functions + parameters (calldatas)
- `description` - proposal description

#### Advanced

The proposer himself creates the contract, which will then be enforced

#### Simple

The `propose` parameters are set to zeros, the result will be a vote, but nothing will be executed

```ts
const targets: string[] = ["0x0000000000000000000000000000000000000000"];
const values: number[] = [0];
const calldatas: string[] = ["0x00"];
```
