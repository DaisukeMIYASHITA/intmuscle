import { NextPage } from "next"
import { useRouter } from "next/router"
import Card from "@/components/Card"
import React, { useState } from "react"
import { Box, Center, Stack, Text, Input, Button, Image } from "@chakra-ui/react"
import { IntmaxWalletSigner } from "webmax"
import { useToast } from "@chakra-ui/react"

const AccountPage: NextPage = () => {
  const toast = useToast()
  const [weight, setWeight] = useState("")

  const handleSendWeight = async () => {
    const signer = new IntmaxWalletSigner()
    const signature = await signer.signMessage(`save weight:${weight}`)
    console.log(signature)
    if (!signature) return

    toast({
      title: "Weight sent.",
      description: `Your weight has been successfully saved. "${weight}"`,
      status: "success",
      duration: 9000,
      isClosable: true,
    })
  }

  return (
    <>
      <Card />
      <Center w="100%">
        <Stack
          borderWidth="1px"
          borderRadius="lg"
          w={{ sm: "100%", md: "540px" }}
          // height={{ sm: "476px", md: "20rem" }}
          direction={{ base: "column", md: "row" }}
          bg="white"
          boxShadow={"2xl"}
          padding={4}
        >
          <Box>
            <Text mt="20px" px="20px">
              Enter your weight now!!
            </Text>
            <Center my="20px" gap="10%" alignItems={"center"}>
              <Input
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value)
                }}
                mt="20px"
                placeholder="60kg"
                w="60%"
              />
              <Button mt="20px" isDisabled={!weight} onClick={handleSendWeight}>
                Send
              </Button>
            </Center>
          </Box>
        </Stack>
      </Center>
    </>
  )
}

export default AccountPage
