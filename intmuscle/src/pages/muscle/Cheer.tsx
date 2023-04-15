import Card from "@/components/Card"
import React, { useState } from "react"
import { Box, Center, Stack, Text, Input, Button, Image } from "@chakra-ui/react"
import { IntmaxWalletSigner } from "webmax"
import { useToast } from "@chakra-ui/react"

const Choose = () => {
  const [message, setMessage] = useState("")
  const toast = useToast()

  const handleSendCheer = async () => {
    const signer = new IntmaxWalletSigner()
    const signature = await signer.signMessage(`Send cheer message via Push: "${message}"!`)
    console.log(signature)
    if (!signature) return

    toast({
      title: "Message sent.",
      description: `Your message has been successfully sent via Push. "${message}"`,
      status: "success",
      duration: 9000,
      isClosable: true,
    })
  }
  return (
    <>
      <Card />
      <Center>
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
              4/16 60kg 　4/17 61kg　4/19 58kg　4/24 56kg→ 5/22 56kg
            </Text>
            <Center my="20px" gap="10%" alignItems={"center"}>
              <Input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                }}
                mt="20px"
                placeholder="You can do it!!!"
                w="60%"
              />
              <Button
                mt="20px"
                isDisabled={!message}
                onClick={handleSendCheer}
                leftIcon={<Image src={"/images/push.png"} h="20px" />}
              >
                Send
              </Button>
            </Center>
          </Box>
        </Stack>
      </Center>
    </>
  )
}

export default Choose
