"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CheckoutErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CheckoutErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
          <div className="rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 p-8">
            <h2 className="text-lg font-semibold text-[#1C1C1C]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[#6B6B6B]">
              We couldn&apos;t complete checkout right now. Please try again in a moment.
            </p>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Your cart is safe — no order was placed.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="rounded-sm bg-[#95271D] px-6 py-2 text-sm font-medium text-white hover:bg-[#7a1f17]"
              >
                Try Again
              </button>
              <a
                href="/shop"
                className="rounded-sm border border-[#E5D5C5] px-6 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-[#F5F0EB]"
              >
                Back to Shop
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
