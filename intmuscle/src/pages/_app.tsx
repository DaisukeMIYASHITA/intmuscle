import type { AppProps } from "next/app"
import * as React from "react"
import { Analytics } from "@/components/Analytics"

// 1. import `ChakraProvider` component
import { ChakraProvider } from "@chakra-ui/react"
import { Layout } from "@/layouts"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Analytics />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChakraProvider>
  )
}
