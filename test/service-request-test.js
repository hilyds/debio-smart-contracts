const { expect } = require('chai')
require("@nomiclabs/hardhat-waffle");
const { soliditySha3 } = require('web3-utils')

describe('ServiceRequests', function () {
  let contract;
  let escrowContract;
  let erc20;
  // Request Parameters
  const country = "Indonesia";
  const city = "Jakarta";
  const serviceCategory = "Whole-Genome Sequencing";
  const stakingAmount = "20000000000000000000";

  let requesterAccount;
  let iDontHaveTokens;
  let DAOGenicsAccount;
  let labAccount;
  let escrowAccount;

  before(async function () {
    /**
     * Deploy ERC20 token
     * */
    const ERC20Contract = await ethers.getContractFactory("DebioToken");
    erc20 = await ERC20Contract.deploy();
    await erc20.deployed()

    /**
     * Get test accounts
     * */
    const accounts = await hre.ethers.getSigners();
    // accounts[0] is the deployer
    requesterAccount = accounts[1];
    iDontHaveTokens = accounts[2];
    DAOGenicsAccount = new ethers.Wallet(process.env.DAOGENICS_WALLET_PRIVATE_KEY, hre.ethers.provider);
    // Dummy lab account
    labAccount = new ethers.Wallet('0x3dce985e67c311fbb951374123d951da6d63abe3cf117c069362780357651d2e', hre.ethers.provider);
    escrowAccount = new ethers.Wallet(process.env.ESCROW_WALLET_PRIVATE_KEY, hre.ethers.provider);

    /**
     * Transfer some ERC20s to requesterAccount
     * */
    const transferTx = await erc20.transfer(requesterAccount.address, "90000000000000000000");
    await transferTx.wait();

    /**
     * Transfer some ERC20s to DAOGenics
     * */
    const transferTx2 = await erc20.transfer(DAOGenicsAccount.address, "90000000000000000000");
    await transferTx2.wait();
    /**
     * Transfer som ETH to DAOGenics
     * */
    const transferTx3 = await deployer.sendTransaction({
      to: DAOGenicsAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx3.wait();

    /**
     * Transfer some ERC20s to lab
     * */
    const transferTx4 = await erc20.transfer(labAccount.address, "90000000000000000000");
    await transferTx4.wait();
    /**
     * Transfer some ETH to lab
     * */
    const transferTx5 = await deployer.sendTransaction({
      to: labAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx5.wait();

    /**
     * Transfer some ETH to escrowAccount
     * */
    const transferTx6 = await deployer.sendTransaction({
      to: escrowAccount.address,
      value: ethers.utils.parseEther("1.0")
    });
    await transferTx6.wait();
    /**
     * Transfer some ERC20s to escrowAccount
     * */
    const transferTx7 = await erc20.transfer(escrowAccount.address, "90000000000000000000");
    await transferTx7.wait();

    /**
     * Deploy Escrow Contract
     * */
    const EscrowContract = await ethers.getContractFactory("Escrow");
    escrowContract = await EscrowContract.deploy(erc20.address, escrowAccount.address);
    await escrowContract.deployed();

    /**
     * Deploy Service Request Contract
     * */
    const ServiceRequestContract = await ethers.getContractFactory("ServiceRequest");
    contract = await ServiceRequestContract.deploy(
      erc20.address,
      DAOGenicsAccount.address,
      escrowContract.address,
      escrowAccount.address
    );
    await contract.deployed();

    /** 
     * Seed request data
     * */
    const erc20WithSigner = erc20.connect(requesterAccount);
    const contractWithSigner = contract.connect(requesterAccount);

    const approveTx = await erc20WithSigner.approve(contract.address, "90000000000000000000");
    await approveTx.wait();

    const requestAddedTx = await contractWithSigner.createRequest(
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
    const hashes = await contract.getRequestsByCountry(country);    
    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount,
      1,
    )
    expect(hashes[0]).to.equal(hashed1)
  })

  it("Should return requests by country,city", async function () {
    const hashes = await contract.getRequestsByCountryCity(country, city);    
    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount,
      1,
    )
    expect(hashes[0]).to.equal(hashed1)
  })

  it("Should emit ServiceRequestCreated event, when request is created", async function () {
    const contractWithSigner = contract.connect(requesterAccount);
    const requestAddedTx = await contractWithSigner.createRequest(
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

    expect(req.country).to.equal(country);
    expect(req.city).to.equal(city);
    expect(req.serviceCategory).to.equal(serviceCategory);
    expect(req.stakingAmount.toString()).to.equal(stakingAmount);

    const requestCount = await contract.getRequestCount();
    expect(requestCount).to.equal(2);
  })

  it("Should return all request Hashes", async function () {
    const hashes = await contract.getAllRequests();
    expect(hashes.length).to.equal(2);

    const hashed1 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount,
      1,
    )

    const hashed2 = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount,
      2,
    )
    
    expect(hashed1).to.equal(hashes[0])
    expect(hashed2).to.equal(hashes[1])
  })

  it("Should return requests by requester Address", async function () {
    const contractWithSigner = contract.connect(requesterAccount)
    const hashes = await contractWithSigner.getRequestsByRequesterAddress();
    for (let i = 0; i < hashes.length; i++) {
      const hashed = soliditySha3(
        requesterAccount.address,
        country,
        city,
        serviceCategory,
        stakingAmount,
        i+1,
      )
      expect(hashes[i]).to.equal(hashed)
    }
  })

  it("Should return request by request hash", async function () {
    const hashes = await contract.getAllRequests();
    const hash = hashes[0]
    const reqByHash = await contract.getRequestByHash(hash)

    const hashed = soliditySha3(
      requesterAccount.address,
      country,
      city,
      serviceCategory,
      stakingAmount,
      1,
    )

    expect(hash).to.equal(hashed)
    expect(country).to.equal(reqByHash.country);
    expect(city).to.equal(reqByHash.city);
    expect(serviceCategory).to.equal(reqByHash.serviceCategory);
    expect(stakingAmount.toString()).to.equal(reqByHash.stakingAmount);
  })

  it("Lab can not claim a request if its service has not been validated", async function () {
    let errMsg
    try {
      const hashes = await contract.getAllRequests()
      const hashToClaim = hashes[0]
      //const shouldNotExist = '0xf1616bee22e8d02c7d8996457d26b87dbacb5c115ab47465f1eb5a52f5fc8833'

      const contractWithSigner = contract.connect(labAccount)
      const claimRequestTx = await contractWithSigner.claimRequest(hashToClaim)
      const receipt = await claimRequestTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal(
        "VM Exception while processing transaction: reverted with reason string 'Lab\'s service has not been validated by DAOGenics'"
      );
  })

  it("Only DAOGenics account can insert into validLabServices mapping", async function () {
    const serviceCategory = 'Whole-Genome Sequencing'
    // This serviceId comes from substrate
    const serviceId = '0xf1616bee22e8d02c7d8996457d26b87dbacb5c115ab47465f1eb5a52f5fc8833'
    
    let errMsg
    try {
      const contractWithSigner = contract.connect(labAccount)   
      const validateLabServiceTx = await contractWithSigner.validateLabService(labAccount.address, serviceCategory, serviceId)
      await validateLabServiceTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal(
        "VM Exception while processing transaction: reverted with reason string 'Only DAOGenics allowed'"
      )
  })

  it("DAOGenics insert into validLabServices mapping", async function () {
    const serviceCategory = 'Whole-Genome Sequencing'
    // This serviceId comes from substrate
    const serviceId = '0xf1616bee22e8d02c7d8996457d26b87dbacb5c115ab47465f1eb5a52f5fc8833'

    const contractWithSigner = contract.connect(DAOGenicsAccount)   
    const validateLabServiceTx = await contractWithSigner.validateLabService(labAccount.address, serviceCategory, serviceId)
    await validateLabServiceTx.wait()

    // wait until transaction is mined
    const receipt = await validateLabServiceTx.wait();
    // Get event from receipt
    const events = receipt.events.filter((x) => x.event == "LabServiceValidated");
    expect(events.length > 0).to.equal(true);
    // Get the request data from the event
    const args = events[0].args
    expect(labAccount.address).to.equal(args[0])
    expect(serviceCategory).to.equal(args[1])
    expect(serviceId).to.equal(args[2])
  })

  it("Lab claim a request, smart contract emit event RequestClaimed, and update Request status to CLAIMED", async function () {
    /**
     * enum RequestStatus { OPEN, CLAIMED }
     */
    const STATUS_OPEN = 0
    const STATUS_CLAIMED = 1

    const hashes = await contract.getAllRequests()
    const hashToClaim = hashes[0]

    const contractWithSigner = contract.connect(labAccount)
    const claimRequestTx = await contractWithSigner.claimRequest(hashToClaim)
    const receipt = await claimRequestTx.wait()

    const events = receipt.events.filter(x => x.event == "RequestClaimed")
    expect(events.length > 0).to.equal(true)

    const args = events[0].args
    expect(labAccount.address).to.equal(args[0])
    expect(hashToClaim).to.equal(args[1])

    const request = await contract.getRequestByHash(hashToClaim)
    expect(request.status).to.equal(STATUS_CLAIMED)
    expect(request.labAddress).to.equal(labAccount.address)
  })

  it("Lab can not claim a request if its already claimed", async function () {
    let errMsg
    try {
      const hashes = await contract.getAllRequests()
      const hashToClaim = hashes[0]

      const contractWithSigner = contract.connect(labAccount)
      const claimRequestTx = await contractWithSigner.claimRequest(hashToClaim)
      const receipt = await claimRequestTx.wait()
    } catch (err) {
      errMsg = err.message
    }
    expect(errMsg)
      .to
      .equal("VM Exception while processing transaction: reverted with reason string 'Request has already been claimed'")
  })

  it("Only escrow account can trigger processRequest", async function () {
    let errMsg;
    try {
      const hashes = await contract.getAllRequests()
      const hashClaimed = hashes[0]

      const orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
      const serviceId = "0xe88f0531fea1654b6a24197ec1025fd7217bb8b19d619bd488105504ec244df8";
      const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
      const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
      const dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";
      const testingPrice = 10;
      const qcPrice = 5;

      const contractWithSigner = contract.connect(labAccount)
      const processRequestTx = await contractWithSigner.processRequest(
        hashClaimed,
        orderId,
        serviceId,
        customerSubstrateAddress,
        sellerSubstrateAddress,
        requesterAccount.address, // Customer ETH Address
        labAccount.address, // Lab ETH Address
        dnaSampleTrackingId,
        testingPrice,
        qcPrice,
      )
      const receipt = await processRequestTx.wait()
    } catch (err) {
      errMsg = err.message;
    }
    expect(errMsg)
      .to
      .equal("VM Exception while processing transaction: reverted with reason string 'Only escrow admin is authorized to process request'")
  })

  it("Escrow account trigger processRequest resulting staking amount with order data sent to Escrow Smart Contract", async function () {
    const hashes = await contract.getAllRequests()
    const hashClaimed = hashes[0]

    const orderId = "0xed19fb816f3d4a3d4f46e0445bd68a666647bc5fd77c60c937b170a398c49e51";
    const serviceId = "0xe88f0531fea1654b6a24197ec1025fd7217bb8b19d619bd488105504ec244df8";
    const customerSubstrateAddress = "5EBs6czjmUy31iawezsude3vudFVfi9gMv6kAHjNeBzzGgvH";
    const sellerSubstrateAddress = "5ESGhRuAhECXu96Pz9L8pwEEd1AeVhStXX67TWE1zHRuvJNU";
    const dnaSampleTrackingId = "Y9JCOABLP16GKHQ14RY9J";
    const testingPrice = 10;
    const qcPrice = 5;

    const contractWithSigner = contract.connect(escrowAccount)
    const processRequestTx = await contractWithSigner.processRequest(
      hashClaimed,
      orderId,
      serviceId,
      customerSubstrateAddress,
      sellerSubstrateAddress,
      requesterAccount.address, // Customer ETH Address
      labAccount.address, // Lab ETH Address
      dnaSampleTrackingId,
      testingPrice,
      qcPrice,
    )
    const receipt = await processRequestTx.wait()
    const events = receipt.events.filter((x) => x.event == "RequestProcessed");
    expect(events.length > 0).to.equal(true);
    
    const args = events[0].args
    expect(hashClaimed).to.equal(args[0]) // request hash
    expect(orderId).to.equal(args[1])
    expect(serviceId).to.equal(args[2])
    expect(customerSubstrateAddress).to.equal(args[3])
    expect(sellerSubstrateAddress).to.equal(args[4])
    expect(requesterAccount.address).to.equal(args[5])
    expect(labAccount.address).to.equal(args[6])
    expect(dnaSampleTrackingId).to.equal(args[7])
    expect(testingPrice).to.equal(args[8])
    expect(qcPrice).to.equal(args[9])

    const order = await escrowContract.getOrderByOrderId(orderId)
    expect(order.orderId).to.equal(orderId)
    expect(order.serviceId).to.equal(serviceId)
    expect(order.customerSubstrateAddress).to.equal(customerSubstrateAddress)
    expect(order.sellerSubstrateAddress).to.equal(sellerSubstrateAddress)
    expect(order.customerAddress).to.equal(requesterAccount.address)
    expect(order.sellerAddress).to.equal(labAccount.address)
    expect(order.dnaSampleTrackingId).to.equal(dnaSampleTrackingId)
    expect(order.testingPrice).to.equal(testingPrice)
    expect(order.qcPrice).to.equal(qcPrice)
  })
})
