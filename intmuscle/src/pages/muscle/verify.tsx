import React, { useEffect } from "react"
import { useRouter } from "next/router"
import { NextPage } from "next"
import axios from "axios"
import { useCookies } from "react-cookie"

const Verify: NextPage = () => {
  const { query } = useRouter()
  const router = useRouter()
  const [accessToken, setAccessToken, deleteAccessToken] = useCookies(["intmuscle-access-token"])
  const [expiryTime, setExpiryTime, deleteExpiryTime] = useCookies(["intmuscle-token-expiry-time"])

  const verify = async (token: string) => {
    if (!token) return

    const res = await axios.post("/api/verify", { token })
    console.log(res.data)
    setAccessToken("intmuscle-access-token", token)
    setExpiryTime("intmuscle-token-expiry-time", res.data.result.exp)
    if (res.data) {
      router.push(`/muscle/${res.data.result.sub}`)
    }
    return res.data
  }

  useEffect(() => {
    if (query.id_token) {
      verify(query.id_token as string)
      console.log("verifing")
    }
  }, [query])
  return <div>verify</div>
}

export default Verify
