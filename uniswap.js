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

//lockers contract instance
const teamFinanceLockerInstance = new ethers.Contract(
   "0xE2fE530C047f2d85298b07D9333C05737f1435fB",
   [
      "event Deposit(uint256 id, address indexed tokenAddress, address indexed withdrawalAddress, uint256 amount, uint256 unlockTime)",
      "event LockDurationExtended(uint256 id, uint256 unlockTime)",
   ],
   connectedWallet
);

const unicryptLockerInstance = new ethers.Contract(
   "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
   [
      "event onDeposit(address lpToken, address user, uint256 amount, uint256 lockDate, uint256 unlockDate)",
   ],
   connectedWallet
);

const pinkLockerInstance = new ethers.Contract(
   "0x71B5759d73262FBb223956913ecF4ecC51057641",
   [
      "event LockAdded(uint256 indexed id, address token, address owner, uint256 amount, uint256 unlockDate)",
   ],
   connectedWallet
);

//team finance lp token locked event listener
teamFinanceLockerInstance.on(
   "Deposit",
   async (id, tokenAddress, withdrawalAddress, amount, unlockTime) => {
      console.log(
         `
      =====================================
      New Deposit detected on TeamFinance
      =====================================
      id : ${id}
      token pair : ${tokenAddress}
      amount : ${amount}
      unlock time : ${unlockTime} 
      `
      );
   }
);

//team unicrypt lp token locked event listener
unicryptLockerInstance.on(
   "onDeposit",
   async (lpToken, user, amount, lockDate, unlockDate) => {
      console.log(
         `
      =====================================
      New Deposit detected on UniCrypt
      =====================================
      token pair : ${lpToken}
      amount : ${ethers.utils.formatEther(amount)}
      unlock time : ${unlockDate} 
      `
      );
   }
);

//team pink sale lp token locked event listener
pinkLockerInstance.on(
   "LockAdded",
   async (id, token, owner, amount, unlockDate) => {
      console.log(
         `
      =====================================
      New Deposit detected on Pink Sale
      =====================================
      id : ${id}
      token pair : ${token}
      amount : ${ethers.utils.formatEther(amount)}
      unlock time : ${unlockDate} 
      `
      );
   }
);

//getBalance function from ethers.js library
// const getBalance = async () => {
//    balance = await provider.getBalance(PUB_KEY);
//    console.log("Your balance : ", balance.toBigInt());
// };

//function totalSupply d'un token et l'affiche dans la console
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
   const amount =
      (lpTokenAmount * (await getWETHInPairAddress(pairAddress))) /
      (await getTotalLPToken(pairAddress));
   console.log("amount locked : ", amount);
   return parseInt(amount);
};

//createdPair event listener web socket
factoryInstance.on("PairCreated", async (token0, token1, pairAddress) => {
   console.log(`
   ================
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
      console.log("No WETH detected in the pair");
      console.log(
         "======================================================================="
      );
   }
});
