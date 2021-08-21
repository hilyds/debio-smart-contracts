# Escrow
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
Customer sends a request for a test to a lab.
If there is no lab in their country,city then the request is also valid. The request will be used as a gauge of interest for the particular type of test in that city.
Labs/future labs can receive the staking amount by providing the service requested.
Whether or not the service fulfills the request, will need to be determined by DAOGenics.   
To make this request, a customer would have to stake a certain amount of DAI

## Data Structure
### Service Request
```solidity
  struct Request {
    string requesterSubstrateAddress;
    string labSubstrateAddress; // optional
    string country; // optional, mandatory if labSubstrateAddress is empty
    string city; // optional, mandatory if labSubstrateAddress is empty
    string service;
    uint stakingAmount;
  }
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

