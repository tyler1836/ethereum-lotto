import { React, useEffect, useState } from 'react'
import { useWeb3Contract } from "react-moralis"
import { abi, address } from "../constants/index.js"
import { useMoralis } from "react-moralis"
import { ethers } from "ethers"
import { useNotification } from "web3uikit"

function LotteryEntrance() {
    const [entrancefee, setEntranceFee] = useState("0")
    const [numberOfPlayers, setNumberOfPlayers] = useState("0")
    const [recentWinner, setRecentWinner] = useState("0")
    const { chainId: chain, isWeb3Enabled } = useMoralis();
    const chainId = parseInt(chain)
    const dispatch = useNotification()
    const raffleAddress = chainId in address ? address[chainId][0] : null
    console.log(raffleAddress);
    const { data, error, runContractFunction: enterRaffle, isFetching, isLoading } =
        useWeb3Contract({
            abi: abi,
            contractAddress: raffleAddress,
            functionName: "enterRaffle",
            params: {},
            msgValue: entrancefee
        })
    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    })
    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    })
    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getRecentWinner",
        params: {},
    })
    async function updateUi() {
        const fromCall = (await getEntranceFee()).toString()
        const numPlayersFromCall = (await getNumberOfPlayers()).toString()
        const recentWinnerFromCall = (await getRecentWinner()).toString()
        setEntranceFee(fromCall)
        setNumberOfPlayers(numPlayersFromCall)
        setRecentWinner(recentWinnerFromCall)
    }
    useEffect(() => {
        if (isWeb3Enabled) {
            //try and read entrance fee
           
            updateUi()

        }
    }, [isWeb3Enabled])

    const handleSuccess = async (tx) => {
        await tx.wait(1)
        handleNewNotification(tx)
        updateUi()
    }

    const handleNewNotification = () => {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Tx Notis",
            position: "topR",
            icon: "bell"
        })
    }
    return (
        <div className='border-b2'>
            {raffleAddress ?
                (<div>
                    <button className='bg-blue-500 hover:bg-blue-700 rounded font-bold text-white ml-auto py-2 px-2 my-4'
                    onClick={async () => {
                        await enterRaffle({
                            onSuccess: handleSuccess,
                            onError: (error) => console.log(error)

                        })
                    }}
                    disabled={isLoading || isFetching}
                    >
                        {isLoading || isFetching ? (<div className='animate-spin spinneer-bordder h-8 w-8 border-b-2 rounded-full'></div>
                ):(
                    <div>Enter Raffle</div>
                )}
                    </button>
                    <div>Lottery entrance Fee is: {ethers.utils.formatUnits(entrancefee, "ether")}</div> 
                    <div>Number of Players: {numberOfPlayers}</div>
                    <div>Recent Winner: {recentWinner}</div> 
                   
                    
                </div>
                ) : (
                    <div>No Lotter found on this Address</div>
                )}
        </div>
    )
}

export default LotteryEntrance