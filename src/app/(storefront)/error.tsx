"use client";

import { StorefrontErrorState } from "@/components/ui/StorefrontState";
import { Messages } from "@/lib/messages";

export default function StorefrontError() {
  return (
    <StorefrontErrorState
      title="Something went wrong"
      message={Messages.somethingWentWrong}
    />
  );
}
