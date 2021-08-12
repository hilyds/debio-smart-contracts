require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
  
});

task("private-keys", "Print list of private keys", async (_, hre) => {
  console.log("DEPLOYER_PRIVATE_KEY =>", process.env.DEPLOYER_PRIVATE_KEY);
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: { 
    debio: {
      url: "https://testnet.theapps.dev/rpc",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    },
    rinkeby: {
      url: process.env.RINKEBY_RPC_URL,
      chainId: 4,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
