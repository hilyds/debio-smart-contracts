const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");

describe('LabRequests', function () {
  let contract;
  // Request Parameters
  const substrateAddress = "5abcedefg1234567890";
  const country = "Indonesia";
  const city = "Jakarta";
  const testCategory = "Whole Genome Sequencing";
  const stakingAmount = "20000000000000000000";

  let iHaveTokens;
  let iDontHaveTokens;

  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("ERC20Mock");
    const initialSupply = "10000000000000000000000"
    const erc20 = await ERC20Contract.deploy(initialSupply);
    await erc20.deployed()

    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    // accounts[0] is the deployer
    iHaveTokens = accounts[1];
    iDontHaveTokens = accounts[2];

    /**
     * Transfer some ERC20s to iHaveTokens
     * */
    const transferTx = await erc20.transfer(iHaveTokens.address, "90000000000000000000");
    await transferTx.wait();

    /**
     * Deploy Lab Request Contract
     * */
    const LabRequestContract = await ethers.getContractFactory("LabRequest");
    contract = await LabRequestContract.deploy(erc20.address);
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(iHaveTokens);
    const contractWithSigner = contract.connect(iHaveTokens);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const requestAddedTx = await contractWithSigner.createRequest(
      substrateAddress,
      country,
      city,
      testCategory,
      stakingAmount
    );
    // wait until transaction is mined
    await requestAddedTx.wait();
  });

  it("Should fail if sender does not have enough ERC20 token balance", async function () {
    let _err;
    try {
      const contractWithSigner = contract.connect(iDontHaveTokens)
      const tx = await contractWithSigner.createRequest(
        substrateAddress,
        country,
        city,
        testCategory,
        stakingAmount
      )
    } catch (err) {
      _err = err
    }
    expect(_err != null).to.equal(true);
  })

  it("Should return requests by country", async function () {
    const requests = await contract.getRequestsByCountry(country);    
    const req = requests[0];

    expect(req.substrateAddress).to.equal(substrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.testCategory).to.equal(testCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);
  })

  it("Should return requests by country,city", async function () {
    const requests = await contract.getRequestsByCountryCity(country, city);    
    const req = requests[0];

    expect(req.substrateAddress).to.equal(substrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.testCategory).to.equal(testCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);
  })

  it("Should emit LabRequestCreated event, when request is created", async function () {
    const substrateAddress = "5abcedefg1234567890";
    const country = "Indonesia";
    const city = "Jakarta";
    const testCategory = "Whole Genome Sequencing";
    const stakingAmount = "20000000000000000000";

    const contractWithSigner = contract.connect(iHaveTokens);
    const requestAddedTx = await contractWithSigner.createRequest(
      substrateAddress,
      country,
      city,
      testCategory,
      stakingAmount
    );
    // wait until transaction is mined
    const receipt = await requestAddedTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "LabRequestCreated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const req = events[0].args[0]
    expect(req.substrateAddress).to.equal(substrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.testCategory).to.equal(testCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);
  })

  it("Should return all requests", async function () {
    const requests = await contract.getAllRequests();
    expect(requests.length).to.equal(2);
    
    for (let req of requests) {
      expect(req.substrateAddress).to.equal(substrateAddress);
      expect(req.country).to.equal(country);
      expect(req.city).to.equal(city);
      expect(req.testCategory).to.equal(testCategory);
      expect(req.stakingAmount.toString()).to.equal(stakingAmount);
    }
  })

  it("Should return requests by substrateAddress", async function () {
    const requests = await contract.getRequestsBySubstrateAddress(substrateAddress);
    for (let req of requests) {
      expect(req.substrateAddress).to.equal(substrateAddress);
      expect(req.country).to.equal(country);
      expect(req.city).to.equal(city);
      expect(req.testCategory).to.equal(testCategory);
      expect(req.stakingAmount.toString()).to.equal(stakingAmount);
    }
  })
})
