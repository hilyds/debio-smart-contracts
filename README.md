# Request Lab Staking
Customer sends a request for a lab at a particular country, city and also a test category
To make this request, a customer would have to stake a certain amount of DAI

## Data Structure
### Lab Request
```solidity
  struct Request {
    string substrateAddress;
    string country;
    string city;
    string testCategory;
    uint stakingAmount;
  }
```

## How it works
- Customer approves the amount to stake in ERC20 contract 
- Customer sends LabRequest Data
```solidity
  function createRequest(
    string memory substrateAddress,
    string memory country,
    string memory city,
    string memory testCategory,
    uint stakingAmount
  ) external { }
```

## Deployed Contract Address
Refer to ./deployed-addresses for the last deployed contract addresses.
Currently deployed in private network for development.
