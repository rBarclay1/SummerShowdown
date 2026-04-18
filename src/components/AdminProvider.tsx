"use client"

import { createContext, useContext } from "react"
import { useUser } from "@clerk/nextjs"

type AdminContextType = {
  isAdmin: boolean
  isRealAdmin: boolean
  isUserView: boolean
}

const AdminContext = createContext<AdminContextType>({ 
  isAdmin: false, 
  isRealAdmin: false, 
  isUserView: false 
})

export function AdminProvider({ 
  children, 
  isUserView 
}: { 
  children: React.ReactNode
  isUserView: boolean 
}) {
  const { user } = useUser()
  const isAdminMeta = (user?.publicMetadata as any)?.isAdmin
  const isRealAdmin = isAdminMeta === true || isAdminMeta === "True" || isAdminMeta === "true"

  return (
    <AdminContext.Provider value={{ 
      isAdmin: isRealAdmin && !isUserView, 
      isRealAdmin, 
      isUserView 
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useIsAdmin() {
  return useContext(AdminContext)
}