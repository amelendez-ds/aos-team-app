export default function FactionDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 rounded-full align-middle"
      style={{ backgroundColor: color }}
    />
  );
}
