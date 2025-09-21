"use client"

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import * as React from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogClose, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return (
    <div className="text-center flex-col gap-3 flex p-3 items-center justify-center">
      <h1>settings</h1>
      <div className="rounded-xl w-full p-3 bg-sidebar-accent">
        <ul>
          <li className="border-b-2 flex items-center justify-between p-2 pb-4">
            <span>theme</span>
              <RadioGroup className="flex items-center space-x-2" value={theme} onValueChange={setTheme}>
                <RadioGroupItem value="system" id="systemDarkMode" />
                <Label htmlFor="systemDarkMode">system</Label>
                <RadioGroupItem value="dark" id="systemDarkMode" />
                <Label htmlFor="darkDarkMode">dark</Label>
                <RadioGroupItem value="light" id="systemDarkMode" />
                <Label htmlFor="lightDarkMode">light</Label>
              </RadioGroup>
          </li>
          <li className="flex content-center pt-4 items-center justify-between p-2">
            <span>your data</span>
              <Dialog>
                <DialogTrigger asChild><Button variant="destructive" className="cursor-pointer">erase</Button></DialogTrigger>
                <DialogContent className="flex flex-col content-center text-center justify-center items-center">
                    <DialogHeader className="flex flex-col text-center content-center justify-center items-center">
                        <DialogTitle>are you sure?</DialogTitle>
                        <DialogDescription className="text-center">this action cannot be undone. once you delete your data, it's gone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="submit" variant="destructive" onClick={() => localStorage.removeItem("hngr-db")} className="cursor-pointer"><Trash></Trash>i'm sure, erase</Button>
                      </DialogClose>
                        </DialogFooter>
                </DialogContent>
              </Dialog>
          </li>
        </ul>
      </div>
    </div>
  );
}
