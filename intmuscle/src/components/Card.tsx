import {
  Badge,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Link,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react"
import { useRouter } from "next/router"

export default function Card() {
  const router = useRouter()

  return (
    <Center py={6}>
      <Stack
        borderWidth="1px"
        borderRadius="lg"
        w={{ sm: "100%", md: "540px" }}
        height={{ sm: "476px", md: "20rem" }}
        direction={{ base: "column", md: "row" }}
        bg={useColorModeValue("white", "gray.900")}
        boxShadow={"2xl"}
        padding={4}
      >
        <Flex flex={1} bg="blue.200">
          <Image objectFit="cover" boxSize="100%" src={"/images/fatcat.png"} />
        </Flex>
        <Stack flex={1} flexDirection="column" justifyContent="center" alignItems="center" p={1} pt={2}>
          <Heading fontSize={"2xl"} fontFamily={"body"}>
            Emily
          </Heading>
          <Text fontWeight={600} color={"gray.500"} size="sm" mb={4}>
            @emily
          </Text>
          <Text pb="20px" textAlign={"center"} color={useColorModeValue("gray.700", "gray.400")} px={3}>
            {`I’m Emily,living in US. I like to eat sushi. And I walk for an hour everyday. ${
              router.query.id ? "" : "I’m now 60kg. And I want to be 55kg by 5/22."
            }`}
          </Text>
        </Stack>
      </Stack>
    </Center>
  )
}
