import Card from "@/components/Card"
import React, { useState } from "react"
import { Box, Center, Stack, Text, Input, Button } from "@chakra-ui/react"
import { useRouter } from "next/router"

const Choose = () => {
  const [deposit, setDeposit] = useState("")
  const router = useRouter()

  const handleDeposit = async (choise: "Yes" | "No") => {


    router.push("/muscle/Cheer")
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
              Do you think Emily will have muscle(55kg) by 5/22? (Deposit your money and click the button)
            </Text>
            <Center>
              <Input
                type="number"
                value={deposit}
                onChange={(e) => {
                  setDeposit(e.target.value)
                }}
                mt="20px"
                placeholder="$100"
                w="60%"
              />
            </Center>
            <Center my="20px" gap="10%">
              <Button isDisabled={!deposit} onClick={() => handleDeposit("Yes")}>
                Yes
              </Button>
              <Button isDisabled={!deposit} onClick={() => router.push("/muscle/Observe")}>
                No
              </Button>
            </Center>
          </Box>
        </Stack>
      </Center>
    </>
  )
}

export default Choose
