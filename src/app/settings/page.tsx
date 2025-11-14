"use client";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as React from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash, ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // 1. initialize state with a default, NOT from localStorage
  const [palette, setPalette] = React.useState("catppuccin");

  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const palettes = [
    { value: "regular", label: "regular" },
    { value: "catppuccin", label: "catppuccin" },
  ];

  // 2. use useEffect to run this code ONLY on the client, after mount
  React.useEffect(() => {
    // mark as mounted so the rest of the page can render
    setMounted(true);

    // now it's safe to access localStorage
    const storedPalette = localStorage.getItem("palette");

    if (storedPalette) {
      // if we found a value, update the state...
      setPalette(storedPalette);
      // ...and update the document
      document.documentElement.dataset.palette = storedPalette;
    } else {
      // otherwise, just make sure the document has the default
      document.documentElement.dataset.palette = "catppuccin";
    }
  }, []); // empty array [] means this only runs once on mount

  // 3. don't render the rest of the component until we're mounted on the client
  //    this avoids a flash of mismatched content
  if (!mounted) return null;

  return (
    <div className="text-center flex-col gap-3 flex p-3 items-center justify-center">
      <h1>settings</h1>
      <div className="rounded-xl w-full p-3 bg-sidebar-accent">
        <ul>
          <li className="border-b-2 flex items-center justify-between p-2 pb-4">
            <span>theme</span>
            <RadioGroup
              className="flex items-center space-x-2"
              value={theme}
              onValueChange={setTheme}
            >
              <RadioGroupItem value="system" id="systemDarkMode" />
              <Label htmlFor="systemDarkMode">system</Label>
              <RadioGroupItem value="dark" id="darkDarkMode" />
              <Label htmlFor="darkDarkMode">dark</Label>
              <RadioGroupItem value="light" id="lightDarkMode" />
              <Label htmlFor="lightDarkMode">light</Label>
            </RadioGroup>
          </li>
          <li className="border-b-2 flex items-center justify-between p-2 py-4">
            <span>palette</span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-[160px] justify-between"
                >
                  {palettes.find((p) => p.value === palette)?.label ??
                    "select palette"}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[160px] p-0">
                <Command>
                  <CommandInput placeholder="search palette..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>no palette found.</CommandEmpty>
                    <CommandGroup>
                      {palettes.map((p) => (
                        <CommandItem
                          key={p.value}
                          value={p.value}
                          onSelect={(currentValue) => {
                            setPalette(currentValue);
                            localStorage.setItem("palette", currentValue);
                            document.documentElement.dataset.palette = currentValue;
                            setOpen(false);
                          }}
                        >
                          {p.label}
                          <Check
                            className={cn(
                              "ml-auto",
                              palette === p.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </li>
          <li className="flex content-center pt-4 items-center justify-between p-2">
            <span>your data</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="cursor-pointer">
                  erase
                </Button>
              </DialogTrigger>
              <DialogContent className="flex flex-col content-center text-center justify-center items-center">
                <DialogHeader className="flex flex-col text-center content-center justify-center items-center">
                  <DialogTitle>are you sure?</DialogTitle>
                  <DialogDescription className="text-center">
                    this action cannot be undone. once you delete your data,
                    it's gone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="submit"
                      variant="destructive"
                      onClick={() => localStorage.removeItem("hngr-db")}
                      className="cursor-pointer"
                    >
                      <Trash></Trash>i'm sure, erase
                    </Button>
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