"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Image from "next/image";
import Link from "next/link";
import { FaGithub, FaStar } from "react-icons/fa";
import { Robot01Icon } from "@/components/ui/robot-01";
import { File01Icon } from "@/components/ui/file-01";
import { Settings01Icon } from "@/components/ui/settings-01";
import { Login01Icon } from "@/components/ui/login-01";
import { Logout01Icon } from "@/components/ui/logout-01";
import { DashboardSquare01Icon } from "@/components/ui/dashboard-square-01";
import { Star, Lightbulb } from "lucide-react";
import { Sun03Icon } from "@/components/ui/sun-03";
import { Moon02Icon } from "@/components/ui/moon-02";
import { MoreHorizontalIcon } from "@/components/ui/more-horizontal";
import { Cancel01Icon } from "@/components/ui/cancel-01";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun03Icon size={16} />
      ) : (
        <Moon02Icon size={16} />
      )}
    </Button>
  );
}

const NAV_ITEMS = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <DashboardSquare01Icon size={16} className="shrink-0" />,
  },
  {
    href: "/feedback",
    label: "Feedback",
    icon: <Star size={16} className="shrink-0" />,
  },
  {
    href: "/feature-request",
    label: "Request a feature",
    icon: <Lightbulb size={16} className="shrink-0" />,
  },
  {
    href: "/generate",
    label: "Generate",
    icon: <File01Icon size={16} className="shrink-0" />,
  },
];

const NAV_ITEM_CLASSES =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted";

export function Navbar() {
  const { data: session } = authClient.useSession();

  const handleSignOut = () => {
    authClient.signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <Link href={"/"} className="flex items-center">
          <Image
            src="/applogo.png"
            alt="fuckmyresume.lol"
            width={32}
            height={32}
            className="size-8 shrink-0"
          />
        </Link>
        <a
          href="https://github.com/subhraneel2005/fuck-my-resume"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:block"
        >
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <FaGithub className="mr-1.5 size-3.5 shrink-0" />
            Star the repo
            <FaStar className="ml-1.5 size-3.5 shrink-0 text-yellow-400" />
          </Button>
        </a>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm">
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
          {session ? (
            <div className="flex items-center gap-1">
              <Link href="/interview">
                <Button variant="outline" size="sm">
                  <Robot01Icon size={14} className="mr-1.5 shrink-0" />
                  Mock Interview
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/settings")}
              >
                AI Settings{" "}
                <Settings01Icon size={14} className="ml-1.5 shrink-0" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <Logout01Icon size={14} className="mr-1.5 shrink-0" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/sign-in")}
            >
              <Login01Icon size={14} className="mr-1.5 shrink-0" />
              Sign In
            </Button>
          )}
        </div>

        <ThemeToggle />

        <div className="lg:hidden">
          <Drawer swipeDirection="right">
            <DrawerTrigger
              render={<Button variant="outline" size="icon" aria-label="Open menu" />}
            >
              <MoreHorizontalIcon size={20} className="shrink-0" />
            </DrawerTrigger>
            <DrawerContent className="w-80">
              <DrawerHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-4 pb-2">
                <DrawerTitle className="text-base font-bold">
                  Menu
                </DrawerTitle>
                <DrawerClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Close menu"
                    />
                  }
                >
                  <Cancel01Icon size={20} className="shrink-0" />
                </DrawerClose>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {session?.user && (
                    <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                      {session.user.image && (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || "User"}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {session.user.name || "User"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {NAV_ITEMS.map((item) => (
                    <DrawerClose
                      key={item.href}
                      render={
                        <Link href={item.href} className={NAV_ITEM_CLASSES} />
                      }
                    >
                      {item.icon}
                      {item.label}
                    </DrawerClose>
                  ))}

                  {session && (
                    <>
                      <DrawerClose
                        render={
                          <Link
                            href="/interview"
                            className={NAV_ITEM_CLASSES}
                          />
                        }
                      >
                        <Robot01Icon size={16} className="shrink-0" />
                        Mock Interview
                      </DrawerClose>
                      <DrawerClose
                        render={
                          <Link
                            href="/settings"
                            className={NAV_ITEM_CLASSES}
                          />
                        }
                      >
                        <Settings01Icon size={16} className="shrink-0" />
                        AI Settings
                      </DrawerClose>
                    </>
                  )}
                </div>

                <div className="mt-3 border-t pt-3">
                  {session ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleSignOut}
                    >
                      <Logout01Icon size={16} className="mr-3 shrink-0" />
                      Sign Out
                    </Button>
                  ) : (
                    <DrawerClose
                      render={
                        <Link href="/sign-in" className={NAV_ITEM_CLASSES} />
                      }
                    >
                      <Login01Icon size={16} className="shrink-0" />
                      Sign In
                    </DrawerClose>
                  )}
                  <a
                    href="https://github.com/subhraneel2005/fuck-my-resume"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <FaGithub className="mr-3 size-4 shrink-0" />
                      Star the repo
                      <FaStar className="ml-1.5 size-3.5 shrink-0 text-yellow-400" />
                    </Button>
                  </a>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
}