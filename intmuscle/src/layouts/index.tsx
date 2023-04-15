import Header from "@/components/Header"
import { memo, ReactElement } from "react"
import { Box } from "@chakra-ui/react"

type LayoutProps = Required<{
  readonly children: ReactElement
}>

// eslint-disable-next-line react/display-name
export const Layout = memo(({ children }: LayoutProps) => {
  return (
    <>
      <Header />
      <Box pt="100px" h="100vh" bg="gray.100">
        {children}
      </Box>
    </>
  )
})
