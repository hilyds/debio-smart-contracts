# Escrow

## How it Works
- Customer pays to escrow, inserting order detail data
- When Lab fulfills order at substrate blockchain, backend receives order fulfilled event
  - On order fulfilled, backend triggers Escrow.fulfillOrder:
    - Transfer QC paymen to *Lab*
    - Transfer Testing payment to *Lab* 
- When Lab reject dna sample, backend receives dnaSample rejected event:
  - On dnaSample rejected backend triggers Escrow.refundOrder:
    - Transfer QC payment to *Lab*
    - Transfer Testing payment to *Customer*


# Request Test Staking
## Making a request
Customer sends a request for a test in a location which there is no labs.
The request also requires the user to stake an amount of DAI as an incentive for labs to fulfill the request.

## Claiming a request
Labs/Future labs can receive the staking amount reward by claiming the request, and fulfilling the request by providing the service.
DAOGenics will need to validate the service before lab can claim the request. This is done by calling a transaction in the smart contract, updating a mapping of valid lab services.

## Data Structure
### Service Request
```solidity
  struct Request {
    address requesterAddress;
    address labAddress; // Added when lab claimed the request
    string country;
    string city;
    string serviceCategory;
    uint stakingAmount;
    RequestStatus status; // { OPEN, CLAIMED }
    bytes32 hash;
    bool exists;
  }
```
### Valid Lab Services
```solidity
      // labID       serviceCategory  serviceID
  mapping(bytes32 => mapping(string => bytes32)) public labValidServices;

```

## How it works
- Customer approves the amount to stake in ERC20 contract 
- Customer sends ServiceRequest Data
```solidity
  function createRequest(
    string memory requesterSubstrateAddress,
    string memory labSubstrateAddress,
    string memory country,
    string memory city,
    string memory service,
    uint stakingAmount
  ) external { }

  if
    labSubstrateAddress == ""
  then 
    country is required
    city is required

  if labSubstrateAddress != ""
  then
    country is not required
    city is not required
```
- Lab fulfills a request
  A lab can fulfill a request and claim the token staked in the request
  TODO: How to validate that the request is really fulfilled?

## Deployed Contract Address
Refer to ./deployed-addresses for the last deployed contract addresses.
Currently deployed in private network for development.

