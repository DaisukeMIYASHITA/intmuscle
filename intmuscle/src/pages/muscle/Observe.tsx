import Card from "@/components/Card"
import React from "react"
import { Box, Center, Stack, Text, Input, Button, Image } from "@chakra-ui/react"
import { useRouter } from "next/router"

const Observe = () => {
  const router = useRouter()
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
              <Button
                mt="20px"
                onClick={() => router.push("/muscle/huddle")}
                leftIcon={<Image src={"/images/huddle.jpeg"} h="20px" />}
              >
                Send Observe Request
              </Button>
            </Center>
          </Box>
        </Stack>
      </Center>
    </>
  )
}

export default Observe
