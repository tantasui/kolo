"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

export function Landing() {
  const { login, ready } = usePrivy();

  return (
    <div className="bloom relative flex min-h-[100dvh] flex-col px-6 pb-10 pt-14">
      <div className="animate-rise-in">
        <Wordmark />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h1 className="animate-rise-in text-[44px] font-bold leading-[1.05] tracking-tight">
          Money that moves
          <br />
          like a message.
        </h1>
        <p className="mt-5 max-w-[19rem] animate-rise-in text-[17px] leading-relaxed text-muted">
          Send to anyone by their @handle. It lands in seconds, and it never
          costs a thing.
        </p>
      </div>

      <div className="animate-rise-in space-y-4">
        <Button full onClick={login} disabled={!ready}>
          Get started
        </Button>
        <p className="text-center text-[13px] text-muted">
          Use your email — nothing to download, nothing to set up.
        </p>
        {/* The only way out of the app, for someone who arrived without being
            told what this is. Deliberately quiet: the thing to do here is tap
            Get started. */}
        <p className="text-center text-[13px]">
          <Link
            href="/"
            className="text-muted underline decoration-line underline-offset-4"
          >
            What is Kolo?
          </Link>
        </p>
      </div>
    </div>
  );
}
