/**
 * Currently this is for localhost testing only
 * The addresses below are always the same when deployed to localhost hardhat network
 * */
const ERC20_TOKEN_ADDRESS = '0x5fbdb2315678afecb367f032d93f642f64180aa3'
const ESCROW_CONTRACT_ADDRESS = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512'
const SERVICE_REQUEST_CONTRACT_ADDRESS = '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0'

const hre = require('hardhat')
const serviceRequestContractABI = require('../artifacts/contracts/ServiceRequest.sol/ServiceRequest.json').abi
const erc20ABI = require('../artifacts/contracts/DebioToken.sol/DebioToken.json').abi

const SERVICE_CATEGORIES = [
  "Bioinformatics Data Analyst Support", 
  "Genetic Counseling", 
  "Single Nucleotida Polymorphism (SNP) Microarray", 
  "Targeted Gene Panel Sequencing", 
  "Whole-Exome Sequencing", 
  "Whole-Genome Sequencing", 
  "Other"
]

const dummyData = [
  {
    country: 'ID',
    city: 'Banda Aceh',
    serviceCategory: SERVICE_CATEGORIES[0],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'ID',
    city: 'Jakarta',
    serviceCategory: SERVICE_CATEGORIES[1],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'ID',
    city: 'Denpasar',
    serviceCategory: SERVICE_CATEGORIES[2],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'ID',
    city: 'Bandung',
    serviceCategory: SERVICE_CATEGORIES[3],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[4],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[0],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'SG',
    city: 'Singapore',
    serviceCategory: SERVICE_CATEGORIES[1],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'MY',
    city: 'Kuala Lumpur',
    serviceCategory: SERVICE_CATEGORIES[2],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'MY',
    city: 'Johor Bahru',
    serviceCategory: SERVICE_CATEGORIES[3],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'MY',
    city: 'Petaling Jaya',
    serviceCategory: SERVICE_CATEGORIES[4],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
  {
    country: 'MY',
    city: 'Sungai Besar',
    serviceCategory: SERVICE_CATEGORIES[5],
    stakingAmount: hre.ethers.utils.parseUnits('20.0')
  },
]

async function transferErc20ToAccounts(erc20) {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]
  const erc20WithSigner = erc20.connect(deployer)
  // Transfer Some ERC20 to accounts
  for (let acc of accounts) {
    const balance = await erc20.balanceOf(acc.address);
    if (balance.toString() != "0") {
      console.log(`${acc.address} ERC20 balance => ${balance.toString()}`)
      continue
    }
    let transferTx = await erc20WithSigner.transfer(acc.address, "90000000000000000000");
    await transferTx.wait();
    console.log(`${acc.address} ERC20 balance => ${balance.toString()}`)
  }
}

async function createRequestsWithDummyData(erc20, serviceRequestContract) {
  /**
   * Only make requests when there are no requests in smart contract
   * */
  const requestHashes = await serviceRequestContract.getAllRequests()
  if (requestHashes.length > 0) {
    for (let hash of requestHashes) {
      const requestData = await serviceRequestContract.getRequestByHash(hash)
      console.log(requestData)
    }
    return
  }
  /**
   * Create requests with accounts 
   * */
  const accounts = await hre.ethers.getSigners();
  let accIdx = 0
  for (let data of dummyData) {
    const { country, city, serviceCategory, stakingAmount } = data

    const signer = accounts[accIdx]
    const erc20WithSigner = erc20.connect(signer)
    const serviceRequestContractWithSigner = serviceRequestContract.connect(signer)

    // Approve ERC20
    const approveTx = await erc20WithSigner.approve(
      serviceRequestContract.address,
      stakingAmount
    );
    await approveTx.wait();

    // Send createRequest Transaction
    const requestAddedTx = await serviceRequestContractWithSigner.createRequest(
      data.country,
      city,
      serviceCategory,
      stakingAmount
    );
    // wait until transaction is mined
    await requestAddedTx.wait();

    accIdx++
    if (accIdx == accounts.length) {
      accIdx = 0
    }
  }
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider();
  const erc20 = new hre.ethers.Contract(
    ERC20_TOKEN_ADDRESS,
    erc20ABI,
    provider,
  )
  const serviceRequestContract = new hre.ethers.Contract(
    SERVICE_REQUEST_CONTRACT_ADDRESS,
    serviceRequestContractABI,
    provider,
  )

  await transferErc20ToAccounts(erc20)
  await createRequestsWithDummyData(erc20, serviceRequestContract)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
