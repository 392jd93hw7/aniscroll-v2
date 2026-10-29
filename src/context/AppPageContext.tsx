import { createContext, useContext, type ReactNode } from "react"

export type AppPageData = Record<string, any>

const AppPageContext = createContext<AppPageData>({})

export function AppPageProvider({ value, children }: { value: AppPageData; children: ReactNode }) {
  return <AppPageContext.Provider value={value}>{children}</AppPageContext.Provider>
}

export function useAppPageData(): AppPageData {
  return useContext(AppPageContext)
}
