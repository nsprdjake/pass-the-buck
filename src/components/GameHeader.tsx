type GameHeaderProps = {
  round: number;
  pot: number;
};

export default function GameHeader({ round, pot }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="text-white/70 text-sm font-bold uppercase tracking-widest">
        Round <span className="text-white">{round}</span>
      </div>
      <div className="flex items-center gap-2 bg-buck-gold/15 border border-buck-gold/40 rounded-full px-3 py-1.5">
        <span className="text-buck-gold text-base">💰</span>
        <span className="text-buck-gold font-black text-sm">
          POT: <span className="text-white">{pot}</span>
        </span>
      </div>
    </div>
  );
}
