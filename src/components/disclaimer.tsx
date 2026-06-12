export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-muted-foreground ${className}`}>
      88Mate is an organisation tool, not migration advice. Always check the
      official requirements on{" "}
      <a
        href="https://immi.homeaffairs.gov.au"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        immi.homeaffairs.gov.au
      </a>
      .
    </p>
  );
}
