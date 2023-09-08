/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
module.exports = {
   solidity: "0.8.7",
   networks: {
      goerli: {
         url: process.env.INFURA_GOERLI_URL,
         accounts: [process.env.PRIV_KEY],
      },
   },
};
