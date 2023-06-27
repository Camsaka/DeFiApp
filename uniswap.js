require("dotenv").config();
const { ethers } = require("ethers");

const INFURA_MAINNET_URL = process.env.INFURA_MAINNET_URL;
const PRIV_KEY = process.env.PRIV_KEY;
const PUB_KEY = process.env.PUB_KEY;
const INFURA_MAINNET_KEY = process.env.INFURA_MAINNET_KEY;
const WETHAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const ETHER_API_TOKEN = process.env.ETHER_API_TOKEN;

//Provider definition RPC ! On prefere websocket
// const provider = new ethers.providers.JsonRpcProvider(INFURA_MAINNET_URL);
//Provider websocket ethereum
const provider = new ethers.providers.WebSocketProvider(
   `wss://mainnet.infura.io/ws/v3/${INFURA_MAINNET_KEY}`
);

const wallet = new ethers.Wallet(PRIV_KEY);
const connectedWallet = wallet.connect(provider);

//instance du contrat uniswap v2 factory
const factoryInstance = new ethers.Contract(
   "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
   [
      "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
   ],
   connectedWallet
);

//getBalance function from ethers.js library
// const getBalance = async () => {
//    balance = await provider.getBalance(PUB_KEY);
//    console.log("Your balance : ", balance.toBigInt());
// };

//function totalSupply d'unn token et l'affiche dans la console
const getTotalSupply = async (contractAddress) => {
   const res = await fetch(
      `https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${contractAddress}&apikey=${ETHER_API_TOKEN}`
   );

   if (res.ok) {
      const data = await res.json();
      console.log("total supply : ", parseInt(data.result));
   }
};

// function get ABI pour token verifé
const getABI = async (contractAddress) => {
   const res = await fetch(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHER_API_TOKEN}`
   );

   if (res.ok) {
      const data = await res.json();
      //status 1 si verifié, status 0 sinon
      console.log("is contract verified", data.status);
   }
};

//function get lp token from pair adress
const getTotalLPToken = async (pairAddress) => {
   const res = await fetch(
      `https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${pairAddress}&apikey=${ETHER_API_TOKEN}`
   );

   if (res.ok) {
      const data = await res.json();
      console.log("total supply LP tokens : ", parseInt(data.result));
      return parseInt(data.result);
   }
};

//function get WETH on a pair address
const getWETHInPairAddress = async (pairAddress) => {
   const res = await fetch(
      `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${WETHAddress}&address=${pairAddress}&tag=latest&apikey=${ETHER_API_TOKEN}`
   );

   if (res.ok) {
      const data = await res.json();
      console.log("WETH in pair address : ", parseInt(data.result));
      return parseInt(parseInt(data.result));
   }
};


//function qui calcul la proportion de token locked (locker)
const getWETHLocked = async (pairAddress, lpTokenAmount) => {
   const amount = lpTokenAmount * await getWETHInPairAddress(pairAddress) / await getTotalLPToken(pairAddress)
   console.log("amount locked : ", amount)
   return parseInt(amount);
}

//createdPair event listener web socket
factoryInstance.on("PairCreated", async (token0, token1, pairAddress) => {
   console.log(`
   New pair created
   ================
   token0 : ${token0}
   token1 : ${token1}
   pairAddress : ${pairAddress}
   `);
   if (token0 != WETHAddress) {
      console.log("token0 is not WETH");
      await getTotalSupply(token0);
      await getABI(token0);
      await getTotalLPToken(pairAddress);
      await getWETHInPairAddress(pairAddress);
      console.log(
         "======================================================================="
      );
   } else if (token1 != WETHAddress) {
      console.log("token1 is not WETH");
      await getTotalSupply(token1);
      await getABI(token1);
      await getTotalLPToken(pairAddress);
      await getWETHInPairAddress(pairAddress);
      console.log(
         "======================================================================="
      );
   } else {
      console.log("No WETH detectec in the pair");
      console.log(
         "======================================================================="
      );
   }
});