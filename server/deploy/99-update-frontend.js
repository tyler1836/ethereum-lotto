const { ethers, network } = require("hardhat");
const fs = require("fs")
const addressFile = "../client/constants/addresses.json"
const abiFile = "../client/constants/abi.json"


module.exports = async () => {
    if(process.env.UPDATE_FRONT_END){
        console.log("Updating front end...");
        updateContractAddress()
        updateAbi()
    }
}

async function updateAbi(){
    const raffle = await ethers.getContract("Raffle")
    //grab abi straight from contract write it to the abi file in client side
    fs.writeFileSync(abiFile, raffle.interface.format(ethers.utils.FormatTypes.json))//ethers method for getting interface
    console.log("----------- abi updated -------------");
}

async function updateContractAddress() {
    //await contract
    const raffle = await ethers.getContract("Raffle")
    //read from addresses
    const currentAddress = JSON.parse(fs.readFileSync(addressFile, "utf8"))
    //grab chainId change to string
    const chainId = network.config.chainId.toString()
    //check if chainId is in file
    if( chainId in currentAddress){
        //check if raffle address is in file
        if(!currentAddress[chainId].includes(raffle.address)){
            //if raffle address is not there push raffle address
            currentAddress[chainId].push(raffle.address)
        }
    }
    else {
        //if no chainId if file create first one and add raffle address to it
        currentAddress[chainId] = raffle.address
    }
    //write the current address to the file 
    fs.writeFileSync(addressFile, JSON.stringify(currentAddress))
}
module.exports.tags = ["all", "update"]