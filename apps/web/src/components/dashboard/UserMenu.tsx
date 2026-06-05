"use client"

import Link from "next/link"
import { LogOut, Settings } from "lucide-react"

import { signOutAction } from "@/actions/auth"
import { getInitials } from "@/lib/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserMenuProps = {
  name: string | null
  email: string | null
  image: string | null
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Account menu"
      >
        <Avatar>
          {image && <AvatarImage src={image} alt={name || email || "Account"} />}
          <AvatarFallback>{getInitials(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2 py-1.5">
          {name && <p className="truncate text-sm font-medium">{name}</p>}
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOutAction()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
