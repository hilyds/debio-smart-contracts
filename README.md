# TODO:
- [ ] Update README

# Escrow
## TODO:
- [x] Order can be paid partially or in full
  - [x] If Order is paid in full:
    - [x] emit OrderPaid Event
    - [x] set Order.status = PAID
  - [x] If Order is paid partially:
    - [x] emit OrderPaidPartial Event
    - [x] set Order.status = PAID_PARTIAL
- [x] Order payment can be topped up
- [x] If payment is more than total price, transfer back to sender
- [ ] Add mechanism to update escrowAdmin address

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
## TODO:
- [ ] Add mechanism to update escrowAdmin address

## Making a request
Customer sends a request for a test in a location which there is no labs.
The request also requires the user to stake an amount of DAI as an incentive for labs to fulfill the request.

## Claiming a request
Future labs can receive the staking amount reward by claiming the request, and fulfilling the request by providing the service.
DAOGenics will need to validate the service before lab can claim the request. This is done by calling a transaction in the smart contract, updating a mapping of valid lab services.

A ClaimRequest event will be fired and listened by Backend.
Backend will create an order in substrate blockchain.
When order is created, it will trigger transferStakingAmount to escrow smart contract

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
    string memory country,
    string memory city,
    string memory serviceCategory,
    uint stakingAmount
  ) external { }
```
- Lab claims a request
  A lab can claim a request and the token will be transferred to escrow account,
  Order will be created in the escrow account by backend that will listen to RequestClaimed event

## Deployed Contract Address
Refer to ./deployed-addresses for the last deployed contract addresses.
Currently deployed to rinkeby

