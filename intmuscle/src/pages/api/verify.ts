// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next"
import * as jose from "jose"

type Data = {
  result: jose.JWTPayload
}

const verify = async (token: string) => {
  const JWKS = jose.createRemoteJWKSet(new URL("https://id.worldcoin.org/jwks.json"))
  // @ts-ignore
  const { payload, header } = await jose.jwtVerify(token, JWKS, {
    issuer: "https://id.worldcoin.org",
    aud: "app_f91c6534554696a6072fd51a1d39df92",
  })
  console.log(payload, header)

  return payload
}

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
  const token = req.body.token
  const result = await verify(token)
  res.status(200).json({ result: result })
}

export default handler
