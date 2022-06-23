const { assert, expect } = require("chai")
const { deployments, ethers, network } = require("hardhat");
const { development, networkConfig } = require("../../helper-hardhat-config")
//https://ethereum-waffle.readthedocs.io for test writing documentation

!development.includes(network.name) ? describe.skip
    : describe("Raffle Unit Tests", async function () {
        let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
        const chainId = network.config.chainId

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
        })

        describe("constructor", function () {
            it("initializes the raffle", async function () {
                //Ideally make our tests have just 1 assert per "it"
                const raffleState = await raffle.getRaffleState()
                assert.equal(raffleState.toString(), "0")
                assert.equal(interval.toString(), networkConfig[chainId]["interval"])
            })
        })

        describe("enterRaffle", function () {
            it("reverts when you don't pay enough", async function () {
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle_NotEnoughETHEntered")
            })
            it("records players when they enter", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                const playerFromContract = await raffle.getPlayer(0)
                assert.equal(playerFromContract, deployer)
            })
            it("emits event on enter", async function () {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
            })
            it("doesn't allow entrance when raffle is calculating", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                await raffle.performUpkeep([])
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__NotOpen")
            })
        })
        describe("checkUpkeep", function () {
            it("returns false if people haven't sent any ETH", async function () {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })
            it("returns false if raffle isn't open", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                //0x || [] to send blank bytes object
                await raffle.performUpkeep("0x")
                const raffleState = await raffle.getRaffleState()
                //callStatic to fake a transaction 
                const { upKeepNeeded } = await raffle.callStatic.checkUpkeep([])
                assert.equal(raffleState.toString() == "1", upKeepNeeded == false)
            })
            it("returns false if enough time hasn't passed", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                assert(!upkeepNeeded)
            })
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upKeepNeeded } = await raffle.callStatic.checkUpkeep("0x")
                assert(upKeepNeeded)
            })
        })
        describe("performUpkeep", function () {
            it("can only run if checkupkeep is true", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                //lines here increase time and mine block forcing checkupkeep to be true
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine", [])
                //----------------------------------------------------------------
                const tx = await raffle.performUpkeep([])
                assert(tx)
            })
            it("reverts when checkupkeep is false", async function () {
                await expect(raffle.performUpkeep([])).to.be.revertedWith(
                    //can pass values looked for in custom error "Raffle__UpKeepNotNeeded(args)"
                    "Raffle__UpKeepNotNeeded"
                )
            })
            it("updates raffle state, emits event, and calls vrf coordinator", async function () {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txResponse = await raffle.performUpkeep([])
                const txReceipt = await txResponse.wait(1)
                const requestId = txReceipt.events[1].args.requestId
                const raffleState = await raffle.getRaffleState()
                assert(requestId.toNumber() > 0)
                assert(raffleState == 1)
            })
        })
        describe("fulfillRandomWords", () => {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({method: "evm_mine", params: []})
            })
            it("can only be called after performUpkeep", async () => {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
            })

        })
        it("picks a winner, resets lottery, and sends money", async () => {
            const additionalEntrants = 3
            const startingAccountIndex = 1
            const accounts = await ethers.getSigners()
            for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
                const accountConnectedRaffle = raffle.connect(accounts[i])
                await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
            }
            const startingTimeStamp = await raffle.getTimeStamp()

            //performupkeep(mock being chainlink keepers)
            //fulfillrandomwords(mock being chainlink vrf)
            //everything should reset after lottery is paid out
            console.log("promise");
            await new Promise(async (resolve, reject) => {
                
                raffle.once("WinnerPicked", async () => {
                    console.log("Found the event")
                    console.log(accounts[2].address);
                    console.log(accounts[0].address);
                    console.log(accounts[1].address);
                    try {
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const endingTimeStamp = await raffle.getTimeStamp()
                        const numPlayers = await raffle.getNumberOfPlayers()
                        assert.equal(numPlayers = 0, raffleState = 0)
                        assert(endingTimeStamp > startingTimeStamp)
                       resolve()
                    }
                    catch (e) {
                        reject(e)
                    }
                    
                    
                })
                //mocking chainlinkvrf
                console.log("mocking vrf");
                //broken here
                //raffle.performUpkeep not resolving its promise
                const tx = await raffle.performUpkeep("0x")
                
                const txReceipt = await tx.wait(1)
                await vrfCoordinatorV2Mock.fulfillRandomWords(
                    txReceipt.events[1].args.requestId,
                    raffle.address
                )
                
            })

        })
    })