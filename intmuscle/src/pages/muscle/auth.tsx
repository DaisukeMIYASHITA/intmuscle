import { Button } from "@chakra-ui/react"
import { NextPage } from "next"
import React, { useEffect, useState } from "react"
import { IntmaxWalletSigner } from "webmax"
import { useRouter } from "next/router"

const Auth: NextPage = () => {
  const router = useRouter()
  const [address, setAddress] = useState<string>("")

  const signer = new IntmaxWalletSigner()

  const handleClick = async () => {
    let account
    account = await signer.connectToAccount()
    if (account.chainId !== 534353) {
      await signer.switchChain(534353)
    }
    setAddress(account.address)
    console.log(account)
  }

  const handleSwitch = async () => {
    const chainId = await signer.switchChain(534353)
    console.log(chainId)
  }

  const handleSign = async () => {
    const signature = await signer.signMessage("hello world")
    console.log(signature)
  }
  return (
    <>
      <Button onClick={handleClick}>connect intmax wallet</Button>
      <Button onClick={handleSwitch}>switch chain</Button>
      <Button onClick={handleSign}>sign message</Button>
      <Button
        isDisabled={!address}
        onClick={() =>
          router.push(
            `https://id.worldcoin.org/authorize?client_id=${
              process.env.NEXT_PUBLIC_WORLD_COIN_CLIENT_ID
            }&response_type=code%20id_token&redirect_uri=${
              process.env.NEXT_PUBLIC_ORIGIN_PATH
            }%2Fmuscle%2Fverify&state=${address}&nonce=${new Date().getTime()}`,
          )
        }
      >
        verify with World ID
      </Button>
    </>
  )
}

export default Auth
