import {useMoralis} from "react-moralis"
import {useEffect} from "react"


function Header() {
    const {enableWeb3, account, isWeb3Enabled, Moralis, deactivateWeb3, isWeb3EnableLoading} = useMoralis()

    useEffect(() => {
        if(isWeb3Enabled){
            return
        }
        if(window.localStorage.getItem("connected")){
            enableWeb3()
        }

    }, [isWeb3Enabled])

    useEffect(()=>{
        Moralis.onAccountChanged((account) =>{
            console.log(`Account changed to ${account}`);
            if(account == null){
                window.localStorage.removeItem("connected")
                deactivateWeb3()
                console.log(`Null account found..`);
            }
        })
    }, [])
  return (
    <div className="p-5 border-b-2 flex flex-row">
    <h1 className="py-4 px-4 font-bold text-3xl">Decentralized Lottery</h1>
    {account ? (
        <div>
            Connected to {account.slice(0,6)}...{account.slice(account.length - 4)}
        </div>
        ) : (
            <button 
                onClick={async() => {
                    await enableWeb3()
                    window.localStorage.setItem("connected", "injected")
                    
                    }}
                    disabled={isWeb3EnableLoading}>
                        CONNECT
            </button>
        )}
   
    </div>
  )
}

export default Header