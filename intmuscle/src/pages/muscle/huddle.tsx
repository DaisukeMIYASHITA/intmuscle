import { useEffect, useState } from "react"

import {
  huddleIframeApp,
  HuddleAppEvent,
  HuddleIframe,
  IframeConfig,
  HuddleClientMethodName,
} from "@huddle01/huddle01-iframe"

import { Chat, ENV } from "@pushprotocol/uiweb"
import { useRouter } from "next/router"

const Huddle = () => {
  const { query } = useRouter()
  const address = query.address as string
  const [walletAddress, setWalletAddress] = useState("")
  // replace with opponent address
  const toAddress = "0x5b30b21781b95B527d99B1459f41B21dDD75FE86"

  const iframeConfig: IframeConfig = {
    roomUrl: "https://iframe.huddle01.com/ncm-sjqp-zfa",
    height: "640px",
    width: "100%",
  }

  useEffect(() => {
    huddleIframeApp.on(HuddleAppEvent.PEER_JOIN, (data: any) => console.log({ iframeData: data }))
    huddleIframeApp.on(HuddleAppEvent.PEER_LEFT, (data: any) => console.log({ iframeData: data }))
  }, [])

  useEffect(() => {
    if (!address) setWalletAddress(address!)
  }, [address])

  return (
    <div className="App">
      <div className="container">
        {/* {address && query.address && ( */}
        {/* <Chat
            account={query.address as string} //user address
            supportAddress={toAddress} //support address
            modalTitle={`Chat with Emily`}
            apiKey={process.env.NEXT_PUBLIC_HUDDLE_KEY}
            env={ENV.STAGING}
          /> */}
        {/* )} */}
        {/* <br /> */}
        <HuddleIframe config={iframeConfig} />
      </div>
    </div>
  )
}

export default Huddle
