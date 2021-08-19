const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");

describe('ServiceRequests', function () {
  let contract;
  // Request Parameters
  const requesterSubstrateAddress = "5abcedefg1234567890";
  const labSubstrateAddress = "5xxxxxxxxxxxxxxxxxx";
  const country = "Indonesia";
  const city = "Jakarta";
  const serviceCategory = "Whole Genome Sequencing";
  const stakingAmount = "20000000000000000000";

  let iHaveTokens;
  let iDontHaveTokens;

  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("DebioToken");
    const erc20 = await ERC20Contract.deploy();
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
     * Deploy Service Request Contract
     * */
    const ServiceRequestContract = await ethers.getContractFactory("ServiceRequest");
    contract = await ServiceRequestContract.deploy(erc20.address);
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(iHaveTokens);
    const contractWithSigner = contract.connect(iHaveTokens);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const requestAddedTx = await contractWithSigner.createRequest(
      requesterSubstrateAddress,
      labSubstrateAddress,
      country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    await requestAddedTx.wait();
  });

  it("Should fail if sender does not have enough ERC20 token balance", async function () {
    let errMsg;
    try {
      const contractWithSigner = contract.connect(iDontHaveTokens)
      const tx = await contractWithSigner.createRequest(
        requesterSubstrateAddress,
        labSubstrateAddress,
        country,
        city,
        serviceCategory,
        stakingAmount
      )
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg).to.equal("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
  })

  it("Should return requests by country", async function () {
    const requests = await contract.getRequestsByCountry(country);    
    const req = requests[0];

    expect(req.requesterSubstrateAddress).to.equal(requesterSubstrateAddress);
    expect(req.labSubstrateAddress).to.equal(labSubstrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.serviceCategory).to.equal(serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);
  })

  it("Should return requests by country,city", async function () {
    const requests = await contract.getRequestsByCountryCity(country, city);    
    const req = requests[0];

    expect(req.requesterSubstrateAddress).to.equal(requesterSubstrateAddress);
    expect(req.labSubstrateAddress).to.equal(labSubstrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.serviceCategory).to.equal(serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);
  })

  it("Should emit ServiceRequestCreated event, when request is created", async function () {
    const requesterSubstrateAddress = "5abcedefg1234567890";
    const labSubstrateAddress = "5xxxxxxxxxxxxxxxxxx";
    const country = "Indonesia";
    const city = "Jakarta";
    const serviceCategory = "Whole Genome Sequencing";
    const stakingAmount = "20000000000000000000";

    const contractWithSigner = contract.connect(iHaveTokens);
    const requestAddedTx = await contractWithSigner.createRequest(
      requesterSubstrateAddress,
      labSubstrateAddress,
      country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    const receipt = await requestAddedTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "ServiceRequestCreated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const req = events[0].args[0]

    expect(req.requesterSubstrateAddress).to.equal(requesterSubstrateAddress);
    expect(req.labSubstrateAddress).to.equal(labSubstrateAddress);
    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.serviceCategory).to.equal(serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);

    const requestCount = await contract.getRequestCount();
    expect(requestCount).to.equal(2);
  })

  it("Should return all requests", async function () {
    const requests = await contract.getAllRequests();
    expect(requests.length).to.equal(2);
    
    for (let req of requests) {
      expect(req.requesterSubstrateAddress).to.equal(requesterSubstrateAddress);
      expect(req.labSubstrateAddress).to.equal(labSubstrateAddress);
      expect(req.country).to.equal(country);
      expect(req.city).to.equal(city);
      expect(req.serviceCategory).to.equal(serviceCategory);
      expect(req.stakingAmount.toString()).to.equal(stakingAmount);
    }
  })

  it("Should return requests by substrateAddress", async function () {
    const requests = await contract.getRequestsByRequesterSubstrateAddress(requesterSubstrateAddress);
    for (let req of requests) {
      expect(req.requesterSubstrateAddress).to.equal(requesterSubstrateAddress);
      expect(req.labSubstrateAddress).to.equal(labSubstrateAddress);
      expect(req.country).to.equal(country);
      expect(req.city).to.equal(city);
      expect(req.serviceCategory).to.equal(serviceCategory);
      expect(req.stakingAmount.toString()).to.equal(stakingAmount);
    }
  })

  it("Should return request by request hash", async function () {
    const requests = await contract.getAllRequests();
    const req = requests[0]
    const reqByHash = await contract.getRequestByHash(req.hash)

    expect(req.requesterSubstrateAddress).to.equal(reqByHash.requesterSubstrateAddress);
    expect(req.labSubstrateAddress).to.equal(reqByHash.labSubstrateAddress);
    expect(req.country).to.equal(reqByHash.country);
    expect(req.city).to.equal(reqByHash.city);
    expect(req.serviceCategory).to.equal(reqByHash.serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(reqByHash.stakingAmount);
  })


  it("Lab can fulfill a request (Updates request status to fulfilled)", async function () {
    /**
     * enum RequestStatus { OPEN, IN_PROGRESS, FULFILLED }
     */
    const requests = await contract.getAllRequests();
    let req = requests[0];
    expect(req.status).to.equal(0);

    const contractWithSigner = contract.connect(iHaveTokens);
    const fulfillTx = await contractWithSigner.fulfillRequest(req.hash);
    await fulfillTx.wait();

    req = await contract.getRequestByHash(req.hash);
    expect(req.status).to.equal(2);
  })

  /*
  it("Lab can not claim a request if: TODO: Define condition", async function () {
    // TODO:
  })
  */

})
