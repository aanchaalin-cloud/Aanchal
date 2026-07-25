export function BackgroundGraphics() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute -top-32 -right-32 h-96 w-96 text-[#800020]/5"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 20C55 20 20 55 20 100s35 80 80 80 80-35 80-80S145 20 100 20z"
          stroke="currentColor"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M100 40c-33 0-60 27-60 60s27 60 60 60 60-27 60-60-27-60-60-60z"
          stroke="currentColor"
          strokeWidth="0.3"
          fill="none"
        />
        <path
          d="M70 70l30 30m0 0l30-30m-30 30l30 30m-30-30l-30 30"
          stroke="currentColor"
          strokeWidth="0.3"
          fill="none"
        />
      </svg>

      <svg
        className="absolute -bottom-40 -left-40 h-[30rem] w-[30rem] text-[#800020]/4"
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M150 30C83 30 30 83 30 150s53 120 120 120 120-53 120-120S217 30 150 30z"
          stroke="currentColor"
          strokeWidth="0.4"
          fill="none"
        />
        <path
          d="M150 60c-50 0-90 40-90 90s40 90 90 90 90-40 90-90-40-90-90-90z"
          stroke="currentColor"
          strokeWidth="0.3"
          fill="none"
        />
        <path d="M90 90l60 60m0 0l60-60m-60 60l60 60m-60-60l-60 60" stroke="currentColor" strokeWidth="0.2" fill="none" />
      </svg>

      <svg
        className="absolute top-1/3 left-1/4 h-48 w-48 text-[#800020]/3"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M50 10C28 10 10 28 10 50s18 40 40 40 40-18 40-40S72 10 50 10z"
          stroke="currentColor"
          strokeWidth="0.3"
          fill="none"
        />
        <path d="M25 25l25 25m0 0l25-25m-25 25l25 25m-25-25l-25 25" stroke="currentColor" strokeWidth="0.2" fill="none" />
      </svg>
    </div>
  );
}
