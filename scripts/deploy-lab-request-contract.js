const hre = require('hardhat');
const { open } = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function main() {
  const networkName = hre.network.name;
  const networkUrl = hre.network.config.url;
  console.log('Deploying to network', networkName, networkUrl);

  const DAITokenAddress = process.env[`${networkName.toUpperCase()}_NETWORK_DAI_TOKEN_ADDRESS`];
  const LabRequestContract = await hre.ethers.getContractFactory("LabRequest");
  const contract = await LabRequestContract.deploy(DAITokenAddress);
  await contract.deployed();

  console.log('Contract deployed!');
  console.log('Deployed address', contract.address);

  // Save the address of deployed contract at the particular network
  const filename = `${networkName}-network`;
  const fh = await open(path.join('deployed-addresses', filename), 'w');
  await fh.writeFile(String(contract.address))
  await fh.close();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
