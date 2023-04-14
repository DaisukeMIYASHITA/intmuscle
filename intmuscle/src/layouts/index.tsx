import { memo, ReactElement } from "react"

type LayoutProps = Required<{
  readonly children: ReactElement
}>

// eslint-disable-next-line react/display-name
export const Layout = memo(({ children }: LayoutProps) => {
  return <>{children}</>
})
