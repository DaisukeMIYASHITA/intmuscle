import { ReactNode, useState, useEffect } from "react"
import {
  Box,
  Flex,
  Avatar,
  HStack,
  Link,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
  Image,
  useBreakpointValue,
} from "@chakra-ui/react"
import { HamburgerIcon, CloseIcon } from "@chakra-ui/icons"
import { IntmaxWalletSigner } from "webmax"
import { useRouter } from "next/router"

const Links = ["Choose", "Observe", "Cheer"]

const NavLink = ({ children }: { children: ReactNode }) => (
  <Link
    px={2}
    py={1}
    rounded={"md"}
    _hover={{
      textDecoration: "none",
      bg: useColorModeValue("gray.200", "gray.700"),
    }}
    href={`/muscle/${children}`}
  >
    {children}
  </Link>
)

export default function Header() {
  const [address, setAddress] = useState("")
  const router = useRouter()
  const breakpointValue = useBreakpointValue({ base: true, sm: false })

  const { isOpen, onOpen, onClose } = useDisclosure()
  const signer = new IntmaxWalletSigner()
  const handleClick = async () => {
    const account = await signer.connectToAccount()
    setAddress(account.address)
    console.log(account)
  }

  useEffect(() => {
    const getAccount = async () => {
      const account = await signer.connectToAccount()
      setAddress(account.address)
      console.log(account)
    }
    getAccount()
  }, [])

  return (
    <>
      <Box bg="white" px={4} top="0" position="fixed" w="100%">
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"}>
          <Image src="/images/intmuscle.png" h="64px" maxWidth={breakpointValue ? "230px" : "unset"} />

          <Flex alignItems={"center"}>
            {address ? (
              <Menu>
                <MenuButton as={Button} rounded={"full"} variant={"link"} cursor={"pointer"} minW={0}>
                  <Avatar size={"sm"} src={"/images/fatcat.png"} />
                </MenuButton>
                <MenuList>
                  <MenuItem
                    isDisabled={!address}
                    onClick={() =>
                      router.push(
                        `https://id.worldcoin.org/authorize?client_id=app_053d81b4723b1f158902b753977fa8bc&response_type=code%20id_token&redirect_uri=http%3A%2F%2Fintmuscle-tezu.vercel.app%2Fmuscle%2Fverify&state=${address}&nonce=${new Date().getTime()}`,
                      )
                    }
                  >
                    verify with World ID
                  </MenuItem>
                  <MenuItem onClick={() => router.push(`/muscle/${address}`)}>Profile</MenuItem>
                  <MenuDivider />
                  <MenuItem>Disconnect Wallet</MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <Button onClick={handleClick}>connect intmax wallet</Button>
            )}
          </Flex>
        </Flex>

        {isOpen ? (
          <Box pb={4} display={{ md: "none" }}>
            <Stack as={"nav"} spacing={4}>
              {Links.map((link) => (
                <NavLink key={link}>{link}</NavLink>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Box>
    </>
  )
}
